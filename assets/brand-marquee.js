/**
 * Brand Marquee – auto-scrolling strip that the user can also drag.
 *
 * The strip used to be a CSS keyframe animation on the track, which meant it
 * could only ever play at the browser: there was nothing for a finger or a
 * cursor to grab. This drives the SAME native scroll position that a touch
 * drag produces, so autoplay and manual control are the one mechanism and
 * never fight each other.
 *
 * The track is rendered twice by Liquid, so scrolling one copy's width puts us
 * back at a visually identical position — that's where we wrap.
 */
(function () {
  'use strict';

  var IDLE_RESUME_MS = 2200;
  var instances = [];
  var initErrors = [];

  /* Defined FIRST, before anything that could throw, and it logs on every
     page load without anyone having to type a command. Previously the
     status function was only assigned after every instance had been built
     successfully — so if the constructor for even one of them threw, the
     whole script halted right there and the function never existed at all.
     That produced exactly the symptom this shipped to diagnose: "the file
     loaded (200 in Network) but the console says the function doesn't
     exist" — the failure was silent because nothing ever reported it. */
  window.__brandMarqueeStatus = function () {
    if (initErrors.length) {
      return { scriptRan: true, initErrors: initErrors.map(function (e) { return e.message || String(e); }) };
    }
    if (!instances.length) {
      return { scriptRan: true, marqueeElementsOnPage: document.querySelectorAll('[data-brand-marquee]').length,
               note: 'No marquee instance was built. 0 elements on the page = wrong page/section removed; >0 = something else stopped construction (see initErrors).' };
    }
    return instances.map(function (i) {
      return i && i.status ? i.status() : { note: 'instance object missing its own methods' };
    });
  };

  console.log('[brand-marquee] script executing, ' + document.querySelectorAll('[data-brand-marquee]').length + ' container(s) on this page');

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  function init() {
    document.querySelectorAll('[data-brand-marquee]').forEach(function (root) {
      try {
        instances.push(new BrandMarquee(root));
      } catch (err) {
        /* One brand strip failing to build must not silently disable every
           other script on the page or hide the reason why. */
        initErrors.push(err);
        console.error('[brand-marquee] failed to initialise:', err);
      }
    });
    console.log('[brand-marquee] ready — ' + instances.length + ' instance(s), ' + initErrors.length + ' error(s). Run __brandMarqueeStatus() for detail.');
  }

  function BrandMarquee(root) {
    this.root  = root;
    this.track = root.querySelector('[data-brand-marquee-track]');
    if (!this.track || this.track.children.length < 2) return;

    this.speed      = parseFloat(root.getAttribute('data-speed')) || 30; // seconds per loop
    this.autoplay   = root.getAttribute('data-autoplay') !== 'false';
    // Opt-in, because an OS-level "reduce motion" setting silently stopping the
    // strip is indistinguishable from it being broken.
    this.respectReducedMotion = root.getAttribute('data-respect-reduced-motion') === 'true';
    this.wrapWidth  = 0;
    this.pos        = 0;
    this.rafId      = null;
    this.lastTs     = 0;
    this.paused     = false;
    this.idleTimer  = null;

    // Pointer-drag state (desktop; touch uses native scrolling).
    this.dragging   = false;
    this.dragStartX = 0;
    this.dragStartScroll = 0;
    this.dragMoved  = 0;

    /* Some privacy/ad-blocking browser extensions patch matchMedia,
       ResizeObserver, or pointer/clipboard APIs and throw from inside their
       own wrapper instead of the native behavior. None of that is ours to
       fix, but it must not stop the strip from being at least manually
       scrollable — so every optional API call below is isolated. */
    try {
      this.reduceMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    } catch (err) {
      console.warn('[brand-marquee] matchMedia unavailable:', err);
      this.reduceMotion = null;
    }

    try { this._measure(); } catch (err) { console.warn('[brand-marquee] measure failed:', err); }
    try { this._bind(); } catch (err) { console.warn('[brand-marquee] bind failed:', err); }

    // Logos are lazy-loaded, so the width isn't final at DOMContentLoaded.
    var self = this;

    try {
      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(function () { self._measure(); });
        this._ro.observe(this.track);
      }
    } catch (err) {
      console.warn('[brand-marquee] ResizeObserver unavailable:', err);
    }

    /* Wrapped in a plain closure rather than .bind() because your last
       traceback showed .bind itself throwing on this._measure — a browser
       extension is patching Function.prototype and making that call unsafe.
       An arrow-equivalent closure sidesteps the poisoned method entirely. */
    try {
      window.addEventListener('load', function () {
        try { self._measure(); } catch (e) { console.warn('[brand-marquee] late measure failed:', e); }
      });
    } catch (err) {
      console.warn('[brand-marquee] load listener unavailable:', err);
    }

    try { this.root.classList.add('is-interactive'); } catch (err) {}
    try { if (!this._prefersReduced()) this._play(); } catch (err) { console.warn('[brand-marquee] could not start:', err); }
  }

  BrandMarquee.prototype._prefersReduced = function () {
    if (!this.autoplay) return true;
    if (!this.respectReducedMotion) return false;
    return !!(this.reduceMotion && this.reduceMotion.matches);
  };

  /* Plain-English answer to "why isn't it moving?", callable from the console:
     window.__brandMarqueeStatus(). Cheaper than guessing across environments. */
  BrandMarquee.prototype.status = function () {
    return {
      scriptLoaded: true,
      autoplaySetting: this.autoplay,
      respectsReducedMotion: this.respectReducedMotion,
      osAsksForReducedMotion: !!(this.reduceMotion && this.reduceMotion.matches),
      animationRunning: this.rafId !== null,
      pausedByHoverOrTouch: this.paused,
      dragging: this.dragging,
      loopWidth: this.wrapWidth,
      containerWidth: this.root.clientWidth,
      currentScroll: Math.round(this.root.scrollLeft),
      tabHidden: document.hidden,
      verdict: this.rafId === null
        ? (this._prefersReduced() ? 'suppressed: autoplay off or reduced-motion' : 'loop not started')
        : (this.wrapWidth > 0 ? 'running' : 'running but loop width is 0 — nothing to scroll')
    };
  };

  /* The seamless loop distance is the offset between the two rendered copies,
     which includes the flex gap — using scrollWidth/2 would drift by half a
     gap on every lap. */
  BrandMarquee.prototype._measure = function () {
    if (this.track.children.length < 2) return;
    var colW = this.track.children[1].offsetLeft - this.track.children[0].offsetLeft;
    if (colW <= 0) { this.wrapWidth = 0; return; }

    /* A wrap jumps back by exactly one copy, so there must be at least a full
       viewport of content BEYOND that point or the strip has nowhere to scroll
       and autoplay silently does nothing. This used to disable autoplay in that
       case — which is what made a short strip (few brands, wide screen, or small
       logo boxes) look like a drag-only menu. Clone copies instead. */
    var needed = Math.ceil(this.root.clientWidth / colW) + 1;
    if (needed < 2) needed = 2;
    var guard = 0;
    while (this.track.children.length < needed && guard++ < 12) {
      try {
        var clone = this.track.children[0].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        var links = clone.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) links[i].setAttribute('tabindex', '-1');
        this.track.appendChild(clone);
      } catch (err) {
        // Whatever brands are already in the DOM keep working; a failed
        // clone just means less run-up before the loop wraps.
        console.warn('[brand-marquee] could not clone a column for the loop:', err);
        break;
      }
    }

    this.wrapWidth = colW;
  };

  BrandMarquee.prototype._play = function () {
    if (this.rafId !== null || this._prefersReduced()) return;
    var self = this;
    this.lastTs = 0;
    this.rafId = requestAnimationFrame(function step(ts) {
      try {
        if (self.lastTs) {
          var dt = (ts - self.lastTs) / 1000;
          // Cap dt so a backgrounded tab doesn't jump on return.
          if (dt > 0.1) dt = 0.1;
          if (self.wrapWidth > 0 && !self.paused && !self.dragging) {
            /* Accumulate in `pos` (a float) and only ever WRITE scrollLeft.
               Reading it back would round-trip through the browser's device-pixel
               grid — on a 1.25x display that snaps to 0.8px steps, so a sub-pixel
               per-frame delta is silently discarded and the strip runs at the
               wrong speed or, at the slow end of the range, never moves at all. */
            self.pos = self._wrapValue(self.pos + (self.wrapWidth / self.speed) * dt);
            self.root.scrollLeft = self.pos;
          }
        }
        self.lastTs = ts;
      } catch (err) {
        /* One bad frame must not permanently silence the loop. */
        console.warn('[brand-marquee] frame skipped:', err);
      }
      self.rafId = requestAnimationFrame(step);
    });
  };

  BrandMarquee.prototype._stop = function () {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  /* Fold a position back into the first copy. The two copies are identical, so
     landing on the same offset in either one looks the same to the eye. */
  BrandMarquee.prototype._wrapValue = function (x) {
    if (!this.wrapWidth) return x;
    // Modulo rather than one subtraction: a resize can shrink wrapWidth well
    // below the current position, which a single subtraction wouldn't fold.
    return ((x % this.wrapWidth) + this.wrapWidth) % this.wrapWidth;
  };

  /* Called after a USER scroll (drag, swipe, wheel, arrow key). Native scroll
     clamps at 0, so reaching the left edge is how "dragged back past the
     start" shows up — hand them the far copy so the strip keeps rotating. */
  BrandMarquee.prototype._wrap = function () {
    if (!this.wrapWidth) return;
    var x = this.root.scrollLeft;
    if (x >= this.wrapWidth) {
      x -= this.wrapWidth;
      this.root.scrollLeft = x;
    } else if (x <= 0) {
      x += this.wrapWidth;
      this.root.scrollLeft = x;
    }
    // Autoplay must pick up from wherever the user left off, not snap back.
    this.pos = x;
  };

  BrandMarquee.prototype._pause = function () {
    this.paused = true;
    clearTimeout(this.idleTimer);
  };

  /* Resume only after the user has been still for a moment, so the strip
     doesn't yank itself out from under a finger that paused to read. */
  BrandMarquee.prototype._resumeSoon = function () {
    var self = this;
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(function () { self.paused = false; }, IDLE_RESUME_MS);
  };

  BrandMarquee.prototype._bind = function () {
    var self = this;
    var root = this.root;

    /* --- Native touch scrolling: just get out of the way ---------- */
    root.addEventListener('touchstart', function () { self._pause(); }, { passive: true });
    root.addEventListener('touchend',   function () { self._resumeSoon(); }, { passive: true });
    root.addEventListener('wheel',      function () { self._pause(); self._resumeSoon(); }, { passive: true });

    // Keep the loop seamless when the user scrolls past a copy boundary,
    // but never reposition mid-drag or we'd fight their finger.
    root.addEventListener('scroll', function () {
      if (self.dragging) return;
      /* Autoplay's own writes land within a device pixel of `pos`; anything
         further away is the user (swipe momentum, wheel, scrollbar) and has to
         be adopted, or autoplay would yank the strip back to where it was. */
      if (Math.abs(root.scrollLeft - self.pos) > 2) self._wrap();
    }, { passive: true });

    /* --- Desktop drag-to-scroll ----------------------------------- */
    root.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; // native scrolling handles touch
      self.dragging       = true;
      self.dragMoved      = 0;
      self.dragStartX     = e.clientX;
      self.dragStartScroll = root.scrollLeft;
      self._pause();
      root.classList.add('is-dragging');
      // Capture keeps the drag alive past the strip's edges. Not worth throwing
      // over if the browser refuses the pointer id — the drag still works.
      try { root.setPointerCapture(e.pointerId); } catch (err) {}
    });

    root.addEventListener('pointermove', function (e) {
      if (!self.dragging) return;
      var dx = e.clientX - self.dragStartX;
      self.dragMoved = Math.max(self.dragMoved, Math.abs(dx));
      root.scrollLeft = self.dragStartScroll - dx;
      self._wrap();
    });

    function endDrag(e) {
      if (!self.dragging) return;
      self.dragging = false;
      root.classList.remove('is-dragging');
      if (e && e.pointerId != null && root.hasPointerCapture && root.hasPointerCapture(e.pointerId)) {
        root.releasePointerCapture(e.pointerId);
      }
      self._resumeSoon();
    }
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);
    root.addEventListener('pointerleave', endDrag);

    // A drag that ends on a logo shouldn't navigate to that brand.
    root.addEventListener('click', function (e) {
      if (self.dragMoved > 5) {
        e.preventDefault();
        e.stopPropagation();
        self.dragMoved = 0;
      }
    }, true);

    /* --- Hover / focus -------------------------------------------- */
    root.addEventListener('mouseenter', function () { self._pause(); });
    root.addEventListener('mouseleave', function () { if (!self.dragging) self._resumeSoon(); });
    root.addEventListener('focusin',  function () { self._pause(); });
    root.addEventListener('focusout', function () { self._resumeSoon(); });

    // Keyboard: arrows nudge by one logo.
    root.addEventListener('keydown', function (e) {
      var card = root.querySelector('.brand-logo-card');
      var stepPx = card ? card.offsetWidth : 120;
      if (e.key === 'ArrowLeft')  { root.scrollLeft -= stepPx; self._wrap(); self._pause(); self._resumeSoon(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { root.scrollLeft += stepPx; self._wrap(); self._pause(); self._resumeSoon(); e.preventDefault(); }
    });

    window.addEventListener('resize', function () { self._measure(); });

    // Don't burn frames while the tab is hidden.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) self._stop();
      else if (!self._prefersReduced()) self._play();
    });

    if (this.reduceMotion && this.reduceMotion.addEventListener) {
      this.reduceMotion.addEventListener('change', function () {
        if (self._prefersReduced()) self._stop();
        else self._play();
      });
    }
  };
})();

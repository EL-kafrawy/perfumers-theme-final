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

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  function init() {
    document.querySelectorAll('[data-brand-marquee]').forEach(function (root) {
      new BrandMarquee(root);
    });
  }

  function BrandMarquee(root) {
    this.root  = root;
    this.track = root.querySelector('[data-brand-marquee-track]');
    if (!this.track || this.track.children.length < 2) return;

    this.speed      = parseFloat(root.getAttribute('data-speed')) || 30; // seconds per loop
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

    this.reduceMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    this._measure();
    this._bind();

    // Logos are lazy-loaded, so the width isn't final at DOMContentLoaded.
    if (window.ResizeObserver) {
      var self = this;
      this._ro = new ResizeObserver(function () { self._measure(); });
      this._ro.observe(this.track);
    }
    window.addEventListener('load', this._measure.bind(this));

    this.root.classList.add('is-interactive');
    if (!this._prefersReduced()) this._play();
  }

  BrandMarquee.prototype._prefersReduced = function () {
    return !!(this.reduceMotion && this.reduceMotion.matches);
  };

  /* The seamless loop distance is the offset between the two rendered copies,
     which includes the flex gap — using scrollWidth/2 would drift by half a
     gap on every lap. */
  BrandMarquee.prototype._measure = function () {
    var cols = this.track.children;
    if (cols.length < 2) return;
    var w = cols[1].offsetLeft - cols[0].offsetLeft;
    // With too few brands one copy is narrower than the viewport, so there is
    // nothing to scroll into after a wrap. Leave it static rather than jump.
    this.wrapWidth = (w > 0 && w >= this.root.clientWidth) ? w : 0;
  };

  BrandMarquee.prototype._play = function () {
    if (this.rafId !== null || this._prefersReduced()) return;
    var self = this;
    this.lastTs = 0;
    this.rafId = requestAnimationFrame(function step(ts) {
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

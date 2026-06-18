/**
 * Shop by Brand – Horizontal Logo Carousel
 * Vanilla JS, no dependencies.
 */
(function () {
  'use strict';

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  function init() {
    document.querySelectorAll('[data-brand-carousel]').forEach(function (root) {
      new BrandCarousel(root);
    });
  }

  function BrandCarousel(root) {
    this.root      = root;
    this.track     = root.querySelector('[data-carousel-track]');
    this.prevBtn   = root.querySelector('[data-carousel-prev]');
    this.nextBtn   = root.querySelector('[data-carousel-next]');
    this.cards     = this.track ? Array.from(this.track.children) : [];
    this.index     = 0;
    this.dragging  = false;
    this.startX    = 0;
    this.currentX  = 0;
    this.dragDelta = 0;

    this.autoPlayInterval = null;

    if (!this.track || this.cards.length === 0) return;

    this._bindEvents();
    this._update();
    this._startAutoplay();
  }

  BrandCarousel.prototype._getSlidesPerView = function () {
    var w = window.innerWidth;
    if (w >= 768) return 4;
    if (w >= 540) return 3;
    return 2;
  };

  BrandCarousel.prototype._maxIndex = function () {
    return Math.max(0, this.cards.length - this._getSlidesPerView());
  };

  BrandCarousel.prototype._clampIndex = function (i) {
    return Math.max(0, Math.min(i, this._maxIndex()));
  };

  BrandCarousel.prototype._update = function () {
    this.index = this._clampIndex(this.index);
    var pct = -(this.index * (100 / this._getSlidesPerView()));
    this.track.style.transform = 'translateX(' + pct + '%)';

    if (this.prevBtn) this.prevBtn.disabled = this.index <= 0;
    if (this.nextBtn) this.nextBtn.disabled = this.index >= this._maxIndex();
  };

  BrandCarousel.prototype._prev = function () {
    this.index = this._clampIndex(this.index - 1);
    this._update();
  };

  BrandCarousel.prototype._next = function () {
    var max = this._maxIndex();
    if (this.index >= max) {
      this.index = 0; // Infinite loop wrap
    } else {
      this.index++;
    }
    this._update();
  };

  BrandCarousel.prototype._startAutoplay = function () {
    var self = this;
    if (this.autoPlayInterval) return;
    this.autoPlayInterval = setInterval(function () {
      self._next();
    }, 3000);
  };

  BrandCarousel.prototype._stopAutoplay = function () {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  };

  BrandCarousel.prototype._resetAutoplay = function () {
    this._stopAutoplay();
    this._startAutoplay();
  };

  /* --- Pointer / touch drag --------------------------------------- */
  BrandCarousel.prototype._onDragStart = function (x) {
    this._stopAutoplay();
    this.dragging  = true;
    this.startX    = x;
    this.currentX  = x;
    this.dragDelta = 0;
    this.track.classList.add('is-dragging');
  };

  BrandCarousel.prototype._onDragMove = function (x) {
    if (!this.dragging) return;
    this.currentX  = x;
    this.dragDelta = this.currentX - this.startX;

    var basePct = -(this.index * (100 / this._getSlidesPerView()));
    var cardW   = this.track.offsetWidth / this._getSlidesPerView();
    var dragPct = (this.dragDelta / cardW) * (100 / this._getSlidesPerView());

    this.track.style.transform = 'translateX(' + (basePct + dragPct) + '%)';
  };

  BrandCarousel.prototype._onDragEnd = function () {
    if (!this.dragging) return;
    this.dragging = false;
    this.track.classList.remove('is-dragging');

    var threshold = this.track.offsetWidth / this._getSlidesPerView() * 0.2;

    if (this.dragDelta < -threshold) {
      this._next();
    } else if (this.dragDelta > threshold) {
      this._prev();
    } else {
      this._update(); // snap back
    }
    this._startAutoplay();
  };

  /* --- Event binding ---------------------------------------------- */
  BrandCarousel.prototype._bindEvents = function () {
    var self = this;

    // Arrow buttons
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', function () { 
        self._prev(); 
        self._resetAutoplay();
      });
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', function () { 
        self._next(); 
        self._resetAutoplay();
      });
    }

    // Touch events
    this.track.addEventListener('touchstart', function (e) {
      self._stopAutoplay();
      self._onDragStart(e.touches[0].clientX);
    }, { passive: true });

    this.track.addEventListener('touchmove', function (e) {
      self._onDragMove(e.touches[0].clientX);
    }, { passive: true });

    this.track.addEventListener('touchend', function () {
      self._onDragEnd();
      self._startAutoplay();
    });

    // Mouse drag (desktop)
    this.track.addEventListener('mousedown', function (e) {
      e.preventDefault();
      self._stopAutoplay();
      self._onDragStart(e.clientX);
    });

    document.addEventListener('mousemove', function (e) {
      if (self.dragging) {
        e.preventDefault();
        self._onDragMove(e.clientX);
      }
    });

    document.addEventListener('mouseup', function () {
      if (self.dragging) {
        self._onDragEnd();
        self._startAutoplay();
      }
    });

    // Hover to pause (Desktop)
    this.root.addEventListener('mouseenter', function () {
      self._stopAutoplay();
    });
    this.root.addEventListener('mouseleave', function () {
      if (!self.dragging) self._startAutoplay();
    });

    // Prevent accidental link clicks after drag
    this.track.addEventListener('click', function (e) {
      if (Math.abs(self.dragDelta) > 5) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Recalculate on resize
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { self._update(); }, 120);
    });

    // Keyboard support (when focused inside carousel)
    this.root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { self._prev(); self._resetAutoplay(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { self._next(); self._resetAutoplay(); e.preventDefault(); }
    });

  };
})();

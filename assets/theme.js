/* ============================================
   PERFUMERS — Theme Core JavaScript
   ============================================ */
(function() {
  'use strict';

  /* ---- Shopify Section Rendering Support ---- */
  document.addEventListener('shopify:section:load', function(event) {
    var section = event.target;
    initSection(section);
  });

  if (document.readyState !== 'loading') {
    initTheme();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      initTheme();
    });
  }

  function initTheme() {
    initLazyImages();
    initSmoothScroll();
    initAnimateOnScroll();
    initCurrencyFormat();
  }

  function initSection(section) {
    initLazyImages();
    initAnimateOnScroll();
  }

  /* ---- Lazy Image Loading ---- */
  function initLazyImages() {
    if ('IntersectionObserver' in window) {
      var lazyImages = document.querySelectorAll('[data-src]');
      var imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            img.src = img.dataset.src;
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
            }
            img.removeAttribute('data-src');
            img.removeAttribute('data-srcset');
            imageObserver.unobserve(img);
          }
        });
      }, { rootMargin: '100px' });

      lazyImages.forEach(function(img) {
        imageObserver.observe(img);
      });
    }
  }

  /* ---- Smooth Scroll for Anchor Links ----
     Only intercepts links that point to a REAL in-page element.
     Anything else (bare "#", placeholder, or non-existent target) is
     left to the browser so navigation/links are never silently killed. */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        var targetId = this.getAttribute('href');
        /* Bare "#" or empty fragment: prevent the jump-to-top, do nothing else */
        if (!targetId || targetId === '#') {
          e.preventDefault();
          return;
        }
        var target = null;
        try {
          target = document.querySelector(targetId);
        } catch (err) {
          /* Invalid selector (e.g. href="#section 1") — let the browser handle it */
          return;
        }
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ---- Animate Elements on Scroll ---- */
  function initAnimateOnScroll() {
    if ('IntersectionObserver' in window) {
      var animElements = document.querySelectorAll('[data-animate]');
      var animObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            animObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      animElements.forEach(function(el) {
        animObserver.observe(el);
      });
    }
  }

  /* ---- Currency Formatting for EGP ---- */
  function initCurrencyFormat() {
    window.PERFUMERS = window.PERFUMERS || {};
    window.PERFUMERS.formatMoney = function(cents) {
      var amount = (cents / 100).toFixed(2);
      return amount + ' EGP';
    };
  }

  /* ---- Utility: Debounce ---- */
  window.PERFUMERS = window.PERFUMERS || {};
  window.PERFUMERS.debounce = function(func, wait) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  };

  /* ---- Utility: Fetch Section HTML ---- */
  window.PERFUMERS.fetchSection = function(url, sectionId) {
    return fetch(url + '?section_id=' + sectionId)
      .then(function(response) {
        return response.text();
      })
      .then(function(html) {
        var parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
      });
  };

  /* ---- Utility: Trap Focus in Element ---- */
  window.PERFUMERS.trapFocus = function(container) {
    var focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    var firstFocusable = focusableElements[0];
    var lastFocusable = focusableElements[focusableElements.length - 1];

    container.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    });

    if (firstFocusable) {
      firstFocusable.focus();
    }
  };

  /* ---- Utility: Remove Focus Trap ---- */
  window.PERFUMERS.removeTrapFocus = function(container) {
    var clone = container.cloneNode(true);
    container.parentNode.replaceChild(clone, container);
  };

})();

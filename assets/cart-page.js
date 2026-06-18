/* ============================================
   PERFUMERS — Cart Page JavaScript
   Handles qty updates and item removal on the
   standalone /cart page via fetch('/cart/change.js').
   Requires no framework. Pure vanilla JS.
   ============================================ */
(function () {
  'use strict';

  var selectors = {
    item:        '[data-cart-item]',
    qtyInput:    '[data-cart-qty]',
    qtyPlus:     '[data-cart-qty-plus]',
    qtyMinus:    '[data-cart-qty-minus]',
    removeBtn:   '[data-cart-remove]',
    totalEl:     '[data-cart-total]',
    linePrice:   '[data-line-price]'
  };

  /* ---- Helpers ---- */
  function money(cents) {
    var amount = (cents / 100).toFixed(2);
    return amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' EGP';
  }

  function request(key, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
    .then(function (res) { return res.json(); })
    .catch(function (err) { console.error('Cart error:', err); });
  }

  /* ---- Update a single line item price ---- */
  function updateLinePrice(itemEl, cart) {
    var key = itemEl.dataset.key;
    var lineItem = null;
    for (var i = 0; i < cart.items.length; i++) {
      if (cart.items[i].key === key) { lineItem = cart.items[i]; break; }
    }
    var priceEl = itemEl.querySelector(selectors.linePrice);
    if (priceEl && lineItem) {
      priceEl.textContent = money(lineItem.final_line_price);
    }
  }

  /* ---- Update cart total ---- */
  function updateTotal(cart) {
    document.querySelectorAll(selectors.totalEl).forEach(function (el) {
      el.textContent = money(cart.total_price);
    });
  }

  /* ---- Remove item row from DOM ---- */
  function removeItemFromDOM(itemEl, cart) {
    itemEl.style.opacity = '0';
    itemEl.style.transition = 'opacity 0.25s ease';
    setTimeout(function () {
      itemEl.remove();
      /* If cart is now empty, reload so Liquid empty state renders */
      if (cart.item_count === 0) {
        window.location.reload();
      }
    }, 260);
  }

  /* ---- Event delegation on cart items container ---- */
  function bindEvents() {
    var container = document.getElementById('cart-items-container');
    if (!container) return;

    container.addEventListener('click', function (e) {
      /* Plus button */
      var plusBtn = e.target.closest(selectors.qtyPlus);
      if (plusBtn) {
        var wrap = plusBtn.closest(selectors.item);
        var input = wrap ? wrap.querySelector(selectors.qtyInput) : null;
        if (!input) return;
        var newQty = parseInt(input.value, 10) + 1;
        input.value = newQty;
        request(input.dataset.lineKey, newQty).then(function (cart) {
          if (!cart) return;
          updateLinePrice(wrap, cart);
          updateTotal(cart);
        });
      }

      /* Minus button */
      var minusBtn = e.target.closest(selectors.qtyMinus);
      if (minusBtn) {
        var wrap = minusBtn.closest(selectors.item);
        var input = wrap ? wrap.querySelector(selectors.qtyInput) : null;
        if (!input) return;
        var newQty = Math.max(1, parseInt(input.value, 10) - 1);
        input.value = newQty;
        request(input.dataset.lineKey, newQty).then(function (cart) {
          if (!cart) return;
          updateLinePrice(wrap, cart);
          updateTotal(cart);
        });
      }

      /* Remove button */
      var removeBtn = e.target.closest(selectors.removeBtn);
      if (removeBtn) {
        var wrap = removeBtn.closest(selectors.item);
        request(removeBtn.dataset.lineKey, 0).then(function (cart) {
          if (!cart) return;
          updateTotal(cart);
          if (wrap) removeItemFromDOM(wrap, cart);
        });
      }
    });

    /* Input blur: direct quantity entry */
    container.addEventListener('change', function (e) {
      var input = e.target.closest(selectors.qtyInput);
      if (!input) return;
      var wrap = input.closest(selectors.item);
      var newQty = Math.max(1, parseInt(input.value, 10) || 1);
      input.value = newQty;
      request(input.dataset.lineKey, newQty).then(function (cart) {
        if (!cart) return;
        if (wrap) updateLinePrice(wrap, cart);
        updateTotal(cart);
      });
    });
  }

  /* ---- Init ---- */
  if (document.readyState !== 'loading') {
    bindEvents();
  } else {
    document.addEventListener('DOMContentLoaded', bindEvents);
  }

})();

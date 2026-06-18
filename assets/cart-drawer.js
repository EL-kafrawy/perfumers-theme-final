/* ============================================
   PERFUMERS — Cart Drawer JavaScript
   ============================================ */
(function () {
    'use strict';

    var selectors = {
        drawer: '[data-cart-drawer]',
        overlay: '[data-cart-overlay]',
        openBtn: '[data-cart-open], [data-drawer-open="cart"]',
        closeBtn: '[data-cart-close]',
        itemRemove: '[data-cart-remove]',
        itemQtyInput: '[data-cart-qty]',
        itemQtyPlus: '[data-cart-qty-plus]',
        itemQtyMinus: '[data-cart-qty-minus]',
        cartCount: '[data-cart-count]',
        cartTotal: '[data-cart-total]',
        cartItems: '[data-cart-items]',
        cartEmpty: '[data-cart-empty]',
        cartFooter: '[data-cart-footer]'
    };

    function CartDrawer() {
        this.drawer = document.querySelector(selectors.drawer);
        this.overlay = document.querySelector(selectors.overlay);

        if (!this.drawer) return;

        this.bindEvents();
    }

    CartDrawer.prototype.bindEvents = function () {
        var self = this;

        /* Open cart drawer */
        document.querySelectorAll(selectors.openBtn).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.open();
            });
        });

        /* Close cart drawer */
        document.querySelectorAll(selectors.closeBtn).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.close();
            });
        });

        /* Close on overlay click */
        if (this.overlay) {
            this.overlay.addEventListener('click', function () {
                self.close();
            });
        }

        /* Close on Escape key */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && self.isOpen()) {
                self.close();
            }
        });

        /* Quantity changes & remove */
        this.drawer.addEventListener('click', function (e) {
            var plusBtn = e.target.closest(selectors.itemQtyPlus);
            var minusBtn = e.target.closest(selectors.itemQtyMinus);
            var removeBtn = e.target.closest(selectors.itemRemove);

            if (plusBtn) {
                e.preventDefault();
                var input = plusBtn.parentElement.querySelector(selectors.itemQtyInput);
                if (input) {
                    var newQty = parseInt(input.value, 10) + 1;
                    self.updateItem(input.dataset.lineKey, newQty);
                }
            }

            if (minusBtn) {
                e.preventDefault();
                var input = minusBtn.parentElement.querySelector(selectors.itemQtyInput);
                if (input) {
                    var newQty = Math.max(0, parseInt(input.value, 10) - 1);
                    self.updateItem(input.dataset.lineKey, newQty);
                }
            }

            if (removeBtn) {
                e.preventDefault();
                self.updateItem(removeBtn.dataset.lineKey, 0);
            }
        });
    };

    CartDrawer.prototype.open = function () {
        this.drawer.classList.add('is-open');
        if (this.overlay) this.overlay.classList.add('is-active');
        document.body.style.overflow = 'hidden';
        if (window.PERFUMERS && window.PERFUMERS.trapFocus) {
            window.PERFUMERS.trapFocus(this.drawer);
        }
        this.refreshCart();
    };

    CartDrawer.prototype.close = function () {
        this.drawer.classList.remove('is-open');
        if (this.overlay) this.overlay.classList.remove('is-active');
        document.body.style.overflow = '';
    };

    CartDrawer.prototype.isOpen = function () {
        return this.drawer.classList.contains('is-open');
    };

    CartDrawer.prototype.updateItem = function (key, quantity) {
        var self = this;
        fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: key, quantity: quantity })
        })
            .then(function (response) { return response.json(); })
            .then(function (cart) {
                self.renderCart(cart);
                self.updateCartCount(cart.item_count);
            })
            .catch(function (error) {
                console.error('Cart update error:', error);
            });
    };

    CartDrawer.prototype.refreshCart = function () {
        var self = this;
        fetch('/cart.js', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
            .then(function (response) { return response.json(); })
            .then(function (cart) {
                self.renderCart(cart);
            })
            .catch(function (error) {
                console.error('Cart fetch error:', error);
            });
    };

    CartDrawer.prototype.renderCart = function (cart) {
        var itemsContainer = this.drawer.querySelector(selectors.cartItems);
        var emptyMessage = this.drawer.querySelector(selectors.cartEmpty);
        var footer = this.drawer.querySelector(selectors.cartFooter);
        var totalEl = this.drawer.querySelector(selectors.cartTotal);

        if (!itemsContainer) return;

        if (cart.item_count === 0) {
            itemsContainer.innerHTML = '';
            if (emptyMessage) emptyMessage.style.display = 'block';
            if (footer) footer.style.display = 'none';
            return;
        }

        if (emptyMessage) emptyMessage.style.display = 'none';
        if (footer) footer.style.display = 'block';

        var html = '';
        cart.items.forEach(function (item) {
            html += '<div class="cart-drawer__item" data-line-key="' + item.key + '">';
            html += '  <div class="cart-drawer__item-image">';
            html += '    <img src="' + item.image + '" alt="' + item.title + '" loading="lazy">';
            html += '  </div>';
            html += '  <div class="cart-drawer__item-details">';
            html += '    <p class="cart-drawer__item-title">' + item.product_title + '</p>';
            if (item.variant_title) {
                html += '    <p class="cart-drawer__item-variant">' + item.variant_title + '</p>';
            }
            html += '    <p class="cart-drawer__item-price">' + (item.final_line_price / 100).toLocaleString('en-EG', {minimumFractionDigits: 2}) + ' EGP</p>';
            html += '    <div class="cart-drawer__item-qty">';
            html += '      <button class="qty-btn" data-cart-qty-minus aria-label="Decrease quantity"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>';
            html += '      <input type="number" data-cart-qty data-line-key="' + item.key + '" value="' + item.quantity + '" min="0" aria-label="Quantity">';
            html += '      <button class="qty-btn" data-cart-qty-plus aria-label="Increase quantity"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>';
            html += '    </div>';
            html += '  </div>';
            html += '  <button class="cart-drawer__item-remove" data-cart-remove data-line-key="' + item.key + '" aria-label="Remove item">';
            html += '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            html += '  </button>';
            html += '</div>';
        });
        itemsContainer.innerHTML = html;

        if (totalEl) {
            totalEl.textContent = (cart.total_price / 100).toLocaleString('en-EG', {minimumFractionDigits: 2}) + ' EGP';
        }

        this.updateCartCount(cart.item_count);
    };

    CartDrawer.prototype.updateCartCount = function (count) {
        document.querySelectorAll(selectors.cartCount).forEach(function (el) {
            el.textContent = count;
            el.style.display = count > 0 ? '' : 'none';
        });
    };

    /* ---- Add to Cart (global) ---- */
    window.PERFUMERS = window.PERFUMERS || {};
    window.PERFUMERS.addToCart = function (variantId, quantity) {
        quantity = quantity || 1;
        return fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: variantId, quantity: quantity }] })
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                var cartDrawerInstance = document.querySelector(selectors.drawer);
                if (cartDrawerInstance && cartDrawerInstance.__cartDrawer) {
                    cartDrawerInstance.__cartDrawer.open();
                } else {
                    /* Fallback: open drawer manually */
                    var drawer = document.querySelector(selectors.drawer);
                    var overlay = document.querySelector(selectors.overlay);
                    if (drawer) {
                        drawer.classList.add('is-open');
                        if (overlay) overlay.classList.add('is-active');
                        document.body.style.overflow = 'hidden';
                    }
                }
                return data;
            });
    };

    /* Initialize */
    function initCartDrawer() {
        var cd = new CartDrawer();
        var drawer = document.querySelector(selectors.drawer);
        if (drawer) {
            drawer.__cartDrawer = cd;
        }
    }

    if (document.readyState !== 'loading') {
        initCartDrawer();
    } else {
        document.addEventListener('DOMContentLoaded', initCartDrawer);
    }

})();

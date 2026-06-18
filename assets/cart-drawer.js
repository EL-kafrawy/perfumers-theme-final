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

        /* Direct quantity edit (typing a number) */
        this.drawer.addEventListener('change', function (e) {
            var qtyInput = e.target.closest(selectors.itemQtyInput);
            if (qtyInput) {
                var newQty = Math.max(0, parseInt(qtyInput.value, 10) || 0);
                self.updateItem(qtyInput.dataset.lineKey, newQty);
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
        if (window.PERFUMERS && window.PERFUMERS.removeTrapFocus) {
            window.PERFUMERS.removeTrapFocus(this.drawer);
        }
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

    function svgIcon(paths) {
        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        paths.forEach(function (d) {
            var line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', d[0]); line.setAttribute('y1', d[1]);
            line.setAttribute('x2', d[2]); line.setAttribute('y2', d[3]);
            svg.appendChild(line);
        });
        return svg;
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function formatMoney(cents) {
        return (cents / 100).toLocaleString('en-EG', { minimumFractionDigits: 2 }) + ' EGP';
    }

    function buildCartItem(item) {
        var wrap = el('div', 'cart-drawer__item');
        wrap.setAttribute('data-line-key', item.key);

        var imgWrap = el('div', 'cart-drawer__item-image');
        var img = document.createElement('img');
        img.src = item.image || '';
        img.alt = item.product_title || item.title || '';
        img.loading = 'lazy';
        imgWrap.appendChild(img);
        wrap.appendChild(imgWrap);

        var details = el('div', 'cart-drawer__item-details');
        details.appendChild(el('p', 'cart-drawer__item-title', item.product_title || item.title));
        if (item.variant_title) {
            details.appendChild(el('p', 'cart-drawer__item-variant', item.variant_title));
        }
        details.appendChild(el('p', 'cart-drawer__item-price', formatMoney(item.final_line_price)));

        var qty = el('div', 'cart-drawer__item-qty');
        var minus = el('button', 'qty-btn');
        minus.setAttribute('data-cart-qty-minus', '');
        minus.setAttribute('aria-label', 'Decrease quantity');
        minus.appendChild(svgIcon([[5, 12, 19, 12]]));

        var input = document.createElement('input');
        input.type = 'number';
        input.setAttribute('data-cart-qty', '');
        input.setAttribute('data-line-key', item.key);
        input.value = item.quantity;
        input.min = '0';
        input.setAttribute('aria-label', 'Quantity');

        var plus = el('button', 'qty-btn');
        plus.setAttribute('data-cart-qty-plus', '');
        plus.setAttribute('aria-label', 'Increase quantity');
        plus.appendChild(svgIcon([[12, 5, 12, 19], [5, 12, 19, 12]]));

        qty.appendChild(minus);
        qty.appendChild(input);
        qty.appendChild(plus);
        details.appendChild(qty);
        wrap.appendChild(details);

        var remove = el('button', 'cart-drawer__item-remove');
        remove.setAttribute('data-cart-remove', '');
        remove.setAttribute('data-line-key', item.key);
        remove.setAttribute('aria-label', 'Remove item');
        remove.appendChild(svgIcon([[18, 6, 6, 18], [6, 6, 18, 18]]));
        wrap.appendChild(remove);

        return wrap;
    }

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

        /* Build items with the DOM API so product/variant titles are inserted as
           text (never parsed as HTML) — no string-concat injection surface. */
        itemsContainer.innerHTML = '';
        cart.items.forEach(function (item) {
            itemsContainer.appendChild(buildCartItem(item));
        });

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
            .then(function (response) {
                /* Shopify returns 422 (with a description) when an item can't be
                   added (sold out / exceeds available stock). Surface it instead
                   of falsely opening the drawer as a success. */
                return response.json().then(function (data) {
                    if (!response.ok) {
                        var err = new Error(data.description || data.message || 'Could not add to cart');
                        err.cartError = data;
                        throw err;
                    }
                    return data;
                });
            })
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
        /* Sync every cart-count badge from the server-rendered value on load,
           so the header (and empty mobile-menu) badge is correct immediately. */
        var initialCountEl = document.querySelector('[data-cart-count][data-count]');
        var initialCount = initialCountEl ? (parseInt(initialCountEl.dataset.count, 10) || 0) : 0;
        cd.updateCartCount(initialCount);
    }

    if (document.readyState !== 'loading') {
        initCartDrawer();
    } else {
        document.addEventListener('DOMContentLoaded', initCartDrawer);
    }

})();

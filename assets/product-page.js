/* ============================================
   PERFUMERS — Product Page JavaScript
   ============================================ */
(function () {
    'use strict';

    var selectors = {
        productForm: '[data-product-form]',
        variantSelect: '[data-variant-select]',
        variantRadio: '[data-variant-radio]',
        priceDisplay: '[data-product-price]',
        comparePriceDisplay: '[data-product-compare-price]',
        addToCartBtn: '[data-add-to-cart]',
        addToCartText: '[data-add-to-cart-text]',
        mainImage: '[data-product-main-image]',
        thumbnails: '[data-product-thumbnail]',
        gallerySlider: '[data-product-gallery]',
        volumeOptions: '[data-volume-option]',
        quantityInput: '[data-product-qty]',
        quantityPlus: '[data-product-qty-plus]',
        quantityMinus: '[data-product-qty-minus]',
        stickyBar: '[data-sticky-bar]'
    };

    function ProductPage() {
        this.form = document.querySelector(selectors.productForm);
        if (!this.form) return;

        this.productData = null;
        this.currentVariant = null;

        this.parseProductData();
        this.bindEvents();
        this.initGallery();
        this.initStickyBar();
    }

    ProductPage.prototype.parseProductData = function () {
        var dataEl = document.querySelector('[data-product-json]');
        if (dataEl) {
            try {
                this.productData = JSON.parse(dataEl.textContent);
            } catch (e) {
                console.error('Failed to parse product data:', e);
            }
        }
    };

    ProductPage.prototype.bindEvents = function () {
        var self = this;

        /* Variant selection via dropdown */
        var variantSelect = this.form.querySelector(selectors.variantSelect);
        if (variantSelect) {
            variantSelect.addEventListener('change', function () {
                self.onVariantChange(this.value);
            });
        }

        /* Variant selection via radio buttons (e.g., volume) */
        this.form.querySelectorAll(selectors.variantRadio).forEach(function (radio) {
            radio.addEventListener('change', function () {
                self.onVariantChange(this.value);
            });
        });

        /* Volume option buttons */
        document.querySelectorAll(selectors.volumeOptions).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelectorAll(selectors.volumeOptions).forEach(function (b) {
                    b.classList.remove('is-active');
                });
                this.classList.add('is-active');

                var variantId = this.dataset.variantId;
                if (variantId) {
                    self.onVariantChange(variantId);
                }
            });
        });

        /* Quantity controls */
        var qtyPlus = document.querySelector(selectors.quantityPlus);
        var qtyMinus = document.querySelector(selectors.quantityMinus);
        var qtyInput = document.querySelector(selectors.quantityInput);

        if (qtyPlus && qtyInput) {
            qtyPlus.addEventListener('click', function (e) {
                e.preventDefault();
                qtyInput.value = parseInt(qtyInput.value, 10) + 1;
            });
        }
        if (qtyMinus && qtyInput) {
            qtyMinus.addEventListener('click', function (e) {
                e.preventDefault();
                var val = parseInt(qtyInput.value, 10) - 1;
                qtyInput.value = Math.max(1, val);
            });
        }

        /* Add to Cart */
        var addBtn = this.form.querySelector(selectors.addToCartBtn);
        if (addBtn) {
            this.form.addEventListener('submit', function (e) {
                /* If buy-now was the submitter, handle separately */
                if (e.submitter && e.submitter.dataset.buyNow !== undefined) {
                    return; /* let the buy-now handler below take over */
                }
                e.preventDefault();
                self.addToCart();
            });
        }

        /* Buy Now — add to cart then redirect to checkout */
        var buyNowBtn = this.form.querySelector('[data-buy-now]');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', function (e) {
                e.preventDefault();
                var variantInput = self.form.querySelector('input[name="id"]');
                var qtyInput = self.form.querySelector(selectors.quantityInput);
                if (!variantInput) return;
                var variantId = parseInt(variantInput.value, 10);
                var quantity = qtyInput ? parseInt(qtyInput.value, 10) : 1;
                fetch('/cart/add.js', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: [{ id: variantId, quantity: quantity }] })
                })
                .then(function () {
                    window.location.href = '/checkout';
                })
                .catch(function (err) {
                    console.error('Buy now error:', err);
                });
            });
        }

        /* Thumbnail clicks */
        document.querySelectorAll(selectors.thumbnails).forEach(function (thumb) {
            thumb.addEventListener('click', function (e) {
                e.preventDefault();
                self.changeMainImage(this);
            });
        });
    };

    ProductPage.prototype.onVariantChange = function (variantId) {
        if (!this.productData || !this.productData.variants) return;

        var variant = null;
        for (var i = 0; i < this.productData.variants.length; i++) {
            if (this.productData.variants[i].id == variantId) {
                variant = this.productData.variants[i];
                break;
            }
        }

        if (!variant) return;

        this.currentVariant = variant;

        /* Update price */
        var priceEl = document.querySelector(selectors.priceDisplay);
        var comparePriceEl = document.querySelector(selectors.comparePriceDisplay);

        if (priceEl) {
            priceEl.textContent = (variant.price / 100).toFixed(2) + ' EGP';
        }

        if (comparePriceEl) {
            if (variant.compare_at_price && variant.compare_at_price > variant.price) {
                comparePriceEl.textContent = (variant.compare_at_price / 100).toFixed(2) + ' EGP';
                comparePriceEl.style.display = '';
            } else {
                comparePriceEl.style.display = 'none';
            }
        }

        /* Update add to cart button */
        var addBtn = this.form.querySelector(selectors.addToCartBtn);
        var addBtnText = this.form.querySelector(selectors.addToCartText);

        if (addBtn && addBtnText) {
            if (variant.available) {
                addBtn.disabled = false;
                addBtnText.textContent = addBtnText.dataset.addText || 'Add to Cart';
            } else {
                addBtn.disabled = true;
                addBtnText.textContent = addBtnText.dataset.soldOutText || 'Sold Out';
            }
        }

        /* Update variant image */
        if (variant.featured_image) {
            var mainImg = document.querySelector(selectors.mainImage);
            if (mainImg) {
                mainImg.src = variant.featured_image.src;
                mainImg.alt = variant.featured_image.alt || variant.title;
            }
        }

        /* Update URL */
        if (history.replaceState) {
            var newUrl = window.location.pathname + '?variant=' + variant.id;
            history.replaceState({ path: newUrl }, '', newUrl);
        }

        /* Update hidden variant input */
        var variantInput = this.form.querySelector('input[name="id"]');
        if (variantInput) {
            variantInput.value = variant.id;
        }
    };

    ProductPage.prototype.addToCart = function () {
        var variantInput = this.form.querySelector('input[name="id"]');
        var qtyInput = this.form.querySelector(selectors.quantityInput);

        if (!variantInput) return;

        var variantId = parseInt(variantInput.value, 10);
        var quantity = qtyInput ? parseInt(qtyInput.value, 10) : 1;

        var addBtn = this.form.querySelector(selectors.addToCartBtn);
        var addBtnText = this.form.querySelector(selectors.addToCartText);
        var originalText = addBtnText ? addBtnText.textContent : '';

        if (addBtn) addBtn.disabled = true;
        if (addBtnText) addBtnText.innerHTML = '<span class="spinner"></span>';

        if (window.PERFUMERS && window.PERFUMERS.addToCart) {
            window.PERFUMERS.addToCart(variantId, quantity)
                .then(function () {
                    if (addBtnText) addBtnText.textContent = '✓ Added';
                    setTimeout(function () {
                        if (addBtn) addBtn.disabled = false;
                        if (addBtnText) addBtnText.textContent = originalText;
                    }, 1500);
                })
                .catch(function (err) {
                    console.error('Add to cart error:', err);
                    if (addBtn) addBtn.disabled = false;
                    if (addBtnText) addBtnText.textContent = originalText;
                });
        }
    };

    ProductPage.prototype.changeMainImage = function (thumbnail) {
        var mainImg = document.querySelector(selectors.mainImage);
        if (!mainImg) return;

        mainImg.src = thumbnail.dataset.fullSrc || thumbnail.src;
        mainImg.alt = thumbnail.alt;

        /* Update active state */
        document.querySelectorAll(selectors.thumbnails).forEach(function (t) {
            t.classList.remove('is-active');
        });
        thumbnail.classList.add('is-active');
    };

    ProductPage.prototype.initGallery = function () {
        var gallery = document.querySelector(selectors.gallerySlider);
        if (!gallery) return;

        /* Touch swipe for mobile gallery */
        var startX = 0;
        var currentX = 0;
        var isDragging = false;

        gallery.addEventListener('touchstart', function (e) {
            startX = e.touches[0].clientX;
            isDragging = true;
        }, { passive: true });

        gallery.addEventListener('touchmove', function (e) {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
        }, { passive: true });

        gallery.addEventListener('touchend', function () {
            if (!isDragging) return;
            isDragging = false;

            var diff = startX - currentX;
            if (Math.abs(diff) > 50) {
                var scrollAmount = diff > 0 ? gallery.offsetWidth : -gallery.offsetWidth;
                gallery.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        });
    };

    ProductPage.prototype.initStickyBar = function () {
        var stickyBar = document.querySelector(selectors.stickyBar);
        if (!stickyBar) return;

        var addBtn = this.form.querySelector(selectors.addToCartBtn);
        if (!addBtn) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    stickyBar.classList.remove('is-visible');
                } else {
                    stickyBar.classList.add('is-visible');
                }
            });
        }, { threshold: 0 });

        observer.observe(addBtn);
    };

    /* Initialize */
    if (document.readyState !== 'loading') {
        new ProductPage();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            new ProductPage();
        });
    }

})();

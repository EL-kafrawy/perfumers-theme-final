/* ============================================
   PERFUMERS — Search Overlay JavaScript
   ============================================ */
(function () {
    'use strict';

    var selectors = {
        overlay: '[data-search-overlay]',
        openBtn: '[data-search-open]',
        closeBtn: '[data-search-close]',
        input: '[data-search-input]',
        results: '[data-search-results]',
        resultsList: '[data-search-results-list]',
        loading: '[data-search-loading]'
    };

    /**
     * Render an amount using the shop's own money format string, so search
     * results read identically to prices everywhere else on the site.
     * Shopify's format is a template such as "LE {{amount}}"; the placeholder
     * name picks the separator and decimal convention.
     */
    function formatMoney(value, format) {
        var amount = parseFloat(value);
        if (isNaN(amount)) return '';

        var placeholder = /\{\{\s*(\w+)\s*\}\}/.exec(format || '');
        var style = placeholder ? placeholder[1] : 'amount';

        function group(num, decimals, thousands, decimalMark) {
            var fixed = Math.abs(num).toFixed(decimals);
            var parts = fixed.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
            return (num < 0 ? '-' : '') + parts.join(parts[1] ? decimalMark : '');
        }

        var out;
        switch (style) {
            case 'amount_no_decimals':                out = group(amount, 0, ',', '.'); break;
            case 'amount_with_comma_separator':       out = group(amount, 2, '.', ','); break;
            case 'amount_no_decimals_with_comma_separator': out = group(amount, 0, '.', ','); break;
            case 'amount_with_apostrophe_separator':  out = group(amount, 2, "'", '.'); break;
            default:                                  out = group(amount, 2, ',', '.');
        }

        // No format string configured — fall back to a plain grouped number
        // rather than inventing a currency label.
        if (!placeholder) return out;
        return format.replace(/\{\{\s*\w+\s*\}\}/, out);
    }

    function SearchOverlay() {
        this.overlay = document.querySelector(selectors.overlay);

        if (!this.overlay) return;

        this.input = this.overlay.querySelector(selectors.input);
        this.results = this.overlay.querySelector(selectors.results);
        this.resultsList = this.overlay.querySelector(selectors.resultsList);
        this.loading = this.overlay.querySelector(selectors.loading);
        this.debounceTimer = null;

        this.bindEvents();
    }

    SearchOverlay.prototype.bindEvents = function () {
        var self = this;

        /* Open */
        document.querySelectorAll(selectors.openBtn).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.open();
            });
        });

        /* Close */
        this.overlay.querySelectorAll(selectors.closeBtn).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.close();
            });
        });

        /* Escape key */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && self.isOpen()) {
                self.close();
            }
        });

        /* Search input */
        if (this.input) {
            this.input.addEventListener('input', function () {
                clearTimeout(self.debounceTimer);
                var query = this.value.trim();

                if (query.length < 2) {
                    self.hideResults();
                    return;
                }

                self.debounceTimer = setTimeout(function () {
                    self.performSearch(query);
                }, 300);
            });
        }
    };

    SearchOverlay.prototype.open = function () {
        this.overlay.classList.add('is-active');
        document.body.style.overflow = 'hidden';
        if (this.input) {
            setTimeout(function () {
                this.input.focus();
            }.bind(this), 100);
        }
    };

    SearchOverlay.prototype.close = function () {
        this.overlay.classList.remove('is-active');
        document.body.style.overflow = '';
        if (this.input) {
            this.input.value = '';
        }
        this.hideResults();
    };

    SearchOverlay.prototype.isOpen = function () {
        return this.overlay.classList.contains('is-active');
    };

    SearchOverlay.prototype.performSearch = function (query) {
        var self = this;

        if (this.loading) this.loading.style.display = 'block';

        var searchUrl = '/search/suggest.json?q=' + encodeURIComponent(query) + '&resources[type]=product&resources[limit]=6';

        fetch(searchUrl)
            .then(function (response) { return response.json(); })
            .then(function (data) {
                if (self.loading) self.loading.style.display = 'none';

                var products = data.resources && data.resources.results && data.resources.results.products
                    ? data.resources.results.products
                    : [];

                if (products.length > 0) {
                    self.renderResults(products, query);
                } else {
                    self.renderNoResults(query);
                }
            })
            .catch(function (error) {
                console.error('Search error:', error);
                if (self.loading) self.loading.style.display = 'none';
            });
    };

    SearchOverlay.prototype.renderResults = function (products, query) {
        if (!this.resultsList) return;

        // Captured out here because forEach's callback doesn't share `this`.
        var moneyFormat = this.overlay.getAttribute('data-money-format') || '';

        var html = '';
        products.forEach(function (product) {
            var imageUrl = product.image || '';
            var price = product.price ? formatMoney(product.price, moneyFormat) : '';
            // Predictive search returns `available`; treat only an explicit
            // false as sold out so a missing field never mislabels a product.
            var soldOut = product.available === false;

            html += '<a href="' + product.url + '" class="search-result' + (soldOut ? ' search-result--sold-out' : '') + '">';
            html += '  <div class="search-result__image">';
            if (imageUrl) {
                html += '    <img src="' + imageUrl + '" alt="' + product.title + '" loading="lazy">';
            }
            if (soldOut) {
                html += '    <span class="search-result__sold-out">Sold Out</span>';
            }
            html += '  </div>';
            html += '  <div class="search-result__info">';
            html += '    <p class="search-result__title">' + product.title + '</p>';
            html += '    <p class="search-result__price">' + price + '</p>';
            html += '  </div>';
            html += '</a>';
        });

        html += '<a href="/search?q=' + encodeURIComponent(query) + '" class="search-result__view-all btn btn-secondary btn-small">';
        html += '  View all results';
        html += '</a>';

        this.resultsList.innerHTML = html;
        this.showResults();
    };

    SearchOverlay.prototype.renderNoResults = function (query) {
        if (!this.resultsList) return;

        this.resultsList.innerHTML = '<p class="search-result__none">No results found for "' + query + '"</p>';
        this.showResults();
    };

    SearchOverlay.prototype.showResults = function () {
        if (this.results) this.results.style.display = 'block';
    };

    SearchOverlay.prototype.hideResults = function () {
        if (this.results) this.results.style.display = 'none';
        if (this.resultsList) this.resultsList.innerHTML = '';
    };

    /* Initialize */
    if (document.readyState !== 'loading') {
        new SearchOverlay();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            new SearchOverlay();
        });
    }

})();

/* ============================================
   PERFUMERS — Collection Filter JavaScript
   ============================================ */
(function () {
    'use strict';

    var selectors = {
        filterDrawer: '[data-filter-drawer]',
        filterOverlay: '[data-filter-overlay]',
        filterOpen: '[data-filter-open]',
        filterClose: '[data-filter-close]',
        filterForm: '[data-filter-form]',
        filterCheckbox: '[data-filter-checkbox]',
        filterClear: '[data-filter-clear]',
        filterApply: '[data-filter-apply]',
        filterCount: '[data-filter-count]',
        sortSelect: '[data-sort-select]',
        collectionGrid: '[data-collection-grid]',
        loadMoreBtn: '[data-load-more]',
        activeFilters: '[data-active-filters]',
        filterGroup: '[data-filter-group]',
        filterGroupToggle: '[data-filter-group-toggle]'
    };

    function CollectionFilter() {
        this.filterDrawer = document.querySelector(selectors.filterDrawer);
        this.filterOverlay = document.querySelector(selectors.filterOverlay);
        this.collectionGrid = document.querySelector(selectors.collectionGrid);

        this.bindEvents();
    }

    CollectionFilter.prototype.bindEvents = function () {
        var self = this;

        /* Open filter drawer */
        document.querySelectorAll(selectors.filterOpen).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.openDrawer();
            });
        });

        /* Close filter drawer */
        document.querySelectorAll(selectors.filterClose).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.closeDrawer();
            });
        });

        /* Overlay click */
        if (this.filterOverlay) {
            this.filterOverlay.addEventListener('click', function () {
                self.closeDrawer();
            });
        }

        /* Sort select */
        var sortSelect = document.querySelector(selectors.sortSelect);
        if (sortSelect) {
            sortSelect.addEventListener('change', function () {
                self.applySort(this.value);
            });
        }

        /* Filter group toggles */
        document.querySelectorAll(selectors.filterGroupToggle).forEach(function (toggle) {
            toggle.addEventListener('click', function (e) {
                e.preventDefault();
                var group = this.closest(selectors.filterGroup);
                if (group) {
                    group.classList.toggle('is-collapsed');
                }
            });
        });

        /* Filter checkboxes */
        document.querySelectorAll(selectors.filterCheckbox).forEach(function (checkbox) {
            checkbox.addEventListener('change', function () {
                self.updateFilterCount();
            });
        });

        /* Apply filters */
        document.querySelectorAll(selectors.filterApply).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.applyFilters();
            });
        });

        /* Clear all filters */
        document.querySelectorAll(selectors.filterClear).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.clearFilters();
            });
        });

        /* Load more */
        var loadMoreBtn = document.querySelector(selectors.loadMoreBtn);
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', function (e) {
                e.preventDefault();
                self.loadMore(this);
            });
        }

        /* Escape key */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && self.isDrawerOpen()) {
                self.closeDrawer();
            }
        });
    };

    CollectionFilter.prototype.openDrawer = function () {
        if (this.filterDrawer) {
            this.filterDrawer.classList.add('is-open');
        }
        if (this.filterOverlay) {
            this.filterOverlay.classList.add('is-active');
        }
        document.body.style.overflow = 'hidden';
    };

    CollectionFilter.prototype.closeDrawer = function () {
        if (this.filterDrawer) {
            this.filterDrawer.classList.remove('is-open');
        }
        if (this.filterOverlay) {
            this.filterOverlay.classList.remove('is-active');
        }
        document.body.style.overflow = '';
    };

    CollectionFilter.prototype.isDrawerOpen = function () {
        return this.filterDrawer && this.filterDrawer.classList.contains('is-open');
    };

    CollectionFilter.prototype.updateFilterCount = function () {
        var checked = document.querySelectorAll(selectors.filterCheckbox + ':checked');
        var countEls = document.querySelectorAll(selectors.filterCount);
        countEls.forEach(function (el) {
            el.textContent = checked.length;
            el.style.display = checked.length > 0 ? '' : 'none';
        });
    };

    CollectionFilter.prototype.applyFilters = function () {
        var form = document.querySelector(selectors.filterForm);
        if (!form) return;

        var params = new URLSearchParams(window.location.search);

        /* Remove existing filter params */
        var keysToDelete = [];
        params.forEach(function (value, key) {
            if (key.startsWith('filter.')) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(function (key) { params.delete(key); });

        /* Add checked filter values */
        form.querySelectorAll(selectors.filterCheckbox + ':checked').forEach(function (checkbox) {
            params.append(checkbox.name, checkbox.value);
        });

        /* Navigate */
        var newUrl = window.location.pathname + '?' + params.toString();
        window.location.href = newUrl;
    };

    CollectionFilter.prototype.clearFilters = function () {
        /* Uncheck all */
        document.querySelectorAll(selectors.filterCheckbox + ':checked').forEach(function (checkbox) {
            checkbox.checked = false;
        });
        this.updateFilterCount();

        /* Remove filter params from URL */
        var params = new URLSearchParams(window.location.search);
        var keysToDelete = [];
        params.forEach(function (value, key) {
            if (key.startsWith('filter.')) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(function (key) { params.delete(key); });

        var newUrl = window.location.pathname;
        if (params.toString()) {
            newUrl += '?' + params.toString();
        }
        window.location.href = newUrl;
    };

    CollectionFilter.prototype.applySort = function (sortValue) {
        var params = new URLSearchParams(window.location.search);
        params.set('sort_by', sortValue);
        var newUrl = window.location.pathname + '?' + params.toString();
        window.location.href = newUrl;
    };

    CollectionFilter.prototype.loadMore = function (button) {
        var nextUrl = button.dataset.nextUrl;
        if (!nextUrl) return;

        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span>';

        var self = this;

        fetch(nextUrl)
            .then(function (response) { return response.text(); })
            .then(function (html) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(html, 'text/html');

                /* Append new products */
                var newProducts = doc.querySelectorAll('[data-collection-grid] .product-card-wrapper');
                if (self.collectionGrid && newProducts.length > 0) {
                    newProducts.forEach(function (product) {
                        self.collectionGrid.appendChild(product.cloneNode(true));
                    });
                }

                /* Update load more button */
                var newLoadMore = doc.querySelector(selectors.loadMoreBtn);
                if (newLoadMore) {
                    button.dataset.nextUrl = newLoadMore.dataset.nextUrl;
                    button.disabled = false;
                    button.textContent = button.dataset.text || 'Load More';
                } else {
                    button.remove();
                }
            })
            .catch(function (error) {
                console.error('Load more error:', error);
                button.disabled = false;
                button.textContent = button.dataset.text || 'Load More';
            });
    };

    /* Initialize */
    if (document.readyState !== 'loading') {
        new CollectionFilter();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            new CollectionFilter();
        });
    }

})();

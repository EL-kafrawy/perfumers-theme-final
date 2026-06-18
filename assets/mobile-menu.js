/* ============================================
   PERFUMERS — Mobile Menu JavaScript
   ============================================ */
(function () {
    'use strict';

    var selectors = {
        menu: '[data-mobile-menu]',
        overlay: '[data-mobile-menu-overlay]',
        openBtn: '[data-mobile-menu-open], [data-drawer-open="mobile-menu"]',
        closeBtn: '[data-mobile-menu-close]',
        submenuTrigger: '[data-submenu-trigger]',
        submenuBack: '[data-submenu-back]',
        submenuPanel: '[data-submenu-panel]'
    };

    function MobileMenu() {
        this.menu = document.querySelector(selectors.menu);
        this.overlay = document.querySelector(selectors.overlay);

        if (!this.menu) return;

        this.bindEvents();
    }

    MobileMenu.prototype.bindEvents = function () {
        var self = this;

        /* Open */
        document.querySelectorAll(selectors.openBtn).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.open();
            });
        });

        /* Close */
        document.querySelectorAll(selectors.closeBtn).forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                self.close();
            });
        });

        /* Overlay close */
        if (this.overlay) {
            this.overlay.addEventListener('click', function () {
                self.close();
            });
        }

        /* Escape key */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && self.isOpen()) {
                self.close();
            }
        });

        /* Submenu navigation */
        this.menu.querySelectorAll(selectors.submenuTrigger).forEach(function (trigger) {
            trigger.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation(); // Prevent click from bubbling to any parent listeners
                var targetId = this.getAttribute('data-submenu-trigger');
                var panel = self.menu.querySelector('[data-submenu-panel="' + targetId + '"]');
                if (panel) {
                    self.openSubmenu(panel);
                }
            });
        });

        this.menu.querySelectorAll(selectors.submenuBack).forEach(function (backBtn) {
            backBtn.addEventListener('click', function (e) {
                e.preventDefault();
                var panel = this.closest(selectors.submenuPanel);
                if (panel) {
                    self.closeSubmenu(panel);
                }
            });
        });
    };

    MobileMenu.prototype.open = function () {
        this.menu.classList.add('is-open');
        if (this.overlay) this.overlay.classList.add('is-active');
        document.body.style.overflow = 'hidden';
        if (window.PERFUMERS && window.PERFUMERS.trapFocus) {
            window.PERFUMERS.trapFocus(this.menu);
        }
    };

    MobileMenu.prototype.close = function () {
        this.menu.classList.remove('is-open');
        if (this.overlay) this.overlay.classList.remove('is-active');
        document.body.style.overflow = '';

        /* Reset all submenus */
        this.menu.querySelectorAll(selectors.submenuPanel).forEach(function (panel) {
            panel.classList.remove('is-active');
        });
    };

    MobileMenu.prototype.isOpen = function () {
        return this.menu.classList.contains('is-open');
    };

    MobileMenu.prototype.openSubmenu = function (panel) {
        panel.classList.add('is-active');
    };

    MobileMenu.prototype.closeSubmenu = function (panel) {
        panel.classList.remove('is-active');
    };

    /* Initialize */
    if (document.readyState !== 'loading') {
        new MobileMenu();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            new MobileMenu();
        });
    }

})();

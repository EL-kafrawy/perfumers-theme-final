# PERFUMERS — 2-Day Production Fix Plan

> Condensed, execution-ready plan. **Critical issues first.**
> Day 1 = make the store *navigable and buyable* (redirection + cart).
> Day 2 = completeness, content, hardening, QA, launch.
> UI source of truth = the **Google Stitch screens** (no redesign — match them).

---

## Conventions
- Work on an **unpublished development theme** via `shopify theme dev`. Nothing touches Live until Day 2 launch step.
- Commit after every fixed issue. Run `shopify theme check` before each commit.
- Test in a **real browser** after each block (mobile 375px + desktop 1280px), EN and AR.
- "DoD" = Definition of Done / acceptance criteria for the issue.

---

# DAY 1 — Navigation & Buy Flow (CRITICAL)

> Theme of the day: **every button goes to the right place, and the cart works.**
> Root cause of "buttons don't redirect": placeholder `href="#"`, empty `href=""` URL
> settings, a JS handler that swallows `#` links, and `/account` links that 404.

## Block 1.0 — Safety net (30 min)
- [ ] Init git on the **root** theme, commit current state, push to remote (root currently has 0 commits).
- [ ] In Shopify admin, **duplicate the live theme** → "Backup pre-fix" (instant rollback later).
- [ ] Start `shopify theme dev` against an unpublished dev theme.
- **DoD:** root pushed; backup theme exists; dev theme serving locally.

## Block 1.1 — ISSUE: Broken redirection / dead buttons (CRITICAL, ~3 hrs)
Fix the navigation systemically, not link-by-link.

**1.1a — Stop the JS from killing links**
- [ ] `assets/theme.js` → `initSmoothScroll`: only intercept anchors that point to a **real in-page target** (`href` starts with `#` AND `length > 1` AND the element exists). Leave everything else to the browser. Never `preventDefault` on `href="#"`.
- **DoD:** no link is dead because of JS; in-page anchors still smooth-scroll.

**1.1b — Replace placeholder/empty hrefs in sections**
Audit and fix every link that renders `#` or empty:
- [ ] `sections/hero-banner.liquid:16` — `button_link` has no default → guard: if blank, fall back to `/collections/all` (so it never renders `href=""`).
- [ ] `sections/footer.liquid:18-31` — `link_archive / authentication / story / shipping / returns / care / contact` all default to `#`. Point to real routes (`/collections/all`, `/pages/...`, `/policies/...`, `/pages/contact`).
- [ ] `sections/mobile-menu.liquid:30` — hardcoded `href="#"` nav links → bind to the linklist / real collection URLs.
- [ ] `sections/mobile-nav.liquid` — `wishlist_link` defaults to `#`; `profile_link` defaults to `/account`. Set wishlist to a real page or hide it; fix profile per the accounts decision (see 1.1d).
- [ ] `sections/shop-by-gender.liquid` & `sections/shop-by-occasion.liquid` — `target_url` falls back to `#`. Ensure each block links to its real collection (`/collections/men|women|unisex`).
- **Pattern to apply everywhere:** never output a raw empty/`#` href — guard with `{% if link != blank and link != '#' %}` and fall back to a real route, or render a non-link element.
- **DoD:** grep for `"#"` / `href=""` in `sections/` returns only legitimate in-page anchors.

**1.1c — Fix placeholder URLs in theme content (`templates/index.json`)**
- [ ] Hero `button_link: "#"` → real collection.
- [ ] Brand-marquee 14 logo blocks `link: "#"` → real brand collection URLs (or `/collections/all`).
- [ ] These are editable in **Theme Editor**, but set sane defaults in the JSON so the store is never broken out of the box.
- **DoD:** clicking any homepage CTA, brand logo, or gender tile lands on a real page.

**1.1d — `/account` links (accounts decision)**
- [ ] **If accounts stay OFF (recommended for v1):** remove/hide Profile in `mobile-nav.liquid` and any `/account` links so they don't 404.
- [ ] **If accounts ON:** keep links (account templates get built Day 2, Block 2.1).
- **DoD:** no link points to a route that 404s.

**1.1e — Product & collection card routing (verify)**
- [ ] Confirm `snippets/product-card.liquid` uses `product.url` (it does) and that every product/collection card on home, PLP, search, related, upsell resolves to a real Shopify URL.
- **DoD:** click-through from every card opens the correct PDP/collection.

## Block 1.2 — ISSUE: Cart not working correctly (CRITICAL, ~2.5 hrs)
- [ ] **Cart badge stuck at 0** — `sections/header.liquid:180` hardcodes `0`. Render `{{ cart.item_count }}` server-side, hide when 0, and call `updateCartCount()` on init in `assets/cart-drawer.js`.
- [ ] **Add-to-cart swallows errors** — `assets/cart-drawer.js` `PERFUMERS.addToCart`: check `response.ok`; on Shopify error JSON show a message and do **not** show a false "Added".
- [ ] **Buy Now** — `assets/product-page.js`: single code path, check `.ok` before redirecting to `/checkout`; stop the form-submit + click double-bind.
- [ ] **Editable cart qty** — wire a `change` listener on `[data-cart-qty]` (currently only +/− work).
- **DoD:** reload with items → badge correct; sold-out add → visible error, no false success; Buy Now → checkout only on success; typing a qty updates the line.

## Block 1.3 — Day 1 QA gate (~1 hr)
- [ ] In a real browser, click **every** nav element: header (menu/search/cart), mobile bottom nav, hero CTA, brand logos, gender tiles, footer links, product cards, PDP breadcrumb.
- [ ] Run the buy flow: PDP → variant → ATC (drawer opens, badge updates) → qty edit → checkout; and Buy Now.
- [ ] Repeat key paths in **Arabic** (RTL) — confirm links still resolve.
- [ ] `shopify theme check` clean; commit + tag `day1-nav-cart`.
- **DoD (Day 1 exit):** zero dead/`#`/empty links; zero 404s from internal links; cart badge + ATC + Buy Now correct in EN and AR.

---

# DAY 2 — Completeness, Content, Hardening, Launch

> Theme of the day: **no 404 routes, no mock data, hardened, tested, shipped.**

## Block 2.1 — ISSUE: Missing Shopify templates / 404 routes (~2 hrs)
- [ ] `templates/gift_card.liquid` — create (Shopify-required), brand-styled.
- [ ] `templates/list-collections.json` — the `/collections` index page + section.
- [ ] `templates/404.json` — confirm it renders header/footer + a "back to shop" CTA.
- [ ] Policy/pages — verify Shipping/Returns/Privacy/Terms exist; footer links (fixed Day 1) resolve to `/policies/*` and `/pages/*`.
- [ ] **Customer accounts** — *if ON:* add `templates/customers/{login,register,account,order,addresses,reset_password,activate_account}.liquid`. *If OFF:* disable accounts in Admin → Checkout, ensure no `/account` links remain (done Day 1).
- [ ] Blog — add `templates/blog.json` + `article.json` **only if a blog is planned**, else skip.
- **DoD:** crawl `/`, `/collections`, `/collections/<h>`, `/products/<h>`, `/cart`, `/search`, `/pages/*`, `/policies/*`, `/gift_cards/...`, `/404` (+ account routes if ON) → all render, no Liquid errors.

## Block 2.2 — ISSUE: Mock/demo content in production (~2 hrs)
- [ ] `templates/index.json` "Treasured Finds" — replace the 4 hardcoded fake `$`-priced product blocks with a **real collection** binding.
- [ ] Brand-marquee — swap Google-CDN placeholder logos for the real `assets/brand-logo-*.png` already in the repo.
- [ ] Confirm ≥4 real products exist and the `all` (or chosen) collection is populated, else homepage shows empty.
- [ ] Document the product data model the theme reads: `vendor` (brand), gender tag (`men/women/unisex`), `custom.short_description`, fragrance notes (top/heart/base).
- **DoD:** no placeholder images, fake prices, or Lorem content anywhere; homepage shows real products.

## Block 2.3 — ISSUE: Stitch pixel parity (~1.5 hrs)
- [ ] Diff each rendered screen against its Stitch screen and fix spacing/type/color drift:
  - Home · PDP (mobile) · Cart drawer · Collection/PLP · Search overlay · Header/Mobile menu · Footer.
- **DoD:** side-by-side at 375px & 1280px within ~2px; exact brand colors/fonts.

## Block 2.4 — ISSUE: Frontend hardening (~1 hr)
- [ ] Escape cart DOM — rebuild `renderCart` in `assets/cart-drawer.js` with `textContent`/`createElement` instead of `innerHTML` string concat.
- [ ] Fix focus-trap listener leak in `assets/theme.js` (`trapFocus` re-binds every open; remove on close).
- [ ] Pagination — `sections/collection-grid.liquid`: move pagination nav out of the CSS-grid flow; keep **either** Load-More **or** numbered pagination, not both.
- **DoD:** no console errors; no accumulating listeners (DevTools); pagination renders correctly.

## Block 2.5 — ISSUE: i18n leakage (~1 hr) *(if bilingual)*
- [ ] Route hardcoded English through `{{ '...' | t }}`: footer headings/links, product-info trust badges, copyright, contact labels.
- [ ] Fill matching keys in `locales/ar.json`; verify against `locales/en.default.json`.
- [ ] RTL spot-check every section in Arabic.
- **DoD:** zero English leakage in Arabic UI chrome; layout mirrors correctly.

## Block 2.6 — Final QA + Launch (~1.5 hrs)
- [ ] **Device/browser matrix:** iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari/Edge.
- [ ] **Functional script (EN + AR):** home → collection (filter/sort/gender/load-more) → PDP (variant/qty/ATC/sticky bar) → cart drawer (qty/remove/totals) → Buy Now → search → contact form (success+error) → 404/gift card/policies → empty states.
- [ ] Lighthouse mobile ≥ 90 perf / ≥ 95 a11y.
- [ ] SEO basics: Product JSON-LD on PDP, OG/share image, favicon.
- [ ] `shopify theme check` clean; commit + tag `v1.0.0`.
- [ ] Stakeholder preview → **publish** in low-traffic window → end-to-end test order → monitor 24–48h.
- [ ] **Rollback:** if a P0 appears, re-publish the Day-1 backup theme (1 click); fix forward on dev.
- **DoD (Launch):** all routes render; buy flow works EN+AR; zero mock data; Stitch parity signed off; Lighthouse targets met; tagged + published with tested rollback.

---

## Decisions to confirm before starting
| Decision | Default assumed in this plan |
|---|---|
| Arabic support | **Full bilingual** (Block 2.5 active) |
| Customer accounts | **OFF for v1** (skip account templates; remove `/account` links Day 1) |
| Blog | **Skipped** unless requested |
| Stitch screens | Provide link/export before Block 2.3 for parity |

## Day-end tags
- End of Day 1 → `day1-nav-cart`
- End of Day 2 → `v1.0.0`

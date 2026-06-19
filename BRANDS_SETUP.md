# Dynamic Brands — Setup Guide

The homepage **Brand Logo Slider** (`brand-marquee`) and the **Shop by Brand**
section (`shop-by-brand`) are now **data-driven**. Create a brand once in Shopify
and its logo appears in both sections automatically, linking to its brand page.

No theme edits are needed to add/remove a brand after the one-time setup below.

---

## One-time setup — create two Collection metafields

Shopify admin → **Settings → Custom data → Collections → Add definition**:

| Definition | Namespace & key | Type |
|---|---|---|
| Is brand | `custom.is_brand` | **True / false** (boolean) |
| Brand logo | `custom.brand_logo` | **File** → *image* (or leave unused, see below) |

> The theme reads `custom.is_brand` to decide which collections are brands, and
> `custom.brand_logo` for the logo. If `brand_logo` is empty, it uses the
> **collection's image** instead — so you can skip the logo metafield entirely
> and just set the collection image.

---

## Adding a brand (repeat per brand)

1. **Create a collection** for the brand (e.g. "Rasasi").
   - Tip: make it an **automated** collection with the condition
     *Product vendor is equal to Rasasi* so its products fill in automatically.
2. Set the collection **Image** to the brand logo
   *(or* set the `custom.brand_logo` metafield to a dedicated logo image).
3. Tick the **`custom.is_brand`** metafield = **true**.
4. Save.

Result, with zero theme changes:
- The logo appears in the **homepage brand slider** and the **Shop by Brand** section.
- Clicking it opens the brand page at `/collections/<handle>`
  (styled by `templates/collection.brand.json`).

Removing a brand = untick `is_brand` (or delete the collection).

---

## Behaviour notes

- **Order:** brands follow Shopify's collection list order (alphabetical by title
  by default). Ask if you want a custom order metafield.
- **Fallback:** if **no** collections are flagged `is_brand`, both sections fall
  back to the manually-added logo blocks (so the theme never looks empty in the
  editor before setup).
- **Logo priority per brand:** `custom.brand_logo` image → else collection image →
  else the brand name as text.
- **Hot sellers / New arrivals / Treasured Finds are unaffected** — those show
  *products* by rule, not brand logos. A brand's products flow into them
  automatically based on sales / date / collection membership.

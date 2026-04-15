# Supplier Database — B2B Marketplace

A high-performance, single-page supplier marketplace built on Firebase Firestore. Browse 30,000+ SKUs, compare multi-supplier pricing, build quote carts, and manage API integrations.

---

## ✅ Completed Features

### Core Platform
- **Firebase Firestore** backend with multi-collection architecture
- **SPA Hash-based routing** (`#home`, `#catalog`, `#product/:sku`, etc.)
- **Dark / Light mode** with persistent theme (localStorage)
- **Mobile-responsive** with bottom navigation bar

### Catalog & Discovery
- Browse / search / filter by UPC, Name, Brand, SKU (Firestore queries)
- **Brand & Category sidebar filters** — built from current page docs
- **Active filter chips strip** above results — click × to remove individual filters
- In-stock toggle, price range, 6 sort options (price, name, suppliers)
- **3 view modes**: grid, compact, list
- **Bulk UPC search** (up to 500 UPCs at once)
- **CSV export** of filtered results
- **Persistent URL state** — filters/search/page saved in hash so Back button restores view

### Performance Optimizations
- **Page-result cache** (Map keyed by constraints + page) — instant back-navigation
- **Two-pass lazy rendering** — first 20 cards immediately, remaining cards after paint
- **300ms debounced search** in both catalog search bar and header search
- No full-DB sweeps — only the current 100-doc page is fetched per request
- **Load More** button alongside Prev/Next pagination

### Cart & Quote
- **Slide-in Cart Drawer** — opens from header cart button, shows all quote items inline
- Live quantity display on "Add to Quote" buttons (`✓ In Quote (×3)`)
- Full Quote Cart page with quantity controls, notes, CSV export
- Quote submission to Firestore `quotes` collection (status tracking)
- Pre-filled contact & company info from saved profile

### Account & Profile
- Polished account dropdown with avatar, company badge, quick navigation
- Profile & Company form saved to Firestore `userProfiles`
- Secure password change with reauthentication
- **Remembers last account section** via localStorage
- **Last login date/time** shown on Profile page (from Firebase `metadata.lastSignInTime`)
- API Key generation, view, copy, revoke with 24h usage quota bar
- Settings: theme toggle, clear favorites, clear cart

### Admin
- Admin panel access gated by `adminUsers` Firestore collection
- CSV/Excel import with drag-and-drop preview and batch write
- Grant/revoke admin access by UID; manage invited users

### UX / UI
- **Smart empty states** — context-aware message (filter hint / search tip / browse CTA)
- **Dark mode image backgrounds** — `--card-img-bg` CSS variable (no more `mix-blend-mode:multiply` artifacts)
- Auth page: two-panel split layout (brand left + login right)
- Skeleton loading placeholders on all async views

---

## 🚀 Entry Points / Routes

| Route | Description |
|-------|-------------|
| `#home` | Landing page — hero, categories, top brands, featured products |
| `#catalog` | Full product catalog with sidebar filters |
| `#catalog?q=TERM&qt=upc` | Catalog with pre-applied search |
| `#catalog?brands=X&cats=Y&instock=1` | Catalog with pre-applied filters |
| `#catalog/brand:BRANDNAME` | Filter catalog by brand |
| `#catalog/category:CATNAME` | Filter catalog by category |
| `#product/SKU` | Product detail page — supplier matrix |
| `#favorites` | Saved products (localStorage) |
| `#cart` | Quote Cart page |
| `#account` | Account profile & settings |
| `#account/apikeys` | API key management |
| `#account/settings` | App settings |
| `#admin` | Admin panel (admin-only) |
| `#nexus` | Link to Inventory Nexus tool |

---

## 🗃️ Data Model

### Firestore Collections
| Collection | Purpose |
|------------|---------|
| `products` | Core product catalog (SKU, UPC, brand, category, suppliers[]) |
| `userProfiles` | Company profiles (name, contact, address, etc.) |
| `adminUsers` | UIDs with admin access |
| `invitedUsers` | Whitelisted emails for signup |
| `apiKeys` | User API keys |
| `apiLogs` | API request logs (for usage quota) |
| `quotes` | Submitted quote cart records |

### Product Document Shape
```json
{
  "sku": "string",
  "upc": "string",
  "itemName": "string",
  "itemName_lowercase": "string",
  "brand": "string",
  "category": "string",
  "size": "string",
  "msrp": "number",
  "imageUrl": "string",
  "suppliers": [
    { "name": "string", "price": "number", "inventory": "number" }
  ]
}
```

---

## 📁 File Structure

```
index.html              — App shell, auth layout, cart drawer, lightbox
css/
  variables.css         — Design tokens (dark/light palette, brand colors)
  base.css              — Reset, layout, typography, toasts, skeleton
  components.css        — Buttons, cards, modals, filter chips, cart drawer
js/
  firebase.js           — Firebase init + Collections helper
  utils.js              — Helpers: toast, format, getLowestPrice, Icons
  store.js              — State: favorites, cart, excluded suppliers, theme, cache
  router.js             — Hash-based SPA router
  auth.js               — Login / Signup / Forgot password UI
  main.js               — Boot, header, router setup, cart drawer logic
  pages/
    home.js             — Homepage: hero, categories, top brands, featured
    catalog.js          — Full catalog: filter, search, paginate, export
    product.js          — Product detail + supplier matrix
    cart.js             — Quote cart: edit, submit, export
    favorites.js        — Saved products
    account.js          — Profile, password, API keys, settings
    brand-category.js   — Brand/category landing pages
    admin.js            — Admin panel: CSV import, user management
```

---

## 🌐 Deployment

- **Hosting**: Cloudflare Pages (upload project files → custom domain via Cloudflare DNS)
- **Firebase auth**: Add custom domain to Firebase Console → Authentication → Authorized Domains
- **No build step** — all files are plain HTML/CSS/JS

### External API
- **Base URL**: `https://supplier-api-977359606390.us-central1.run.app`
- **Auth**: `Authorization: Bearer YOUR_API_KEY`
- **Rate limit**: 300 requests / 24 hours

---

## 🔜 Recommended Next Steps

1. **Firestore security rules** — lock down collections so only authenticated users can read/write
2. **Product detail page** — complete the supplier matrix and quote add-from-detail
3. **Quote submission UX** — confirmation email or status page after submission
4. **Catalog URL share** — copy shareable link with current filter state
5. **Admin analytics** — quote volume, top-searched SKUs dashboard

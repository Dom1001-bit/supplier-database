/* ============================================================
   js/pages/home.js — Homepage: hero, stats, categories, brands
   ============================================================ */

const HomePage = (() => {

  async function render() {
    const view = document.getElementById('page-view');
    view.innerHTML = `
      <!-- Hero -->
      <div class="hero-section">
        <div class="hero-eyebrow">
          <svg style="width:.875rem;height:.875rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Supplier Database
        </div>
        <h1 class="hero-title">Your Complete<br>Product Catalog</h1>
        <p class="hero-subtitle">Browse thousands of products across all suppliers. Compare prices, check stock, and build quotes instantly.</p>
        <div style="display:flex;justify-content:center;gap:.75rem;flex-wrap:wrap;margin-bottom:2rem">
          <button onclick="Router.navigate('catalog')" class="btn btn-primary btn-lg">
            <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            Browse Catalog
          </button>
          <button onclick="document.getElementById('home-search-input').focus()" class="btn btn-secondary btn-lg">
            <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            Search Products
          </button>
        </div>
        <!-- Hero search -->
        <div style="max-width:520px;margin:0 auto;position:relative">
          <div style="position:absolute;left:.875rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text-secondary)">
            <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <input type="text" id="home-search-input" placeholder="Search by UPC, name, brand, or SKU…"
            style="padding-left:2.5rem;height:2.75rem;border-radius:2rem;font-size:.9375rem;box-shadow:var(--shadow-md)">
        </div>

      </div>

      <div class="page-container">
        <!-- Categories -->
        <div style="margin-bottom:2.5rem">
          <div class="section-header">
            <span class="section-title">Browse by Category</span>
            <button onclick="Router.navigate('catalog')" class="btn btn-ghost btn-sm">View All →</button>
          </div>
          <div id="home-categories" class="category-chips" style="margin-bottom:.5rem">
            ${[1,2,3,4,5,6].map(() => '<div class="skeleton" style="height:2.25rem;width:100px;border-radius:2rem"></div>').join('')}
          </div>
        </div>

        <!-- Top Brands -->
        <div style="margin-bottom:2.5rem">
          <div class="section-header">
            <span class="section-title">Top Brands</span>
            <button onclick="Router.navigate('catalog')" class="btn btn-ghost btn-sm">Browse All →</button>
          </div>
          <div id="home-brands">
            ${[1,2,3,4,5,6].map(() => '<div class="skeleton" style="height:2.25rem;border-radius:var(--radius-md);margin-bottom:.375rem"></div>').join('')}
          </div>
        </div>

        <!-- Featured Products -->
        <div>
          <div class="section-header">
            <span class="section-title">Featured Products</span>
            <button onclick="Router.navigate('catalog')" class="btn btn-ghost btn-sm">See More →</button>
          </div>
          <div id="home-featured" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem">
            ${Utils.skeletonCards(6)}
          </div>
        </div>
      </div>
    `;

    // Hero search binding
    document.getElementById('home-search-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const term = e.target.value.trim();
        if (term) Router.navigate(`catalog`);
      }
    });

    _loadData();
  }

  // Safe string helper (mirrors catalog.js)
  function _safeStr(val, fallback) {
    if (val === null || val === undefined || val === '') return fallback;
    if (Array.isArray(val)) return fallback;
    return String(val).trim() || fallback;
  }

  async function _loadData() {
    try {
      // Load a sample of products for stats + featured (fast, no full-DB sweep)
      const snap = await Collections.products.orderBy('sku').limit(100).get();
      const docs = snap.docs.map(d => d.data());

      // Categories
      const catMap = new Map();
      docs.forEach(d => {
        const c = _safeStr(d.category, 'Uncategorized');
        catMap.set(c, (catMap.get(c) || 0) + 1);
      });
      _renderCategories(catMap);

      // Brands
      const brandMap = new Map();
      docs.forEach(d => {
        const b = _safeStr(d.brand, 'Unknown');
        brandMap.set(b, (brandMap.get(b) || 0) + 1);
      });
      _renderBrands(brandMap);

      // Featured = in-stock items with lowest price
      const excS = Store.getExcludedSuppliers();
      const featured = docs.filter(d => Utils.isInStock(d))
        .map(d => ({ ...d, _lp: Utils.getLowestPrice(d, excS) }))
        .sort((a, b) => (a._lp === -1 ? 999 : a._lp) - (b._lp === -1 ? 999 : b._lp))
        .slice(0, 12);
      _renderFeatured(featured);

    } catch (err) {
      console.error('HomePage load error', err);
    }
  }

  function _renderCategories(catMap) {
    const el = document.getElementById('home-categories');
    if (!el) return;
    const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    el.innerHTML = sorted.map(([cat, count]) =>
      `<button class="category-chip" onclick="Router.navigate('catalog/category:${encodeURIComponent(cat)}')">
        ${_esc(cat)}
        <span class="category-chip-count">${count}</span>
      </button>`
    ).join('');
  }

  function _renderBrands(brandMap) {
    const el = document.getElementById('home-brands');
    if (!el) return;
    const top = [...brandMap.entries()]
      .filter(([b]) => b !== 'Unknown')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    if (!top.length) { el.innerHTML = '<p style="color:var(--text-secondary);font-size:.875rem">No brands found.</p>'; return; }

    // Render as a clean list — no counts (counts require full DB read)
    el.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.375rem';
    el.innerHTML = top.map(([brand], idx) =>
      `<button class="brand-list-row" onclick="Router.navigate('catalog/brand:${encodeURIComponent(brand)}')" style="
          display:flex;align-items:center;justify-content:space-between;
          background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-md);
          padding:.5rem .75rem;cursor:pointer;transition:background .15s,border-color .15s;
          text-align:left;width:100%;font-family:inherit;
        "
        onmouseover="this.style.background='var(--surface-3)';this.style.borderColor='var(--accent)'"
        onmouseout="this.style.background='var(--surface-2)';this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;gap:.625rem;min-width:0">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--accent);color:#fff;font-size:.6rem;font-weight:700;flex-shrink:0">${idx + 1}</span>
          <span style="font-size:.8125rem;font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${_esc(brand)}">${_esc(brand)}</span>
        </div>
      </button>`
    ).join('');
  }

  function _renderFeatured(docs) {
    const el = document.getElementById('home-featured');
    if (!el) return;
    if (!docs.length) { el.innerHTML = '<p style="color:var(--text-secondary);font-size:.875rem">No featured products yet.</p>'; return; }
    const excS = Store.getExcludedSuppliers();
    el.innerHTML = docs.map((item, i) => {
      const lp = item._lp;
      const imgUrl = Utils.getImgUrl(item);
      const inCart = Store.isInCart(item.sku);
      return `<div class="card card-hover product-card" onclick="Router.navigate('product/${_esc(item.sku)}')" style="animation-delay:${i*15}ms">
        <div class="card-img-wrap" style="height:140px">
          <img src="${imgUrl}" alt="${_esc(item.itemName)}" loading="lazy" onerror="this.src='${Utils.PLACEHOLDER_IMG}'">
          <div class="card-price-badge">${lp !== -1 ? '$'+lp.toFixed(2) : 'N/A'}</div>
          <div class="card-in-stock-dot"></div>
        </div>
        <div class="card-body">
          <div class="card-name">${_esc(item.itemName)}</div>
          <span class="card-brand-chip" style="margin-bottom:.625rem">${_esc(item.brand || 'No Brand')}</span>
          <button class="btn btn-secondary btn-sm w-full" style="margin-top:auto;font-size:.6875rem" onclick="event.stopPropagation();_homeAddToCart('${_esc(item.sku)}', this)">
            ${inCart ? '✓ In Quote' : '+ Add to Quote'}
          </button>
        </div>
      </div>`;
    }).join('');

    // Store items for cart reference
    window._homeItems = docs;
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render };
})();

// Global helper for home page add to cart
function _homeAddToCart(sku, btn) {
  const item = (window._homeItems || []).find(d => d.sku === sku);
  if (!item) return;
  const added = Store.addToCart({ ...item, lowestPrice: item._lp });
  if (added) {
    btn.textContent = '✓ In Quote';
    Utils.toast('Added to Quote Cart', 'success');
  } else {
    Utils.toast('Already in your quote', 'info');
  }
}

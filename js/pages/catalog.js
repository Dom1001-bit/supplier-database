/* ============================================================
   js/pages/catalog.js — Product catalog / browse page
   ============================================================ */

const CatalogPage = (() => {
  const ITEMS_PER_PAGE = 100;

  let _allDocs = [];           // all docs fetched for current query
  let _filteredDocs = [];      // client-side filtered
  let _lastVisible = null;
  let _firstVisible = null;
  let _currentPage = 1;
  let _queryConstraints = [];
  let _searchType = 'browse';
  let _view = 'grid';          // grid | compact | list
  let _sortBy = 'default';
  let _filterBrands = new Set();   // empty = show all
  let _filterCategories = new Set(); // empty = show all
  let _inStockOnly = false;
  let _priceMin = '';
  let _priceMax = '';
  let _allBrands = new Set();    // brands seen on current page
  let _allCategories = new Set(); // categories seen on current page
  let _bulkUpcs = [];
  const _pageCache = new Map();   // #1 page result cache
  let _urlStateDirty = false;       // #4 URL state flag

  // Global brand/category index — populated once per session
  // These hold ALL brands/categories across the entire database.
  let _globalBrands = new Set();
  let _globalCategories = new Set();
  let _globalIndexLoaded = false;
  let _globalIndexLoading = false;

  // ── Render page ───────────────────────────────────────────────
  function render(param) {
    const view = document.getElementById('page-view');
    view.innerHTML = `
      <div class="page-container">
        <div class="catalog-layout" id="catalog-main">
          <!-- Sidebar -->
          <aside class="catalog-sidebar" id="catalog-sidebar">
            <div class="filter-section">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
                <span style="font-size:.8125rem;font-weight:700">Filters</span>
                <button id="clear-all-filters-btn" class="btn btn-ghost btn-sm" style="font-size:.6875rem">Clear All</button>
              </div>

              <!-- In Stock -->
              <label class="filter-item" style="cursor:pointer;margin-bottom:.75rem">
                <div class="filter-item-left">
                  <div class="filter-checkbox ${_inStockOnly ? 'checked' : ''}" id="instock-checkbox">
                    ${_inStockOnly ? Utils.Icons.check : ''}
                  </div>
                  <span class="filter-label">In Stock Only</span>
                </div>
              </label>

              <!-- Price range -->
              <div class="filter-section-title">Price Range</div>
              <div class="price-range mb-3">
                <input type="number" id="price-min" placeholder="Min" value="${_priceMin}" min="0">
                <span>—</span>
                <input type="number" id="price-max" placeholder="Max" value="${_priceMax}" min="0">
              </div>
              <button id="apply-price-btn" class="btn btn-secondary btn-sm w-full" style="margin-bottom:1rem">Apply Price</button>
            </div>

            <!-- Categories -->
            <div class="filter-section" id="sidebar-categories-section">
              <div class="filter-section-title">
                Categories
                <span class="filter-count-badge" id="category-active-badge">${_filterCategories.size > 0 ? _filterCategories.size + ' active' : ''}</span>
              </div>
              <div id="sidebar-categories">
                <div style="text-align:center;padding:.5rem"><div class="loader loader-sm inline-block"></div></div>
              </div>
            </div>

            <!-- Brands -->
            <div class="filter-section" id="sidebar-brands-section">
              <div class="filter-section-title">
                Brands
                <span class="filter-count-badge" id="brand-active-badge">${_filterBrands.size > 0 ? _filterBrands.size + ' active' : ''}</span>
              </div>
              <div style="margin-bottom:.375rem">
                <input type="text" id="brand-search-input" placeholder="Search brands..." style="font-size:.75rem;padding:.3125rem .625rem">
              </div>
              <div id="sidebar-brands" style="max-height:280px;overflow-y:auto">
                <div style="text-align:center;padding:.5rem"><div class="loader loader-sm inline-block"></div></div>
              </div>
            </div>
          </aside>

          <!-- Main content -->
          <div id="catalog-content">
            <!-- Search bar -->
            <div class="card" style="margin-bottom:1rem;padding:.75rem">
              <div style="display:flex;align-items:center;gap:.625rem;flex-wrap:wrap">
                <div style="flex:1;min-width:180px;position:relative">
                  <div style="position:absolute;left:.625rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text-secondary)">${Utils.Icons.search.replace('<svg','<svg style="width:.875rem;height:.875rem"')}</div>
                  <input type="text" id="catalog-search" placeholder="Search by UPC, name, brand, SKU..." style="padding-left:2rem;height:2rem;font-size:.8125rem">
                </div>
                <select id="catalog-search-type" style="width:auto;min-width:90px;height:2rem;font-size:.75rem;padding:.25rem .5rem">
                  <option value="upc">UPC</option>
                  <option value="itemName_lowercase">Name</option>
                  <option value="brand">Brand</option>
                  <option value="sku">SKU</option>
                </select>
                <button id="catalog-search-btn" class="btn btn-primary btn-sm" style="height:2rem">Search</button>
                <button id="catalog-browse-btn" class="btn btn-secondary btn-sm" style="height:2rem">Browse All</button>
                <button class="btn btn-secondary btn-sm" id="mobile-filter-btn" style="height:2rem;display:none" aria-label="Filters">
                  ${Utils.Icons.filter.replace('<svg','<svg style="width:.875rem;height:.875rem"')}
                </button>
              </div>
              <!-- Bulk search toggle -->
              <details style="margin-top:.625rem" id="bulk-search-details">
                <summary style="font-size:.75rem;color:var(--text-secondary);cursor:pointer;list-style:none;display:flex;align-items:center;gap:.375rem">
                  <span>Bulk UPC Search</span>
                  ${Utils.Icons.chevronDown.replace('<svg','<svg style="width:.75rem;height:.75rem"')}
                </summary>
                <div style="margin-top:.5rem;display:flex;gap:.5rem;align-items:flex-end">
                  <textarea id="bulk-upc-input" rows="3" placeholder="Paste UPCs, one per line..." style="flex:1;resize:none;font-size:.75rem"></textarea>
                  <button id="bulk-search-btn" class="btn btn-primary btn-sm">Search</button>
                </div>
              </details>
            </div>

            <!-- Sort + view -->
            <div class="sort-bar">
              <div style="flex:1;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
                <span id="results-count" style="font-size:.75rem;color:var(--text-secondary)">Loading...</span>
                <button id="mobile-filter-toggle" class="btn btn-secondary btn-sm" style="display:none">
                  ${Utils.Icons.filter.replace('<svg','<svg style="width:.75rem;height:.75rem"')} Filters
                </button>
              </div>
              <div style="display:flex;align-items:center;gap:.625rem;flex-wrap:wrap">
                <select id="sort-select" style="width:auto;height:1.875rem;font-size:.75rem;padding:.25rem .5rem">
                  <option value="default">Sort: Default</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="name_asc">Name: A → Z</option>
                  <option value="name_desc">Name: Z → A</option>
                  <option value="suppliers_desc">Most Suppliers</option>
                </select>
                <div class="view-toggle">
                  <button class="view-btn ${_view === 'grid' ? 'active' : ''}" data-view="grid" title="Grid view">
                    <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                  </button>
                  <button class="view-btn ${_view === 'compact' ? 'active' : ''}" data-view="compact" title="Compact view">
                    <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1" stroke-width="1.75"/><rect x="14" y="3" width="7" height="7" rx="1" stroke-width="1.75"/><rect x="3" y="14" width="7" height="7" rx="1" stroke-width="1.75"/><rect x="14" y="14" width="7" height="7" rx="1" stroke-width="1.75"/></svg>
                  </button>
                  <button class="view-btn ${_view === 'list' ? 'active' : ''}" data-view="list" title="List view">
                    <svg style="width:1rem;height:1rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                  </button>
                </div>
                <button id="export-csv-btn" class="btn btn-success btn-sm">
                  ${Utils.Icons.download.replace('<svg','<svg style="width:.75rem;height:.75rem"')} Export CSV
                </button>
              </div>
            </div>

            <!-- Active filter chips strip (#6) -->
            <div id="active-filter-chips" style="display:none;flex-wrap:wrap;gap:.375rem;margin-bottom:.625rem;padding:.375rem 0;align-items:center"></div>

            <!-- Results -->
            <div id="catalog-results"></div>
            <div id="catalog-pagination" class="pagination"></div>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
    _restoreUrlState(param); // #4 restores filters+search from URL, calls _fetchAll internally
    if (!_urlStateDirty) {
      if (param && param.startsWith('brand:')) {
        const brand = decodeURIComponent(param.replace('brand:', ''));
        _filterBrands = new Set([brand]);
        _filterCategories.clear();
        _searchType = 'browse';
        _currentPage = 1; _lastVisible = null; _firstVisible = null;
        _applyServerFiltersAndFetch();
      } else if (param && param.startsWith('category:')) {
        const cat = decodeURIComponent(param.replace('category:', ''));
        _filterCategories = new Set([cat]);
        _filterBrands.clear();
        _searchType = 'browse';
        _currentPage = 1; _lastVisible = null; _firstVisible = null;
        _applyServerFiltersAndFetch();
      } else {
        _fetchAll();
      }
    }
    _renderActiveFilterChips(); // show active chips on load

    // Mobile sidebar toggle
    const mobileFB = document.getElementById('mobile-filter-btn');
    if (mobileFB) { mobileFB.style.display = ''; }
    const mobileToggle = document.getElementById('mobile-filter-toggle');
    if (mobileToggle) { mobileToggle.style.display = ''; }

    // Load full brand/category index in background (runs once per session)
    _loadGlobalIndex();
  }

  // ── #4 URL state ──────────────────────────────────────────────
  function _saveUrlState() {
    const p = [];
    if (_searchType === 'search') {
      const term = document.getElementById('catalog-search')?.value.trim();
      const type = document.getElementById('catalog-search-type')?.value || 'upc';
      if (term) { p.push('q=' + encodeURIComponent(term)); p.push('qt=' + type); }
    }
    if (_filterBrands.size > 0) p.push('brands=' + encodeURIComponent([..._filterBrands].join('|')));
    if (_filterCategories.size > 0) p.push('cats=' + encodeURIComponent([..._filterCategories].join('|')));
    if (_inStockOnly) p.push('instock=1');
    if (_priceMin) p.push('pmin=' + _priceMin);
    if (_priceMax) p.push('pmax=' + _priceMax);
    if (_sortBy !== 'default') p.push('sort=' + _sortBy);
    if (_currentPage > 1) p.push('page=' + _currentPage);
    if (_view !== 'grid') p.push('view=' + _view);
    history.replaceState(null, '', '#catalog' + (p.length ? '?' + p.join('&') : ''));
  }

  function _restoreUrlState(param) {
    _urlStateDirty = false;
    if (param) return; // brand:/category: handled normally
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const raw = hash.slice(qIdx + 1);
    if (!raw) return;
    _urlStateDirty = true;
    const ps = new URLSearchParams(raw);
    const q = ps.get('q'), qt = ps.get('qt') || 'upc';
    const brands = ps.get('brands'), cats = ps.get('cats');
    if (brands) _filterBrands = new Set(decodeURIComponent(brands).split('|').filter(Boolean));
    if (cats) _filterCategories = new Set(decodeURIComponent(cats).split('|').filter(Boolean));
    if (ps.get('instock')) _inStockOnly = true;
    if (ps.get('pmin')) _priceMin = ps.get('pmin');
    if (ps.get('pmax')) _priceMax = ps.get('pmax');
    if (ps.get('sort')) _sortBy = ps.get('sort');
    if (ps.get('view')) _view = ps.get('view');
    // Sync UI controls
    const inStockCb = document.getElementById('instock-checkbox');
    if (inStockCb && _inStockOnly) { inStockCb.classList.add('checked'); inStockCb.innerHTML = Utils.Icons.check; }
    const sortSel = document.getElementById('sort-select');
    if (sortSel && ps.get('sort')) sortSel.value = _sortBy;
    const searchIn = document.getElementById('catalog-search');
    if (searchIn && q) searchIn.value = q;
    const typeIn = document.getElementById('catalog-search-type');
    if (typeIn && qt) typeIn.value = qt;
    // Fetch — respect brand/category as server constraints
    _currentPage = 1; _lastVisible = null; _firstVisible = null;
    _searchType = q ? 'search' : 'browse';
    if (q) {
      let constraints = [];
      if (qt === 'itemName_lowercase') {
        constraints = [
          { field: 'itemName_lowercase', op: '>=', value: q.toLowerCase() },
          { field: 'itemName_lowercase', op: '<=', value: q.toLowerCase() + '\uf8ff' }
        ];
      } else { constraints = [{ field: qt, op: '==', value: q }]; }
      _fetchAll(constraints);
    } else {
      // Brand/category filters from URL → Firestore constraints
      _applyServerFiltersAndFetch();
    }
  }

  // ── Fetch ──────────────────────────────────────────────────────
  async function _fetchAll(constraints = [], direction = 'next') {
    _showLoader();
    _queryConstraints = constraints;
    // #1 Check page cache
    const cacheKey = JSON.stringify(constraints) + ':p' + _currentPage + ':' + direction;
    const cached = _pageCache.get(cacheKey);
    if (cached) {
      _allDocs = cached.docs;
      _lastVisible = cached.last;
      _firstVisible = cached.first;
      _buildFilterSets(_allDocs);
      _renderSidebarFilters();
      _applyFiltersAndRender();
      return;
    }
    let q = Collections.products.orderBy('sku').limit(ITEMS_PER_PAGE);
    constraints.forEach(c => { q = q.where(c.field, c.op, c.value); });
    if (direction === 'next' && _lastVisible) q = q.startAfter(_lastVisible);
    else if (direction === 'prev' && _firstVisible) q = q.endBefore(_firstVisible).limitToLast(ITEMS_PER_PAGE);
    try {
      const snap = await q.get();
      if (snap.empty) { _showEmpty(); return; }
      _lastVisible = snap.docs[snap.docs.length - 1];
      _firstVisible = snap.docs[0];
      _allDocs = snap.docs.map(d => d.data());
      _pageCache.set(cacheKey, { docs: _allDocs, last: _lastVisible, first: _firstVisible });
      _buildFilterSets(_allDocs);
      _renderSidebarFilters();
      _applyFiltersAndRender();
    } catch (err) { _showError(err.message); }
  }

  async function _fetchBulk(upcs) {
    _showLoader();
    try {
      const chunks = [];
      for (let i = 0; i < upcs.length; i += 10) chunks.push(upcs.slice(i, i + 10));
      const snaps = await Promise.all(chunks.map(c => Collections.products.where('upc', 'in', c).get()));
      const docs = [];
      snaps.forEach(s => s.forEach(d => docs.push(d.data())));
      _allDocs = docs.sort((a, b) => upcs.indexOf(a.upc) - upcs.indexOf(b.upc));
      _buildFilterSets(_allDocs);
      _renderSidebarFilters();
      _applyFiltersAndRender();
    } catch (err) {
      _showError(err.message);
    }
  }

  // ── Safe string coerce helper ─────────────────────────────────
  function _safeStr(val, fallback) {
    if (val === null || val === undefined || val === '') return fallback;
    if (Array.isArray(val)) return fallback;
    return String(val).trim() || fallback;
  }

  // ── Build brand/category sets from current page docs ──────────
  function _buildFilterSets(docs) {
    _allBrands = new Set();
    _allCategories = new Set();
    docs.forEach(item => {
      _allBrands.add(_safeStr(item.brand, 'Unknown'));
      _allCategories.add(_safeStr(item.category, 'Uncategorized'));
    });
    // Merge in global index if already loaded so sidebar stays complete
    if (_globalIndexLoaded) {
      _globalBrands.forEach(b => _allBrands.add(b));
      _globalCategories.forEach(c => _allCategories.add(c));
    }
  }

  // ── Background full-DB brand/category index ────────────────────
  // Sweeps the entire products collection in 500-doc batches.
  // Results cached in sessionStorage so revisits are instant.
  async function _loadGlobalIndex() {
    if (_globalIndexLoaded || _globalIndexLoading) return;

    // Try sessionStorage cache first (survives page navigations in same tab)
    try {
      const cached = sessionStorage.getItem('_brand_cat_index');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.brands.forEach(b => _globalBrands.add(b));
        parsed.cats.forEach(c => _globalCategories.add(c));
        _globalIndexLoaded = true;
        // Merge and refresh sidebar immediately
        _globalBrands.forEach(b => _allBrands.add(b));
        _globalCategories.forEach(c => _allCategories.add(c));
        _renderSidebarFilters();
        return;
      }
    } catch (e) { /* sessionStorage blocked */ }

    _globalIndexLoading = true;

    // Show a subtle "loading" hint in the brand section header
    const brandSection = document.getElementById('sidebar-brands-section');
    const loadingHint = document.createElement('span');
    loadingHint.id = 'brand-index-loading';
    loadingHint.style.cssText = 'font-size:.6rem;color:var(--text-muted);margin-left:.375rem';
    loadingHint.textContent = '(loading all…)';
    const brandTitle = brandSection?.querySelector('.filter-section-title');
    if (brandTitle) brandTitle.appendChild(loadingHint);

    try {
      let last = null;
      const BATCH = 500;
      for (;;) {
        let q = Collections.products.orderBy('brand').limit(BATCH);
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        snap.forEach(d => {
          const data = d.data();
          const b = _safeStr(data.brand, 'Unknown');
          const c = _safeStr(data.category, 'Uncategorized');
          _globalBrands.add(b);
          _globalCategories.add(c);
        });
        last = snap.docs[snap.docs.length - 1];
        // Refresh sidebar after each batch so brands appear progressively
        _globalBrands.forEach(b => _allBrands.add(b));
        _globalCategories.forEach(c => _allCategories.add(c));
        _renderSidebarFilters();
        if (snap.size < BATCH) break;
      }
      _globalIndexLoaded = true;
      // Save to sessionStorage so next catalog visit is instant
      try {
        sessionStorage.setItem('_brand_cat_index', JSON.stringify({
          brands: [..._globalBrands],
          cats: [..._globalCategories]
        }));
      } catch (e) { /* storage full / blocked */ }
    } catch (e) {
      console.warn('Brand index load failed:', e.message);
    } finally {
      _globalIndexLoading = false;
      // Remove loading hint
      document.getElementById('brand-index-loading')?.remove();
    }
  }

  // ── Sidebar filters rendering ──────────────────────────────────
  function _renderSidebarFilters() {
    _renderCategoryFilters();
    _renderBrandFilters();
  }

  function _renderCategoryFilters() {
    const el = document.getElementById('sidebar-categories');
    if (!el) return;
    const sorted = [..._allCategories].sort();
    if (sorted.length === 0) { el.innerHTML = '<span style="font-size:.75rem;color:var(--text-muted)">No categories</span>'; return; }
    el.innerHTML = sorted.map(cat => {
      const checked = _filterCategories.size === 0 || _filterCategories.has(cat);
      return `<div class="filter-item" data-cat="${_esc(cat)}">
        <div class="filter-item-left">
          <div class="filter-checkbox ${checked ? 'checked' : ''}" data-cat-cb="${_esc(cat)}">
            ${checked ? Utils.Icons.check : ''}
          </div>
          <span class="filter-label" title="${_esc(cat)}">${_esc(cat)}</span>
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('.filter-item[data-cat]').forEach(item => {
      item.addEventListener('click', () => {
        const cat = item.dataset.cat;
        if (_filterCategories.has(cat)) {
          _filterCategories.delete(cat);
        } else {
          _filterCategories.add(cat);
          if (_filterCategories.size === _allCategories.size) _filterCategories.clear();
        }
        _renderCategoryFilters();
        _updateBadges();
        _applyServerFiltersAndFetch(); // push to Firestore
      });
    });
  }

  function _renderBrandFilters(searchQ = '') {
    const el = document.getElementById('sidebar-brands');
    if (!el) return;
    let sorted = [..._allBrands].sort();
    if (searchQ) sorted = sorted.filter(b => b.toLowerCase().includes(searchQ.toLowerCase()));
    if (sorted.length === 0) { el.innerHTML = '<span style="font-size:.75rem;color:var(--text-muted)">No brands found</span>'; return; }

    const multiBrandNote = _filterBrands.size > 1
      ? '<div style="font-size:.6875rem;color:var(--amber);padding:.375rem .25rem;line-height:1.4">⚠ Multiple brands: showing matches in current page only</div>'
      : '';

    el.innerHTML = sorted.map(brand => {
      const checked = _filterBrands.size === 0 || _filterBrands.has(brand);
      return `<div class="filter-item" data-brand="${_esc(brand)}">
        <div class="filter-item-left">
          <div class="filter-checkbox ${checked ? 'checked' : ''}" data-brand-cb="${_esc(brand)}">
            ${checked ? Utils.Icons.check : ''}
          </div>
          <span class="filter-label" title="${_esc(brand)}">${_esc(brand)}</span>
        </div>
      </div>`;
    }).join('') + multiBrandNote;

    el.querySelectorAll('.filter-item[data-brand]').forEach(item => {
      item.addEventListener('click', () => {
        const brand = item.dataset.brand;
        if (_filterBrands.size === 0) {
          // First brand selected — activate it
          _filterBrands = new Set([brand]);
        } else if (_filterBrands.has(brand)) {
          // Deselect — if no brands left, clear (show all)
          _filterBrands.delete(brand);
          if (_filterBrands.size === 0) _filterBrands.clear();
        } else {
          // Add brand
          _filterBrands.add(brand);
          if (_filterBrands.size === _allBrands.size) _filterBrands.clear();
        }
        _renderBrandFilters(document.getElementById('brand-search-input')?.value || '');
        _updateBadges();
        _applyServerFiltersAndFetch(); // push to Firestore
      });
    });
  }

  function _updateBadges() {
    const bb = document.getElementById('brand-active-badge');
    if (bb) bb.textContent = _filterBrands.size > 0 ? `${_filterBrands.size} active` : '';
    const cb = document.getElementById('category-active-badge');
    if (cb) cb.textContent = _filterCategories.size > 0 ? `${_filterCategories.size} active` : '';
  }

  // ── Server-side brand/category fetch ──────────────────────────
  // Single brand or single category → Firestore where() for accurate
  // full-database results. Multiple selections → client-side filter.
  function _applyServerFiltersAndFetch() {
    const constraints = [];

    if (_filterBrands.size === 1 && _filterCategories.size === 0) {
      // Single brand only → server query
      constraints.push({ field: 'brand', op: '==', value: [..._filterBrands][0] });
    } else if (_filterCategories.size === 1 && _filterBrands.size === 0) {
      // Single category only → server query
      constraints.push({ field: 'category', op: '==', value: [..._filterCategories][0] });
    } else if (_filterBrands.size === 1 && _filterCategories.size === 1) {
      // One brand + one category → compound query (both fields)
      constraints.push({ field: 'brand', op: '==', value: [..._filterBrands][0] });
      constraints.push({ field: 'category', op: '==', value: [..._filterCategories][0] });
    }
    // Multi-brand or multi-category with no server support →
    // fetch all (or current search) and let _applyFiltersAndRender handle it client-side

    // Reset pagination when filters change
    _currentPage = 1;
    _lastVisible = null;
    _firstVisible = null;
    _searchType = 'browse';

    _fetchAll(constraints);
  }

  // ── Apply filters client-side ──────────────────────────────────
  function _applyFiltersAndRender() {
    const excSuppliers = Store.getExcludedSuppliers();
    _filteredDocs = _allDocs.filter(item => {
      // Brand filter
      if (_filterBrands.size > 0) {
        const b = _safeStr(item.brand, 'Unknown');
        if (!_filterBrands.has(b)) return false;
      }
      // Category filter
      if (_filterCategories.size > 0) {
        const c = _safeStr(item.category, 'Uncategorized');
        if (!_filterCategories.has(c)) return false;
      }
      // In stock
      if (_inStockOnly && !Utils.isInStock(item)) return false;
      // Price range
      const lp = Utils.getLowestPrice(item, excSuppliers);
      if (_priceMin !== '' && lp !== -1 && lp < parseFloat(_priceMin)) return false;
      if (_priceMax !== '' && lp !== -1 && lp > parseFloat(_priceMax)) return false;
      return true;
    });

    // Sort
    const excS = Store.getExcludedSuppliers();
    if (_sortBy === 'price_asc') {
      _filteredDocs.sort((a, b) => {
        const pa = Utils.getLowestPrice(a, excS); const pb = Utils.getLowestPrice(b, excS);
        return (pa === -1 ? 99999 : pa) - (pb === -1 ? 99999 : pb);
      });
    } else if (_sortBy === 'price_desc') {
      _filteredDocs.sort((a, b) => {
        const pa = Utils.getLowestPrice(a, excS); const pb = Utils.getLowestPrice(b, excS);
        return (pb === -1 ? -1 : pb) - (pa === -1 ? -1 : pa);
      });
    } else if (_sortBy === 'name_asc') {
      _filteredDocs.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));
    } else if (_sortBy === 'name_desc') {
      _filteredDocs.sort((a, b) => (b.itemName || '').localeCompare(a.itemName || ''));
    } else if (_sortBy === 'suppliers_desc') {
      _filteredDocs.sort((a, b) => (b.suppliers?.length || 0) - (a.suppliers?.length || 0));
    }

    _renderResults();
    _saveUrlState(); // #4 persist URL state
  }

  // ── #6 Active filter chips strip ───────────────────────────────
  function _renderActiveFilterChips() {
    const el = document.getElementById('active-filter-chips');
    if (!el) return;
    const chips = [];
    _filterBrands.forEach(b => {
      chips.push('<span class="filter-chip" data-type="brand" data-val="' + _esc(b) + '">' + _esc(b) + ' <span class="filter-chip-x">&times;</span></span>');
    });
    _filterCategories.forEach(c => {
      chips.push('<span class="filter-chip cat" data-type="cat" data-val="' + _esc(c) + '">' + _esc(c) + ' <span class="filter-chip-x">&times;</span></span>');
    });
    if (_inStockOnly) chips.push('<span class="filter-chip instock" data-type="instock">In Stock <span class="filter-chip-x">&times;</span></span>');
    if (_priceMin || _priceMax) {
      const label = (_priceMin ? '$' + _priceMin : '') + ' – ' + (_priceMax ? '$' + _priceMax : '∞');
      chips.push('<span class="filter-chip price" data-type="price">Price: ' + label + ' <span class="filter-chip-x">&times;</span></span>');
    }
    if (chips.length === 0) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = 'flex';
    el.innerHTML = chips.join('') + '<button class="filter-chip clear" id="chips-clear-all">Clear All</button>';
    el.querySelectorAll('.filter-chip[data-type]').forEach(function(chip) {
      chip.addEventListener('click', function() {
        const type = chip.dataset.type, val = chip.dataset.val;
        if (type === 'brand') _filterBrands.delete(val);
        else if (type === 'cat') _filterCategories.delete(val);
        else if (type === 'instock') {
          _inStockOnly = false;
          const cb = document.getElementById('instock-checkbox');
          if (cb) { cb.classList.remove('checked'); cb.innerHTML = ''; }
        } else if (type === 'price') {
          _priceMin = ''; _priceMax = '';
          const mn = document.getElementById('price-min'); if (mn) mn.value = '';
          const mx = document.getElementById('price-max'); if (mx) mx.value = '';
        }
        _updateBadges();
        // brand/category removal → re-fetch; in-stock/price → client-side
        if (type === 'brand' || type === 'cat') {
          _applyServerFiltersAndFetch();
        } else {
          _renderSidebarFilters();
          _applyFiltersAndRender();
        }
      });
    });
    const clearAll = el.querySelector('#chips-clear-all');
    if (clearAll) clearAll.addEventListener('click', function() { _clearAllFilters(); });
  }

  // ── Render results (#3 two-pass lazy render) ───────────────────
  function _renderResults() {
    const el = document.getElementById('catalog-results');
    const countEl = document.getElementById('results-count');
    if (!el) return;
    if (_filteredDocs.length === 0) { _showEmpty(); return; }
    if (countEl) countEl.textContent = _filteredDocs.length.toLocaleString() + ' product' + (_filteredDocs.length !== 1 ? 's' : '');
    _renderActiveFilterChips(); // #6 update chips
    const excS = Store.getExcludedSuppliers();
    const FIRST_PASS = 20;
    const firstDocs = _filteredDocs.slice(0, FIRST_PASS);
    const restDocs  = _filteredDocs.slice(FIRST_PASS);
    if (_view === 'list') {
      el.innerHTML = '<div class="card" id="results-inner" style="overflow:hidden">' + firstDocs.map(function(item, i) { return _listItem(item, i, excS); }).join('') + '</div>';
    } else {
      const cls = _view === 'compact' ? 'products-grid compact' : 'products-grid';
      el.innerHTML = '<div class="' + cls + '" id="results-inner">' + firstDocs.map(function(item, i) { return _productCard(item, i, excS); }).join('') + '</div>';
    }
    _bindCardClicks();
    _renderPagination();
    // Second pass — append remaining items after next paint
    if (restDocs.length > 0) {
      requestAnimationFrame(function() {
        const inner = document.getElementById('results-inner');
        if (!inner) return;
        if (_view === 'list') {
          inner.insertAdjacentHTML('beforeend', restDocs.map(function(item, i) { return _listItem(item, i + FIRST_PASS, excS); }).join(''));
        } else {
          inner.insertAdjacentHTML('beforeend', restDocs.map(function(item, i) { return _productCard(item, i + FIRST_PASS, excS); }).join(''));
        }
        _bindCardClicks();
      });
    }
  }

  // #7 Helper: get current cart quantity for a SKU
  function _cartQty(sku) {
    const cart = Store.getCart();
    const found = cart.find(function(i) { return i.sku === sku; });
    return found ? (found.qty || 1) : 0;
  }

  function _productCard(item, i, excS) {
    const lp = Utils.getLowestPrice(item, excS);
    const imgUrl = Utils.getImgUrl(item);
    const inStock = Utils.isInStock(item);
    const isFav = Store.isFavorite(item.sku);
    const inCart = Store.isInCart(item.sku);
    const qty = inCart ? _cartQty(item.sku) : 0;  // #7 live quantity

    if (_view === 'compact') {
      return `<div class="card card-hover product-card" data-sku="${_esc(item.sku)}" style="animation-delay:${i * 12}ms">
        <div class="card-img-wrap" style="height:100px;padding:.5rem">
          <img src="${imgUrl}" alt="${_esc(item.itemName)}" loading="lazy" onerror="this.src='${Utils.PLACEHOLDER_IMG}'">
          <div class="card-price-badge">${lp !== -1 ? '$'+lp.toFixed(2) : 'N/A'}</div>
          ${inStock ? '<div class="card-in-stock-dot"></div>' : ''}
        </div>
        <div class="card-body" style="padding:.5rem">
          <div class="card-name" style="font-size:.75rem;-webkit-line-clamp:2">${_esc(item.itemName)}</div>
        </div>
      </div>`;
    }

    const topSups = (item.suppliers || []).sort((a, b) => (parseFloat(a.price)||Infinity) - (parseFloat(b.price)||Infinity)).slice(0, 3);
    const suppliersHtml = topSups.length ? topSups.map(s => {
      const p = parseFloat(s.price);
      const isLowest = (p === lp);
      return `<div class="card-supplier-row">
        <span class="card-supplier-name">${_esc(s.name)}</span>
        <span class="card-supplier-price ${isLowest ? 'best' : ''}">${!isNaN(p) ? '$'+p.toFixed(2) : '-'}</span>
      </div>`;
    }).join('') : '<span style="font-size:.75rem;color:var(--text-muted)">No suppliers</span>';

    return `<div class="card card-hover product-card" data-sku="${_esc(item.sku)}" style="animation-delay:${i * 12}ms">
      <div class="card-img-wrap" style="height:140px">
        <img src="${imgUrl}" alt="${_esc(item.itemName)}" loading="lazy" onerror="this.src='${Utils.PLACEHOLDER_IMG}'">
        <div class="card-price-badge">${lp !== -1 ? '$'+lp.toFixed(2) : 'N/A'}</div>
        ${inStock ? '<div class="card-in-stock-dot"></div>' : ''}
      </div>
      <div class="card-body">
        <div class="card-name">${_esc(item.itemName)}</div>
        <div style="display:flex;align-items:center;gap:.375rem;margin-bottom:.5rem;flex-wrap:wrap">
          <span class="card-brand-chip">${_esc(item.brand || 'No Brand')}</span>
          ${item.size ? `<span style="font-size:.6875rem;color:var(--text-secondary)">${_esc(item.size)}</span>` : ''}
        </div>
        <div class="card-suppliers">${suppliersHtml}</div>
        <div style="display:flex;gap:.375rem;margin-top:.625rem">
          <button class="btn btn-secondary btn-sm add-cart-btn" data-sku="${_esc(item.sku)}" style="flex:1;font-size:.6875rem;${inCart ? 'color:var(--green);border-color:var(--green)' : ''}">
            ${inCart ? `✓ In Quote${qty > 1 ? ' (×'+qty+')' : ''}` : '+ Quote'}
          </button>
          <button class="btn btn-ghost btn-sm fav-btn" data-sku="${_esc(item.sku)}" style="padding:.3125rem .5rem;${isFav ? 'color:var(--red)' : ''}">
            <svg style="width:.875rem;height:.875rem" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function _listItem(item, i, excS) {
    const lp = Utils.getLowestPrice(item, excS);
    const imgUrl = Utils.getImgUrl(item);
    const inStock = Utils.isInStock(item);
    return `<div class="product-list-item" data-sku="${_esc(item.sku)}" style="animation-delay:${i * 8}ms">
      <div class="list-img">
        <img src="${imgUrl}" alt="${_esc(item.itemName)}" loading="lazy" onerror="this.src='${Utils.PLACEHOLDER_IMG}'">
      </div>
      <div style="min-width:0">
        <div style="font-size:.875rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(item.itemName)}</div>
        <div style="display:flex;align-items:center;gap:.375rem;margin-top:.125rem;flex-wrap:wrap">
          <span class="card-brand-chip" style="font-size:.6rem">${_esc(item.brand || '-')}</span>
          <span style="font-size:.6875rem;color:var(--text-muted)">${_esc(item.upc || '')}</span>
          ${inStock ? '<span class="badge badge-green" style="font-size:.6rem">In Stock</span>' : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.25rem">
        <span style="font-size:.875rem;font-weight:700;font-family:var(--font-mono)">${lp !== -1 ? '$'+lp.toFixed(2) : 'N/A'}</span>
        <span style="font-size:.6875rem;color:var(--text-muted)">${(item.suppliers||[]).length} suppliers</span>
      </div>
    </div>`;
  }

  // ── Bind events ────────────────────────────────────────────────
  function _bindEvents() {
    Utils.onClick('#catalog-search-btn', () => _handleSearch());
    Utils.onClick('#catalog-browse-btn', () => _handleBrowseAll());
    Utils.onClick('#bulk-search-btn', () => _handleBulkSearch());
    Utils.onClick('#clear-all-filters-btn', () => _clearAllFilters());
    Utils.onClick('#apply-price-btn', () => {
      _priceMin = document.getElementById('price-min')?.value || '';
      _priceMax = document.getElementById('price-max')?.value || '';
      _applyFiltersAndRender();
    });
    Utils.onClick('#export-csv-btn', () => _handleExport());

    // #2 Debounce 300ms — also fire immediately on Enter
    let _searchDebounceTimer = null;
    document.getElementById('catalog-search')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { clearTimeout(_searchDebounceTimer); _handleSearch(); }
    });
    document.getElementById('catalog-search')?.addEventListener('input', e => {
      clearTimeout(_searchDebounceTimer);
      _searchDebounceTimer = setTimeout(() => {
        const v = e.target.value.trim();
        if (v.length >= 3) _handleSearch();
        else if (v.length === 0) _handleBrowseAll();
      }, 300);
    });

    document.getElementById('sort-select')?.addEventListener('change', e => {
      _sortBy = e.target.value;
      _applyFiltersAndRender();
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _view = btn.dataset.view;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === _view));
        _applyFiltersAndRender();
      });
    });

    // In-stock toggle
    Utils.onClick('#instock-checkbox', () => {
      _inStockOnly = !_inStockOnly;
      const cb = document.getElementById('instock-checkbox');
      if (cb) { cb.classList.toggle('checked', _inStockOnly); cb.innerHTML = _inStockOnly ? Utils.Icons.check : ''; }
      _applyFiltersAndRender();
    });

    // Brand search
    document.getElementById('brand-search-input')?.addEventListener('input', e => {
      _renderBrandFilters(e.target.value);
    });

    // Mobile sidebar toggle
    Utils.onClick('#mobile-filter-toggle', () => {
      document.getElementById('catalog-sidebar')?.classList.toggle('open');
    });
    Utils.onClick('#mobile-filter-btn', () => {
      document.getElementById('catalog-sidebar')?.classList.toggle('open');
    });
  }

  function _bindCardClicks() {
    document.querySelectorAll('.product-card[data-sku], .product-list-item[data-sku]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.add-cart-btn, .fav-btn')) return;
        const sku = card.dataset.sku;
        Router.navigate(`product/${sku}`);
      });
    });

    document.querySelectorAll('.add-cart-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const sku = btn.dataset.sku;
        const item = _allDocs.find(d => d.sku === sku);
        if (!item) return;
        const excS = Store.getExcludedSuppliers();
        const lp = Utils.getLowestPrice(item, excS);
        const added = Store.addToCart({ ...item, lowestPrice: lp });
        if (added) {
          Utils.toast('Added to Quote Cart', 'success');
          btn.style.color = 'var(--green)';
          btn.style.borderColor = 'var(--green)';
          const qty = _cartQty(sku);  // #7 live qty
          btn.textContent = qty > 1 ? `✓ In Quote (×${qty})` : '✓ In Quote';
        } else {
          Utils.toast('Already in your quote', 'info');
        }
      });
    });

    document.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const sku = btn.dataset.sku;
        const added = Store.toggleFavorite(sku);
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', added ? 'currentColor' : 'none');
        btn.style.color = added ? 'var(--red)' : '';
        Utils.toast(added ? 'Added to Favorites' : 'Removed from Favorites', added ? 'success' : 'info');
      });
    });
  }

  // ── Search handlers ────────────────────────────────────────────
  function _handleSearch() {
    const term = document.getElementById('catalog-search')?.value.trim();
    const type = document.getElementById('catalog-search-type')?.value || 'upc';
    if (!term) { _handleBrowseAll(); return; }
    _currentPage = 1; _lastVisible = null; _firstVisible = null;
    _searchType = 'search';
    let constraints = [];
    if (type === 'itemName_lowercase') {
      constraints = [
        { field: 'itemName_lowercase', op: '>=', value: term.toLowerCase() },
        { field: 'itemName_lowercase', op: '<=', value: term.toLowerCase() + '\uf8ff' }
      ];
    } else {
      constraints = [{ field: type, op: '==', value: term }];
    }
    _fetchAll(constraints);
  }

  async function _handleBulkSearch() {
    const raw = document.getElementById('bulk-upc-input')?.value || '';
    const upcs = [...new Set(raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean))];
    if (upcs.length === 0) { Utils.toast('Paste at least one UPC', 'error'); return; }
    if (upcs.length > 500) { Utils.toast('Bulk search limited to 500 UPCs', 'error'); return; }
    _bulkUpcs = upcs;
    _searchType = 'bulk';
    _currentPage = 1;
    await _fetchBulk(upcs);
  }

  function _handleBrowseAll() {
    _searchType = 'browse';
    _currentPage = 1; _lastVisible = null; _firstVisible = null;
    _filterBrands.clear(); _filterCategories.clear();
    _inStockOnly = false; _priceMin = ''; _priceMax = '';
    _fetchAll([]);
  }

  function _clearAllFilters() {
    _filterBrands.clear(); _filterCategories.clear();
    _inStockOnly = false; _priceMin = ''; _priceMax = '';
    _sortBy = 'default';
    _currentPage = 1; _lastVisible = null; _firstVisible = null;
    _renderActiveFilterChips();
    _updateBadges();
    const inStockCb = document.getElementById('instock-checkbox');
    if (inStockCb) { inStockCb.classList.remove('checked'); inStockCb.innerHTML = ''; }
    const sortSel = document.getElementById('sort-select');
    if (sortSel) sortSel.value = 'default';
    // Re-fetch from Firestore with no constraints
    _fetchAll([]);
  }

  // ── Export ─────────────────────────────────────────────────────
  function _handleExport() {
    if (_filteredDocs.length === 0) { Utils.toast('No data to export', 'error'); return; }
    const supplierSet = new Set();
    _filteredDocs.forEach(item => (item.suppliers||[]).forEach(s => supplierSet.add(s.name)));
    const sups = [...supplierSet].sort();
    const header = ['UPC','Item Name','Brand','Size','Category','MSRP', ...sups.flatMap(n => [n+' Price', n+' Inv'])];
    const rows = [header, ..._filteredDocs.map(item => [
      item.upc, item.itemName, item.brand, item.size, item.category, item.msrp,
      ...sups.flatMap(n => {
        const s = (item.suppliers||[]).find(x => x.name === n);
        return s ? [s.price, s.inventory] : ['',''];
      })
    ])];
    Utils.downloadCSV(rows, 'supplier_catalog_export.csv');
    Utils.toast('CSV exported', 'success');
  }

  // ── Pagination ─────────────────────────────────────────────────
  function _renderPagination() {
    const el = document.getElementById('catalog-pagination');
    if (!el) return;
    el.innerHTML = '';
    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.disabled = _currentPage === 1;
    prev.innerHTML = '<svg style="width:.875rem;height:.875rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>';
    prev.onclick = () => { _currentPage--; _fetchAll(_queryConstraints, 'prev'); };
    const info = document.createElement('span');
    info.className = 'page-btn active';
    info.style.minWidth = '2.5rem';
    info.textContent = _currentPage;
    const next = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<svg style="width:.875rem;height:.875rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
    next.onclick = () => { _currentPage++; _fetchAll(_queryConstraints, 'next'); };
    el.append(prev, info, next);
  }

  // ── State helpers ──────────────────────────────────────────────
  function _showLoader() {
    const el = document.getElementById('catalog-results');
    const cnt = document.getElementById('results-count');
    if (cnt) cnt.textContent = 'Loading...';
    if (el) el.innerHTML = `<div class="products-grid">${Utils.skeletonCards(12)}</div>`;
    const pg = document.getElementById('catalog-pagination');
    if (pg) pg.innerHTML = '';
  }

  // #9 Smart empty state
  function _showEmpty() {
    const el = document.getElementById('catalog-results');
    const cnt = document.getElementById('results-count');
    if (cnt) cnt.textContent = '0 products';
    const hasFilters = _filterBrands.size > 0 || _filterCategories.size > 0 || _inStockOnly || _priceMin || _priceMax;
    const searchTerm = _esc(document.getElementById('catalog-search')?.value.trim() || '');
    const tipHtml = hasFilters
      ? 'Try removing some filters or <strong>clearing all filters</strong> to see more results.'
      : searchTerm
        ? ('No results for <strong>"' + searchTerm + '"</strong>. Check spelling or try a different search type.')
        : 'No products matched your query. Try browsing all products.';
    if (el) el.innerHTML = '<div class="empty-state">'
      + '<div class="empty-state-icon">' + Utils.Icons.search + '</div>'
      + '<h3>No Products Found</h3>'
      + '<p style="max-width:380px;margin:.5rem auto 1.5rem;font-size:.875rem;color:var(--text-secondary);line-height:1.6">' + tipHtml + '</p>'
      + '<div style="display:flex;gap:.625rem;justify-content:center;flex-wrap:wrap">'
      + (hasFilters ? '<button class="btn btn-primary" onclick="CatalogPage.clearFilters()">Clear Filters</button>' : '')
      + '<button class="btn btn-secondary" onclick="CatalogPage.browseAll()">Browse All Products</button>'
      + '</div></div>';
    const pg = document.getElementById('catalog-pagination'); if (pg) pg.innerHTML = '';
  }

  function _showError(msg) {
    const el = document.getElementById('catalog-results');
    if (el) el.innerHTML = `<div style="background:var(--red-bg);border:1px solid rgba(239,68,68,.2);color:var(--red);padding:.75rem 1rem;border-radius:var(--radius-md);font-size:.8125rem">
      Error loading data: ${_esc(msg)}
    </div>`;
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Public API
  function browseAll() { _handleBrowseAll(); }
  function clearFilters() { _clearAllFilters(); }
  function getAllDocs() { return _allDocs; }
  function getFilteredDocs() { return _filteredDocs; }

  return { render, browseAll, clearFilters, getAllDocs, getFilteredDocs };
})();

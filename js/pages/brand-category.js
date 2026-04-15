/* ============================================================
   js/pages/brand-category.js — Brand & Category pages with banners
   ============================================================ */

const BrandCategoryPage = (() => {

  async function renderBrand(brandName) {
    if (!brandName) { Router.navigate('catalog'); return; }
    const decodedBrand = decodeURIComponent(brandName);
    _renderShell(decodedBrand, 'brand');
    try {
      const snap = await Collections.products.where('brand', '==', decodedBrand).limit(100).get();
      const docs = snap.docs.map(function(d){ return d.data(); });
      _renderBrandContent(decodedBrand, docs);
    } catch (err) {
      _showError(err.message);
    }
  }

  async function renderCategory(catName) {
    if (!catName) { Router.navigate('catalog'); return; }
    const decodedCat = decodeURIComponent(catName);
    _renderShell(decodedCat, 'category');
    try {
      const snap = await Collections.products.where('category', '==', decodedCat).limit(100).get();
      const docs = snap.docs.map(function(d){ return d.data(); });
      _renderCategoryContent(decodedCat, docs);
    } catch (err) {
      _showError(err.message);
    }
  }

  function _renderShell(name, type) {
    const view = document.getElementById('page-view');
    view.innerHTML = '<div class="page-container" style="max-width:1200px">'
      + '<div style="margin-bottom:1rem">'
      + '<button onclick="Router.navigate(\'catalog\')" class="btn btn-ghost btn-sm">&#8592; Back to Catalog</button>'
      + '</div>'
      // Banner skeleton
      + '<div class="skeleton" style="height:140px;border-radius:var(--radius-xl);margin-bottom:1.5rem"></div>'
      // Products skeleton
      + '<div class="products-grid">' + Utils.skeletonCards(8) + '</div>'
      + '</div>';
  }

  function _renderBrandContent(brandName, docs) {
    const view = document.getElementById('page-view');
    const excS = Store.getExcludedSuppliers();

    // Stats
    const totalStock = docs.reduce(function(t, d){ return t + Utils.getTotalStock(d); }, 0);
    const inStockCount = docs.filter(function(d){ return Utils.isInStock(d); }).length;
    const brandColor = Utils.getBrandColor(brandName);
    const initials = Utils.getBrandInitials(brandName);

    view.innerHTML = '<div class="page-container" style="max-width:1200px">'
      + '<div style="margin-bottom:1.25rem">'
      + '<button onclick="Router.navigate(\'catalog\')" class="btn btn-ghost btn-sm">&#8592; Back to Catalog</button>'
      + '</div>'

      // Brand hero banner
      + '<div class="brand-hero" style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:2rem;margin-bottom:1.75rem;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;position:relative;overflow:hidden">'
      + '<div style="position:absolute;right:-30px;top:50%;transform:translateY(-50%);font-size:8rem;font-weight:900;color:' + brandColor + ';opacity:.04;pointer-events:none;user-select:none;line-height:1">' + initials + '</div>'
      + '<div class="brand-hero-logo">'
      + Utils.brandLogoHtml(brandName, 80)
      + '</div>'
      + '<div style="flex:1;min-width:200px">'
      + '<div style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary);margin-bottom:.25rem">Brand</div>'
      + '<h2 style="font-size:1.625rem;font-weight:800;letter-spacing:-.025em;margin-bottom:.5rem">' + e(brandName) + '</h2>'
      + '<div style="display:flex;gap:1.25rem;flex-wrap:wrap">'
      + _statPill(docs.length + ' Products', Utils.Icons.catalog)
      + _statPill(inStockCount + ' In Stock', Utils.Icons.check)
      + _statPill(Utils.fmtNum(totalStock) + ' Total Units', Utils.Icons.tag)
      + '</div>'
      + '</div>'
      + '<button class="btn btn-primary" onclick="Router.navigate(\'catalog/brand:' + encodeURIComponent(brandName) + '\')">'
      + 'Browse All ' + e(brandName) + ' Products'
      + '</button>'
      + '</div>'

      // Products
      + '<div class="section-header"><span class="section-title">' + e(brandName) + ' Products</span><span style="font-size:.75rem;color:var(--text-secondary)">' + docs.length + ' total</span></div>'
      + '<div class="products-grid" id="brand-products">'
      + docs.map(function(item, i){ return _productCard(item, i, excS); }).join('')
      + '</div>'
      + '</div>';

    _bindCardClicks(docs);
  }

  function _renderCategoryContent(catName, docs) {
    const view = document.getElementById('page-view');
    const excS = Store.getExcludedSuppliers();

    // Build brand breakdown
    const brandCounts = new Map();
    docs.forEach(function(d){ var b = (d.brand==null||Array.isArray(d.brand)||d.brand==='')?'Unknown':String(d.brand).trim()||'Unknown'; brandCounts.set(b, (brandCounts.get(b)||0)+1); });
    const topBrands = [...brandCounts.entries()].sort(function(a,b){return b[1]-a[1];}).slice(0,5);

    view.innerHTML = '<div class="page-container" style="max-width:1200px">'
      + '<div style="margin-bottom:1.25rem">'
      + '<button onclick="Router.navigate(\'catalog\')" class="btn btn-ghost btn-sm">&#8592; Back to Catalog</button>'
      + '</div>'

      // Category banner
      + '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:2rem;margin-bottom:1.75rem;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">'
      + '<div style="width:5rem;height:5rem;border-radius:var(--radius-lg);background:var(--bg-main);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + '<svg style="width:2rem;height:2rem;color:var(--text-secondary)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>'
      + '</div>'
      + '<div style="flex:1;min-width:200px">'
      + '<div style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary);margin-bottom:.25rem">Category</div>'
      + '<h2 style="font-size:1.625rem;font-weight:800;letter-spacing:-.025em;margin-bottom:.625rem">' + e(catName) + '</h2>'
      + '<div style="display:flex;gap:.375rem;flex-wrap:wrap">'
      + topBrands.map(function(b){ return '<span class="badge badge-gray">' + e(b[0]) + ' <span style="opacity:.6">' + b[1] + '</span></span>'; }).join('')
      + '</div>'
      + '</div>'
      + '<div style="text-align:right">'
      + '<div style="font-size:1.75rem;font-weight:800;font-family:var(--font-mono)">' + docs.length + '</div>'
      + '<div style="font-size:.6875rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em">Products</div>'
      + '</div>'
      + '</div>'

      + '<div class="section-header"><span class="section-title">' + e(catName) + ' Products</span></div>'
      + '<div class="products-grid">'
      + docs.map(function(item, i){ return _productCard(item, i, excS); }).join('')
      + '</div>'
      + '</div>';

    _bindCardClicks(docs);
  }

  function _productCard(item, i, excS) {
    var lp = Utils.getLowestPrice(item, excS);
    var imgUrl = Utils.getImgUrl(item);
    var inCart = Store.isInCart(item.sku);
    return '<div class="card card-hover product-card" data-sku="' + e(item.sku) + '" style="animation-delay:' + (i*12) + 'ms">'
      + '<div class="card-img-wrap" style="height:140px">'
      + '<img src="' + imgUrl + '" alt="' + e(item.itemName) + '" loading="lazy" style="mix-blend-mode:multiply" onerror="this.src=\'' + Utils.PLACEHOLDER_IMG + '\'">'
      + '<div class="card-price-badge">' + (lp !== -1 ? '$'+lp.toFixed(2) : 'N/A') + '</div>'
      + (Utils.isInStock(item) ? '<div class="card-in-stock-dot"></div>' : '')
      + '</div>'
      + '<div class="card-body">'
      + '<div class="card-name">' + e(item.itemName) + '</div>'
      + '<span class="card-brand-chip" style="margin-bottom:.5rem">' + e(item.brand||'—') + '</span>'
      + '<button class="btn btn-secondary btn-sm bc-add-cart" data-sku="' + e(item.sku) + '" style="margin-top:auto;width:100%;font-size:.6875rem;' + (inCart ? 'color:var(--green);border-color:var(--green)' : '') + '">'
      + (inCart ? '&#x2713; In Quote' : '+ Add to Quote')
      + '</button>'
      + '</div>'
      + '</div>';
  }

  function _bindCardClicks(docs) {
    document.querySelectorAll('.product-card[data-sku]').forEach(function(card){
      card.addEventListener('click', function(ev){
        if (ev.target.closest('.bc-add-cart')) return;
        Router.navigate('product/' + card.dataset.sku);
      });
    });

    document.querySelectorAll('.bc-add-cart').forEach(function(btn){
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        var sku = this.dataset.sku;
        var item = docs.find(function(d){ return d.sku === sku; });
        if (!item) return;
        var excS2 = Store.getExcludedSuppliers();
        var lp2 = Utils.getLowestPrice(item, excS2);
        var added = Store.addToCart(Object.assign({}, item, { lowestPrice: lp2 }));
        if (added) {
          Utils.toast('Added to Quote Cart', 'success');
          this.innerHTML = '&#x2713; In Quote';
          this.style.color = 'var(--green)';
          this.style.borderColor = 'var(--green)';
        } else {
          Utils.toast('Already in your quote', 'info');
        }
      });
    });
  }

  function _statPill(text, icon) {
    return '<div style="display:flex;align-items:center;gap:.375rem;font-size:.75rem;color:var(--text-secondary)">'
      + icon.replace('<svg', '<svg style="width:.875rem;height:.875rem;flex-shrink:0"')
      + text
      + '</div>';
  }

  function _showError(msg) {
    var view = document.getElementById('page-view');
    if (view) view.innerHTML = '<div class="page-container"><div style="color:var(--red);padding:1rem">Error: ' + msg + '</div></div>';
  }

  function e(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { renderBrand, renderCategory };
})();

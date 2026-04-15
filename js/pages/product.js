/* ============================================================
   js/pages/product.js — Route-based product detail page
   ============================================================ */

const ProductPage = (() => {

  async function render(sku) {
    const view = document.getElementById('page-view');

    if (!sku) {
      Router.navigate('catalog');
      return;
    }

    // Skeleton
    view.innerHTML = '<div class="page-container" style="max-width:1100px">'
      + '<div style="margin-bottom:1rem"><button onclick="history.back()" class="btn btn-ghost btn-sm">&#8592; Back</button></div>'
      + '<div class="card"><div style="padding:2rem;display:flex;gap:2rem;flex-wrap:wrap">'
      + '<div class="skeleton" style="width:240px;height:240px;border-radius:var(--radius-lg);flex-shrink:0"></div>'
      + '<div style="flex:1;min-width:240px">'
      + '<div class="skeleton" style="height:1.5rem;width:70%;margin-bottom:.75rem"></div>'
      + '<div class="skeleton" style="height:.875rem;width:40%;margin-bottom:2rem"></div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem">'
      + [1,2,3,4,5,6].map(function(){return '<div class="skeleton" style="height:3.5rem;border-radius:var(--radius-md)"></div>';}).join('')
      + '</div></div></div></div></div>';

    try {
      var snap = await Collections.products.where('sku', '==', sku).limit(1).get();
      if (snap.empty) { _showNotFound(view, sku); return; }
      _renderProduct(view, snap.docs[0].data());
    } catch (err) {
      view.innerHTML = '<div class="page-container"><div style="color:var(--red);padding:1rem">Error: ' + err.message + '</div></div>';
    }
  }

  function _renderProduct(view, item) {
    var excS = Store.getExcludedSuppliers();
    var lp = Utils.getLowestPrice(item, excS);
    var totalStock = Utils.getTotalStock(item);
    var imgUrl = Utils.getImgUrl(item);
    var msrpText = typeof item.msrp === 'number' ? ('$' + item.msrp.toFixed(2)) : (item.msrp || 'N/A');
    var inCart = Store.isInCart(item.sku);
    var isFav = Store.isFavorite(item.sku);

    var visibleSuppliers = (item.suppliers || [])
      .filter(function(s){ return !excS.has(s.name); })
      .sort(function(a, b){ return (parseFloat(a.price)||Infinity) - (parseFloat(b.price)||Infinity); });

    var lowestVisible = Infinity;
    visibleSuppliers.forEach(function(s){
      var p = parseFloat(s.price);
      var st = parseFloat(String(s.inventory||'').replace(/,/g,''));
      if (!isNaN(p) && p > 0 && !isNaN(st) && st > 0 && p < lowestVisible) lowestVisible = p;
    });

    var suppHtml = '';
    if (visibleSuppliers.length) {
      visibleSuppliers.forEach(function(s){
        var p = parseFloat(s.price);
        var pTxt = !isNaN(p) ? ('$'+p.toFixed(2)) : 'N/A';
        var st = parseFloat(String(s.inventory||'').replace(/,/g,''));
        var inStk = !isNaN(st) && st > 0;
        var isLow = (p === lowestVisible && p < Infinity);
        suppHtml += '<tr>'
          + '<td style="padding:.625rem 1rem;font-size:.8125rem;font-weight:500">' + e(s.name) + (isLow ? ' <span class="badge badge-green" style="font-size:.5625rem">BEST</span>' : '') + '</td>'
          + '<td style="padding:.625rem 1rem;text-align:right;font-family:var(--font-mono);font-weight:700;font-size:.875rem;color:' + (isLow ? 'var(--green)' : 'var(--text-main)') + '">' + pTxt + '</td>'
          + '<td style="padding:.625rem 1rem;text-align:right;font-size:.8125rem;font-family:var(--font-mono)">' + (inStk ? '<span style="color:var(--green)">' + Utils.fmtNum(s.inventory) + '</span>' : '<span style="color:var(--text-muted)">0</span>') + '</td>'
          + '<td style="padding:.625rem 1rem;text-align:right;font-size:.75rem;color:var(--text-secondary)">' + Utils.fmtDateShort(s.lastUpdate) + '</td>'
          + '</tr>';
      });
    } else {
      suppHtml = '<tr><td colspan="4" style="padding:2rem;text-align:center;color:var(--text-secondary)">No suppliers match current filters.</td></tr>';
    }

    view.innerHTML = '<div class="page-container" style="max-width:1100px">'
      // Breadcrumb
      + '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.25rem;font-size:.8125rem;color:var(--text-secondary);flex-wrap:wrap">'
      + '<button onclick="Router.navigate(\'home\')" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">Home</button>'
      + '<span>/</span>'
      + '<button onclick="Router.navigate(\'catalog\')" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">Catalog</button>'
      + '<span>/</span>'
      + '<span style="color:var(--text-main);font-weight:500">' + e(item.itemName) + '</span>'
      + '</div>'

      // Top product card
      + '<div class="card" style="margin-bottom:1.5rem">'
      + '<div style="display:flex;gap:2rem;padding:1.75rem;flex-wrap:wrap">'

      // Image
      + '<div style="flex-shrink:0">'
      + '<div id="pdp-img-wrap" style="width:240px;height:240px;background:#fff;border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;padding:1.5rem;border:1px solid var(--border-color);cursor:zoom-in;overflow:hidden">'
      + '<img src="' + imgUrl + '" id="pdp-img" alt="' + e(item.itemName) + '" style="max-width:100%;max-height:100%;object-fit:contain;mix-blend-mode:multiply;transition:transform .4s" onerror="this.src=\'' + Utils.PLACEHOLDER_IMG + '\'">'
      + '</div>'
      + '<div style="display:flex;gap:.5rem;margin-top:.75rem">'
      + '<button class="btn btn-primary w-full" id="pdp-cart-btn" style="' + (inCart ? 'background:var(--green-bg);color:var(--green);border:1px solid rgba(16,185,129,.25)' : '') + '">'
      + (inCart ? '&#x2713; In Quote' : '+ Add to Quote')
      + '</button>'
      + '<button class="btn btn-ghost btn-icon" id="pdp-fav-btn" style="' + (isFav ? 'color:var(--red)' : '') + '">'
      + '<svg style="width:1.125rem;height:1.125rem" fill="' + (isFav ? 'currentColor' : 'none') + '" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>'
      + '</button>'
      + '</div>'
      + '</div>'

      // Info
      + '<div style="flex:1;min-width:240px">'
      + '<h1 style="font-size:1.375rem;font-weight:800;letter-spacing:-.025em;line-height:1.2;margin-bottom:.375rem">' + e(item.itemName) + '</h1>'
      + '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.25rem;flex-wrap:wrap">'
      + '<button class="card-brand-chip" onclick="Router.navigate(\'catalog/brand:' + encodeURIComponent(item.brand||'') + '\')" style="cursor:pointer">' + e(item.brand||'Unknown Brand') + '</button>'
      + (item.category ? '<button class="badge badge-gray" onclick="Router.navigate(\'catalog/category:' + encodeURIComponent(item.category) + '\')" style="cursor:pointer">' + e(item.category) + '</button>' : '')
      + (Utils.isInStock(item) ? '<span class="badge badge-green">In Stock</span>' : '<span class="badge badge-red">Out of Stock</span>')
      + '</div>'
      + '<div style="display:flex;align-items:baseline;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap">'
      + '<span style="font-size:2rem;font-weight:800;font-family:var(--font-mono);letter-spacing:-.03em;color:var(--green)">' + (lp !== -1 ? ('$'+lp.toFixed(2)) : 'N/A') + '</span>'
      + '<span style="font-size:.875rem;color:var(--text-secondary)">best price</span>'
      + (item.msrp ? '<span style="font-size:.875rem;color:var(--text-muted);text-decoration:line-through">MSRP ' + msrpText + '</span>' : '')
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.625rem;margin-bottom:1.25rem">'
      + mc('SKU', item.sku, true) + mc('UPC', item.upc, true) + mc('ASIN', item.asin||'—')
      + mc('Size', item.size||'—') + mc('Gender', item.gender||'—') + mc('MSRP', msrpText)
      + mc('Total Stock', Utils.fmtNum(totalStock)) + mc('Suppliers', (item.suppliers||[]).length)
      + '</div>'
      + (item.description ? '<div style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-secondary);margin-bottom:.375rem">Description</div><div style="font-size:.8125rem;color:var(--text-secondary);line-height:1.6">' + e(item.description) + '</div>' : '')
      + '</div>'
      + '</div>'
      + '</div>'

      // Supplier table
      + '<div class="card" style="overflow:hidden">'
      + '<div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border-color);background:var(--bg-main);display:flex;align-items:center;gap:.5rem">'
      + '<span style="font-size:.875rem;font-weight:700">Supplier Matrix</span>'
      + '<span style="font-size:.75rem;color:var(--text-secondary);margin-left:.25rem">' + visibleSuppliers.length + ' supplier' + (visibleSuppliers.length !== 1 ? 's' : '') + '</span>'
      + '</div>'
      + '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Supplier</th><th style="text-align:right">Price</th><th style="text-align:right">Stock</th><th style="text-align:right">Updated</th></tr></thead>'
      + '<tbody>' + suppHtml + '</tbody></table></div>'
      + '</div>'
      + '</div>';

    // Bind img
    var wrap = document.getElementById('pdp-img-wrap');
    var img = document.getElementById('pdp-img');
    if (wrap && img) {
      wrap.addEventListener('click', function(){ _openLightbox(imgUrl); });
      wrap.addEventListener('mouseover', function(){ img.style.transform = 'scale(1.06)'; });
      wrap.addEventListener('mouseout', function(){ img.style.transform = ''; });
    }

    // Cart button
    document.getElementById('pdp-cart-btn').addEventListener('click', function(){
      var excS2 = Store.getExcludedSuppliers();
      var lp2 = Utils.getLowestPrice(item, excS2);
      var added = Store.addToCart(Object.assign({}, item, { lowestPrice: lp2 }));
      if (added) {
        Utils.toast('Added to Quote Cart', 'success');
        this.innerHTML = '&#x2713; In Quote';
        this.style.background = 'var(--green-bg)';
        this.style.color = 'var(--green)';
        this.style.border = '1px solid rgba(16,185,129,.25)';
      } else {
        Utils.toast('Already in your quote cart', 'info');
      }
    });

    // Fav button
    document.getElementById('pdp-fav-btn').addEventListener('click', function(){
      var added = Store.toggleFavorite(item.sku);
      var svg = this.querySelector('svg');
      if (svg) svg.setAttribute('fill', added ? 'currentColor' : 'none');
      this.style.color = added ? 'var(--red)' : '';
      Utils.toast(added ? 'Saved to Favorites' : 'Removed from Favorites', added ? 'success' : 'info');
    });
  }

  function mc(label, value, mono) {
    return '<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:.625rem .875rem">'
      + '<div style="font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-secondary);margin-bottom:.25rem">' + label + '</div>'
      + '<div style="' + (mono ? 'font-family:var(--font-mono);' : '') + 'font-size:.8125rem;font-weight:500;user-select:all">' + e(String(value == null ? 'N/A' : value)) + '</div>'
      + '</div>';
  }

  function _showNotFound(view, sku) {
    view.innerHTML = '<div class="page-container"><div class="empty-state">'
      + '<div class="empty-state-icon">' + Utils.Icons.search + '</div>'
      + '<h3>Product Not Found</h3><p>No product with SKU &quot;' + e(sku) + '&quot; was found.</p>'
      + '<button class="btn btn-secondary" onclick="Router.navigate(\'catalog\')">Back to Catalog</button>'
      + '</div></div>';
  }

  function e(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render };
})();

function _openLightbox(url) {
  var lb = document.getElementById('lightbox');
  var img = document.getElementById('lightbox-img');
  if (lb && img) { img.src = url; lb.classList.remove('hidden'); }
}

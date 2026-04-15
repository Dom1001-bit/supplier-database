/* ============================================================
   js/pages/favorites.js — Saved / favorited products
   ============================================================ */

const FavoritesPage = (() => {

  async function render() {
    const view = document.getElementById('page-view');
    const favSkus = Store.getFavorites();

    view.innerHTML = '<div class="page-container" style="max-width:1200px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem">'
      + '<div><h2>Saved Products</h2><p style="font-size:.8125rem;color:var(--text-secondary);margin-top:.25rem">' + favSkus.length + ' saved item' + (favSkus.length !== 1 ? 's' : '') + '</p></div>'
      + (favSkus.length > 0 ? '<button id="clear-favs-btn" class="btn btn-danger btn-sm">Clear All</button>' : '')
      + '</div>'
      + '<div id="favs-content">'
      + (favSkus.length === 0 ? _emptyState() : '<div class="products-grid">' + Utils.skeletonCards(6) + '</div>')
      + '</div>'
      + '</div>';

    Utils.onClick('#clear-favs-btn', function(){
      if (!confirm('Remove all saved products?')) return;
      Store.saveFavorites([]);
      render();
    });

    if (favSkus.length === 0) return;

    // Fetch from Firestore in chunks
    try {
      const chunks = [];
      for (let i = 0; i < favSkus.length; i += 10) chunks.push(favSkus.slice(i, i + 10));
      const snaps = await Promise.all(chunks.map(function(c){ return Collections.products.where('sku', 'in', c).get(); }));
      const docs = [];
      snaps.forEach(function(s){ s.forEach(function(d){ docs.push(d.data()); }); });
      _renderItems(docs);
    } catch (err) {
      document.getElementById('favs-content').innerHTML = '<div style="color:var(--red);padding:1rem">Error: ' + err.message + '</div>';
    }
  }

  function _renderItems(docs) {
    const el = document.getElementById('favs-content');
    if (!el) return;
    if (!docs.length) { el.innerHTML = _emptyState(); return; }
    const excS = Store.getExcludedSuppliers();
    el.innerHTML = '<div class="products-grid">' + docs.map(function(item, i){
      const lp = Utils.getLowestPrice(item, excS);
      const imgUrl = Utils.getImgUrl(item);
      const inCart = Store.isInCart(item.sku);
      return '<div class="card card-hover product-card" data-sku="' + e(item.sku) + '" style="animation-delay:' + (i*15) + 'ms">'
        + '<div class="card-img-wrap" style="height:140px">'
        + '<img src="' + imgUrl + '" alt="' + e(item.itemName) + '" loading="lazy" style="mix-blend-mode:multiply" onerror="this.src=\'' + Utils.PLACEHOLDER_IMG + '\'">'
        + '<div class="card-price-badge">' + (lp !== -1 ? '$'+lp.toFixed(2) : 'N/A') + '</div>'
        + (Utils.isInStock(item) ? '<div class="card-in-stock-dot"></div>' : '')
        + '</div>'
        + '<div class="card-body">'
        + '<div class="card-name">' + e(item.itemName) + '</div>'
        + '<span class="card-brand-chip" style="margin-bottom:.625rem">' + e(item.brand||'No Brand') + '</span>'
        + '<div style="display:flex;gap:.375rem;margin-top:auto">'
        + '<button class="btn btn-secondary btn-sm fav-add-cart" data-sku="' + e(item.sku) + '" style="flex:1;font-size:.6875rem;' + (inCart ? 'color:var(--green);border-color:var(--green)' : '') + '">'
        + (inCart ? '&#x2713; In Quote' : '+ Quote')
        + '</button>'
        + '<button class="btn btn-danger btn-sm remove-fav-btn" data-sku="' + e(item.sku) + '" style="font-size:.6875rem">'
        + '<svg style="width:.75rem;height:.75rem" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>'
        + '</button>'
        + '</div>'
        + '</div>'
        + '</div>';
    }).join('') + '</div>';

    // Bind
    el.querySelectorAll('.product-card[data-sku]').forEach(function(card){
      card.addEventListener('click', function(ev){
        if (ev.target.closest('.fav-add-cart, .remove-fav-btn')) return;
        Router.navigate('product/' + card.dataset.sku);
      });
    });

    el.querySelectorAll('.fav-add-cart').forEach(function(btn){
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

    el.querySelectorAll('.remove-fav-btn').forEach(function(btn){
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        Store.toggleFavorite(this.dataset.sku);
        Utils.toast('Removed from Favorites', 'info');
        render();
      });
    });
  }

  function _emptyState() {
    return '<div class="empty-state">'
      + '<div class="empty-state-icon">'
      + '<svg style="width:1.25rem;height:1.25rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>'
      + '</div>'
      + '<h3>No Saved Products</h3>'
      + '<p>Click the heart icon on any product to save it here.</p>'
      + '<button class="btn btn-secondary" onclick="Router.navigate(\'catalog\')">Browse Catalog</button>'
      + '</div>';
  }

  function e(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render };
})();

/* ============================================================
   js/store.js — App state management
   ============================================================ */

const Store = (() => {
  // ── Favorites ─────────────────────────────────────────────────
  function getFavorites() {
    try { return JSON.parse(localStorage.getItem('supplier_db_favorites') || '[]'); } catch { return []; }
  }
  function saveFavorites(arr) { localStorage.setItem('supplier_db_favorites', JSON.stringify(arr)); }
  function isFavorite(sku) { return getFavorites().includes(sku); }
  function toggleFavorite(sku) {
    const favs = getFavorites();
    const idx = favs.indexOf(sku);
    if (idx === -1) favs.push(sku); else favs.splice(idx, 1);
    saveFavorites(favs);
    document.dispatchEvent(new CustomEvent('favorites-changed', { detail: { favs } }));
    return idx === -1;
  }
  function getFavoriteCount() { return getFavorites().length; }

  // ── Cart (Quote) ──────────────────────────────────────────────
  function getCart() {
    try { return JSON.parse(localStorage.getItem('supplier_db_cart') || '[]'); } catch { return []; }
  }
  function saveCart(arr) {
    localStorage.setItem('supplier_db_cart', JSON.stringify(arr));
    document.dispatchEvent(new CustomEvent('cart-changed', { detail: { count: arr.length } }));
  }
  function getCartCount() { return getCart().length; }
  function isInCart(sku) { return getCart().some(i => i.sku === sku); }
  function addToCart(item) {
    const cart = getCart();
    if (!cart.some(i => i.sku === item.sku)) {
      cart.push({
        sku: item.sku,
        upc: item.upc,
        itemName: item.itemName,
        brand: item.brand,
        imageUrl: item.imageUrl,
        lowestPrice: item.lowestPrice,
        qty: 1,
        notes: '',
        addedAt: Date.now()
      });
      saveCart(cart);
      return true;
    }
    return false;
  }
  function removeFromCart(sku) {
    const cart = getCart().filter(i => i.sku !== sku);
    saveCart(cart);
  }
  function updateCartItem(sku, updates) {
    const cart = getCart().map(i => i.sku === sku ? { ...i, ...updates } : i);
    saveCart(cart);
  }
  function clearCart() { saveCart([]); }

  // ── Excluded Suppliers ────────────────────────────────────────
  function getExcludedSuppliers() {
    try { return new Set(JSON.parse(localStorage.getItem('supplier_db_excluded') || '[]')); } catch { return new Set(); }
  }
  function saveExcludedSuppliers(set) {
    localStorage.setItem('supplier_db_excluded', JSON.stringify([...set]));
  }

  // ── Theme ─────────────────────────────────────────────────────
  function getTheme() { return localStorage.getItem('supplier_db_theme') || 'dark'; }
  function setTheme(t) {
    localStorage.setItem('supplier_db_theme', t);
    applyTheme(t);
  }
  function applyTheme(t) {
    const isLight = t === 'light';
    document.documentElement.classList.toggle('light-mode', isLight);
    document.documentElement.classList.toggle('dark', !isLight);
    const sun = document.getElementById('sun-icon');
    const moon = document.getElementById('moon-icon');
    if (sun) sun.classList.toggle('hidden', !isLight);
    if (moon) moon.classList.toggle('hidden', isLight);
  }
  function toggleTheme() {
    const t = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(t);
    return t;
  }

  // ── Cache ─────────────────────────────────────────────────────
  const _docCache = new Map();
  function setCachedDocs(key, docs) { _docCache.set(key, { docs, ts: Date.now() }); }
  function getCachedDocs(key, ttlMs = 5 * 60 * 1000) {
    const c = _docCache.get(key);
    if (!c) return null;
    if (Date.now() - c.ts > ttlMs) { _docCache.delete(key); return null; }
    return c.docs;
  }
  function clearCache() { _docCache.clear(); }

  return {
    getFavorites, saveFavorites, isFavorite, toggleFavorite, getFavoriteCount,
    getCart, saveCart, getCartCount, isInCart, addToCart, removeFromCart, updateCartItem, clearCart,
    getExcludedSuppliers, saveExcludedSuppliers,
    getTheme, setTheme, applyTheme, toggleTheme,
    setCachedDocs, getCachedDocs, clearCache
  };
})();

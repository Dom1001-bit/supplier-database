/* ============================================================
   js/utils.js — Utility helpers
   ============================================================ */

const Utils = (() => {

  // ── Toast ─────────────────────────────────────────────────────
  function toast(msg, type = 'default', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = {
      success: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
      error: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
      info: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    };
    const el = document.createElement('div');
    el.className = `toast${type !== 'default' ? ' ' + type : ''}`;
    el.innerHTML = (icons[type] || '') + `<span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration + 100);
  }

  // ── Formatting ─────────────────────────────────────────────────
  function fmtPrice(val) {
    const n = parseFloat(val);
    return isNaN(n) ? 'N/A' : '$' + n.toFixed(2);
  }

  function fmtDate(val) {
    if (!val) return 'N/A';
    try {
      const d = val.toDate ? val.toDate() : new Date(val);
      if (isNaN(d)) return String(val);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return String(val); }
  }

  function fmtDateShort(val) {
    if (!val) return 'N/A';
    try {
      const d = val.toDate ? val.toDate() : new Date(val);
      if (isNaN(d)) return String(val);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
    } catch { return String(val); }
  }

  function fmtDateTime(val) {
    if (!val) return 'N/A';
    try {
      const d = val.toDate ? val.toDate() : new Date(val);
      if (isNaN(d)) return String(val);
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return String(val); }
  }

  function fmtNum(val) {
    const n = parseInt(val);
    return isNaN(n) ? 0 : n.toLocaleString();
  }

  // ── Item helpers ──────────────────────────────────────────────
  function getLowestPrice(item, excludedSuppliers = new Set()) {
    if (!item.suppliers) return -1;
    let min = Infinity;
    for (const s of item.suppliers) {
      if (excludedSuppliers.has(s.name)) continue;
      const p = parseFloat(s.price);
      const stock = parseFloat(String(s.inventory || '').replace(/,/g,''));
      if (!isNaN(p) && p > 0 && !isNaN(stock) && stock > 0 && p < min) min = p;
    }
    return min === Infinity ? -1 : min;
  }

  function getTotalStock(item) {
    if (!item.suppliers) return 0;
    return item.suppliers.reduce((t, s) => {
      const n = parseFloat(String(s.inventory || '').replace(/,/g,''));
      return t + (isNaN(n) ? 0 : n);
    }, 0);
  }

  function isInStock(item) {
    return getTotalStock(item) > 0;
  }

  // ── DOM ────────────────────────────────────────────────────────
  function qs(sel, ctx = document) { return ctx.querySelector(sel); }
  function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }

  function setInner(sel, html, ctx = document) {
    const el = typeof sel === 'string' ? qs(sel, ctx) : sel;
    if (el) el.innerHTML = html;
  }

  function onClick(sel, fn, ctx = document) {
    const el = typeof sel === 'string' ? qs(sel, ctx) : sel;
    if (el) el.addEventListener('click', fn);
  }

  // ── Placeholders ──────────────────────────────────────────────
  const PLACEHOLDER_IMG = 'https://i.imgur.com/IUBzxFv.jpeg';

  function getImgUrl(item) {
    return (item.imageUrl && String(item.imageUrl).trim()) ? item.imageUrl : PLACEHOLDER_IMG;
  }

  // ── Brand color/letter helpers ─────────────────────────────────
  const BRAND_COLORS = [
    '#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#ec4899','#8b5cf6'
  ];
  function getBrandColor(name) {
    let hash = 0;
    for (let i = 0; i < (name||'').length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
    return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
  }
  function getBrandInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  // Brand logo HTML: tries Clearbit logo API, falls back to stylized initials
  function brandLogoHtml(brandName, size = 56) {
    const initials = getBrandInitials(brandName);
    const color = getBrandColor(brandName);
    const domain = brandName.toLowerCase().replace(/[^a-z0-9]/g,'') + '.com';
    return `<div style="width:${size}px;height:${size}px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:inherit">
      <img src="https://logo.clearbit.com/${domain}" 
        style="width:${size}px;height:${size}px;object-fit:contain;padding:4px"
        onerror="this.style.display='none';this.nextSibling.style.display='flex'">
      <span style="display:none;width:${size}px;height:${size}px;background:${color};color:#fff;font-size:${Math.round(size*0.28)}px;font-weight:800;align-items:center;justify-content:center;border-radius:inherit;letter-spacing:-0.02em">${initials}</span>
    </div>`;
  }

  // ── CSV export ─────────────────────────────────────────────────
  function downloadCSV(rows, filename) {
    const escape = (v) => {
      const s = String(v == null ? '' : v);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = rows.map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── Random key generator ───────────────────────────────────────
  function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let k = 'sk_';
    for (let i = 0; i < 32; i++) k += chars[Math.floor(Math.random() * chars.length)];
    return k;
  }

  // ── Skeleton rows ──────────────────────────────────────────────
  function skeletonCards(n = 12, imgH = 150) {
    return Array.from({ length: n }, () => `
      <div class="card" style="animation:skeleton-pulse 1.8s ease-in-out infinite">
        <div class="skeleton" style="height:${imgH}px"></div>
        <div style="padding:.875rem">
          <div class="skeleton" style="height:.75rem;width:75%;margin-bottom:.5rem"></div>
          <div class="skeleton" style="height:.625rem;width:45%;margin-bottom:1rem"></div>
          <div style="border-top:1px solid var(--border-color);padding-top:.625rem">
            <div class="skeleton" style="height:.625rem;width:100%;margin-bottom:.375rem"></div>
            <div class="skeleton" style="height:.625rem;width:80%"></div>
          </div>
        </div>
      </div>`).join('');
  }

  function skeletonRows(n = 6) {
    return Array.from({ length: n }, () => `
      <div class="product-list-item" style="animation:skeleton-pulse 1.8s ease-in-out infinite">
        <div class="skeleton" style="width:52px;height:52px;border-radius:6px"></div>
        <div>
          <div class="skeleton" style="height:.75rem;width:60%;margin-bottom:.375rem"></div>
          <div class="skeleton" style="height:.625rem;width:40%"></div>
        </div>
        <div class="skeleton" style="height:.75rem;width:4rem"></div>
      </div>`).join('');
  }

  // ── SVGs ───────────────────────────────────────────────────────
  const Icons = {
    search: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`,
    home: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    catalog: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>`,
    heart: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`,
    cart: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`,
    user: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
    key: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>`,
    settings: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
    docs: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
    logout: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>`,
    x: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    chevronDown: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`,
    check: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`,
    eye: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`,
    eyeOff: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`,
    copy: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`,
    upload: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>`,
    download: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>`,
    filter: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>`,
    building: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
    admin: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
    nexus: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`,
    tag: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>`,
  };

  return { toast, fmtPrice, fmtDate, fmtDateShort, fmtDateTime, fmtNum,
    getLowestPrice, getTotalStock, isInStock,
    qs, qsa, show, hide, setInner, onClick,
    PLACEHOLDER_IMG, getImgUrl, getBrandColor, getBrandInitials, brandLogoHtml,
    downloadCSV, generateApiKey,
    skeletonCards, skeletonRows, Icons };
})();

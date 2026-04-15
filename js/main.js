/* ============================================================
   js/main.js — App bootstrap, routing, polished account dropdown
   ============================================================ */

(function () {

  // ── Boot ───────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    Store.applyTheme(Store.getTheme());
    Auth.init(_onUserSignedIn);
  });

  // ── After sign-in ──────────────────────────────────────────────
  async function _onUserSignedIn(user) {
    _setupHeader(user);
    _setupRouter();
    _setupCartBadge();
    _setupCartDrawer();  // #8 cart drawer
    _setupLightbox();
    _setupMobileNav();
    _setupKeyboardShortcuts();

    // Load company profile for dropdown
    _loadDropdownProfile(user);

    Router.init();
  }

  // ── Header / Account Dropdown ──────────────────────────────────
  function _setupHeader(user) {
    // Email display
    var emailDisplay = document.getElementById('header-user-email');
    if (emailDisplay) emailDisplay.textContent = user.email;

    // Initials for avatar
    var initials = (user.email || 'U').slice(0, 2).toUpperCase();
    var avatarEls = document.querySelectorAll('.account-avatar');
    avatarEls.forEach(function (el) { el.textContent = initials; });

    // Account button toggle
    var accountBtn = document.getElementById('account-menu-btn');
    var dropdown = document.getElementById('account-dropdown');

    if (accountBtn && dropdown) {
      accountBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = !dropdown.classList.contains('hidden');
        if (isOpen) {
          _closeDropdown();
        } else {
          dropdown.classList.remove('hidden');
          accountBtn.classList.add('open');
        }
      });

      // Close on outside click
      document.addEventListener('click', function (e) {
        if (!accountBtn.contains(e.target) && !dropdown.contains(e.target)) {
          _closeDropdown();
        }
      });
    }

    // Dropdown item clicks
    _bindDropdownItem('dd-home', function () { Router.navigate('home'); _closeDropdown(); });
    _bindDropdownItem('dd-catalog', function () { Router.navigate('catalog'); _closeDropdown(); });
    _bindDropdownItem('dd-favorites', function () { Router.navigate('favorites'); _closeDropdown(); });
    _bindDropdownItem('dd-cart', function () { Router.navigate('cart'); _closeDropdown(); });
    _bindDropdownItem('dd-account', function () { Router.navigate('account'); _closeDropdown(); });
    _bindDropdownItem('dd-apikeys', function () { Router.navigate('account/apikeys'); _closeDropdown(); });
    _bindDropdownItem('dd-settings', function () { Router.navigate('account/settings'); _closeDropdown(); });
    _bindDropdownItem('dd-admin', function () { Router.navigate('admin'); _closeDropdown(); });
    _bindDropdownItem('dd-logout', function () {
      _closeDropdown();
      auth.signOut();
    });

    // Theme toggle in header
    var themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        Store.toggleTheme();
        _updateThemeIcon();
      });
    }
    _updateThemeIcon();

    // Header search — #2 debounced
    var headerSearch = document.getElementById('header-search');
    if (headerSearch) {
      var _headerSearchTimer = null;
      headerSearch.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          clearTimeout(_headerSearchTimer);
          var term = this.value.trim();
          if (term) {
            sessionStorage.setItem('pending_search', term);
            Router.navigate('catalog');
            _closeDropdown();
          }
        }
      });
      headerSearch.addEventListener('input', function() {
        clearTimeout(_headerSearchTimer);
        var term = this.value.trim();
        _headerSearchTimer = setTimeout(function() {
          if (term.length >= 3) {
            sessionStorage.setItem('pending_search', term);
            Router.navigate('catalog');
            _closeDropdown();
          }
        }, 400);
      });
    }

    // Desktop nav links
    document.querySelectorAll('.nav-link[data-route]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Router.navigate(this.dataset.route);
      });
    });

    // Logout button (separate from dropdown)
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () { auth.signOut(); });
    }

    // Cart button in header — #8 open drawer instead of navigate
    var cartHeaderBtn = document.getElementById('cart-header-btn');
    if (cartHeaderBtn) {
      cartHeaderBtn.addEventListener('click', function () { _openCartDrawer(); });
    }
  }

  // ── #8 Cart Drawer ─────────────────────────────────────────────
  function _openCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-drawer-overlay');
    if (!drawer) return;
    _renderCartDrawer();
    if (overlay) overlay.classList.remove('hidden');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function _closeCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function _renderCartDrawer() {
    var cart = Store.getCart();
    var countEl = document.getElementById('drawer-count');
    if (countEl) countEl.textContent = cart.length;
    var body = document.getElementById('cart-drawer-body');
    if (!body) return;
    if (cart.length === 0) {
      body.innerHTML = '<div class="cart-drawer-empty">'
        + '<svg style="width:2.5rem;height:2.5rem;margin-bottom:.75rem;opacity:.3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
        + '<p style="font-size:.875rem;font-weight:600;margin-bottom:.375rem">Your quote is empty</p>'
        + '<p style="font-size:.75rem;color:var(--text-muted)">Add products from the catalog</p>'
        + '</div>';
      return;
    }
    body.innerHTML = cart.map(function(item) {
      var imgUrl = Utils.getImgUrl(item);
      var price = item.lowestPrice !== undefined && item.lowestPrice !== -1
        ? '$' + parseFloat(item.lowestPrice).toFixed(2) : 'N/A';
      return '<div class="cart-drawer-item">'
        + '<div class="cart-drawer-item-img"><img src="' + imgUrl + '" alt="" onerror="this.src=\'' + Utils.PLACEHOLDER_IMG + '\'"></div>'
        + '<div class="cart-drawer-item-info">'
        + '<div class="cart-drawer-item-name">' + (item.itemName || 'Unknown Product').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>'
        + '<div class="cart-drawer-item-meta">' + (item.brand || '') + (item.upc ? ' · ' + item.upc : '') + '</div>'
        + '<div class="cart-drawer-item-meta">Qty: ' + (item.qty || 1) + '</div>'
        + '</div>'
        + '<span class="cart-drawer-item-price">' + price + '</span>'
        + '</div>';
    }).join('');
  }

  function _setupCartDrawer() {
    var closeBtn = document.getElementById('cart-drawer-close');
    var overlay = document.getElementById('cart-drawer-overlay');
    var viewBtn = document.getElementById('cart-drawer-view-btn');
    var clearBtn = document.getElementById('cart-drawer-clear-btn');
    if (closeBtn) closeBtn.addEventListener('click', _closeCartDrawer);
    if (overlay) overlay.addEventListener('click', _closeCartDrawer);
    if (viewBtn) viewBtn.addEventListener('click', function() { _closeCartDrawer(); Router.navigate('cart'); });
    if (clearBtn) clearBtn.addEventListener('click', function() {
      if (confirm('Clear all items from your quote?')) {
        Store.clearCart();
        _renderCartDrawer();
        Utils.toast('Quote cart cleared', 'info');
      }
    });
    // Update drawer when cart changes
    document.addEventListener('cart-changed', function() {
      _renderCartDrawer();
    });
    // Escape closes drawer
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') _closeCartDrawer();
    });
  }

  function _closeDropdown() {
    var dropdown = document.getElementById('account-dropdown');
    var btn = document.getElementById('account-menu-btn');
    if (dropdown) dropdown.classList.add('hidden');
    if (btn) btn.classList.remove('open');
  }

  function _bindDropdownItem(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  async function _loadDropdownProfile(user) {
    try {
      var snap = await Collections.userProfiles.doc(user.uid).get();
      if (snap.exists) {
        var p = snap.data();
        // Update display name in dropdown
        var nameEl = document.getElementById('dropdown-user-name');
        if (nameEl && p.contactName) nameEl.textContent = p.contactName;
        // Company badge
        var badge = document.getElementById('dropdown-company-badge');
        if (badge && p.companyName) {
          var badgeSpan = badge.querySelector('span');
          if (badgeSpan) badgeSpan.textContent = p.companyName;
          badge.classList.remove('hidden');
        }
        // Account button name
        var acctName = document.getElementById('account-btn-name');
        if (acctName && p.contactName) acctName.textContent = p.contactName;
      }

      // Check admin
      var adminSnap = await Collections.adminUsers.doc(user.uid).get();
      if (adminSnap.exists) {
        var adminItem = document.getElementById('dd-admin-wrap');
        if (adminItem) adminItem.classList.remove('hidden');
      }
    } catch (e) { /* ignore */ }
  }

  function _updateThemeIcon() {
    var isLight = Store.getTheme() === 'light';
    var sun = document.getElementById('sun-icon');
    var moon = document.getElementById('moon-icon');
    if (sun) sun.classList.toggle('hidden', !isLight);
    if (moon) moon.classList.toggle('hidden', isLight);
  }

  // ── Cart badge ─────────────────────────────────────────────────
  function _setupCartBadge() {
    _updateCartBadge();
    document.addEventListener('cart-changed', function (e) {
      _updateCartBadge(e.detail.count);
    });
  }

  function _updateCartBadge(count) {
    var c = count !== undefined ? count : Store.getCartCount();
    var badges = document.querySelectorAll('.cart-badge');
    badges.forEach(function (b) {
      b.textContent = c;
      b.classList.toggle('hidden', c === 0);
    });
    // Mobile nav badge
    var mobileBadge = document.getElementById('mobile-cart-badge');
    if (mobileBadge) {
      mobileBadge.textContent = c;
      mobileBadge.classList.toggle('hidden', c === 0);
    }
  }

  // ── Router ─────────────────────────────────────────────────────
  function _setupRouter() {
    Router.register('home', function () {
      _setActiveNav('home');
      HomePage.render();
    });

    Router.register('catalog', function (param) {
      _setActiveNav('catalog');
      CatalogPage.render(param);
    });

    Router.register('product', function (sku) {
      _setActiveNav('catalog');
      ProductPage.render(sku);
    });

    Router.register('brand', function (brandName) {
      _setActiveNav('catalog');
      BrandCategoryPage.renderBrand(brandName);
    });

    Router.register('category', function (catName) {
      _setActiveNav('catalog');
      BrandCategoryPage.renderCategory(catName);
    });

    Router.register('favorites', function () {
      _setActiveNav('favorites');
      FavoritesPage.render();
    });

    Router.register('cart', function () {
      _setActiveNav('cart');
      CartPage.render();
    });

    Router.register('account', function (section) {
      _setActiveNav('account');
      AccountPage.render(section);
    });

    Router.register('admin', function () {
      _setActiveNav('account');
      AdminPage.render();
    });

    Router.register('nexus', function () {
      _setActiveNav('');
      _renderNexusPage();
    });

    Router.register('404', function () {
      Router.navigate('home');
    });
  }

  function _setActiveNav(route) {
    // Desktop nav links
    document.querySelectorAll('.nav-link[data-route]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.route === route);
    });
    // Mobile nav items
    document.querySelectorAll('.mobile-nav-item[data-route]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.route === route);
    });
    // Scroll to top
    window.scrollTo(0, 0);
  }

  // ── Lightbox ───────────────────────────────────────────────────
  function _setupLightbox() {
    var lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.id === 'lightbox-close-btn') {
        lb.classList.add('hidden');
      }
    });
  }

  // ── Mobile bottom nav ──────────────────────────────────────────
  function _setupMobileNav() {
    document.querySelectorAll('.mobile-nav-item[data-route]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Router.navigate(this.dataset.route);
      });
    });
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────
  function _setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      // Escape closes lightbox or dropdowns
      if (e.key === 'Escape') {
        var lb = document.getElementById('lightbox');
        if (lb && !lb.classList.contains('hidden')) { lb.classList.add('hidden'); return; }
        _closeDropdown();
        // Close mobile sidebar if open
        var sidebar = document.getElementById('catalog-sidebar');
        if (sidebar) sidebar.classList.remove('open');
      }
    });
  }

  // ── Nexus page (standalone link) ───────────────────────────────
  function _renderNexusPage() {
    var view = document.getElementById('page-view');
    view.innerHTML = '<div class="page-container" style="max-width:760px">'
      + '<div style="text-align:center;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:3rem 2rem">'
      + '<div style="width:4rem;height:4rem;border-radius:var(--radius-xl);background:var(--bg-main);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">'
      + Utils.Icons.nexus.replace('<svg', '<svg style="width:2rem;height:2rem;color:var(--text-main)"')
      + '</div>'
      + '<h2 style="margin-bottom:.75rem">Inventory Nexus</h2>'
      + '<p style="font-size:.9375rem;color:var(--text-secondary);max-width:440px;margin:0 auto 2rem;line-height:1.65">Upload custom files, map data columns, and consolidate inventory information. A powerful extension for streamlined inventory management.</p>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:480px;margin:0 auto 2rem;text-align:left">'
      + '<div style="padding:1rem;background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md)">'
      + '<div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.375rem;color:var(--green)">Upload &amp; Map</div>'
      + '<p style="font-size:.75rem;color:var(--text-secondary);line-height:1.55">Upload CSV/Excel and map columns to specific data fields dynamically.</p>'
      + '</div>'
      + '<div style="padding:1rem;background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md)">'
      + '<div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.375rem">Bulk Extraction</div>'
      + '<p style="font-size:.75rem;color:var(--text-secondary);line-height:1.55">Perform rapid bulk UPC searches against uploaded datasets instantly.</p>'
      + '</div>'
      + '</div>'
      + '<a href="https://inventorynexus.brnddirect.com/" target="_blank" class="btn btn-primary btn-lg">Launch Nexus Environment'
      + '<svg style="width:1rem;height:1rem;margin-left:.375rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>'
      + '</a>'
      + '</div>'
      + '</div>';
  }

})();

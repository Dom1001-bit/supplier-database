/* ============================================================
   js/pages/account.js — Full account page with polished dropdown,
   company profile, API keys, settings, API docs
   ============================================================ */

const AccountPage = (() => {
  let _activeSection = localStorage.getItem('acct_last_section') || 'profile'; // #11 remember last
  let _isAdmin = false;

  async function render(section) {
    _activeSection = section || localStorage.getItem('acct_last_section') || 'profile';
    const view = document.getElementById('page-view');
    const user = auth.currentUser;
    if (!user) { Router.navigate('home'); return; }

    // Check admin status
    try {
      const snap = await Collections.adminUsers.doc(user.uid).get();
      _isAdmin = snap.exists;
    } catch(e) { _isAdmin = false; }

    view.innerHTML = '<div class="page-container" style="max-width:960px">'
      + '<h2 style="margin-bottom:1.5rem">Account</h2>'
      + '<div class="account-layout">'
      + _renderSidebar(user)
      + '<div id="account-panel-container">' + _loadingPanel() + '</div>'
      + '</div>'
      + '</div>';

    _bindSidebarNav();
    _loadSection(_activeSection, user);
  }

  function _renderSidebar(user) {
    const initials = (user.email || 'U').slice(0, 2).toUpperCase();
    return '<div class="account-sidebar-nav">'
      + '<div style="padding:.75rem .625rem;border-bottom:1px solid var(--border-color);margin-bottom:.375rem">'
      + '<div style="display:flex;align-items:center;gap:.625rem">'
      + '<div style="width:2rem;height:2rem;border-radius:50%;background:linear-gradient(135deg,var(--accent-color),var(--text-secondary));display:flex;align-items:center;justify-content:center;font-size:.6875rem;font-weight:700;color:var(--accent-text);flex-shrink:0">' + initials + '</div>'
      + '<div style="min-width:0"><div style="font-size:.8125rem;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + e(user.email) + '</div></div>'
      + '</div>'
      + '</div>'
      + '<div class="account-nav-section-label">Account</div>'
      + _navItem('profile', Utils.Icons.user, 'Profile & Company')
      + _navItem('password', Utils.Icons.key, 'Password')
      + '<div class="account-nav-divider"></div>'
      + '<div class="account-nav-section-label">API</div>'
      + _navItem('apikeys', Utils.Icons.key, 'API Keys')
      + _navItem('apidocs', Utils.Icons.docs, 'API Docs')
      + '<div class="account-nav-divider"></div>'
      + '<div class="account-nav-section-label">Preferences</div>'
      + _navItem('settings', Utils.Icons.settings, 'Settings')
      + (_isAdmin ? '<div class="account-nav-divider"></div><div class="account-nav-section-label">Admin</div>' + _navItem('admin-redirect', Utils.Icons.admin, 'Admin Panel', 'admin') : '')
      + '</div>';
  }

  function _navItem(id, icon, label, badge) {
    return '<button class="account-nav-item' + (_activeSection === id ? ' active' : '') + '" data-section="' + id + '">'
      + icon.replace('<svg', '<svg style="width:1rem;height:1rem"')
      + '<span style="flex:1">' + label + '</span>'
      + (badge ? '<span class="dropdown-item-badge admin">' + badge + '</span>' : '')
      + '</button>';
  }

  function _bindSidebarNav() {
    document.querySelectorAll('.account-nav-item[data-section]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var section = this.dataset.section;
        if (section === 'admin-redirect') { Router.navigate('admin'); return; }
        document.querySelectorAll('.account-nav-item').forEach(function(b){ b.classList.remove('active'); });
        this.classList.add('active');
        _activeSection = section;
        localStorage.setItem('acct_last_section', section); // #11 save last section
        _loadSection(section, auth.currentUser);
      });
    });
  }

  function _loadSection(section, user) {
    const container = document.getElementById('account-panel-container');
    if (!container) return;
    switch(section) {
      case 'profile': _renderProfile(container, user); break;
      case 'password': _renderPassword(container, user); break;
      case 'apikeys': _renderApiKeys(container, user); break;
      case 'apidocs': _renderApiDocs(container); break;
      case 'settings': _renderSettings(container, user); break;
      default: _renderProfile(container, user);
    }
  }

  // ── Profile & Company ──────────────────────────────────────────
  async function _renderProfile(container, user) {
    container.innerHTML = _loadingPanel();
    var profile = {};
    try {
      var snap = await Collections.userProfiles.doc(user.uid).get();
      if (snap.exists) profile = snap.data();
    } catch(e) {}

    container.innerHTML = '<div class="account-panel">'
      + '<div class="account-panel-header"><h2>Profile &amp; Company</h2><p style="font-size:.75rem;color:var(--text-secondary);margin-top:.25rem">Your account information and company details</p></div>'
      + '<div class="account-panel-body">'

      // Account info
      + '<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:1rem">'
      + '<div style="width:3rem;height:3rem;border-radius:50%;background:linear-gradient(135deg,var(--accent-color),var(--text-secondary));display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:var(--accent-text);flex-shrink:0">'
      + (user.email||'U').slice(0,2).toUpperCase()
      + '</div>'
      + '<div>'
      + '<div style="font-size:.9375rem;font-weight:600">' + e(user.email) + '</div>'
      + '<div style="font-size:.75rem;color:var(--text-secondary);margin-top:.125rem">UID: <span style="font-family:var(--font-mono)">' + e(user.uid) + '</span></div>'
      // #12 Last sign-in info
      + (user.metadata && user.metadata.lastSignInTime
        ? '<div style="font-size:.6875rem;color:var(--text-muted);margin-top:.25rem">Last login: ' + e(new Date(user.metadata.lastSignInTime).toLocaleString()) + '</div>'
        : '')
      + '</div>'
      + '</div>'

      // Company form
      + '<h4 style="margin-bottom:1rem">Company Details</h4>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.875rem;margin-bottom:1rem">'
      + _field('company-name', 'Company Name', profile.companyName||'', 'text', 'Acme Corp')
      + _field('contact-name', 'Contact Name', profile.contactName||'', 'text', 'John Doe')
      + _field('phone', 'Phone', profile.phone||'', 'tel', '+1 (555) 000-0000')
      + _field('website', 'Website', profile.website||'', 'url', 'https://example.com')
      + '</div>'
      + '<div style="margin-bottom:1rem">'
      + _field('address-line1', 'Address Line 1', profile.addressLine1||'', 'text', '123 Main St')
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.875rem;margin-bottom:1.25rem">'
      + _field('city', 'City', profile.city||'', 'text', 'New York')
      + _field('state', 'State / Region', profile.state||'', 'text', 'NY')
      + _field('zip', 'ZIP / Postal', profile.zip||'', 'text', '10001')
      + '</div>'
      + '<div style="margin-bottom:1.25rem">'
      + _field('country', 'Country', profile.country||'', 'text', 'United States')
      + '</div>'
      + '<div id="profile-msg" class="hidden" style="margin-bottom:.75rem"></div>'
      + '<button id="save-profile-btn" class="btn btn-primary">Save Profile</button>'
      + '</div>'
      + '</div>';

    Utils.onClick('#save-profile-btn', async function(){
      var btn = this;
      btn.disabled = true; btn.innerHTML = '<span class="loader loader-sm"></span> Saving...';
      var data = {
        companyName: document.getElementById('company-name')?.value||'',
        contactName: document.getElementById('contact-name')?.value||'',
        phone: document.getElementById('phone')?.value||'',
        website: document.getElementById('website')?.value||'',
        addressLine1: document.getElementById('address-line1')?.value||'',
        city: document.getElementById('city')?.value||'',
        state: document.getElementById('state')?.value||'',
        zip: document.getElementById('zip')?.value||'',
        country: document.getElementById('country')?.value||'',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      try {
        await Collections.userProfiles.doc(user.uid).set(data, { merge: true });
        Utils.toast('Profile saved!', 'success');
        // Update dropdown company badge
        var badge = document.getElementById('dropdown-company-badge');
        if (badge && data.companyName) {
          var badgeSpan = badge.querySelector('span');
          if (badgeSpan) badgeSpan.textContent = data.companyName;
          badge.classList.remove('hidden');
        }
      } catch(err) {
        Utils.toast('Error: ' + err.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Save Profile';
      }
    });
  }

  // ── Password change ────────────────────────────────────────────
  function _renderPassword(container, user) {
    container.innerHTML = '<div class="account-panel">'
      + '<div class="account-panel-header"><h2>Change Password</h2></div>'
      + '<div class="account-panel-body">'
      + '<div style="max-width:400px">'
      + '<div class="form-group">' + '<label>Current Password</label><input type="password" id="cur-pw" autocomplete="current-password" style="width:100%"></div>'
      + '<div class="form-group"><label>New Password (min 6 chars)</label><input type="password" id="new-pw" autocomplete="new-password" style="width:100%"></div>'
      + '<div class="form-group"><label>Confirm New Password</label><input type="password" id="confirm-pw" autocomplete="new-password" style="width:100%"></div>'
      + '<button id="change-pw-btn" class="btn btn-primary" style="width:100%">Update Password</button>'
      + '</div>'
      + '</div>'
      + '</div>';

    Utils.onClick('#change-pw-btn', async function(){
      var btn = this;
      var cur = document.getElementById('cur-pw')?.value;
      var nw = document.getElementById('new-pw')?.value;
      var conf = document.getElementById('confirm-pw')?.value;
      if (!cur || !nw) { Utils.toast('Fill in all fields', 'error'); return; }
      if (nw !== conf) { Utils.toast('Passwords do not match', 'error'); return; }
      if (nw.length < 6) { Utils.toast('Password must be at least 6 characters', 'error'); return; }
      btn.disabled = true; btn.innerHTML = '<span class="loader loader-sm"></span>';
      try {
        var cred = firebase.auth.EmailAuthProvider.credential(user.email, cur);
        await user.reauthenticateWithCredential(cred);
        await user.updatePassword(nw);
        Utils.toast('Password updated successfully!', 'success');
        document.getElementById('cur-pw').value = '';
        document.getElementById('new-pw').value = '';
        document.getElementById('confirm-pw').value = '';
      } catch(err) {
        Utils.toast('Error: ' + err.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Update Password';
      }
    });
  }

  // ── API Keys ───────────────────────────────────────────────────
  async function _renderApiKeys(container, user) {
    container.innerHTML = _loadingPanel();
    var keyData = null;
    try {
      var snap = await Collections.apiKeys.doc(user.uid).get();
      if (snap.exists) keyData = snap.data();
    } catch(e) {}

    // Load usage
    var usageCount = 0;
    try {
      var ts24h = firebase.firestore.Timestamp.fromMillis(Date.now() - 24*3600*1000);
      var logSnap = await Collections.apiLogs.where('userId','==',user.uid).where('timestamp','>=',ts24h).get();
      usageCount = logSnap.size;
    } catch(e) {}

    container.innerHTML = '<div class="account-panel">'
      + '<div class="account-panel-header"><h2>API Keys</h2><p style="font-size:.75rem;color:var(--text-secondary);margin-top:.25rem">Manage your secret keys for API integrations</p></div>'
      + '<div class="account-panel-body">'

      + (keyData ? `
        <div style="margin-bottom:1.5rem">
          <label>Secret Key</label>
          <div class="key-display" style="margin-top:.375rem">
            <input type="password" class="key-input" id="api-key-val" value="${e(keyData.key)}" readonly>
            <button id="toggle-key-vis" class="icon-btn" title="Show/hide key">${Utils.Icons.eye}</button>
            <button id="copy-key-btn" class="btn btn-secondary btn-sm">Copy</button>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:.5rem">
            <button id="revoke-key-btn" class="btn btn-danger btn-sm">Revoke &amp; Regenerate</button>
          </div>
        </div>` :
        `<div style="background:var(--bg-main);border:2px dashed var(--border-color);border-radius:var(--radius-lg);padding:2rem;text-align:center;margin-bottom:1.5rem">
          <p style="font-size:.875rem;color:var(--text-secondary);margin-bottom:1rem">No API key generated yet</p>
          <button id="gen-key-btn" class="btn btn-primary">Generate API Key</button>
        </div>`)

      + '<div style="margin-bottom:1.5rem">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.375rem">'
      + '<span style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-secondary)">Daily Usage</span>'
      + '<span style="font-size:.8125rem;font-family:var(--font-mono);font-weight:600">' + usageCount + ' / 300</span>'
      + '</div>'
      + '<div class="usage-bar"><div class="usage-bar-fill' + (usageCount >= 250 ? ' danger' : usageCount >= 200 ? ' warning' : '') + '" style="width:' + Math.min((usageCount/300)*100, 100).toFixed(1) + '%"></div></div>'
      + '</div>'
      + '</div>'
      + '</div>';

    // Toggle visibility
    Utils.onClick('#toggle-key-vis', function(){
      var inp = document.getElementById('api-key-val');
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // Copy
    Utils.onClick('#copy-key-btn', function(){
      var inp = document.getElementById('api-key-val');
      if (!inp) return;
      navigator.clipboard.writeText(inp.value).then(function(){
        Utils.toast('API key copied!', 'success');
      });
    });

    // Generate
    Utils.onClick('#gen-key-btn', function(){ _generateKey(container, user); });
    Utils.onClick('#revoke-key-btn', function(){
      if (!confirm('Revoke current key and generate a new one? This will immediately invalidate your existing key.')) return;
      _generateKey(container, user);
    });
  }

  async function _generateKey(container, user) {
    var newKey = Utils.generateApiKey();
    try {
      await Collections.apiKeys.doc(user.uid).set({ key: newKey, userId: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      Utils.toast('New API key generated', 'success');
      _renderApiKeys(container, user);
    } catch(err) {
      Utils.toast('Error: ' + err.message, 'error');
    }
  }

  // ── API Docs ───────────────────────────────────────────────────
  function _renderApiDocs(container) {
    container.innerHTML = '<div class="account-panel">'
      + '<div class="account-panel-header"><h2>API Documentation</h2><p style="font-size:.75rem;color:var(--text-secondary);margin-top:.25rem">Integrate your system with live inventory data</p></div>'
      + '<div class="account-panel-body">'
      + '<div class="api-doc-section">'
      + '<h5 style="margin-bottom:.625rem">Base URL</h5>'
      + '<pre>https://supplier-api-977359606390.us-central1.run.app</pre>'
      + '</div>'
      + '<div class="api-doc-section">'
      + '<h5 style="margin-bottom:.625rem">Authentication</h5>'
      + '<pre>Authorization: Bearer YOUR_API_KEY</pre>'
      + '</div>'
      + '<div class="api-doc-section">'
      + '<h5 style="margin-bottom:.625rem">Endpoints</h5>'
      + '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem"><span class="api-endpoint-badge"><span class="method-get">GET</span> /</span></div>'
      + '<ul style="list-style:disc;list-style-position:inside;font-size:.8125rem;color:var(--text-secondary);line-height:1.8;margin-left:.5rem">'
      + '<li><code>limit</code> — max 250</li>'
      + '<li><code>sku</code>, <code>upc</code> — exact match filter</li>'
      + '<li><code>cursor</code> — pagination cursor</li>'
      + '</ul>'
      + '</div>'
      + '<div class="api-doc-section">'
      + '<h5 style="margin-bottom:.625rem">Response Format</h5>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">'
      + '<div><p style="font-size:.75rem;color:var(--text-secondary);margin-bottom:.375rem">Browse:</p>'
      + '<pre>{\n  "meta": {\n    "rate_limit_remaining": 299,\n    "per_page": 250,\n    "next_page_cursor": "..."\n  },\n  "data": [...]\n}</pre></div>'
      + '<div><p style="font-size:.75rem;color:var(--text-secondary);margin-bottom:.375rem">Filtered:</p>'
      + '<pre>{\n  "meta": {\n    "rate_limit_remaining": 298,\n    "total": 1,\n    "per_page": 250\n  },\n  "data": [...]\n}</pre></div>'
      + '</div>'
      + '</div>'
      + '<div class="api-doc-section">'
      + '<h5 style="margin-bottom:.625rem">Data Fields</h5>'
      + '<ul style="list-style:disc;list-style-position:inside;font-size:.8125rem;color:var(--text-secondary);line-height:2;margin-left:.5rem">'
      + '<li><code>sku</code>, <code>upc</code>, <code>asin</code> — Identifiers</li>'
      + '<li><code>itemName</code>, <code>brand</code>, <code>size</code>, <code>category</code>, <code>description</code>, <code>imageUrl</code> — Product details</li>'
      + '<li><code>msrp</code> — Suggested retail price</li>'
      + '<li><code>lastUpdate</code> — Record last updated timestamp</li>'
      + '<li><code>supplier_X_name</code>, <code>supplier_X_price</code>, <code>supplier_X_inventory</code> — Flattened supplier data (sorted by price)</li>'
      + '</ul>'
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between">'
      + '<h5>Rate Limit</h5>'
      + '<div style="background:var(--bg-main);border:1px solid var(--border-color);padding:.25rem .75rem;border-radius:var(--radius-sm);font-size:.8125rem;font-family:var(--font-mono)"><strong>300</strong> req / 24h</div>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  // ── Settings ───────────────────────────────────────────────────
  function _renderSettings(container, user) {
    const isLight = Store.getTheme() === 'light';
    container.innerHTML = '<div class="account-panel">'
      + '<div class="account-panel-header"><h2>Settings</h2></div>'
      + '<div class="account-panel-body">'
      + '<h4 style="margin-bottom:1rem">Appearance</h4>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:.875rem 1rem;background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:1.25rem">'
      + '<div>'
      + '<div style="font-size:.875rem;font-weight:500">Dark Mode</div>'
      + '<div style="font-size:.75rem;color:var(--text-secondary)">Toggle between dark and light theme</div>'
      + '</div>'
      + '<button id="settings-theme-toggle" class="btn btn-secondary btn-sm">'
      + (isLight ? '&#9790; Enable Dark Mode' : '&#9788; Enable Light Mode')
      + '</button>'
      + '</div>'
      + '<h4 style="margin-bottom:1rem">Data</h4>'
      + '<div style="display:flex;flex-direction:column;gap:.625rem;margin-bottom:1.25rem">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md)">'
      + '<div><div style="font-size:.875rem;font-weight:500">Saved Products</div><div style="font-size:.75rem;color:var(--text-secondary)">' + Store.getFavoriteCount() + ' items</div></div>'
      + '<button id="clear-favs-setting" class="btn btn-danger btn-sm">Clear</button>'
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md)">'
      + '<div><div style="font-size:.875rem;font-weight:500">Quote Cart</div><div style="font-size:.75rem;color:var(--text-secondary)">' + Store.getCartCount() + ' items</div></div>'
      + '<button id="clear-cart-setting" class="btn btn-danger btn-sm">Clear</button>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</div>';

    Utils.onClick('#settings-theme-toggle', function(){
      var t = Store.toggleTheme();
      Utils.toast('Switched to ' + t + ' mode', 'info');
      _renderSettings(container, user);
    });

    Utils.onClick('#clear-favs-setting', function(){
      if (!confirm('Remove all saved products?')) return;
      Store.saveFavorites([]);
      Utils.toast('Favorites cleared', 'info');
      _renderSettings(container, user);
    });

    Utils.onClick('#clear-cart-setting', function(){
      if (!confirm('Clear your quote cart?')) return;
      Store.clearCart();
      Utils.toast('Cart cleared', 'info');
      _renderSettings(container, user);
    });
  }

  // ── Helpers ────────────────────────────────────────────────────
  function _loadingPanel() {
    return '<div class="account-panel"><div class="account-panel-body" style="display:flex;justify-content:center;padding:3rem"><div class="loader"></div></div></div>';
  }

  function _field(id, labelText, value, type, placeholder) {
    return '<div class="form-group"><label>' + labelText + '</label>'
      + '<input type="' + type + '" id="' + id + '" value="' + e(value) + '" placeholder="' + e(placeholder) + '" style="width:100%">'
      + '</div>';
  }

  function e(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render };
})();

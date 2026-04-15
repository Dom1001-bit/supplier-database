/* ============================================================
   js/pages/admin.js — Admin-only import/upload tools
   Admin access controlled by Firestore 'adminUsers' collection
   ============================================================ */

const AdminPage = (() => {
  let _isAdmin = false;

  async function render() {
    const view = document.getElementById('page-view');
    const user = auth.currentUser;

    if (!user) { Router.navigate('home'); return; }

    // Show loading
    view.innerHTML = '<div class="page-container"><div style="display:flex;justify-content:center;padding:4rem"><div class="loader loader-lg"></div></div></div>';

    // Check admin status in Firestore
    try {
      const snap = await Collections.adminUsers.doc(user.uid).get();
      _isAdmin = snap.exists;
    } catch(err) {
      _isAdmin = false;
    }

    if (!_isAdmin) {
      _renderAccessDenied(view, user);
      return;
    }

    _renderAdminPanel(view, user);
  }

  function _renderAccessDenied(view, user) {
    view.innerHTML = '<div class="page-container" style="max-width:480px">'
      + '<div style="text-align:center;padding:4rem 2rem;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-xl)">'
      + '<div style="width:4rem;height:4rem;border-radius:50%;background:var(--red-bg);border:1px solid rgba(239,68,68,.2);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">'
      + '<svg style="width:1.75rem;height:1.75rem;color:var(--red)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>'
      + '</div>'
      + '<h2 style="margin-bottom:.5rem">Access Restricted</h2>'
      + '<p style="font-size:.875rem;color:var(--text-secondary);margin-bottom:.5rem">This area is for administrators only.</p>'
      + '<p style="font-size:.75rem;color:var(--text-muted);margin-bottom:1.5rem;font-family:var(--font-mono)">' + e(user.email) + '</p>'
      + '<div style="font-size:.75rem;color:var(--text-muted);background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:.75rem 1rem;margin-bottom:1.5rem;text-align:left">'
      + 'To gain admin access, your account UID must be added to the <code>adminUsers</code> Firestore collection by an existing administrator.'
      + '</div>'
      + '<button class="btn btn-secondary" onclick="Router.navigate(\'home\')">Back to Home</button>'
      + '</div>'
      + '</div>';
  }

  function _renderAdminPanel(view, user) {
    view.innerHTML = '<div class="page-container" style="max-width:1000px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem">'
      + '<div>'
      + '<div style="display:flex;align-items:center;gap:.625rem;margin-bottom:.25rem">'
      + '<h2>Admin Panel</h2>'
      + '<span class="badge badge-amber">Admin</span>'
      + '</div>'
      + '<p style="font-size:.8125rem;color:var(--text-secondary)">Logged in as ' + e(user.email) + '</p>'
      + '</div>'
      + '</div>'

      // Stats
      + '<div id="admin-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.75rem;margin-bottom:2rem">'
      + [1,2,3,4].map(function(){ return '<div class="skeleton" style="height:80px;border-radius:var(--radius-lg)"></div>'; }).join('')
      + '</div>'

      // Upload section
      + '<div class="card" style="padding:1.5rem;margin-bottom:1.5rem">'
      + '<h4 style="margin-bottom:1rem">Import Products</h4>'
      + '<p style="font-size:.8125rem;color:var(--text-secondary);margin-bottom:1.25rem">Upload a CSV or Excel file to bulk-import products into the database. Existing records will be merged by SKU.</p>'

      + '<div class="upload-zone" id="upload-zone">'
      + '<div style="margin-bottom:.75rem">'
      + Utils.Icons.upload.replace('<svg', '<svg style="width:2rem;height:2rem;color:var(--text-secondary);margin:0 auto .5rem;display:block"')
      + '</div>'
      + '<div style="font-size:.875rem;font-weight:600;margin-bottom:.25rem">Drop CSV or Excel file here</div>'
      + '<div style="font-size:.75rem;color:var(--text-secondary);margin-bottom:1rem">or click to browse</div>'
      + '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'file-input\').click()">Choose File</button>'
      + '<input type="file" id="file-input" accept=".csv,.xlsx,.xls" style="display:none">'
      + '</div>'

      + '<div id="file-preview" class="hidden" style="margin-top:1rem">'
      + '<div id="preview-table-wrap" style="overflow-x:auto;max-height:300px;border:1px solid var(--border-color);border-radius:var(--radius-md)"></div>'
      + '<div style="margin-top:.75rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem">'
      + '<span id="preview-row-count" style="font-size:.75rem;color:var(--text-secondary)"></span>'
      + '<div style="display:flex;gap:.5rem">'
      + '<button id="clear-file-btn" class="btn btn-secondary btn-sm">Clear</button>'
      + '<button id="import-btn" class="btn btn-primary btn-sm">Import to Database</button>'
      + '</div>'
      + '</div>'
      + '</div>'

      + '<div id="import-progress" class="hidden" style="margin-top:1rem">'
      + '<div style="font-size:.75rem;color:var(--text-secondary);margin-bottom:.375rem" id="import-status-text">Importing...</div>'
      + '<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:2px;height:6px;overflow:hidden">'
      + '<div id="import-bar" style="height:100%;background:var(--green);transition:width .3s;width:0%"></div>'
      + '</div>'
      + '</div>'
      + '</div>'

      // Manage Admins section
      + '<div class="card" style="padding:1.5rem;margin-bottom:1.5rem">'
      + '<h4 style="margin-bottom:.75rem">Manage Admins</h4>'
      + '<p style="font-size:.8125rem;color:var(--text-secondary);margin-bottom:1rem">Grant or revoke admin access. Admins are stored by UID in the <code>adminUsers</code> Firestore collection.</p>'
      + '<div style="display:flex;gap:.5rem;margin-bottom:1rem">'
      + '<input type="text" id="new-admin-uid" placeholder="Firebase UID to grant admin..." style="flex:1">'
      + '<button id="add-admin-btn" class="btn btn-primary btn-sm">Grant Admin</button>'
      + '</div>'
      + '<div id="admin-list" style="font-size:.8125rem;color:var(--text-secondary)">Loading admins...</div>'
      + '</div>'

      // Invited users
      + '<div class="card" style="padding:1.5rem">'
      + '<h4 style="margin-bottom:.75rem">Invite Users</h4>'
      + '<p style="font-size:.8125rem;color:var(--text-secondary);margin-bottom:1rem">Add email addresses to the invite list. Only invited users can register.</p>'
      + '<div style="display:flex;gap:.5rem;margin-bottom:1rem">'
      + '<input type="email" id="invite-email" placeholder="user@example.com"style="flex:1">'
      + '<button id="add-invite-btn" class="btn btn-primary btn-sm">Add Invite</button>'
      + '</div>'
      + '<div id="invite-list" style="font-size:.8125rem;color:var(--text-secondary)">Loading...</div>'
      + '</div>'
      + '</div>';

    _loadAdminStats();
    _loadAdminList();
    _loadInviteList();
    _bindUploadEvents();
    _bindAdminEvents();
  }

  async function _loadAdminStats() {
    try {
      var productsSnap = await Collections.products.limit(1).get();
      // We can't get total count cheaply, show approximate
      document.getElementById('admin-stats').innerHTML = [
        _statCard('Products', '100+', 'Live in DB'),
        _statCard('Admins', '—', 'Loading...'),
        _statCard('Invites', '—', 'Loading...'),
        _statCard('Quotes', '—', 'Pending review'),
      ].join('');
    } catch(e) {}
  }

  async function _loadAdminList() {
    var el = document.getElementById('admin-list');
    if (!el) return;
    try {
      var snap = await Collections.adminUsers.get();
      if (snap.empty) { el.innerHTML = '<span style="color:var(--text-muted)">No other admins</span>'; return; }
      var html = '<div style="display:flex;flex-direction:column;gap:.375rem">';
      snap.forEach(function(doc){
        var d = doc.data();
        html += '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-main);border:1px solid var(--border-color);padding:.5rem .75rem;border-radius:var(--radius-sm)">'
          + '<span style="font-family:var(--font-mono);font-size:.75rem">' + e(doc.id) + (d.email ? ' (' + e(d.email) + ')' : '') + '</span>'
          + '<button class="btn btn-danger btn-sm" onclick="AdminPage.removeAdmin(\'' + e(doc.id) + '\')" style="font-size:.6875rem">Revoke</button>'
          + '</div>';
      });
      el.innerHTML = html + '</div>';
    } catch(err) {
      el.innerHTML = '<span style="color:var(--red)">Error: ' + err.message + '</span>';
    }
  }

  async function removeAdmin(uid) {
    if (!confirm('Revoke admin access for UID: ' + uid + '?')) return;
    try {
      await Collections.adminUsers.doc(uid).delete();
      Utils.toast('Admin access revoked', 'success');
      _loadAdminList();
    } catch(err) {
      Utils.toast('Error: ' + err.message, 'error');
    }
  }

  async function _loadInviteList() {
    var el = document.getElementById('invite-list');
    if (!el) return;
    try {
      var snap = await Collections.invitedUsers.limit(50).get();
      if (snap.empty) { el.innerHTML = '<span style="color:var(--text-muted)">No invites yet</span>'; return; }
      var html = '<div style="display:flex;flex-wrap:wrap;gap:.375rem">';
      snap.forEach(function(doc){
        html += '<div style="display:flex;align-items:center;gap:.375rem;background:var(--bg-main);border:1px solid var(--border-color);padding:.25rem .625rem;border-radius:1rem;font-size:.75rem">'
          + e(doc.id)
          + '<button onclick="AdminPage.removeInvite(\'' + e(doc.id) + '\')" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:0;line-height:1;font-size:.75rem" title="Remove">&#x2715;</button>'
          + '</div>';
      });
      el.innerHTML = html + '</div>';
    } catch(err) {
      el.innerHTML = '<span style="color:var(--red)">Error: ' + err.message + '</span>';
    }
  }

  async function removeInvite(email) {
    if (!confirm('Remove invite for ' + email + '?')) return;
    try {
      await Collections.invitedUsers.doc(email).delete();
      Utils.toast('Invite removed', 'info');
      _loadInviteList();
    } catch(err) {
      Utils.toast('Error: ' + err.message, 'error');
    }
  }

  function _bindAdminEvents() {
    Utils.onClick('#add-admin-btn', async function(){
      var uid = document.getElementById('new-admin-uid')?.value.trim();
      if (!uid) { Utils.toast('Enter a UID', 'error'); return; }
      try {
        await Collections.adminUsers.doc(uid).set({ grantedAt: firebase.firestore.FieldValue.serverTimestamp() });
        Utils.toast('Admin access granted', 'success');
        document.getElementById('new-admin-uid').value = '';
        _loadAdminList();
      } catch(err) {
        Utils.toast('Error: ' + err.message, 'error');
      }
    });

    Utils.onClick('#add-invite-btn', async function(){
      var email = document.getElementById('invite-email')?.value.trim().toLowerCase();
      if (!email || !email.includes('@')) { Utils.toast('Enter a valid email', 'error'); return; }
      try {
        await Collections.invitedUsers.doc(email).set({ invitedAt: firebase.firestore.FieldValue.serverTimestamp() });
        Utils.toast('Invite added for ' + email, 'success');
        document.getElementById('invite-email').value = '';
        _loadInviteList();
      } catch(err) {
        Utils.toast('Error: ' + err.message, 'error');
      }
    });
  }

  function _bindUploadEvents() {
    var zone = document.getElementById('upload-zone');
    var fileInput = document.getElementById('file-input');

    if (zone) {
      zone.addEventListener('dragover', function(ev){ ev.preventDefault(); this.classList.add('drag-over'); });
      zone.addEventListener('dragleave', function(){ this.classList.remove('drag-over'); });
      zone.addEventListener('drop', function(ev){
        ev.preventDefault(); this.classList.remove('drag-over');
        var file = ev.dataTransfer.files[0];
        if (file) _handleFile(file);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function(){
        if (this.files[0]) _handleFile(this.files[0]);
      });
    }
  }

  function _handleFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (!['csv','xlsx','xls'].includes(ext)) {
      Utils.toast('Only CSV and Excel files are supported', 'error');
      return;
    }

    var reader = new FileReader();
    reader.onload = function(ev){
      var rows = [];
      if (ext === 'csv') {
        var result = Papa.parse(ev.target.result, { header: true, skipEmptyLines: true });
        rows = result.data;
      } else {
        var wb = XLSX.read(ev.target.result, { type: 'binary' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
      }
      _previewData(rows, file.name);
    };

    if (ext === 'csv') reader.readAsText(file);
    else reader.readAsBinaryString(file);
  }

  function _previewData(rows, filename) {
    if (!rows.length) { Utils.toast('No data found in file', 'error'); return; }
    var previewEl = document.getElementById('file-preview');
    var tableWrap = document.getElementById('preview-table-wrap');
    var countEl = document.getElementById('preview-row-count');
    if (!previewEl || !tableWrap) return;

    var headers = Object.keys(rows[0]);
    var tableHtml = '<table class="data-table" style="font-size:.6875rem">'
      + '<thead><tr>' + headers.map(function(h){ return '<th>' + e(h) + '</th>'; }).join('') + '</tr></thead>'
      + '<tbody>'
      + rows.slice(0, 20).map(function(row){ return '<tr>' + headers.map(function(h){ return '<td>' + e(String(row[h]||'')) + '</td>'; }).join('') + '</tr>'; }).join('')
      + (rows.length > 20 ? '<tr><td colspan="' + headers.length + '" style="text-align:center;color:var(--text-muted);padding:.5rem">... ' + (rows.length - 20) + ' more rows</td></tr>' : '')
      + '</tbody></table>';

    tableWrap.innerHTML = tableHtml;
    if (countEl) countEl.textContent = rows.length + ' rows from ' + filename;
    previewEl.classList.remove('hidden');

    // Store rows for import
    window._pendingImportRows = rows;

    Utils.onClick('#clear-file-btn', function(){
      previewEl.classList.add('hidden');
      window._pendingImportRows = null;
      document.getElementById('file-input').value = '';
    });

    Utils.onClick('#import-btn', function(){
      _runImport(rows);
    });
  }

  async function _runImport(rows) {
    var progressEl = document.getElementById('import-progress');
    var barEl = document.getElementById('import-bar');
    var statusEl = document.getElementById('import-status-text');
    var importBtn = document.getElementById('import-btn');
    if (importBtn) importBtn.disabled = true;
    if (progressEl) progressEl.classList.remove('hidden');

    var total = rows.length;
    var done = 0;
    var batchSize = 400; // Firestore batch limit is 500

    // Process in Firestore batches
    for (var i = 0; i < total; i += batchSize) {
      var chunk = rows.slice(i, i + batchSize);
      var batch = db.batch();
      chunk.forEach(function(row){
        var sku = String(row.sku || row.SKU || row.Sku || '').trim();
        if (!sku) return;
        var ref = Collections.products.doc(sku);
        var data = {};
        Object.keys(row).forEach(function(k){ data[k] = row[k]; });
        data.sku = sku;
        if (data.itemName) data.itemName_lowercase = String(data.itemName).toLowerCase();
        batch.set(ref, data, { merge: true });
      });
      try {
        await batch.commit();
        done += chunk.length;
        var pct = Math.round((done / total) * 100);
        if (barEl) barEl.style.width = pct + '%';
        if (statusEl) statusEl.textContent = 'Imported ' + done + ' of ' + total + ' rows...';
      } catch(err) {
        Utils.toast('Import error: ' + err.message, 'error');
        if (importBtn) importBtn.disabled = false;
        return;
      }
    }

    if (statusEl) statusEl.textContent = 'Import complete! ' + total + ' records processed.';
    Utils.toast(total + ' products imported successfully', 'success');
    if (importBtn) { importBtn.disabled = false; importBtn.textContent = 'Import Complete ✓'; }
    window._pendingImportRows = null;
  }

  function _statCard(title, value, sub) {
    return '<div class="stat-card">'
      + '<div class="stat-value">' + e(String(value)) + '</div>'
      + '<div class="stat-label">' + e(title) + '</div>'
      + (sub ? '<div style="font-size:.625rem;color:var(--text-muted);margin-top:.125rem">' + e(sub) + '</div>' : '')
      + '</div>';
  }

  function e(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render, removeAdmin, removeInvite };
})();

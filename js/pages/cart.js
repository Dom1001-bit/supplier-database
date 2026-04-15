/* ============================================================
   js/pages/cart.js — Quote cart + Firestore quote submission
   ============================================================ */

const CartPage = (() => {

  function render() {
    const view = document.getElementById('page-view');
    const cart = Store.getCart();

    view.innerHTML = '<div class="page-container" style="max-width:860px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem">'
      + '<div>'
      + '<h2>Quote Cart</h2>'
      + '<p style="font-size:.8125rem;color:var(--text-secondary);margin-top:.25rem">' + cart.length + ' product' + (cart.length !== 1 ? 's' : '') + ' ready for quoting</p>'
      + '</div>'
      + '<div style="display:flex;gap:.5rem;flex-wrap:wrap">'
      + '<button id="copy-upcs-btn" class="btn btn-secondary btn-sm">Copy UPCs</button>'
      + '<button id="export-quote-csv-btn" class="btn btn-success btn-sm">Export CSV</button>'
      + '<button id="clear-cart-btn" class="btn btn-danger btn-sm">Clear All</button>'
      + '</div>'
      + '</div>'

      + (cart.length === 0 ? _emptyCart() : _cartContents(cart))
      + '</div>';

    _bindEvents(cart);
  }

  function _emptyCart() {
    return '<div class="empty-state">'
      + '<div class="empty-state-icon">' + Utils.Icons.cart + '</div>'
      + '<h3>Your Quote Cart is Empty</h3>'
      + '<p>Add products from the catalog to build your quote request.</p>'
      + '<button class="btn btn-secondary" onclick="Router.navigate(\'catalog\')">Browse Catalog</button>'
      + '</div>';
  }

  function _cartContents(cart) {
    return '<div class="card" style="margin-bottom:1rem">'
      + cart.map(function(item){
        var lp = item.lowestPrice;
        var imgUrl = (item.imageUrl && String(item.imageUrl).trim()) ? item.imageUrl : Utils.PLACEHOLDER_IMG;
        return '<div class="cart-item" data-sku="' + e(item.sku) + '">'
          + '<div class="cart-item-img"><img src="' + imgUrl + '" alt="' + e(item.itemName) + '" onerror="this.src=\'' + Utils.PLACEHOLDER_IMG + '\'"></div>'
          + '<div style="min-width:0">'
          + '<div style="font-size:.875rem;font-weight:600;margin-bottom:.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + e(item.itemName) + '</div>'
          + '<div style="display:flex;align-items:center;gap:.375rem;flex-wrap:wrap;margin-bottom:.5rem">'
          + '<span class="card-brand-chip" style="font-size:.6rem">' + e(item.brand||'—') + '</span>'
          + '<span style="font-size:.6875rem;color:var(--text-muted);font-family:var(--font-mono)">' + e(item.upc||'') + '</span>'
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:.625rem;flex-wrap:wrap">'
          + '<div class="qty-control">'
          + '<button class="qty-btn qty-minus" data-sku="' + e(item.sku) + '">&#x2212;</button>'
          + '<span class="qty-value" data-sku-qty="' + e(item.sku) + '">' + (item.qty||1) + '</span>'
          + '<button class="qty-btn qty-plus" data-sku="' + e(item.sku) + '">&#x2B;</button>'
          + '</div>'
          + '<input type="text" placeholder="Notes for this item..." class="cart-notes-input" data-sku="' + e(item.sku) + '" value="' + e(item.notes||'') + '" style="flex:1;min-width:120px;font-size:.75rem;padding:.3125rem .5rem">'
          + '</div>'
          + '</div>'
          + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:.375rem">'
          + '<span style="font-family:var(--font-mono);font-weight:700;font-size:.9375rem;color:' + (lp && lp !== -1 ? 'var(--green)' : 'var(--text-secondary)') + '">' + (lp && lp !== -1 ? '$'+lp.toFixed(2) : 'N/A') + '</span>'
          + '<button class="btn btn-ghost btn-sm remove-item-btn" data-sku="' + e(item.sku) + '" style="color:var(--red);font-size:.6875rem;padding:.25rem .5rem">'
          + '<svg style="width:.75rem;height:.75rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
          + '</button>'
          + '</div>'
          + '</div>';
      }).join('')
      + '</div>'

      // Quote submission form
      + '<div class="card" style="padding:1.5rem;margin-bottom:1rem">'
      + '<h4 style="margin-bottom:1rem">Submit Quote Request</h4>'
      + '<div id="quote-submit-success" class="hidden quote-success-banner" style="margin-bottom:1rem">'
      + '<div class="quote-success-icon"><svg style="width:1.125rem;height:1.125rem;color:#fff" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>'
      + '<div>'
      + '<div style="font-size:.875rem;font-weight:600;color:var(--green)">Quote Submitted!</div>'
      + '<div id="quote-id-display" style="font-size:.75rem;color:var(--text-secondary);margin-top:.25rem"></div>'
      + '</div>'
      + '</div>'
      + '<div id="quote-form-body">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">'
      + '<div class="form-group"><label>Company Name</label><input type="text" id="quote-company" placeholder="Your company name"></div>'
      + '<div class="form-group"><label>Contact Name</label><input type="text" id="quote-contact" placeholder="Your name"></div>'
      + '<div class="form-group"><label>Email</label><input type="email" id="quote-email" placeholder="your@email.com"></div>'
      + '<div class="form-group"><label>Phone (optional)</label><input type="tel" id="quote-phone" placeholder="+1 (555) 000-0000"></div>'
      + '</div>'
      + '<div class="form-group"><label>Quote Notes</label><textarea id="quote-global-notes" rows="3" placeholder="Any special requirements, shipping details, or notes for the entire quote..."></textarea></div>'
      + '<button class="btn btn-primary w-full" id="submit-quote-btn" style="margin-top:.25rem">'
      + '<svg style="width:.875rem;height:.875rem" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      + 'Submit Quote Request'
      + '</button>'
      + '</div>'
      + '</div>';
  }

  function _bindEvents(cart) {
    // Qty controls
    document.querySelectorAll('.qty-minus').forEach(function(btn){
      btn.addEventListener('click', function(){
        var sku = this.dataset.sku;
        var cartItem = Store.getCart().find(function(i){ return i.sku === sku; });
        if (!cartItem) return;
        var newQty = Math.max(1, (cartItem.qty||1) - 1);
        Store.updateCartItem(sku, { qty: newQty });
        var el = document.querySelector('[data-sku-qty="' + sku + '"]');
        if (el) el.textContent = newQty;
      });
    });

    document.querySelectorAll('.qty-plus').forEach(function(btn){
      btn.addEventListener('click', function(){
        var sku = this.dataset.sku;
        var cartItem = Store.getCart().find(function(i){ return i.sku === sku; });
        if (!cartItem) return;
        var newQty = (cartItem.qty||1) + 1;
        Store.updateCartItem(sku, { qty: newQty });
        var el = document.querySelector('[data-sku-qty="' + sku + '"]');
        if (el) el.textContent = newQty;
      });
    });

    // Notes
    document.querySelectorAll('.cart-notes-input').forEach(function(inp){
      inp.addEventListener('blur', function(){
        Store.updateCartItem(this.dataset.sku, { notes: this.value });
      });
    });

    // Remove
    document.querySelectorAll('.remove-item-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var sku = this.dataset.sku;
        Store.removeFromCart(sku);
        Utils.toast('Removed from cart', 'info');
        render();
      });
    });

    // Clear all
    Utils.onClick('#clear-cart-btn', function(){
      if (!confirm('Clear all items from your quote cart?')) return;
      Store.clearCart();
      render();
    });

    // Copy UPCs
    Utils.onClick('#copy-upcs-btn', function(){
      var upcs = Store.getCart().map(function(i){ return i.upc||i.sku; }).join('\n');
      navigator.clipboard.writeText(upcs).then(function(){
        Utils.toast('UPCs copied to clipboard!', 'success');
      });
    });

    // Export CSV
    Utils.onClick('#export-quote-csv-btn', function(){
      var rows = [['SKU','UPC','Item Name','Brand','Best Price','Qty','Notes']];
      Store.getCart().forEach(function(item){
        rows.push([item.sku, item.upc||'', item.itemName||'', item.brand||'', item.lowestPrice && item.lowestPrice !== -1 ? '$'+item.lowestPrice.toFixed(2) : 'N/A', item.qty||1, item.notes||'']);
      });
      Utils.downloadCSV(rows, 'quote_request.csv');
      Utils.toast('Quote CSV exported', 'success');
    });

    // Submit quote to Firestore
    Utils.onClick('#submit-quote-btn', async function(){
      var btn = this;
      var company = document.getElementById('quote-company')?.value.trim();
      var contact = document.getElementById('quote-contact')?.value.trim();
      var email = document.getElementById('quote-email')?.value.trim();
      var phone = document.getElementById('quote-phone')?.value.trim();
      var notes = document.getElementById('quote-global-notes')?.value.trim();

      if (!company || !contact || !email) {
        Utils.toast('Please fill in Company, Contact, and Email fields', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="loader loader-sm"></span> Submitting...';

      var cartData = Store.getCart();
      var user = auth.currentUser;

      try {
        var quoteDoc = {
          status: 'pending',
          submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
          userId: user ? user.uid : null,
          userEmail: user ? user.email : email,
          company: company,
          contact: contact,
          email: email,
          phone: phone || '',
          notes: notes || '',
          items: cartData.map(function(item){
            return {
              sku: item.sku,
              upc: item.upc || '',
              itemName: item.itemName || '',
              brand: item.brand || '',
              bestPrice: item.lowestPrice || null,
              qty: item.qty || 1,
              notes: item.notes || ''
            };
          }),
          itemCount: cartData.length
        };

        var ref = await Collections.quotes.add(quoteDoc);

        // Show success
        var successBanner = document.getElementById('quote-submit-success');
        var formBody = document.getElementById('quote-form-body');
        var quoteIdDisplay = document.getElementById('quote-id-display');
        if (successBanner) successBanner.classList.remove('hidden');
        if (formBody) formBody.classList.add('hidden');
        if (quoteIdDisplay) quoteIdDisplay.textContent = 'Quote ID: ' + ref.id;

        Utils.toast('Quote request submitted!', 'success');

        // Pre-fill with saved profile if available
      } catch (err) {
        Utils.toast('Error submitting quote: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Submit Quote Request';
      }
    });

    // Pre-fill email from auth
    var user = auth.currentUser;
    if (user) {
      var emailInp = document.getElementById('quote-email');
      if (emailInp && !emailInp.value) emailInp.value = user.email;
    }

    // Pre-fill from saved company profile
    _prefillFromProfile();
  }

  async function _prefillFromProfile() {
    var user = auth.currentUser;
    if (!user) return;
    try {
      var snap = await Collections.userProfiles.doc(user.uid).get();
      if (snap.exists) {
        var p = snap.data();
        var companyInp = document.getElementById('quote-company');
        var contactInp = document.getElementById('quote-contact');
        var phoneInp = document.getElementById('quote-phone');
        if (companyInp && !companyInp.value && p.companyName) companyInp.value = p.companyName;
        if (contactInp && !contactInp.value && p.contactName) contactInp.value = p.contactName;
        if (phoneInp && !phoneInp.value && p.phone) phoneInp.value = p.phone;
      }
    } catch(e) { /* ignore */ }
  }

  function e(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render };
})();

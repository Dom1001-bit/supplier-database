/* ============================================================
   js/auth.js — Authentication UI
   ============================================================ */

const Auth = (() => {

  function init(onUser) {
    // Auth state listener
    auth.onAuthStateChanged(user => {
      if (user) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        onUser(user);
      } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        showForm('login');
      }
    });

    // Form event bindings
    _bindForms();
  }

  function showForm(name) {
    ['login', 'signup', 'forgot'].forEach(f => {
      const form = document.getElementById(`${f}-form`);
      if (form) form.classList.toggle('hidden', f !== name);
    });
    const titles = {
      login:  ['Welcome back',      'Sign in to access your supplier database.'],
      signup: ['Create your account', 'Your email must be on the approved invite list.'],
      forgot: ['Reset your password', 'We\'ll send a reset link to your email address.'],
    };
    const [title, subtitle] = titles[name] || titles.login;
    const t = document.getElementById('auth-title');
    const s = document.getElementById('auth-subtitle');
    if (t) t.textContent = title;
    if (s) s.textContent = subtitle;
    clearMsg();
  }

  function showMsg(msg, type = 'error') {
    const el = document.getElementById('auth-message');
    if (!el) return;
    el.textContent = msg;
    el.className = type === 'success'
      ? 'auth-msg success'
      : 'auth-msg error';
    el.classList.remove('hidden');
  }

  function clearMsg() {
    const el = document.getElementById('auth-message');
    if (el) el.classList.add('hidden');
  }

  function _bindForms() {
    // Show signup
    document.getElementById('show-signup-btn')?.addEventListener('click', () => showForm('signup'));
    document.getElementById('show-forgot-btn')?.addEventListener('click', () => showForm('forgot'));
    document.getElementById('back-login-from-signup')?.addEventListener('click', () => showForm('login'));
    document.getElementById('back-login-from-forgot')?.addEventListener('click', () => showForm('login'));

    // Login
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const btn = document.getElementById('login-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loader loader-sm"></span>';
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        showMsg(_friendlyError(err.code));
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });

    // Signup
    document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const btn = document.getElementById('signup-btn');
      if (password.length < 6) { showMsg('Password must be at least 6 characters.'); return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="loader loader-sm"></span>';
      try {
        const snap = await Collections.invitedUsers.doc(email.toLowerCase()).get();
        if (!snap.exists) {
          showMsg('Access denied. Your email is not on the invite list.');
          btn.disabled = false; btn.textContent = 'Create Account';
          return;
        }
        await auth.createUserWithEmailAndPassword(email, password);
      } catch (err) {
        showMsg(_friendlyError(err.code));
        btn.disabled = false; btn.textContent = 'Create Account';
      }
    });

    // Forgot password
    document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('reset-email').value;
      const btn = document.getElementById('reset-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loader loader-sm"></span>';
      try {
        await auth.sendPasswordResetEmail(email);
        showMsg('Reset link sent! Check your email.', 'success');
      } catch (err) {
        showMsg(_friendlyError(err.code));
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
      }
    });
  }

  function _friendlyError(code) {
    const map = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  return { init, showForm };
})();

/**
 * LOST & FOUND CAMPUS PORTAL - AUTHENTICATION LOGIC
 */

function isAuthenticated() {
  return !!getAuthToken();
}

function getCurrentUser() {
  return getStoredUser();
}

// Redirect protection helper
function requireAuth(redirectUrl = '/login.html') {
  if (!isAuthenticated()) {
    const current = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${redirectUrl}?returnUrl=${current}`;
    return false;
  }
  return true;
}

// If already authenticated and visits login/signup, redirect to dashboard
function redirectIfAuthenticated(targetUrl = '/dashboard.html') {
  if (isAuthenticated()) {
    window.location.href = targetUrl;
    return true;
  }
  return false;
}

// Perform Logout
function logoutUser() {
  removeAuthToken();
  removeStoredUser();
  showToast('Logged out successfully. See you soon!', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 500);
}

// Wire up login form if present
function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  redirectIfAuthenticated();

  // Check URL params for expired message
  const params = new URLSearchParams(window.location.search);
  if (params.get('expired')) {
    showToast('Your session has expired. Please log in again.', 'warning');
  }

  // Quick Demo account fill buttons
  const demoRohanBtn = document.getElementById('fill-demo-rohan');
  if (demoRohanBtn) {
    demoRohanBtn.addEventListener('click', () => {
      document.getElementById('email').value = 'rohan@campus.edu';
      document.getElementById('password').value = 'password123';
      showToast('Filled Rohan Sharma credentials!', 'info');
    });
  }

  const demoPriyaBtn = document.getElementById('fill-demo-priya');
  if (demoPriyaBtn) {
    demoPriyaBtn.addEventListener('click', () => {
      document.getElementById('email').value = 'priya.sharma@campus.edu';
      document.getElementById('password').value = 'password123';
      showToast('Filled Priya Sharma credentials!', 'info');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-small"></span> Logging in...';

      const data = await authAPI.login({ email, password });
      setAuthToken(data.token);
      setStoredUser(data.user);

      showToast(data.message || 'Login successful!', 'success');

      // Check returnUrl
      const returnUrl = params.get('returnUrl') ? decodeURIComponent(params.get('returnUrl')) : '/dashboard.html';
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 600);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// Wire up signup form if present
function setupSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  redirectIfAuthenticated();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !phone || !password) {
      showToast('All fields are required.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-small"></span> Creating account...';

      const data = await authAPI.signup({ name, email, phone, password });
      setAuthToken(data.token);
      setStoredUser(data.user);

      showToast(data.message || 'Account created successfully!', 'success');

      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 700);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupLoginForm();
  setupSignupForm();
});

/**
 * LOST & FOUND CAMPUS PORTAL - NAVBAR CONTROLLER
 * Dynamically mounts & manages navbar state, authentication status, and mobile menu
 */

function renderNavbar() {
  const navContainer = document.getElementById('navbar');
  if (!navContainer) return;

  const user = getStoredUser();
  const loggedIn = isAuthenticated() && user;
  const currentPath = window.location.pathname;

  const isActive = (path) => {
    if (path === '/' && (currentPath === '/' || currentPath.endsWith('index.html'))) return 'active';
    return currentPath.includes(path) ? 'active' : '';
  };

  const navHtml = `
    <div class="container nav-container">
      <a href="/index.html" class="brand-logo">
        <div class="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <div class="brand-text">
          Lost<span>&</span>Found
          <span class="brand-sub">Campus Portal</span>
        </div>
      </a>

      <!-- Desktop & Mobile Navigation Links -->
      <ul class="nav-links" id="nav-links">
        <li><a href="/index.html" class="nav-link ${isActive('/index.html')}">Home</a></li>
        <li><a href="/search.html" class="nav-link ${isActive('/search.html')}">Browse Items</a></li>
        ${
          loggedIn
            ? `
          <li><a href="/dashboard.html" class="nav-link ${isActive('/dashboard.html')}">Dashboard</a></li>
          <li><a href="/my-posts.html" class="nav-link ${isActive('/my-posts.html')}">My Posts</a></li>
          <li><a href="/report-lost.html" class="nav-link ${isActive('/report-lost.html')}">Report Lost</a></li>
          <li><a href="/report-found.html" class="nav-link ${isActive('/report-found.html')}">Report Found</a></li>
        `
            : ''
        }
      </ul>

      <!-- Nav Actions (Auth Buttons or User Profile) -->
      <div class="nav-actions">
        ${
          loggedIn
            ? `
          <div style="position: relative;" id="user-dropdown-wrapper">
            <button class="user-menu-btn" id="user-menu-btn" aria-label="User Menu">
              <span class="user-avatar">${(user.name || 'U').charAt(0).toUpperCase()}</span>
              <span class="user-name" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.name.split(' ')[0]}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div id="user-dropdown" style="display: none; position: absolute; right: 0; top: 115%; width: 210px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); padding: 0.5rem; z-index: 1001;">
              <div style="padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 0.4rem;">
                <div style="font-weight: 700; font-size: 0.88rem; color: #fff;">${user.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis;">${user.email}</div>
              </div>
              <a href="/profile.html" class="nav-link" style="display: block; padding: 0.5rem 0.8rem;">Profile Settings</a>
              <a href="/my-posts.html" class="nav-link" style="display: block; padding: 0.5rem 0.8rem;">Manage My Posts</a>
              <button onclick="logoutUser()" style="width: 100%; text-align: left; background: transparent; border: none; padding: 0.5rem 0.8rem; color: var(--color-soft-pink); cursor: pointer; border-radius: var(--radius-sm); font-size: 0.88rem; font-family: inherit;">
                Sign Out
              </button>
            </div>
          </div>
          <a href="/report-lost.html" class="btn btn-primary btn-sm" style="display: inline-flex;">+ Report Item</a>
        `
            : `
          <a href="/login.html" class="btn btn-secondary btn-sm">Log In</a>
          <a href="/signup.html" class="btn btn-primary btn-sm">Sign Up</a>
        `
        }
        <button class="mobile-menu-toggle" id="mobile-toggle" aria-label="Toggle Menu">
          ☰
        </button>
      </div>
    </div>
  `;

  navContainer.innerHTML = navHtml;

  // Toggle user dropdown
  const userBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  if (userBtn && userDropdown) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      userDropdown.style.display = 'none';
    });
  }

  // Toggle mobile menu
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }
}

// Render universal footer
function renderFooter() {
  const footerContainer = document.getElementById('footer');
  if (!footerContainer) return;

  footerContainer.innerHTML = `
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <div class="brand-logo">
            <div class="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <div class="brand-text">Lost<span>&</span>Found <span class="brand-sub">Campus Portal</span></div>
          </div>
          <p>
            The dedicated college campus web platform for reporting, tracking, and reuniting lost belongings among students and staff safely.
          </p>
          <div style="margin-top: 1rem;">
            <span class="presentation-pill">
              🎓 College Campus &bull; <strong>Lost &amp; Found Portal</strong>
            </span>
          </div>
        </div>

        <div>
          <h4 class="footer-heading">Quick Actions</h4>
          <ul class="footer-links">
            <li><a href="/report-lost.html">Report Lost Item</a></li>
            <li><a href="/report-found.html">Report Found Item</a></li>
            <li><a href="/search.html">Search Campus Items</a></li>
            <li><a href="/dashboard.html">Student Dashboard</a></li>
          </ul>
        </div>

        <div>
          <h4 class="footer-heading">Campus Zones</h4>
          <ul class="footer-links">
            <li><a href="/search.html?location=Central+Library">Central Library</a></li>
            <li><a href="/search.html?location=Computer+Lab+2">Computer Lab 2</a></li>
            <li><a href="/search.html?location=Main+Canteen">Main Canteen</a></li>
            <li><a href="/search.html?location=Sports+Ground">Sports Complex</a></li>
          </ul>
        </div>

        <div>
          <h4 class="footer-heading">Built With</h4>
          <div class="tech-badges-grid">
            <span class="tech-badge-pill">HTML5</span>
            <span class="tech-badge-pill">CSS3</span>
            <span class="tech-badge-pill">JavaScript</span>
            <span class="tech-badge-pill">Node.js</span>
            <span class="tech-badge-pill">Express.js</span>
            <span class="tech-badge-pill">MongoDB</span>
            <span class="tech-badge-pill">Mongoose</span>
            <span class="tech-badge-pill">JWT</span>
            <span class="tech-badge-pill">Multer</span>
            <span class="tech-badge-pill">Bcrypt</span>
          </div>
          <p style="margin-top: 0.85rem; font-size: 0.8rem; color: var(--text-dim);">
            End-to-end REST API architecture with secure authentication & photo upload pipeline.
          </p>
        </div>
      </div>

      <div class="footer-bottom">
        <div>&copy; 2026 Lost & Found Campus Portal. All rights reserved.</div>
        <div>Designed with student privacy protection and secure contact verification.</div>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
});

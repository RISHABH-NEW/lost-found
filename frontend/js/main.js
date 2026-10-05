/**
 * LOST & FOUND CAMPUS PORTAL - LANDING & DASHBOARD CONTROLLER
 */

// Animate numbers
function animateCounter(element, target) {
  let count = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    count += step;
    if (count >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = count;
    }
  }, 35);
}

// Landing Page Controller
async function initLandingPage() {
  const statsContainer = document.getElementById('landing-stats');
  if (!statsContainer) return;

  // Setup hero search form
  const heroSearchForm = document.getElementById('hero-search-form');
  if (heroSearchForm) {
    heroSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = document.getElementById('hero-search-input').value.trim();
      window.location.href = `/search.html?search=${encodeURIComponent(query)}`;
    });
  }

  // Load live statistics
  try {
    const statsRes = await itemsAPI.getStats();
    const stats = statsRes.stats || {};

    const elTotal = document.getElementById('stat-total-items');
    const elResolved = document.getElementById('stat-resolved-items');
    const elLost = document.getElementById('stat-lost-items');
    const elFound = document.getElementById('stat-found-items');

    if (elTotal) animateCounter(elTotal, stats.totalItems || 0);
    if (elResolved) animateCounter(elResolved, stats.totalResolved || 0);
    if (elLost) animateCounter(elLost, stats.totalLost || 0);
    if (elFound) animateCounter(elFound, stats.totalFound || 0);
  } catch (err) {
    console.warn('Could not load statistics:', err);
  }

  // Load Recent Items Preview
  const recentGrid = document.getElementById('recent-items-grid');
  if (recentGrid) {
    try {
      const data = await itemsAPI.getAll({ limit: 6, status: 'Active' });
      const items = data.items || [];
      if (items.length === 0) {
        recentGrid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <p class="empty-state-text">No active campus items reported yet.</p>
          </div>
        `;
      } else {
        recentGrid.innerHTML = items.map(createItemCardHTML).join('');
      }
    } catch (err) {
      console.warn('Could not load recent items:', err);
    }
  }
}

// User Dashboard Page Controller
async function initDashboardPage() {
  const dashboardContainer = document.getElementById('dashboard-container');
  if (!dashboardContainer) return;

  if (!requireAuth()) return;

  const user = getCurrentUser();
  const userNameEl = document.getElementById('dash-user-name');
  if (userNameEl && user) {
    userNameEl.textContent = user.name;
  }

  // Load User's posts stats & summary
  try {
    const [myPostsData, statsData, recentItemsData] = await Promise.all([
      itemsAPI.getMyPosts(),
      itemsAPI.getStats(),
      itemsAPI.getAll({ limit: 4, status: 'Active' }),
    ]);

    // My Stats
    const myTotalEl = document.getElementById('my-stat-total');
    const myActiveEl = document.getElementById('my-stat-active');
    const myResolvedEl = document.getElementById('my-stat-resolved');

    if (myTotalEl) myTotalEl.textContent = myPostsData.count || 0;
    if (myActiveEl) myActiveEl.textContent = myPostsData.activeCount || 0;
    if (myResolvedEl) myResolvedEl.textContent = myPostsData.resolvedCount || 0;

    // Campus Overview
    const campusTotalEl = document.getElementById('campus-stat-total');
    const campusResolvedEl = document.getElementById('campus-stat-resolved');
    if (campusTotalEl) campusTotalEl.textContent = statsData.stats.totalItems || 0;
    if (campusResolvedEl) campusResolvedEl.textContent = statsData.stats.totalResolved || 0;

    // Recent items feed
    const recentFeed = document.getElementById('dash-recent-feed');
    if (recentFeed) {
      const items = recentItemsData.items || [];
      if (items.length === 0) {
        recentFeed.innerHTML = '<p class="text-muted">No recent campus items.</p>';
      } else {
        recentFeed.innerHTML = items.map(createItemCardHTML).join('');
      }
    }
  } catch (err) {
    console.error('Dashboard Load Error:', err);
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLandingPage();
  initDashboardPage();
});

/**
 * LOST & FOUND CAMPUS PORTAL - ITEMS & SEARCH CONTROLLER
 */

// Category icons map
const categoryIcons = {
  'Electronics': '💻',
  'Documents & IDs': '🪪',
  'Books & Stationery': '📚',
  'Clothing & Accessories': '🧥',
  'Keys & Wallets': '🔑',
  'Bags & Backpacks': '🎒',
  'Water Bottles': '🍶',
  'Other': '📦',
};

// Format Date nicely
function formatDate(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Render a single Item Card HTML
function createItemCardHTML(item) {
  const isLost = item.type === 'Lost';
  const isResolved = item.status === 'Resolved';
  const categoryIcon = categoryIcons[item.category] || '📦';

  const mediaHTML = item.imagePath
    ? `<img src="${item.imagePath}" alt="${item.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'item-card-placeholder\\'><span>${categoryIcon}</span><span>${item.category}</span></div>'">`
    : `<div class="item-card-placeholder">
        <span style="font-size:2.5rem;">${categoryIcon}</span>
        <span style="font-size:0.8rem; color:var(--text-dim);">${item.category}</span>
       </div>`;

  const statusBadge = isResolved
    ? `<span class="badge badge-resolved">✓ Resolved</span>`
    : `<span class="badge ${isLost ? 'badge-lost' : 'badge-found'}">${isLost ? '⚠️ Lost' : '🔍 Found'}</span>`;

  return `
    <div class="item-card" data-id="${item._id}">
      <div class="item-card-media">
        ${mediaHTML}
        <div class="item-card-tag">
          ${statusBadge}
        </div>
      </div>
      <div class="item-card-body">
        <div class="item-card-meta">
          <span>📅 ${formatDate(item.date || item.createdAt)}</span>
          <span>•</span>
          <span>📍 ${item.location}</span>
        </div>
        <h3 class="item-card-title">${item.title}</h3>
        <p class="item-card-desc">${item.description}</p>
        
        <div class="item-card-info-chips">
          <span class="info-chip">🏷️ ${item.category}</span>
          <span class="info-chip">📍 ${item.location}</span>
        </div>

        <div class="item-card-footer">
          <div class="item-card-poster">
            Posted by <strong>${item.postedBy ? item.postedBy.name : 'Student'}</strong>
          </div>
          <a href="/item-details.html?id=${item._id}" class="btn btn-outline btn-sm">
            View Details &rarr;
          </a>
        </div>
      </div>
    </div>
  `;
}

// Search and Browse Page Controller
function initSearchPage() {
  const grid = document.getElementById('items-grid');
  if (!grid) return;

  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-filter');
  const locationSelect = document.getElementById('location-filter');
  const statusSelect = document.getElementById('status-filter');
  const sortSelect = document.getElementById('sort-filter');
  const typeTabs = document.querySelectorAll('.filter-tab');
  const countDisplay = document.getElementById('results-count');

  let currentType = ''; // '' for All, 'Lost', 'Found'

  // Read URL query params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('type')) currentType = urlParams.get('type');
  if (urlParams.get('category') && categorySelect) categorySelect.value = urlParams.get('category');
  if (urlParams.get('location') && locationSelect) locationSelect.value = urlParams.get('location');
  if (urlParams.get('search') && searchInput) searchInput.value = urlParams.get('search');
  if (urlParams.get('status') && statusSelect) statusSelect.value = urlParams.get('status');

  // Activate matching tab
  typeTabs.forEach((tab) => {
    if (tab.dataset.type === currentType || (!currentType && tab.dataset.type === '')) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }

    tab.addEventListener('click', () => {
      typeTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
      fetchAndRenderItems();
    });
  });

  // Debounced search
  let debounceTimer;
  const triggerSearch = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchAndRenderItems, 280);
  };

  if (searchInput) searchInput.addEventListener('input', triggerSearch);
  if (categorySelect) categorySelect.addEventListener('change', fetchAndRenderItems);
  if (locationSelect) locationSelect.addEventListener('change', fetchAndRenderItems);
  if (statusSelect) statusSelect.addEventListener('change', fetchAndRenderItems);
  if (sortSelect) sortSelect.addEventListener('change', fetchAndRenderItems);

  async function fetchAndRenderItems() {
    grid.innerHTML = '<div class="loading-spinner"></div>';

    const params = {
      search: searchInput ? searchInput.value.trim() : '',
      type: currentType || '',
      category: categorySelect ? categorySelect.value : '',
      location: locationSelect ? locationSelect.value : '',
      status: statusSelect ? statusSelect.value : 'all',
      sort: sortSelect ? sortSelect.value : 'newest',
    };

    try {
      const data = await itemsAPI.getAll(params);
      const items = data.items || [];

      if (countDisplay) {
        countDisplay.textContent = `Showing ${items.length} ${items.length === 1 ? 'item' : 'items'}`;
      }

      if (items.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🔍</div>
            <h3 class="empty-state-title">No matching campus items found</h3>
            <p class="empty-state-text">
              Try adjusting your search keywords, clearing filters, or check back later.
            </p>
            <button class="btn btn-secondary btn-sm" onclick="resetSearchFilters()">Clear All Filters</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = items.map(createItemCardHTML).join('');
    } catch (err) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">⚠️</div>
          <h3 class="empty-state-title">Error loading items</h3>
          <p class="empty-state-text">${err.message}</p>
        </div>
      `;
    }
  }

  // Clear filters helper
  window.resetSearchFilters = () => {
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (locationSelect) locationSelect.value = '';
    if (statusSelect) statusSelect.value = 'all';
    currentType = '';
    typeTabs.forEach((t) => t.classList.toggle('active', t.dataset.type === ''));
    fetchAndRenderItems();
  };

  // Initial load
  fetchAndRenderItems();
}

// Item Details Page Controller
async function initItemDetailsPage() {
  const container = document.getElementById('item-details-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  if (!itemId) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Item ID Missing</h3>
        <p class="empty-state-text">No item ID specified. Please return to the search page.</p>
        <a href="/search.html" class="btn btn-primary">Browse All Items</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const data = await itemsAPI.getById(itemId);
    const item = data.item;
    const isOwner = data.isOwner;
    const isAuth = data.isAuthenticated;

    const isLost = item.type === 'Lost';
    const isResolved = item.status === 'Resolved';
    const categoryIcon = categoryIcons[item.category] || '📦';

    // Image section
    const imageHTML = item.imagePath
      ? `<div style="border-radius: var(--radius-lg); overflow: hidden; background: #070d1a; border: 1px solid var(--border-subtle); max-height: 480px; display: flex; align-items: center; justify-content: center;">
          <img src="${item.imagePath}" alt="${item.title}" style="max-height: 480px; width: 100%; object-fit: contain;">
        </div>`
      : `<div style="border-radius: var(--radius-lg); background: #0c1527; border: 1px solid var(--border-subtle); height: 320px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: var(--text-dim);">
          <span style="font-size: 4rem;">${categoryIcon}</span>
          <span>No photograph provided for this item</span>
        </div>`;

    // Contact Box
    let contactHTML = '';
    if (isAuth) {
      const poster = item.postedBy || {};
      contactHTML = `
        <div class="card" style="background: rgba(14, 25, 48, 0.85); border-color: rgba(56, 189, 248, 0.3);">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div class="brand-icon" style="width: 2.5rem; height: 2.5rem; font-size: 1.1rem;">
              👤
            </div>
            <div>
              <h4 style="margin: 0; font-size: 1.05rem;">Posted by ${poster.name || 'Student'}</h4>
              <span style="font-size: 0.8rem; color: var(--color-found);">✓ Verified Campus Student</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; font-size: 0.95rem;">
            <div style="display: flex; justify-content: space-between; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted);">📧 Email:</span>
              <strong><a href="mailto:${poster.email}">${poster.email}</a></strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted);">📞 Phone:</span>
              <strong style="color: var(--accent-blue);">${poster.phone}</strong>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <a href="tel:${poster.phone}" class="btn btn-primary" style="flex: 1;">
              📞 Call Student
            </a>
            <a href="https://wa.me/${poster.phone.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" class="btn btn-success" style="flex: 1;">
              💬 WhatsApp
            </a>
          </div>
        </div>
      `;
    } else {
      contactHTML = `
        <div class="card" style="background: rgba(14, 25, 48, 0.85); border-color: rgba(244, 63, 94, 0.25); text-align: center; padding: 2rem 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔒</div>
          <h4 style="margin-bottom: 0.5rem; color: #fff;">Contact Details Protected</h4>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.25rem;">
            To prevent spam and protect student privacy, personal phone numbers and direct email links are only revealed to authenticated campus members.
          </p>
          <a href="/login.html?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}" class="btn btn-primary btn-block">
            Log In to View Contact Details & Claim
          </a>
        </div>
      `;
    }

    // Owner management controls
    let ownerControlsHTML = '';
    if (isOwner) {
      ownerControlsHTML = `
        <div class="card" style="margin-top: 1.5rem; border-color: rgba(99, 102, 241, 0.4); background: rgba(18, 22, 45, 0.9);">
          <div class="flex-between" style="flex-wrap: wrap; gap: 1rem;">
            <div>
              <h4 style="color: #fff; margin-bottom: 0.25rem;">Post Management (Owner)</h4>
              <span style="font-size: 0.82rem; color: var(--text-muted);">You created this post on ${formatDate(item.createdAt)}.</span>
            </div>
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button onclick="toggleResolveStatus('${item._id}', '${item.status}')" class="btn ${isResolved ? 'btn-secondary' : 'btn-success'} btn-sm">
                ${isResolved ? '↺ Reopen Post' : '✓ Mark as Resolved'}
              </button>
              <button onclick="openDeleteDialog('${item._id}')" class="btn btn-danger btn-sm">
                🗑 Delete Post
              </button>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <a href="/search.html" style="color: var(--text-muted); font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem;">
          &larr; Back to all items
        </a>
      </div>

      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2.5rem;" class="item-details-layout">
        <!-- Left: Image & Description -->
        <div>
          ${imageHTML}
          
          <div class="card" style="margin-top: 1.5rem;">
            <h3 style="font-size: 1.25rem; margin-bottom: 0.75rem; color: #fff;">Item Description</h3>
            <p style="color: var(--text-main); font-size: 1rem; line-height: 1.7; white-space: pre-wrap;">${item.description}</p>
          </div>

          ${ownerControlsHTML}
        </div>

        <!-- Right: Meta details & Contact Card -->
        <div>
          <div class="card" style="margin-bottom: 1.5rem;">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
              <span class="badge ${isLost ? 'badge-lost' : 'badge-found'}" style="font-size: 0.85rem; padding: 0.35rem 0.85rem;">
                ${isLost ? '⚠️ Reported Lost' : '🔍 Reported Found'}
              </span>
              <span class="badge ${isResolved ? 'badge-resolved' : 'badge-pill'}" style="font-size: 0.85rem; padding: 0.35rem 0.85rem;">
                Status: ${item.status}
              </span>
            </div>

            <h1 style="font-size: 2rem; margin-bottom: 1.25rem; line-height: 1.25;">${item.title}</h1>

            <div style="display: flex; flex-direction: column; gap: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1.25rem; font-size: 0.95rem;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">🏷️ Category:</span>
                <strong>${item.category}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">📍 Campus Location:</span>
                <strong style="color: var(--accent-blue);">${item.location}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">📅 Date ${isLost ? 'Lost' : 'Found'}:</span>
                <strong>${formatDate(item.date)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">🕒 Posted On:</span>
                <span>${formatDate(item.createdAt)}</span>
              </div>
            </div>
          </div>

          <!-- Contact / Claim Box -->
          ${contactHTML}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Item Not Found</h3>
        <p class="empty-state-text">${err.message}</p>
        <a href="/search.html" class="btn btn-primary">Browse All Items</a>
      </div>
    `;
  }
}

// Global toggle resolve helper for item-details page
window.toggleResolveStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === 'Active' ? 'Resolved' : 'Active';
  try {
    await itemsAPI.resolve(id, newStatus);
    showToast(`Status updated to ${newStatus}!`, 'success');
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Global delete dialog helper
window.openDeleteDialog = (id) => {
  const confirmDelete = confirm('Are you sure you want to permanently delete this post? This action cannot be undone.');
  if (confirmDelete) {
    itemsAPI.delete(id)
      .then(() => {
        showToast('Post deleted successfully.', 'success');
        setTimeout(() => window.location.href = '/my-posts.html', 700);
      })
      .catch((err) => showToast(err.message, 'error'));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initSearchPage();
  initItemDetailsPage();
});

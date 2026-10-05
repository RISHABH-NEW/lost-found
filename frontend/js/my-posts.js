/**
 * LOST & FOUND CAMPUS PORTAL - MY POSTS CONTROLLER
 * Allows logged-in students to manage, edit, resolve, and delete their own posts
 */

let userPosts = [];
let activeFilter = 'all';

async function loadMyPosts() {
  const container = document.getElementById('my-posts-container');
  if (!container) return;

  if (!requireAuth()) return;

  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const data = await itemsAPI.getMyPosts();
    userPosts = data.items || [];

    // Update stats counters
    const totalCountEl = document.getElementById('stat-total');
    const activeCountEl = document.getElementById('stat-active');
    const resolvedCountEl = document.getElementById('stat-resolved');

    if (totalCountEl) totalCountEl.textContent = data.count || 0;
    if (activeCountEl) activeCountEl.textContent = data.activeCount || 0;
    if (resolvedCountEl) resolvedCountEl.textContent = data.resolvedCount || 0;

    renderFilteredPosts();
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Error Loading Posts</h3>
        <p class="empty-state-text">${err.message}</p>
      </div>
    `;
  }
}

function renderFilteredPosts() {
  const container = document.getElementById('my-posts-container');
  if (!container) return;

  let filtered = [...userPosts];

  if (activeFilter === 'Active') {
    filtered = filtered.filter((p) => p.status === 'Active');
  } else if (activeFilter === 'Resolved') {
    filtered = filtered.filter((p) => p.status === 'Resolved');
  } else if (activeFilter === 'Lost') {
    filtered = filtered.filter((p) => p.type === 'Lost');
  } else if (activeFilter === 'Found') {
    filtered = filtered.filter((p) => p.type === 'Found');
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📝</div>
        <h3 class="empty-state-title">${userPosts.length === 0 ? 'You haven’t posted any items yet' : 'No posts match this filter'}</h3>
        <p class="empty-state-text">
          ${userPosts.length === 0 ? 'Report a lost or found campus item to help your peers and recover belongings quickly.' : 'Switch to another filter tab to view your other posts.'}
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
          <a href="/report-lost.html" class="btn btn-primary">Report Lost Item</a>
          <a href="/report-found.html" class="btn btn-secondary">Report Found Item</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const isLost = item.type === 'Lost';
      const isResolved = item.status === 'Resolved';
      const categoryIcon = categoryIcons[item.category] || '📦';

      const mediaHTML = item.imagePath
        ? `<img src="${item.imagePath}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">`
        : `<div class="item-card-placeholder">
            <span style="font-size:2.5rem;">${categoryIcon}</span>
            <span style="font-size:0.8rem; color:var(--text-dim);">${item.category}</span>
           </div>`;

      return `
        <div class="card" style="display: flex; flex-direction: column; overflow: hidden; padding: 0;">
          <div style="height: 180px; background: #081020; position: relative;">
            ${mediaHTML}
            <div style="position: absolute; top: 0.75rem; left: 0.75rem;">
              <span class="badge ${isLost ? 'badge-lost' : 'badge-found'}">
                ${isLost ? '⚠️ Lost' : '🔍 Found'}
              </span>
            </div>
            <div style="position: absolute; top: 0.75rem; right: 0.75rem;">
              <span class="badge ${isResolved ? 'badge-resolved' : 'badge-found'}">
                ${item.status}
              </span>
            </div>
          </div>

          <div style="padding: 1.25rem; display: flex; flex-direction: column; flex: 1;">
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem;">
              📅 ${formatDate(item.date)} • 📍 ${item.location}
            </div>
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: #fff;">${item.title}</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${item.description}
            </p>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
              <span class="badge-pill">🏷️ ${item.category}</span>
              <span class="badge-pill">🕒 ${formatDate(item.createdAt)}</span>
            </div>

            <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.85rem; margin-top: auto; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button onclick="handleResolvePost('${item._id}', '${item.status}')" class="btn ${isResolved ? 'btn-secondary' : 'btn-success'} btn-sm" style="flex: 1;">
                ${isResolved ? '↺ Reopen' : '✓ Resolve'}
              </button>
              <button onclick="openEditPostModal('${item._id}')" class="btn btn-secondary btn-sm" style="flex: 1;">
                ✏️ Edit
              </button>
              <button onclick="handleDeletePost('${item._id}')" class="btn btn-danger btn-sm" title="Delete Post">
                🗑
              </button>
            </div>
            <div style="margin-top: 0.65rem; text-align: center;">
              <a href="/item-details.html?id=${item._id}" style="font-size: 0.82rem; color: var(--accent-blue);">
                View Public Listing &rarr;
              </a>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Handle Status Resolution
async function handleResolvePost(id, currentStatus) {
  const newStatus = currentStatus === 'Active' ? 'Resolved' : 'Active';
  try {
    await itemsAPI.resolve(id, newStatus);
    showToast(`Post marked as ${newStatus}!`, 'success');
    await loadMyPosts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Post Deletion
async function handleDeletePost(id) {
  const confirmed = confirm('Are you sure you want to delete this post? This cannot be undone.');
  if (!confirmed) return;

  try {
    await itemsAPI.delete(id);
    showToast('Post deleted successfully.', 'success');
    await loadMyPosts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Open Edit Modal
function openEditPostModal(id) {
  const item = userPosts.find((p) => p._id.toString() === id.toString());
  if (!item) return;

  const modal = document.getElementById('edit-modal');
  if (!modal) return;

  document.getElementById('edit-id').value = item._id;
  document.getElementById('edit-title').value = item.title;
  document.getElementById('edit-category').value = item.category;
  document.getElementById('edit-location').value = item.location;
  document.getElementById('edit-status').value = item.status;
  document.getElementById('edit-description').value = item.description;

  modal.classList.add('active');
}

function closeEditPostModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.classList.remove('active');
}

// Setup Edit Form listener
function setupEditModalForm() {
  const form = document.getElementById('edit-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const category = document.getElementById('edit-category').value;
    const location = document.getElementById('edit-location').value;
    const status = document.getElementById('edit-status').value;
    const description = document.getElementById('edit-description').value.trim();
    const fileInput = document.getElementById('edit-image-input');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('location', location);
    formData.append('status', status);
    formData.append('description', description);

    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Saving...';
      await itemsAPI.update(id, formData);
      showToast('Post updated successfully!', 'success');
      closeEditPostModal();
      await loadMyPosts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const filterPills = document.querySelectorAll('.post-filter-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      renderFilteredPosts();
    });
  });

  setupEditModalForm();
  loadMyPosts();
});

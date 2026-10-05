/**
 * LOST & FOUND CAMPUS PORTAL - REPORT FORMS HANDLER
 * Handles report-lost and report-found submissions, drag-and-drop, and photo preview
 */

function setupFileDropzone() {
  const dropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('image-input');
  const previewWrapper = document.getElementById('preview-wrapper');
  const previewImg = document.getElementById('preview-img');
  const removeBtn = document.getElementById('remove-img-btn');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG, WEBP).', 'error');
      fileInput.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file exceeds the 5MB size limit.', 'error');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImg && previewWrapper) {
        previewImg.src = e.target.result;
        previewWrapper.style.display = 'inline-block';
      }
    };
    reader.readAsDataURL(file);
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.value = '';
      if (previewWrapper) previewWrapper.style.display = 'none';
      if (previewImg) previewImg.src = '';
    });
  }
}

// Setup Report Item Forms
function setupReportForm(itemType) {
  const form = document.getElementById('report-item-form');
  if (!form) return;

  requireAuth();
  setupFileDropzone();

  // Set default date to today
  const dateInput = document.getElementById('date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    const location = document.getElementById('location').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value.trim();
    const fileInput = document.getElementById('image-input');

    if (!title || !category || !location || !description) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('type', itemType);
    formData.append('category', category);
    formData.append('location', location);
    formData.append('date', date || new Date().toISOString());
    formData.append('description', description);

    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-small"></span> Submitting report...';

      const res = await itemsAPI.create(formData);
      showToast(res.message || `${itemType} item reported successfully!`, 'success');

      setTimeout(() => {
        if (res.item && res.item._id) {
          window.location.href = `/item-details.html?id=${res.item._id}`;
        } else {
          window.location.href = '/my-posts.html';
        }
      }, 700);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const pageType = document.body.dataset.pageType;
  if (pageType === 'report-lost') {
    setupReportForm('Lost');
  } else if (pageType === 'report-found') {
    setupReportForm('Found');
  }
});

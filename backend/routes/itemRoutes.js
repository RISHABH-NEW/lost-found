const express = require('express');
const router = express.Router();
const {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  resolveItem,
  getMyPosts,
  getStats,
} = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public summary statistics
router.get('/stats/summary', getStats);

// User's own posts (Protected)
router.get('/user/my-posts', protect, getMyPosts);

// General items list (Public, query params for filters)
router.get('/', getItems);

// Single item details (Optional auth for contact privacy)
router.get('/:id', optionalAuth, getItemById);

// Create item (Protected, Multer image upload)
router.post('/', protect, upload.single('image'), createItem);

// Update item (Protected, Owner check, optional Multer image upload)
router.put('/:id', protect, upload.single('image'), updateItem);

// Delete item (Protected, Owner check)
router.delete('/:id', protect, deleteItem);

// Mark as Resolved / Active (Protected, Owner check)
router.patch('/:id/resolve', protect, resolveItem);

module.exports = router;

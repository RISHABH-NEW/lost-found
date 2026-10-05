const fs = require('fs');
const path = require('path');
const { Item, User } = require('../models');

// Helper to remove an image from disk safely
const deleteFileSafe = (relativePath) => {
  if (!relativePath) return;
  try {
    const fullPath = path.join(__dirname, '..', relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn('Could not delete old image file:', err.message);
  }
};

// @desc    Create a new lost or found item
// @route   POST /api/items
// @access  Private
const createItem = async (req, res) => {
  try {
    const { title, description, type, category, location, date } = req.body;

    if (!title || !description || !type || !category || !location) {
      // If a file was uploaded but validation fails, clean up the file
      if (req.file) {
        deleteFileSafe(path.join('uploads', req.file.filename));
      }
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, type, category, location.',
      });
    }

    if (!['Lost', 'Found'].includes(type)) {
      if (req.file) deleteFileSafe(path.join('uploads', req.file.filename));
      return res.status(400).json({
        success: false,
        message: 'Item type must be either "Lost" or "Found".',
      });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const parsedDate = date ? new Date(date) : new Date();

    const item = await Item.create({
      title: title.trim(),
      description: description.trim(),
      type,
      category: category.trim(),
      location: location.trim(),
      date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      imagePath,
      status: 'Active',
      postedBy: req.user._id,
    });

    const populatedItem = await Item.findById(item._id).populate(
      'postedBy',
      'name email phone createdAt'
    );

    return res.status(201).json({
      success: true,
      message: `${type} item reported successfully!`,
      item: populatedItem,
    });
  } catch (error) {
    console.error('Create Item Error:', error);
    if (req.file) deleteFileSafe(path.join('uploads', req.file.filename));
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating item post.',
    });
  }
};

// @desc    Get all items with search, filters & pagination
// @route   GET /api/items
// @access  Public
const getItems = async (req, res) => {
  try {
    const {
      search,
      type,
      category,
      location,
      status,
      postedBy,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    // Filter by type (Lost / Found)
    if (type && ['Lost', 'Found'].includes(type)) {
      query.type = type;
    }

    // Filter by category
    if (category && category !== 'All' && category !== '') {
      query.category = category;
    }

    // Filter by location
    if (location && location !== 'All' && location !== '') {
      query.location = location;
    }

    // Filter by status (Active / Resolved)
    if (status && ['Active', 'Resolved'].includes(status)) {
      query.status = status;
    } else if (status === 'all') {
      // Do not restrict status
    } else {
      // Default to Active for general browsing
      query.status = 'Active';
    }

    // Filter by user ID
    if (postedBy) {
      query.postedBy = postedBy;
    }

    // Search keyword in title, description, category, location
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { location: regex },
      ];
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'date_asc') sortOption = { date: 1 };
    if (sort === 'date_desc') sortOption = { date: -1 };

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    const [items, total] = await Promise.all([
      Item.find(query)
        .populate('postedBy', 'name createdAt')
        .sort(sortOption)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Item.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: items.length,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
      currentPage: pageNumber,
      items,
    });
  } catch (error) {
    console.error('Get Items Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching items.',
    });
  }
};

// @desc    Get single item details by ID
// @route   GET /api/items/:id
// @access  Public (Optional auth for contact privacy)
const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      'postedBy',
      'name email phone createdAt'
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
      });
    }

    const itemObj = item.toObject();

    // Check ownership
    const isOwner =
      req.user &&
      item.postedBy &&
      item.postedBy._id.toString() === req.user._id.toString();

    const isAuthenticated = !!req.user;

    // Contact Privacy Enforcement:
    // If user is NOT authenticated, do NOT expose phone number or email!
    if (!isAuthenticated && itemObj.postedBy) {
      itemObj.postedBy = {
        _id: itemObj.postedBy._id,
        name: itemObj.postedBy.name,
        phone: '🔒 Log in to view phone',
        email: '🔒 Log in to view email',
        isContactProtected: true,
      };
    }

    return res.status(200).json({
      success: true,
      item: itemObj,
      isOwner,
      isAuthenticated,
    });
  } catch (error) {
    console.error('Get Item By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching item details.',
    });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private (Owner only)
const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      if (req.file) deleteFileSafe(path.join('uploads', req.file.filename));
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
      });
    }

    // Backend Ownership Check
    if (item.postedBy.toString() !== req.user._id.toString()) {
      if (req.file) deleteFileSafe(path.join('uploads', req.file.filename));
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only edit your own posts.',
      });
    }

    const { title, description, category, location, date, type, status } = req.body;

    if (title) item.title = title.trim();
    if (description) item.description = description.trim();
    if (category) item.category = category.trim();
    if (location) item.location = location.trim();
    if (type && ['Lost', 'Found'].includes(type)) item.type = type;
    if (status && ['Active', 'Resolved'].includes(status)) item.status = status;
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) item.date = parsed;
    }

    // Handle new photo upload
    if (req.file) {
      if (item.imagePath) {
        deleteFileSafe(item.imagePath);
      }
      item.imagePath = `/uploads/${req.file.filename}`;
    }

    await item.save();

    const updated = await Item.findById(item._id).populate(
      'postedBy',
      'name email phone createdAt'
    );

    return res.status(200).json({
      success: true,
      message: 'Item updated successfully!',
      item: updated,
    });
  } catch (error) {
    console.error('Update Item Error:', error);
    if (req.file) deleteFileSafe(path.join('uploads', req.file.filename));
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating item.',
    });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private (Owner only)
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
      });
    }

    // Backend Ownership Check
    if (item.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only delete your own posts.',
      });
    }

    if (item.imagePath) {
      deleteFileSafe(item.imagePath);
    }

    await Item.findByIdAndDelete(item._id);

    return res.status(200).json({
      success: true,
      message: 'Item post removed successfully.',
    });
  } catch (error) {
    console.error('Delete Item Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting item.',
    });
  }
};

// @desc    Mark item as Resolved or Active
// @route   PATCH /api/items/:id/resolve
// @access  Private (Owner only)
const resolveItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
      });
    }

    // Backend Ownership Check
    if (item.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only modify status of your own posts.',
      });
    }

    const targetStatus = req.body.status || (item.status === 'Active' ? 'Resolved' : 'Active');
    item.status = targetStatus;
    await item.save();

    return res.status(200).json({
      success: true,
      message: `Item has been marked as ${targetStatus}!`,
      status: item.status,
      item,
    });
  } catch (error) {
    console.error('Resolve Item Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating item status.',
    });
  }
};

// @desc    Get current user's posts
// @route   GET /api/items/user/my-posts
// @access  Private
const getMyPosts = async (req, res) => {
  try {
    const items = await Item.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const activeCount = items.filter((i) => i.status === 'Active').length;
    const resolvedCount = items.filter((i) => i.status === 'Resolved').length;

    return res.status(200).json({
      success: true,
      count: items.length,
      activeCount,
      resolvedCount,
      items,
    });
  } catch (error) {
    console.error('Get My Posts Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error retrieving your posts.',
    });
  }
};

// @desc    Get portal stats summary
// @route   GET /api/items/stats/summary
// @access  Public
const getStats = async (req, res) => {
  try {
    const [totalLost, totalFound, totalResolved, totalActive, totalUsers] =
      await Promise.all([
        Item.countDocuments({ type: 'Lost' }),
        Item.countDocuments({ type: 'Found' }),
        Item.countDocuments({ status: 'Resolved' }),
        Item.countDocuments({ status: 'Active' }),
        User.countDocuments(),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalLost,
        totalFound,
        totalResolved,
        totalActive,
        totalUsers,
        totalItems: totalLost + totalFound,
      },
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error retrieving statistics.',
    });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  resolveItem,
  getMyPosts,
  getStats,
};

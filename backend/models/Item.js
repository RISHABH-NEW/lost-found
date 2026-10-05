const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: {
        values: ['Lost', 'Found'],
        message: '{VALUE} is not a valid item type',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Campus location is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    imagePath: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'Resolved'],
      default: 'Active',
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Poster user reference is required'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Update updatedAt on change
itemSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for fast campus searches
itemSchema.index({ title: 'text', description: 'text', category: 'text', location: 'text' });
itemSchema.index({ type: 1, status: 1, createdAt: -1 });
itemSchema.index({ postedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Item', itemSchema);

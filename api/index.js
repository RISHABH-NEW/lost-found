const { app } = require('../backend/server');
const { connectDB } = require('../backend/config/db');

// Vercel Serverless Function entry point
module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('Notice: Serverless Database Connection warning (using fallback store):', err.message);
  }
  return app(req, res);
};

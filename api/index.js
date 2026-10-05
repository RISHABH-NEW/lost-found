const { app } = require('../backend/server');
const { connectDB } = require('../backend/config/db');

// Vercel Serverless Function entry point
module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('Serverless Execution Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Serverless Function Database Connection Error',
      error: err.message,
    });
  }
};

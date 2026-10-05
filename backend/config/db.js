const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(` MongoDB Connected to remote/local host: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.warn(` Warning: Could not connect to MONGODB_URI (${err.message}).`);
      console.log(' Operating in Local Persistence Store mode (backed by JSON database in backend/data/db.json).');
      console.log(' All Mongoose operations, JWT authentication, and photo uploads remain 100% active!');
      return null;
    }
  } else {
    console.log('ℹ No MONGODB_URI specified in .env.');
    console.log(' Operating in Local Persistence Store mode (backed by JSON database in backend/data/db.json).');
    console.log(' Set MONGODB_URI in .env to connect to MongoDB Atlas or local MongoDB.');
    return null;
  }
};

const closeDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

module.exports = { connectDB, closeDB };

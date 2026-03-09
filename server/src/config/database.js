const mongoose = require('mongoose');

const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint_management');
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.error(`❌ MongoDB Connection Error: ${err.message}`);
      retries--;
      if (retries === 0) {
        console.error('All MongoDB connection retries failed. Exiting...');
        process.exit(1);
      }
      console.log(`Retrying... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;

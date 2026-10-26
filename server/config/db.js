const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connectDB() {
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    logger.error('MongoDB connection failed', { err: err.message });
    throw err;
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (err) {
    logger.error('MongoDB disconnect failed', { err: err.message });
  }
}

mongoose.connection.on('error', (err) => logger.error('MongoDB error', { err: err.message }));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected event'));

module.exports = { connectDB, disconnectDB };
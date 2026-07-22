import mongoose from 'mongoose';

const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT);
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI && isServerless) {
  console.warn('WARNING: MONGODB_URI environment variable is not defined in serverless environment!');
}

const dbUri = MONGODB_URI || 'mongodb://localhost:27017/kreeda';

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  if (!process.env.MONGODB_URI && isServerless) {
    throw new Error('MONGODB_URI environment variable is missing in serverless environment. Please configure it in your dashboard.');
  }
  try {
    await mongoose.connect(dbUri);
    console.log('MongoDB connected successfully to:', dbUri);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    if (isServerless) {
      throw error;
    } else {
      process.exit(1);
    }
  }
};

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kreeda';

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully to:', MONGODB_URI);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    if (process.env.VERCEL) {
      throw error;
    } else {
      process.exit(1);
    }
  }
};

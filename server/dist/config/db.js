"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT);
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI && isServerless) {
    console.warn('WARNING: MONGODB_URI environment variable is not defined in serverless environment!');
}
const dbUri = MONGODB_URI || 'mongodb://localhost:27017/kreeda';
const connectDB = async () => {
    if (mongoose_1.default.connection.readyState >= 1) {
        return;
    }
    if (!process.env.MONGODB_URI && isServerless) {
        throw new Error('MONGODB_URI environment variable is missing in serverless environment. Please configure it in your dashboard.');
    }
    try {
        await mongoose_1.default.connect(dbUri);
        console.log('MongoDB connected successfully to:', dbUri);
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        if (isServerless) {
            throw error;
        }
        else {
            process.exit(1);
        }
    }
};
exports.connectDB = connectDB;

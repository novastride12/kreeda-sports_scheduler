"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kreeda';
const connectDB = async () => {
    if (mongoose_1.default.connection.readyState >= 1) {
        return;
    }
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('MongoDB connected successfully to:', MONGODB_URI);
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        if (process.env.VERCEL) {
            throw error;
        }
        else {
            process.exit(1);
        }
    }
};
exports.connectDB = connectDB;

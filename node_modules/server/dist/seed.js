"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("./config/db");
const Admin_1 = require("./models/Admin");
const seedAdmin = async () => {
    try {
        // Connect to database
        await (0, db_1.connectDB)();
        const username = 'admin';
        const rawPassword = 'santaclaus@2512';
        // Delete existing admin
        await Admin_1.Admin.deleteMany({ username });
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(rawPassword, salt);
        // Create new admin
        const admin = new Admin_1.Admin({
            username,
            password: hashedPassword,
        });
        await admin.save();
        console.log('----------------------------------------');
        console.log('Admin account successfully seeded!');
        console.log('Username:', username);
        console.log('Password:', rawPassword);
        console.log('----------------------------------------');
        await mongoose_1.default.disconnect();
        console.log('Database disconnected.');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding admin account:', error);
        process.exit(1);
    }
};
seedAdmin();

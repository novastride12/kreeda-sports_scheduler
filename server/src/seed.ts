import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { Admin } from './models/Admin';

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    const username = 'admin';
    const rawPassword = 'santaclaus@2512';

    // Delete existing admin
    await Admin.deleteMany({ username });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // Create new admin
    const admin = new Admin({
      username,
      password: hashedPassword,
    });

    await admin.save();
    console.log('----------------------------------------');
    console.log('Admin account successfully seeded!');
    console.log('Username:', username);
    console.log('Password:', rawPassword);
    console.log('----------------------------------------');

    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin account:', error);
    process.exit(1);
  }
};

seedAdmin();

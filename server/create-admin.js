require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userSchema');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartendance')
  .then(async () => {
    try {
      // Delete existing admin if exists
      await User.deleteOne({ username: 'admin' });
      console.log('Removed existing admin if any');

      // Create new admin user
      const adminUser = new User({
        username: 'admin',
        password: 'admin123', // Will be hashed by the pre-save hook
        role: 'admin'
      });

      await adminUser.save();
      console.log('Admin user created successfully');
    } catch (error) {
      console.error('Error creating admin:', error);
    }
    process.exit();
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
const User = require("../models/userSchema");

// Hardcoded admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";  // In production, use a strong password and store securely

const createAdminUser = async () => {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });
        if (!existingAdmin) {
            await User.create({
                username: ADMIN_USERNAME,
                password: ADMIN_PASSWORD,  // In production, hash this password
                role: 'admin'
            });
            console.log('Admin user created successfully');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
};

// Call this when your server starts
createAdminUser();

module.exports = {
    createAdminUser
}
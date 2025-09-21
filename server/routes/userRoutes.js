const express = require("express");
const router = express.Router();
const { createAdminUser } = require("../controllers/userController");
const User = require("../models/userSchema");

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // For now, doing a simple password comparison
    // TODO: Implement proper password hashing
    if (password !== user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return user data (excluding password)
    const userResponse = {
      id: user._id,
      username: user.username,
      role: user.role
    };

    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
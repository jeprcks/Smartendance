require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const rateLimit = require('express-rate-limit');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting only in production to avoid blocking local development/testing
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
} else {
  console.log('Rate limiter disabled in non-production (NODE_ENV=%s)', process.env.NODE_ENV);
}

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",     // Admin web panel
        "http://localhost:5000",     // Flutter web (common port)
        "http://localhost:5001",     // Flutter web (alternate)
        "http://10.0.2.2:4000",     // Android emulator
        "http://localhost:4000",     // iOS simulator
        "https://umapadelementaryschool.vercel.app",  // Production admin web
      ];
      // Optional: allow extra origins from env (comma-separated)
      const extra = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
      const allOrigins = [...allowedOrigins, ...extra];

      const isAllowed = !origin ||
        allOrigins.includes(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Connect to MongoDB
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

mongoose.connect(process.env.MONGODB_URI, {
  // Increase timeouts to tolerate transient DNS/network blips
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  // Prefer IPv4 in environments with IPv6/DNS issues
  family: 4,
  // Retryable writes / write concern
  retryWrites: true,
  w: 'majority'
})
  .then(() => {
    console.log("Connected to MongoDB");
    // Create default admin user after successful DB connection
    try {
      const { createAdminUser } = require("./controllers/userController");
      createAdminUser().catch(err => {
        console.error('createAdminUser failed:', err);
      });
    } catch (err) {
      console.error('Error requiring userController:', err);
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    // Don't exit immediately; allow app to continue and log further reconnection attempts
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose event: connected');
});

mongoose.connection.on('reconnected', () => {
  console.log('Mongoose event: reconnected');
});
// Attempt to recreate admin user on reconnects as well
mongoose.connection.on('reconnected', () => {
  try {
    const { createAdminUser } = require("./controllers/userController");
    createAdminUser().catch(err => {
      console.error('createAdminUser on reconnect failed:', err);
    });
  } catch (err) {
    console.error('Error requiring userController on reconnect:', err);
  }
});

// Handle application shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// routes imports
const userRoutes = require("./routes/userRoutes");
const studentRoutes = require("./routes/studentsRoutes");
const historyRoutes = require("./routes/historyRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const authRoutes = require("./routes/authRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const reportRoutes = require("./routes/reportRoutes");
const telegramRoutes = require("./routes/telegramRoutes");

app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/telegram", telegramRoutes);

// Start server
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

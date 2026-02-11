require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require('express-rate-limit');

const app = express();

const allowedOriginsList = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5001",
  "http://10.0.2.2:4000",
  "http://localhost:4000",
  "https://umapadelementaryschool.vercel.app",
  "https://smartendance-api.vercel.app",
  "https://smartendance-lilac.vercel.app",
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  const extra = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const all = [...allowedOriginsList, ...extra];
  return all.includes(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin);
}

// CORS first: set headers on every response and handle preflight so errors (503, etc.) still have CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
} else {
  console.log('Rate limiter disabled in non-production (NODE_ENV=%s)', process.env.NODE_ENV);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// MongoDB: reuse connection (required for Vercel serverless)
// Cache connection promise to prevent multiple simultaneous connections
let mongoConnectionPromise = null;

function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string') {
    return Promise.reject(new Error('MONGODB_URI is not set. Add it in Vercel → Settings → Environment Variables.'));
  }
  
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }
  
  // Connection in progress, wait for it
  if (mongoose.connection.readyState === 2) {
    return mongoConnectionPromise || Promise.resolve();
  }
  
  // Reuse existing connection promise if available
  if (mongoConnectionPromise) {
    return mongoConnectionPromise;
  }
  
  // Create new connection with optimized settings for serverless
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  
  mongoConnectionPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000, // Reduced from 30s for faster failure
    connectTimeoutMS: 10000, // Reduced from 30s
    socketTimeoutMS: 45000,
    maxPoolSize: 10, // Connection pool size
    minPoolSize: 2, // Keep minimum connections alive
    maxIdleTimeMS: 30000, // Close idle connections after 30s
    family: 4,
    retryWrites: true,
    w: 'majority',
    // Enable buffering for serverless to prevent errors
    bufferCommands: true, // Buffer commands until connected
    bufferMaxEntries: 50 // Allow some buffering
  }).then(() => {
    // Ensure connection is fully ready
    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        if (mongoose.connection.readyState === 1) {
          console.log('MongoDB connected (serverless optimized)');
          resolve(mongoose.connection);
        } else if (mongoose.connection.readyState === 0) {
          // Not connected, wait for connection event
          mongoose.connection.once('connected', () => {
            console.log('MongoDB connected (serverless optimized)');
            resolve(mongoose.connection);
          });
          mongoose.connection.once('error', reject);
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000);
        } else {
          // Connecting (state 2), wait a bit and check again
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }).catch((err) => {
    mongoConnectionPromise = null; // Reset on error so we can retry
    throw err;
  });
  
  return mongoConnectionPromise;
}

// On Vercel: ensure DB is connected before handling (no long-running process)
if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    try {
      await connectMongo();
      // Double-check connection is ready before proceeding
      if (mongoose.connection.readyState !== 1) {
        // Wait for connection if it's still connecting
        await new Promise((resolve, reject) => {
          if (mongoose.connection.readyState === 1) {
            resolve();
          } else {
            mongoose.connection.once('connected', resolve);
            mongoose.connection.once('error', reject);
            // Timeout after 10 seconds
            setTimeout(() => reject(new Error('Connection timeout')), 10000);
          }
        });
      }
      next();
    } catch (err) {
      console.error('MongoDB connect error:', err);
      res.status(503).json({ message: 'Database unavailable', error: err.message });
    }
  });
} else {
  connectMongo()
    .then(() => {
      console.log("Connected to MongoDB");
      try {
        const { createAdminUser } = require("./controllers/userController");
        createAdminUser().catch(err => console.error('createAdminUser failed:', err));
      } catch (err) {
        console.error('Error requiring userController:', err);
      }
    })
    .catch((err) => console.error("MongoDB connection error:", err));
  mongoose.connection.on('error', err => console.error('MongoDB connection error:', err));
  mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => {
    console.log('Mongoose reconnected');
    try {
      const { createAdminUser } = require("./controllers/userController");
      createAdminUser().catch(err => console.error('createAdminUser on reconnect failed:', err));
    } catch (err) {}
  });
}

// Keep-alive endpoint to prevent cold starts (call this every 5 minutes)
app.get('/api/keepalive', async (req, res) => {
  try {
    await connectMongo();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// Routes
const userRoutes = require("./routes/userRoutes");
const studentRoutes = require("./routes/studentsRoutes");
const historyRoutes = require("./routes/historyRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const authRoutes = require("./routes/authRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const reportRoutes = require("./routes/reportRoutes");
const telegramRoutes = require("./routes/telegramRoutes");

// Health check (GET /) so you can verify backend is deployed
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Smartendance API", api: "/api/users/login, /api/students, ..." });
});

app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/telegram", telegramRoutes);

module.exports = app;

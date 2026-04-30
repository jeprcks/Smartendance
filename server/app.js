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
  "https://umapad-teacherportal.vercel.app",
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  const extra = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const all = [...allowedOriginsList, ...extra];
  return all.includes(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
    // Allow CGNAT/Tailscale-style local network hosts (e.g. http://100.84.x.x:3000)
    /^http:\/\/100\.\d+\.\d+\.\d+:\d+$/.test(origin);
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
  app.use((req, res, next) => {
    if (req.method === 'POST' && req.originalUrl?.includes('telegram/webhook')) return next();
    limiter(req, res, next);
  });
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
function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string') {
    return Promise.reject(new Error('MONGODB_URI is not set. Add it in Vercel → Settings → Environment Variables.'));
  }
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve) => mongoose.connection.once('open', resolve));
  }
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  return mongoose.connect(uri, {
    // Regional optimization for HKG1 (Hong Kong)
    serverSelectionTimeoutMS: 5000,   // Faster for same-region connections
    connectTimeoutMS: 10000,          // Connection timeout
    socketTimeoutMS: 45000,           // Keep-alive for long operations
    maxPoolSize: 10,                  // Connection pool size
    minPoolSize: 2,                   // Keep min connections alive
    maxIdleTimeMS: 30000,             // Close idle connections
    family: 4,                        // IPv4 only (faster for regional)
    retryWrites: true,
    w: 'majority',
    // Serverless optimization
    bufferCommands: false,            // Don't buffer commands (serverless)
    autoCreate: true,
    autoIndex: true
  });
}

// On Vercel: ensure DB is connected before handling (no long-running process)
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    connectMongo()
      .then(() => next())
      .catch((err) => {
        console.error('MongoDB connect error:', err);
        res.status(503).json({ message: 'Database unavailable', error: err.message });
      });
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

// Routes
const userRoutes = require("./routes/userRoutes");
const studentRoutes = require("./routes/studentsRoutes");
const historyRoutes = require("./routes/historyRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const authRoutes = require("./routes/authRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const reportRoutes = require("./routes/reportRoutes");
const telegramRoutes = require("./routes/telegramRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

// Health check (GET /) so you can verify backend is deployed
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Smartendance API", api: "/api/users/login, /api/students, ..." });
});

// Keep-alive endpoint: prevents Vercel cold starts
// Call this every 5 minutes via cron job to keep functions warm
app.get("/api/keepalive", async (req, res) => {
  try {
    await connectMongo();
    const isConnected = mongoose.connection.readyState === 1;
    res.json({ 
      ok: true, 
      message: "Server is alive", 
      dbConnected: isConnected,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Keepalive check failed:", err);
    res.status(503).json({ 
      ok: false, 
      message: "Server is alive but database unavailable",
      error: err.message 
    });
  }
});

app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/settings", settingsRoutes);

module.exports = app;

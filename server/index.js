const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

const app = express();

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

const dbURI = "";

mongoose.connect(dbURI).then(() => {
  console.log("Connected to MongoDB");
});
app.listen(4000, () => console.log(`Listening on port 4000`));

// routes imports
const userRoutes = require("./routes/userRoutes");

app.use("/api/users", userRoutes);

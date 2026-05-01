// Local: run Express with listen(). On Vercel, this file is the entry and we export the app (no listen).
require("dotenv").config();
const app = require("./app");
const { initializeMidnightResetJob } = require("./jobs/midnightResetJob");

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Initialize the midnight reset job
    initializeMidnightResetJob();
  });

  process.on("SIGINT", async () => {
    try {
      const mongoose = require("mongoose");
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });
}

module.exports = app;

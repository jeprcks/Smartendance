// Run this script to fix the MongoDB index issue
// This will drop the problematic email unique index and recreate with sparse option
// Usage: node fix-student-index.js

const mongoose = require("mongoose");
const Student = require("./models/studentsSchema");
const dotenv = require("dotenv");

dotenv.config();

async function fixStudentIndex() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smartendance");
    console.log("Connected to MongoDB");

    // Get the Student model
    const studentCollection = mongoose.connection.collection("students");

    // List all indexes
    console.log("\n=== Current Indexes ===");
    const indexes = await studentCollection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop the problematic email unique index if it exists
    console.log("\n=== Dropping problematic indexes ===");
    
    try {
      // Try to drop email unique index with different possible names
      const indexesToDrop = [
        'email_1',
        'parentInfo.email_1',
        'email',
        'parentInfo_1'
      ];

      for (const indexName of indexesToDrop) {
        try {
          await studentCollection.dropIndex(indexName);
          console.log(`✓ Dropped index: ${indexName}`);
        } catch (err) {
          if (!err.message.includes("index not found")) {
            console.log(`✗ Could not drop ${indexName}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.log("Error dropping indexes:", err.message);
    }

    // Reindex by using collection.deleteMany to remove duplicates if any
    console.log("\n=== Checking for duplicate emails ===");
    const duplicates = await studentCollection
      .aggregate([
        {
          $group: {
            _id: "$parentInfo.email",
            count: { $sum: 1 },
            ids: { $push: "$_id" }
          }
        },
        { $match: { count: { $gt: 1 } } }
      ])
      .toArray();

    if (duplicates.length > 0) {
      console.log("Found duplicates:");
      console.log(JSON.stringify(duplicates, null, 2));
    } else {
      console.log("✓ No duplicate emails found");
    }

    // Rebuild indexes from the schema
    console.log("\n=== Rebuilding indexes from schema ===");
    
    // Clear all indexes first except _id
    try {
      const allIndexes = await studentCollection.getIndexes();
      for (const indexName in allIndexes) {
        if (indexName !== "_id_") {
          try {
            await studentCollection.dropIndex(indexName);
            console.log(`Dropped: ${indexName}`);
          } catch (err) {
            // Index might not exist, continue
          }
        }
      }
    } catch (err) {
      console.log("Error clearing indexes:", err.message);
    }

    // Let Mongoose rebuild indexes from schema
    console.log("Rebuilding indexes from schema...");
    await Student.collection.dropIndexes();
    await Student.syncIndexes();
    console.log("✓ Indexes rebuilt successfully");

    // Verify the new indexes
    console.log("\n=== New Indexes ===");
    const newIndexes = await studentCollection.getIndexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    console.log("\n✓ Index fix completed successfully!");
    console.log("\nYou can now try adding students again.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error fixing student index:", error);
    process.exit(1);
  }
}

fixStudentIndex();

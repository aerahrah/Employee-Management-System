// migrateMiddleName.js
require("dotenv").config();
const mongoose = require("mongoose");
const Employee = require("../models/employeeModel"); // Ensure this path matches your structure

const runMigration = async () => {
  try {
    // 1. Connect to your database
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected.");

    // 2. Find employees missing the middleName field
    // We check for fields that don't exist, are null, or are explicitly undefined
    const filter = {
      $or: [{ middleName: { $exists: false } }, { middleName: null }],
    };

    // 3. Set the default middle name
    // You can change "N/A" to "" if you prefer empty strings for legacy records
    const update = {
      $set: { middleName: "N/A" },
    };

    console.log("Running migration...");

    // 4. Execute the bulk update
    const result = await Employee.updateMany(filter, update);

    console.log("🎉 Migration Complete!");
    console.log(`👉 Employees checked/updated: ${result.modifiedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

runMigration();

// migrate.js
require("dotenv").config();
const mongoose = require("mongoose");
const Employee = require("../models/employeeModel");

async function runMigration() {
  try {
    // 1. Connect to your database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 2. Find all employees missing the employeeType and set it to "Organic"
    const result = await Employee.updateMany(
      { employeeType: { $exists: false } },
      { $set: { employeeType: "Organic" } },
    );

    console.log(
      `🎉 Migration complete! Updated ${result.modifiedCount} employees.`,
    );

    // 3. Exit the script
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();

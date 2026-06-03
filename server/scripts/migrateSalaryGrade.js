// seedSalaryGrades.js

require("dotenv").config();
const mongoose = require("mongoose");
const SalaryGrade = require("../models/salaryGradeModel");

console.log("MONGO_URI", process.env.MONGO_URI);
// Philippines Executive Order No. 64, s. 2024
// Third Tranche (Effective January 1, 2026) - Step 1 Values
const sgData = [
  { grade: 1, amount: 14634 },
  { grade: 2, amount: 15522 },
  { grade: 3, amount: 16486 },
  { grade: 4, amount: 17506 },
  { grade: 5, amount: 18581 },
  { grade: 6, amount: 19716 },
  { grade: 7, amount: 20914 },
  { grade: 8, amount: 22423 },
  { grade: 9, amount: 24329 },
  { grade: 10, amount: 26917 },
  { grade: 11, amount: 31705 },
  { grade: 12, amount: 33947 },
  { grade: 13, amount: 36125 },
  { grade: 14, amount: 38764 },
  { grade: 15, amount: 42178 },
  { grade: 16, amount: 45694 },
  { grade: 17, amount: 49562 },
  { grade: 18, amount: 53818 },
  { grade: 19, amount: 59153 },
  { grade: 20, amount: 66052 },
  { grade: 21, amount: 73303 },
  { grade: 22, amount: 81796 },
  { grade: 23, amount: 91306 },
  { grade: 24, amount: 102603 },
  { grade: 25, amount: 116643 },
  { grade: 26, amount: 131807 },
  { grade: 27, amount: 148940 },
  { grade: 28, amount: 167129 },
  { grade: 29, amount: 187531 },
  { grade: 30, amount: 210718 },
  { grade: 31, amount: 300961 },
  { grade: 32, amount: 356237 },
  { grade: 33, amount: 449157 },
];

async function runSeed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing salary grades
    const deleteResult = await SalaryGrade.deleteMany({});
    console.log(
      `🗑️ Deleted ${deleteResult.deletedCount} existing salary grades`,
    );

    // Prepare records
    const salaryGrades = sgData.map((item) => ({
      grade: item.grade,
      step: 1,
      amount: item.amount,
    }));

    // Insert records
    const inserted = await SalaryGrade.insertMany(salaryGrades);

    console.log(
      `🎉 Successfully seeded ${inserted.length} salary grades (SG 1–33, Step 1)`,
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Salary grade seeding failed:");
    console.error(error);

    await mongoose.connection.close();
    process.exit(1);
  }
}

runSeed();

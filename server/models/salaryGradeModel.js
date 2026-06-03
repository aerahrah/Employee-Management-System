// models/salaryGradeModel.js
const mongoose = require("mongoose");

const salaryGradeSchema = new mongoose.Schema(
  {
    grade: {
      type: Number,
      required: [true, "Salary grade is required"],
      min: [1, "Salary grade must be at least 1"],
      max: [33, "Salary grade cannot exceed 33"],
    },
    step: {
      type: Number,
      required: [true, "Salary step is required"],
      min: [1, "Step must be at least 1"],
      max: [8, "Step cannot exceed 8"],
      default: 1,
    },
    amount: {
      type: Number,
      required: [true, "Monetary amount is required"],
      min: [0, "Amount cannot be negative"],
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate grade-step combinations (e.g., cannot have two SG 1 Step 1 records)
salaryGradeSchema.index({ grade: 1, step: 1 }, { unique: true });

module.exports = mongoose.model("SalaryGrade", salaryGradeSchema);

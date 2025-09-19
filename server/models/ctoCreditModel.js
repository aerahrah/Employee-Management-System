const mongoose = require("mongoose");

const ctoCreditSchema = new mongoose.Schema(
  {
    employees: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    ],
    hours: { type: Number, required: true },
    memoNo: { type: String, required: true },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    dateApproved: { type: Date },
    uploadedMemo: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CtoCredit", ctoCreditSchema);

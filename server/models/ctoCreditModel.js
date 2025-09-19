const mongoose = require("mongoose");

const ctoCreditSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    hours: { type: Number, required: true }, // credited hours
    memoNo: { type: String, required: true }, // memo number
    approvedBy: { type: String, required: true }, // e.g., Regional Director
    dateApproved: { type: Date, required: true },
    uploadedMemo: { type: String }, // path or GridFS id for uploaded memo (PDF)
  },
  { timestamps: true }
);

module.exports = mongoose.model("CtoCredit", ctoCreditSchema);

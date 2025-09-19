const mongoose = require("mongoose");

const ctoApplicationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    requestedHours: { type: Number, required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DENIED"],
      default: "PENDING",
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CtoApplication", ctoApplicationSchema);

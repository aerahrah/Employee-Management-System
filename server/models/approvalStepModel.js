// models/approvalStepModel.js
const mongoose = require("mongoose");
const { APPROVAL_ROLE_VALUES } = require("../constants/approvalRoles");

const approvalStepSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: true,
    },

    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    role: {
      type: String,
      enum: {
        values: APPROVAL_ROLE_VALUES,
        message: "{VALUE} is not a valid approval role",
      },
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },

    reviewedAt: {
      type: Date,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, "Remarks cannot exceed 1000 characters"],
    },

    // Snapshot of approver signature at approval time
    approverSignature: {
      signatureUrl: {
        type: String,
        trim: true,
      },
      signedAt: {
        type: Date,
      },
    },

    ctoApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CtoApplication",
    },

    wellnessApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WellnessApplication",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("ApprovalStep", approvalStepSchema);

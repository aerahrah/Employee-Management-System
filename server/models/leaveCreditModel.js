const mongoose = require("mongoose");

const leaveCreditSchema = new mongoose.Schema(
  {
    // VL or SL
    leaveType: {
      type: String,
      enum: ["VL", "SL"],
      required: true,
    },

    // Date the credits were approved
    dateApproved: {
      type: Date,
      required: true,
    },

    // Total leave days credited in this transaction
    days: {
      type: Number,
      required: true,
      default: 1.25, // Optional: if always fixed, you can remove this field entirely
    },

    // Employee-level credits
    employees: [
      {
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
          required: true,
        },

        creditedDays: {
          type: Number,
          required: true,
        },

        usedDays: {
          type: Number,
          default: 0,
        },

        reservedDays: {
          type: Number,
          default: 0,
        },

        remainingDays: {
          type: Number,
          required: true,
        },

        status: {
          type: String,
          enum: ["ACTIVE", "EXHAUSTED", "ROLLEDBACK"],
          default: "ACTIVE",
        },

        dateCredited: {
          type: Date,
          required: true,
        },
      },
    ],

    status: {
      type: String,
      enum: ["CREDITED", "ROLLEDBACK"],
      default: "CREDITED",
    },

    dateCredited: {
      type: Date,
      default: Date.now,
    },

    dateRolledBack: Date,

    creditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },

    rolledBackBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("LeaveCredit", leaveCreditSchema);

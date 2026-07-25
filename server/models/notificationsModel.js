const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    type: {
      type: String,
      required: true,
      enum: [
        // CTO Applications
        "CTO_APPROVAL_REQUIRED",
        "CTO_APPLICATION_APPROVED",
        "CTO_APPLICATION_REJECTED",
        "CTO_APPLICATION_CANCELLED",
        "CTO_FOLLOW_UP",
        "CTO_REVOCATION_REQUESTED", // ✅ Added
        "CTO_REVOCATION_APPROVED", // ✅ Added
        "CTO_REVOCATION_REJECTED", // ✅ Added
        "CTO_REVOCATION_CANCELLED", // ✅ Added

        // CTO Credits
        "CTO_CREDITED",
        "CTO_ROLLEDBACK",

        // Wellness Applications
        "WELLNESS_APPROVAL_REQUIRED",
        "WELLNESS_APPLICATION_APPROVED",
        "WELLNESS_APPLICATION_REJECTED",
        "WELLNESS_APPLICATION_CANCELLED",
        "WELLNESS_FOLLOW_UP",
        "WELLNESS_REVOCATION_REQUESTED", // ✅ Added
        "WELLNESS_REVOCATION_APPROVED", // ✅ Added
        "WELLNESS_REVOCATION_REJECTED", // ✅ Added
        "WELLNESS_REVOCATION_CANCELLED", // ✅ Added

        // Wellness Credits
        "WELLNESS_CREDITED",
        "WELLNESS_ROLLEDBACK",

        // Regular Leave Credits (VL / SL)
        "LEAVE_CREDITED",
        "LEAVE_ROLLEDBACK",

        // Misc
        "GENERAL",
      ],
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    link: {
      type: String,
      default: "",
      trim: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },

    metadata: {
      // CTO Specific References
      ctoApplicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CtoApplication",
        default: null,
      },
      ctoCreditId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CtoCredit",
        default: null,
      },

      // Wellness Specific References
      wellnessApplicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WellnessApplication",
        default: null,
      },
      wellnessCreditId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WellnessCredit",
        default: null,
      },

      // Regular Leave (VL/SL) Specific References
      leaveCreditId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeaveCredit",
        default: null,
      },

      // Shared References
      approvalStepId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ApprovalStep",
        default: null,
      },
      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
      },

      // Generic catch-all for any other unstructured data
      extra: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
  },
  { timestamps: true },
);

// Compound indexes for faster query performance when fetching user notifications
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

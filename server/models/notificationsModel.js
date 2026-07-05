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
        "CTO_APPLICATION_SUBMITTED",
        "CTO_APPLICATION_APPROVED",
        "CTO_APPLICATION_REJECTED",
        "CTO_APPLICATION_CANCELLED",
        "CTO_FOLLOW_UP",

        // CTO Credits
        "CTO_CREDITED",
        "CTO_ROLLEDBACK",

        // Wellness Applications
        "WELLNESS_APPLICATION_SUBMITTED",
        "WELLNESS_APPROVAL_REQUIRED",
        "WELLNESS_APPLICATION_APPROVED",
        "WELLNESS_APPLICATION_REJECTED",
        "WELLNESS_APPLICATION_CANCELLED",
        "WELLNESS_FOLLOW_UP",

        // Wellness Credits
        "WELLNESS_CREDITED",
        "WELLNESS_ROLLEDBACK",

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
      ctoApplicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CtoApplication",
        default: null,
      },
      approvalStepId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ApprovalStep",
        default: null,
      },
      ctoCreditId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CtoCredit",
        default: null,
      },
      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
      },
      // The "extra" mixed object will easily handle any Wellness IDs
      // (like wellnessApplicationId or wellnessCreditId) without needing
      // strictly defined schema paths.
      extra: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

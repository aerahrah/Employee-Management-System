// models/approvalRouteModel.js
const mongoose = require("mongoose");
const { APPROVAL_ROLE_VALUES } = require("../constants/approvalRoles");

const approvalRouteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    // true = visible to all employees as a template, false = private to creator
    isPublic: {
      type: Boolean,
      default: true,
    },
    // The routing group category
    category: {
      type: String,
      enum: ["sick_vacation", "cto_wellness"],
      default: "cto_wellness",
      required: true,
    },
    // Ordered list of approver steps (level 1 → N)
    steps: [
      {
        level: { type: Number, required: true },
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
          required: true, // Making this required since it now relies on a strict enum
        },
        notes: {
          type: String,
          default: "",
        },
        isEnabled: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { timestamps: true },
);

// Index for faster lookup by creator
approvalRouteSchema.index({ createdBy: 1 });
// Index for filtering public routes
approvalRouteSchema.index({ isPublic: 1 });

module.exports = mongoose.model("ApprovalRoute", approvalRouteSchema);

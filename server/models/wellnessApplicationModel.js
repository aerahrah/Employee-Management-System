const mongoose = require("mongoose");

const wellnessApplicationSchema = new mongoose.Schema(
  {
    // =========================================
    // BASE FIELDS (Required for everyone)
    // =========================================
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    employeeType: {
      type: String,
      enum: ["Organic", "Job Order"],
      required: true,
    },
    inclusiveDates: {
      type: [Date],
      required: true,
      validate: {
        validator: function (arr) {
          return arr && arr.length > 0;
        },
        message: "At least one date must be selected.",
      },
    },
    totalDays: {
      type: Number,
      required: true,
      min: [0.5, "Total days must be at least 0.5"],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },
    approvals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ApprovalStep",
      },
    ],
    overallStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
    attachment: {
      fileName: {
        type: String,
        trim: true,
        maxlength: [255, "Filename too long"],
      },
      fileUrl: {
        type: String,
        trim: true,
        maxlength: [500, "URL too long"],
      },
      fileType: {
        type: String,
        trim: true,
        enum: {
          values: ["application/pdf", "image/jpeg", "image/png"],
          message: "{VALUE} is not an allowed file type",
        },
      },
      uploadedAt: { type: Date, default: Date.now },
    },

    // =========================================
    // ORGANIC-SPECIFIC FIELDS (CSC Form 6)
    // =========================================

    // Snapshot of the applicant's digital signature at the time of submission
    applicantSignatureUrl: {
      type: String,
      required: function () {
        return this.employeeType === "Organic";
      },
    },

    // Derived from Section 6.D
    commutation: {
      type: String,
      enum: ["Requested", "Not Requested"],
      default: "Not Requested",
      required: function () {
        return this.employeeType === "Organic";
      },
    },

    // Derived from Section 7.A (Usually populated by HR later)
    certificationOfLeaveCredits: {
      asOfDate: { type: Date },
      vacationLeave: {
        totalEarned: { type: Number, default: 0 },
        lessThisApplication: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
      },
      sickLeave: {
        totalEarned: { type: Number, default: 0 },
        lessThisApplication: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
      },
      certifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    },

    // Derived from Section 7.C & 7.D
    actionDetails: {
      approvedDaysWithPay: { type: Number },
      approvedDaysWithoutPay: { type: Number },
      approvedOthersSpecify: { type: String, trim: true },
      disapprovedDueTo: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

module.exports = mongoose.model(
  "WellnessApplication",
  wellnessApplicationSchema,
);

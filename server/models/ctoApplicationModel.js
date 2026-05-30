const mongoose = require("mongoose");

const CtoApplicationSchema = new mongoose.Schema(
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
      enum: ["Organic", "Job Order", "Contractual", "Others"], // Adjust based on your system
      required: true,
    },
    requestedHours: {
      type: Number,
      required: true,
      min: [1, "Requested hours must be at least 1"],
      max: [300, "Requested hours exceed maximum logical limit"],
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
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },
    memo: [
      {
        memoId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CtoCredit",
          required: true,
        },
        uploadedMemo: {
          type: String,
          required: true,
          trim: true,
          maxlength: [500, "URL/Path is too long"],
        },
        appliedHours: {
          type: Number,
          required: true,
          min: [0.5, "Applied hours cannot be negative or zero"],
        },
      },
    ],
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
    // ORGANIC-SPECIFIC FIELDS (Conditionally Required)
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

module.exports = mongoose.model("CtoApplication", CtoApplicationSchema);

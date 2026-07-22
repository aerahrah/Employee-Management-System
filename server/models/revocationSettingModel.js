// models/revocationSettingModel.js
const mongoose = require("mongoose");

const revocationSettingSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: true,
    },
    // ✅ ADDED: Toggle to make the revocation attachment optional or required
    isAttachmentRequired: {
      type: Boolean,
      default: false, // Defaults to optional
    },
    approvers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("RevocationSetting", revocationSettingSchema);

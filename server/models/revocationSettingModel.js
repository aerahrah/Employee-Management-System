// models/revocationSettingModel.js
const mongoose = require("mongoose");

const revocationSettingSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: true,
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

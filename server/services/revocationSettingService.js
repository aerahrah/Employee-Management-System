// services/revocationSettingService.js
const RevocationSetting = require("../models/revocationSettingModel");
const Employee = require("../models/employeeModel");
const Role = require("../models/roleModel"); // Ensure you have this import

/**
 * Fetch the global revocation settings and dynamically populate
 * approvers based on their role permissions.
 */
const getSettingsService = async () => {
  // 1. Get or create the basic settings document (just the toggle)
  let setting = await RevocationSetting.findOne();

  if (!setting) {
    setting = await RevocationSetting.create({
      isEnabled: true,
      isAttachmentRequired: false, // ✅ Added default
    });
  }

  // 2. Find all roles that include the required permission (or Super Admin '*')
  const eligibleRoles = await Role.find({
    permissions: { $in: ["revocation.manage_application", "*"] },
  }).select("_id");

  const roleIds = eligibleRoles.map((role) => role._id);

  // 3. Find all ACTIVE employees assigned to those roles
  const dynamicApprovers = await Employee.find({
    role: { $in: roleIds },
    status: "Active", // Ensure we only get active employees
  }).select(
    "prefixTitle firstName lastName nameExtension postfixTitle position email",
  );

  // 4. Return the combined result
  return {
    _id: setting._id,
    isEnabled: setting.isEnabled,
    isAttachmentRequired: setting.isAttachmentRequired, // ✅ Added to return object
    approvers: dynamicApprovers,
  };
};

/**
 * Update the global revocation settings.
 * Since approvers are now dynamically resolved, this only updates the toggles.
 */
// ✅ Updated parameters to accept an object matching the controller
const updateSettingsService = async ({ isEnabled, isAttachmentRequired }) => {
  const updateData = {};

  if (typeof isEnabled === "boolean") {
    updateData.isEnabled = isEnabled;
  }

  // ✅ Added check for the new attachment toggle
  if (typeof isAttachmentRequired === "boolean") {
    updateData.isAttachmentRequired = isAttachmentRequired;
  }

  // Update the single global document
  await RevocationSetting.findOneAndUpdate(
    {},
    { $set: updateData },
    { new: true, upsert: true },
  );

  // Return the fully resolved settings (including the dynamic approvers list)
  return await getSettingsService();
};

module.exports = {
  getSettingsService,
  updateSettingsService,
};

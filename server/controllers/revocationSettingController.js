// controllers/revocationSettingController.js
const revocationSettingService = require("../services/revocationSettingService");

/**
 * GET /api/settings/revocation
 * Retrieves the global revocation settings and dynamic list of approvers.
 */
const getRevocationSettings = async (req, res, next) => {
  try {
    const data = await revocationSettingService.getSettingsService();

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT or PATCH /api/settings/revocation
 * Updates the global revocation settings (enable/disable, attachment requirements).
 */
const updateRevocationSettings = async (req, res, next) => {
  try {
    // ✅ Expecting payload: { isEnabled: boolean, isAttachmentRequired: boolean }
    const { isEnabled, isAttachmentRequired } = req.body;

    // Passed as an object for better scalability
    const data = await revocationSettingService.updateSettingsService({
      isEnabled,
      isAttachmentRequired,
    });

    res.status(200).json({
      success: true,
      message: "Global Revocation Settings updated successfully.",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevocationSettings,
  updateRevocationSettings,
};

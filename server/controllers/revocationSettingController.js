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
 * Updates the global revocation settings (enable/disable).
 */
const updateRevocationSettings = async (req, res, next) => {
  try {
    // Expecting payload: { isEnabled: boolean }
    const { isEnabled } = req.body;

    const data =
      await revocationSettingService.updateSettingsService(isEnabled);

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

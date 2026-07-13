const RevocationSetting = require("../models/revocationSettingModel");

const getRevocationApprover = async (req, res, next) => {
  try {
    const setting = await RevocationSetting.findOne().populate(
      "globalApprover",
      "prefixTitle firstName lastName nameExtension postfixTitle position email",
    );
    res.status(200).json({
      success: true,
      data: setting || null,
    });
  } catch (error) {
    next(error);
  }
};

const setRevocationApprover = async (req, res, next) => {
  try {
    const { approverId } = req.body;

    if (!approverId) {
      return res.status(400).json({ error: "Employee ID is required." });
    }

    let setting = await RevocationSetting.findOne();

    if (!setting) {
      setting = new RevocationSetting({ globalApprover: approverId });
    } else {
      setting.globalApprover = approverId;
    }

    await setting.save();

    const populatedSetting = await RevocationSetting.findById(
      setting._id,
    ).populate(
      "globalApprover",
      "prefixTitle firstName lastName nameExtension postfixTitle position email",
    );

    res.status(200).json({
      success: true,
      message: "Global Revocation Approver updated successfully.",
      data: populatedSetting,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevocationApprover,
  setRevocationApprover,
};

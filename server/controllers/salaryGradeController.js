const salaryGradeService = require("../services/salaryGradeService");

/**
 * @desc    Get all salary grades
 * @route   GET /api/salary-grades
 * @access  Private/Admin
 */
exports.getAllGrades = async (req, res) => {
  try {
    const grades = await salaryGradeService.getAllSalaryGrades();
    res.status(200).json({
      success: true,
      count: grades.length,
      data: grades,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error fetching salary grades",
    });
  }
};

/**
 * @desc    Get single salary grade by ID
 * @route   GET /api/salary-grades/:id
 * @access  Private/Admin
 */
exports.getGradeById = async (req, res) => {
  try {
    const grade = await salaryGradeService.getSalaryGradeById(req.params.id);
    res.status(200).json({
      success: true,
      data: grade,
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Update a salary grade amount
 * @route   PUT /api/salary-grades/:id
 * @access  Private/Admin
 */
exports.updateGrade = async (req, res) => {
  try {
    const { amount } = req.body;
    const updatedGrade = await salaryGradeService.updateSalaryGrade(
      req.params.id,
      amount,
    );

    res.status(200).json({
      success: true,
      message: `Salary Grade ${updatedGrade.grade} updated successfully.`,
      data: updatedGrade,
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

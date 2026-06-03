const SalaryGrade = require("../models/salaryGradeModel");

class SalaryGradeService {
  /**
   * Fetch all salary grades ordered by grade and step
   */
  async getAllSalaryGrades() {
    return await SalaryGrade.find({}).sort({ grade: 1, step: 1 });
  }

  /**
   * Fetch a single salary grade by its ID
   */
  async getSalaryGradeById(id) {
    const salaryGrade = await SalaryGrade.findById(id);
    if (!salaryGrade) {
      throw new Error("Salary grade record not found");
    }
    return salaryGrade;
  }

  /**
   * Update the monetary amount of a specific salary grade
   */
  async updateSalaryGrade(id, amount) {
    if (amount === undefined || amount === null || amount < 0) {
      throw new Error("A valid positive salary amount is required");
    }

    const updatedGrade = await SalaryGrade.findByIdAndUpdate(
      id,
      { amount },
      { new: true, runValidators: true },
    );

    if (!updatedGrade) {
      throw new Error("Salary grade record not found to update");
    }

    return updatedGrade;
  }

  /**
   * Optional: Create a new salary grade configuration dynamically
   */
  async createSalaryGrade(gradeData) {
    return await SalaryGrade.create(gradeData);
  }
}

module.exports = new SalaryGradeService();

const CtoCredit = require("../models/ctoCreditModel");
const Employee = require("../models/employeeModel");
const addCreditRequest = async (req, res) => {
  try {
    const { employees, hours, memoNo, approver } = req.body;

    // ✅ Validate employee IDs exist
    const existingEmployees = await Employee.find({
      _id: { $in: employees },
    });

    if (existingEmployees.length !== employees.length) {
      return res.status(400).json({
        message: "Some employee IDs are invalid or not found in the database",
      });
    }

    // ✅ Optional: validate approver exists too
    const approverExists = await Employee.findById(approver);
    if (!approverExists) {
      return res.status(400).json({
        message: "Approver ID is invalid or not found in the database",
      });
    }

    const creditRequest = await CtoCredit.create({
      employees,
      hours,
      memoNo,
      approver,
      status: "PENDING",
      uploadedMemo: req.file?.path,
    });

    res
      .status(201)
      .json({ message: "CTO credit request created", creditRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const approveOrRejectCredit = async (req, res) => {
  try {
    const { creditId } = req.params;
    const { decision, remarks } = req.body;
    const userId = req.user.id; // 👈 comes from JWT middleware

    const credit = await CtoCredit.findById(creditId);

    if (!credit) {
      return res.status(404).json({ message: "Credit request not found" });
    }
    if (credit.status !== "PENDING") {
      return res.status(400).json({ message: "Already processed" });
    }

    // ✅ Make sure the approver matches the logged-in user
    if (credit.approver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to approve/reject this request",
      });
    }

    if (decision === "APPROVE") {
      credit.status = "APPROVED";
      credit.dateApproved = new Date();
      await credit.save();

      await Employee.updateMany(
        { _id: { $in: credit.employees } },
        { $inc: { "balances.ctoHours": credit.hours } }
      );

      return res.json({ message: "CTO credit approved and applied", credit });
    }

    if (decision === "REJECT") {
      credit.status = "REJECTED";
      credit.reviewedAt = new Date();
      if (remarks) credit.remarks = remarks; // optional remarks
      await credit.save();

      return res.json({ message: "CTO credit rejected", credit });
    }

    return res
      .status(400)
      .json({ message: "Invalid decision. Use APPROVE or REJECT." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addCreditRequest,
  approveOrRejectCredit,
};

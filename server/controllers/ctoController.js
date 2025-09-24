const CtoCredit = require("../models/ctoCreditModel");
const Employee = require("../models/employeeModel");

const addCreditRequest = async (req, res) => {
  try {
    const { employees, hours, memoNo } = req.body;
    const userId = req.user.id;

    const existingEmployees = await Employee.find({
      _id: { $in: employees },
    });

    if (existingEmployees.length !== employees.length) {
      return res.status(400).json({
        message: "Some employee IDs are invalid or not found in the database",
      });
    }

    const creditRequest = await CtoCredit.create({
      employees,
      hours,
      memoNo,
      status: "CREDITED",
      dateCredited: new Date(),
      creditedBy: userId,
      uploadedMemo: req.file?.path,
    });

    await Employee.updateMany(
      { _id: { $in: employees } },
      { $inc: { "balances.ctoHours": hours } }
    );

    res.status(201).json({
      message: "CTO credit request created and credited",
      creditRequest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const rollbackCreditedRequest = async (req, res) => {
  try {
    const { creditId } = req.params;
    const userId = req.user.id;

    const credit = await CtoCredit.findById(creditId);

    if (!credit) {
      return res.status(404).json({ message: "Credit request not found" });
    }
    if (credit.status !== "CREDITED") {
      return res
        .status(400)
        .json({ message: "This credit is not active or already rolled back" });
    }

    // Reverse the CTO hours
    await Employee.updateMany(
      { _id: { $in: credit.employees } },
      { $inc: { "balances.ctoHours": -credit.hours } }
    );

    // Mark as rolled back
    credit.status = "ROLLEDBACK";
    credit.dateRolledBack = new Date();
    credit.rolledBackBy = userId;
    await credit.save();

    res.json({
      message: "CTO credit rolled back and employee balances updated",
      credit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getRecentCreditRequests = async (req, res) => {
  try {
    const credits = await CtoCredit.find()
      .populate("employees", "firstName lastName position")
      // .populate("approver", "firstName lastName position")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      message: "Showing recent 10 credit requests",
      credits,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllCreditRequests = async (req, res) => {
  try {
    const credits = await CtoCredit.find()
      .populate("employees", "firstName lastName position")
      // .populate("approver", "firstName lastName position")
      // .populate("canceledBy", "firstName lastName position role")
      .populate("rolledBackBy", "firstName lastName position role")
      .populate("creditedBy", "firstName lastName position role")
      .sort({ createdAt: -1 });

    res.json({
      message: "Showing all credit requests",
      credits,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add credit request cto with approver
// const addCreditRequest = async (req, res) => {
//   try {
//     const { employees, hours, memoNo, approver } = req.body;

//     const existingEmployees = await Employee.find({
//       _id: { $in: employees },
//     });

//     if (existingEmployees.length !== employees.length) {
//       return res.status(400).json({
//         message: "Some employee IDs are invalid or not found in the database",
//       });
//     }
//     const approverExists = await Employee.findById(approver);
//     if (!approverExists) {
//       return res.status(400).json({
//         message: "Approver ID is invalid or not found in the database",
//       });
//     }

//     const creditRequest = await CtoCredit.create({
//       employees,
//       hours,
//       memoNo,
//       approver,
//       status: "PENDING",
//       uploadedMemo: req.file?.path,
//     });

//     res
//       .status(201)
//       .json({ message: "CTO credit request created", creditRequest });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// const approveOrRejectCredit = async (req, res) => {
//   try {
//     const { creditId } = req.params;
//     const { decision, remarks } = req.body;
//     const userId = req.user.id;

//     const credit = await CtoCredit.findById(creditId);

//     if (!credit) {
//       return res.status(404).json({ message: "Credit request not found" });
//     }
//     if (credit.status !== "PENDING") {
//       return res.status(400).json({ message: "Already processed" });
//     }

//     if (credit.approver.toString() !== userId.toString()) {
//       return res.status(403).json({
//         message: "You are not authorized to approve/reject this request",
//       });
//     }

//     if (decision === "APPROVE") {
//       credit.status = "APPROVED";
//       credit.dateApproved = new Date();
//       await credit.save();

//       await Employee.updateMany(
//         { _id: { $in: credit.employees } },
//         { $inc: { "balances.ctoHours": credit.hours } }
//       );

//       return res.json({ message: "CTO credit approved and applied", credit });
//     }

//     if (decision === "REJECT") {
//       credit.status = "REJECTED";
//       credit.reviewedAt = new Date();
//       if (remarks) credit.remarks = remarks;
//       await credit.save();

//       return res.json({ message: "CTO credit rejected", credit });
//     }

//     return res
//       .status(400)
//       .json({ message: "Invalid decision. Use APPROVE or REJECT." });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// const cancelCreditRequest = async (req, res) => {
//   try {
//     const { creditId } = req.params;
//     const userId = req.user.id;

//     const credit = await CtoCredit.findById(creditId);

//     if (!credit) {
//       return res.status(404).json({ message: "Credit request not found" });
//     }

//     if (credit.status !== "PENDING") {
//       return res.status(400).json({
//         message: "Only pending requests can be canceled",
//       });
//     }

//     credit.status = "CANCELED";
//     credit.canceledAt = new Date();
//     credit.canceledBy = userId;

//     await credit.save();

//     return res.json({
//       message: "CTO credit request canceled",
//       credit,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
module.exports = {
  addCreditRequest,
  rollbackCreditedRequest,
  getRecentCreditRequests,
  getAllCreditRequests,
  // approveOrRejectCredit,
  // cancelCreditRequest,
};

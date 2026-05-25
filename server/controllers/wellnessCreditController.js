// controllers/wellnessCreditController.js
const wellnessCreditService = require("../services/wellnessCredit.service");
const path = require("path");
const fs = require("fs/promises");

function getUserIdOrThrow(req) {
  const userId = req?.user?.id;
  if (!userId) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return userId;
}

function parseJsonMaybe(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function safeDateStamp(dateApproved) {
  const d = dateApproved ? new Date(dateApproved) : new Date();
  const ok = !Number.isNaN(d.getTime()) ? d : new Date();
  return ok.toISOString().slice(0, 10).replace(/-/g, "");
}

function cleanToken(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
}

function sendError(res, err) {
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({ message: err.message || "Server error" });
}

const addWellnessCreditRequest = async (req, res) => {
  try {
    const userId = getUserIdOrThrow(req);

    const { employees, days, memoNo, dateApproved } = req.body;

    // robust parsing (supports form-data string OR JSON body)
    const employeesArray = parseJsonMaybe(employees, employees);

    // ✅ normalize req.body too (helps audit middleware if it reads req.body)
    req.body.employees = employeesArray;
    req.body.days = days;

    if (!memoNo) {
      return res.status(400).json({ message: "memoNo is required" });
    }

    let fileName = null; // just "xxx.pdf"
    let filePath = null; // "/uploads/wellness_memos/xxx.pdf" (what we store)

    // If a file was uploaded via multer
    if (req.file?.path && req.file?.originalname) {
      const extension = path.extname(req.file.originalname).toLowerCase();

      // Allow only pdf/images
      const allowed = new Set([".pdf", ".png", ".jpg", ".jpeg"]);
      if (!allowed.has(extension)) {
        await fs.unlink(req.file.path).catch(() => {});
        return res
          .status(400)
          .json({ message: "Invalid file type. Upload PDF/JPG/PNG only." });
      }

      const cleanMemoNo = cleanToken(memoNo) || "memo";
      const cleanDate = safeDateStamp(dateApproved);
      const newFileName = `${cleanMemoNo}_${cleanDate}${extension}`;

      const uploadDir = path.dirname(req.file.path);
      const newAbsPath = path.join(uploadDir, newFileName);

      try {
        await fs.rename(req.file.path, newAbsPath);
        fileName = newFileName;
      } catch {
        fileName = path.basename(req.file.path);
      }

      filePath = `/uploads/wellness_memos/${fileName}`;
    }

    const creditRequest = await wellnessCreditService.addCredit({
      employees: employeesArray,
      days,
      memoNo,
      dateApproved,
      userId,
      filePath,
    });

    // ✅ BEST: provide DB doc for audit summary (days + employees objects)
    res.locals.auditAfter = creditRequest;

    return res.status(201).json({
      message: "Wellness credit request created",
      creditRequest,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const rollbackWellnessCreditRequest = async (req, res) => {
  try {
    const userId = getUserIdOrThrow(req);
    const { creditId } = req.params;

    const credit = await wellnessCreditService.rollbackCredit({
      creditId,
      userId,
    });

    // ✅ provide updated doc to audit builder (has memoNo + employees + creditedDays)
    res.locals.auditAfter = credit;

    return res.json({
      message: "Wellness credit rolled back and employee balances updated",
      credit,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getEmployeeDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await wellnessCreditService.getEmployeeDetails(employeeId);

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    return res.json({ message: "Employee fetched", employee });
  } catch (error) {
    return sendError(res, error);
  }
};

const getAllWellnessCreditRequests = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;

    const credits = await wellnessCreditService.getAllCredits({
      page,
      limit,
      search,
      filters: { status },
    });

    return res.json({
      message: "Showing wellness credit requests",
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      total: credits.totalCount,
      credits: credits.items,
      grandTotals: credits.grandTotals,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getEmployeeWellnessCredits = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req?.user?.id;
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });

    const { search, status, page, limit } = req.query;

    const result = await wellnessCreditService.getEmployeeCredits(employeeId, {
      search,
      filters: { status },
      page,
      limit,
    });

    return res.json({
      message: "Employee wellness credits fetched successfully",
      employeeId,
      ...result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  addWellnessCreditRequest,
  rollbackWellnessCreditRequest,
  getAllWellnessCreditRequests,
  getEmployeeDetails,
  getEmployeeWellnessCredits,
};

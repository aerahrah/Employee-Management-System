const calendarService = require("../services/calendar.service");
const Employee = require("../models/employeeModel");

/**
 * @desc    Get logged-in employee's calendar events
 * @route   GET /api/calendar/my-events
 * @access  Private (Requires 'calendar.view_self' permission)
 */
const getMyEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const queryOptions = { employee: userId };

    if (req.query.status) {
      queryOptions.overallStatus = req.query.status.toUpperCase();
    }

    const events = await calendarService.getCalendarEvents(queryOptions);

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching personal calendar events:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching your calendar data.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all employees' calendar events (HR / Admin view)
 * @route   GET /api/calendar/all
 * @access  Private (Requires 'calendar.view_all' permission)
 */
const getAllEvents = async (req, res) => {
  try {
    const queryOptions = {};

    // Allow HR to filter by a specific employee ID if needed
    if (req.query.employeeId) {
      queryOptions.employee = req.query.employeeId;
    }

    if (req.query.status) {
      queryOptions.overallStatus = req.query.status.toUpperCase();
    }

    const events = await calendarService.getCalendarEvents(queryOptions);

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching all calendar events:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching global calendar data.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all calendar events for the logged-in user's project team
 * @route   GET /api/calendar/project-team
 * @access  Private
 */
const getProjectTeamEvents = async (req, res) => {
  try {
    // Grab the project ID directly from the decoded JWT token!
    const projectId = req.user.project;

    console.log(req.user.project);
    console.log(projectId);
    if (!projectId) {
      return res.status(404).json({
        success: false,
        message: "No project associated with your account.",
      });
    }

    // Find all employees belonging to the user's project
    const teamMembers = await Employee.find({
      project: projectId,
    }).select("_id");

    const teamIds = teamMembers.map((member) => member._id);

    // Query events where the employee ID is in our teamIds array
    const queryOptions = { employee: { $in: teamIds } };

    if (req.query.status) {
      queryOptions.overallStatus = req.query.status.toUpperCase();
    }

    const events = await calendarService.getCalendarEvents(queryOptions);

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching project team events:", error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while fetching your project team's calendar data.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all calendar events for the logged-in user's designation team
 * @route   GET /api/calendar/designation-team
 * @access  Private
 */
const getDesignationTeamEvents = async (req, res) => {
  try {
    // Grab the designation ID directly from the decoded JWT token!
    const designationId = req.user.designation;

    if (!designationId) {
      return res.status(404).json({
        success: false,
        message: "No designation associated with your account.",
      });
    }

    // Find all employees belonging to the user's designation
    const teamMembers = await Employee.find({
      designation: designationId,
    }).select("_id");

    const teamIds = teamMembers.map((member) => member._id);

    // Query events where the employee ID is in our teamIds array
    const queryOptions = { employee: { $in: teamIds } };

    if (req.query.status) {
      queryOptions.overallStatus = req.query.status.toUpperCase();
    }

    const events = await calendarService.getCalendarEvents(queryOptions);

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching designation team events:", error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while fetching your designation team's calendar data.",
      error: error.message,
    });
  }
};

module.exports = {
  getMyEvents,
  getAllEvents,
  getProjectTeamEvents,
  getDesignationTeamEvents,
};

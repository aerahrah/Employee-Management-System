const calendarService = require("../services/calendar.service");

/**
 * @desc    Get logged-in employee's calendar events
 * @route   GET /api/calendar/my-events
 * @access  Private (Requires 'calendar.view_self' permission)
 */
const getMyEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const queryOptions = { employee: userId };

    // Optional frontend status filtering (e.g., ?status=APPROVED)
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

    // Optional frontend status filtering
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

module.exports = {
  getMyEvents,
  getAllEvents,
};

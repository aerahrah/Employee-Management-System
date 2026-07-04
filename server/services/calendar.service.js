const CtoApplication = require("../models/ctoApplicationModel");
const WellnessApplication = require("../models/wellnessApplicationModel");

/**
 * Fetches and formats CTO and Wellness applications for a frontend calendar.
 * @param {Object} queryOptions - Filters for MongoDB (e.g., specific employee, status)
 * @returns {Array} Array of standardized calendar event objects
 */
const getCalendarEvents = async (queryOptions = {}) => {
  const ctos = await CtoApplication.find(queryOptions)
    .select(
      "inclusiveDates overallStatus applicantSnapshot reason requestedHours",
    )
    .lean();

  const wellness = await WellnessApplication.find(queryOptions)
    .select("inclusiveDates overallStatus applicantSnapshot reason totalDays")
    .lean();

  const calendarEvents = [];

  // Format CTO Applications
  ctos.forEach((app) => {
    app.inclusiveDates.forEach((date) => {
      calendarEvents.push({
        id: app._id.toString(),
        type: "CTO",
        title: `CTO - ${app.applicantSnapshot.firstName} ${app.applicantSnapshot.lastName}`,
        date: date,
        status: app.overallStatus,
        details: {
          reason: app.reason,
          duration: `${app.requestedHours} hours`,
          division: app.applicantSnapshot.division,
        },
      });
    });
  });

  // Format Wellness Applications
  wellness.forEach((app) => {
    app.inclusiveDates.forEach((date) => {
      calendarEvents.push({
        id: app._id.toString(),
        type: "Wellness",
        title: `Wellness - ${app.applicantSnapshot.firstName} ${app.applicantSnapshot.lastName}`,
        date: date,
        status: app.overallStatus,
        details: {
          reason: app.reason,
          duration: `${app.totalDays} days`,
          division: app.applicantSnapshot.division,
        },
      });
    });
  });

  return calendarEvents;
};

module.exports = {
  getCalendarEvents,
};

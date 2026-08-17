import React, { useMemo, useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { useQuery } from "@tanstack/react-query";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

// IMPORT YOUR SETTINGS FETCH FUNCTION HERE
import { fetchWorkingDaysGeneralSettings } from "../../api/generalSettings";

// ------------------ Date Setup ------------------
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// ------------------ Helper: Formatter & Colors ------------------
const formatStatusLabel = (status) => {
  if (status === "REVOCATION_REQUESTED") return "Pending Revocation";
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const getEventColor = (status) => {
  switch (status) {
    case "APPROVED":
      return "#16a34a"; // Green
    case "PENDING":
      return "#d97706"; // Amber
    case "REJECTED":
      return "#ef4444"; // Red
    case "CANCELLED":
      return "#94a3b8"; // Slate 400 (Lighter gray to distinguish from revoked)
    case "REVOCATION_REQUESTED":
      return "#9333ea"; // Purple
    case "REVOKED":
      return "#334155"; // Slate 700 (Dark solid gray)
    default:
      return "#3b82f6"; // Default Blue
  }
};

// ------------------ Custom Agenda Event Component ------------------
const CustomAgendaEvent = ({ event }) => {
  const backgroundColor = getEventColor(event.status);

  // If this is a revocation or revoked event, we might want to prioritize the revocation reason
  const displayReason =
    event.details?.revocationReason || event.details?.reason;

  return (
    <div className="flex flex-col items-start justify-center">
      <div
        className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wide shadow-sm"
        style={{ backgroundColor, color: "#ffffff" }}
      >
        {event.title}
      </div>
      {displayReason && (
        <span
          className="text-xs mt-1 opacity-70"
          style={{ color: "var(--app-text)" }}
        >
          {displayReason}
        </span>
      )}
    </div>
  );
};

// ------------------ Calendar Theme Overrides ------------------
const CalendarThemeStyles = () => (
  <style>
    {`
      .rbc-calendar {
        font-family: inherit;
        color: var(--app-text);
        height: 650px; 
      }
      
      .rbc-overlay {
        background-color: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        padding: 0.5rem;
        z-index: 50;
      }
      .rbc-overlay-header {
        font-weight: 700;
        border-bottom: 1px solid var(--app-border);
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
        color: var(--app-text);
      }
      
      /* Headers (Sun, Mon, Tue...) */
      .rbc-header {
        border-bottom: 1px solid var(--app-border) !important;
        border-left: 1px solid var(--app-border) !important;
        padding: 10px 0;
        font-weight: 700;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--app-muted);
        background-color: var(--app-surface);
      }
      .rbc-header + .rbc-header {
        border-left: 1px solid var(--app-border) !important;
      }

      .rbc-month-view, .rbc-time-view, .rbc-day-view {
        border: 1px solid var(--app-border) !important;
        background-color: var(--app-surface);
        border-radius: 0.5rem;
        overflow: hidden;
      }

      .rbc-agenda-view {
        border: 1px solid var(--app-border) !important;
        background-color: var(--app-surface);
        border-radius: 0.5rem;
        overflow-y: auto !important; 
      }

      .rbc-day-bg, .rbc-month-row, .rbc-time-header-content {
        border-color: var(--app-border) !important;
      }
      .rbc-day-bg + .rbc-day-bg {
        border-left: 1px solid var(--app-border) !important;
      }
      
      /* Off-range (Days from previous/next month) */
      .rbc-off-range-bg {
        background-color: var(--app-surface-2);
      }
      .rbc-off-range .rbc-date-cell {
        color: var(--app-muted);
        opacity: 0.5;
      }

      /* Today */
      .rbc-today {
        background-color: var(--accent-soft) !important;
      }

      /* Dates */
      .rbc-date-cell {
        padding: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--app-text);
      }

      /* Toolbar */
      .rbc-toolbar {
        margin-bottom: 1.25rem;
      }
      .rbc-toolbar button {
        color: var(--app-text);
        border: 1px solid var(--app-border);
        background-color: var(--app-surface);
        padding: 0.375rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
      }
      .rbc-toolbar button:active, .rbc-toolbar button.rbc-active {
        background-color: var(--accent);
        color: white;
        border-color: var(--accent);
        box-shadow: none;
      }
      .rbc-toolbar button:hover:not(.rbc-active) {
        background-color: var(--app-surface-2);
      }
      .rbc-toolbar-label {
        font-weight: 700;
        font-size: 1.125rem;
        color: var(--app-text);
      }

      /* Events */
      .rbc-event {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        border: none !important;
        transition: transform 0.15s ease-out;
      }
      .rbc-event:hover {
        transform: scale(1.02);
        z-index: 10;
      }

      /* =========================================
         AGENDA (LIST) VIEW OVERRIDES
      ========================================= */
      .rbc-agenda-view table.rbc-agenda-table {
        border: none !important;
        background-color: var(--app-surface);
      }
      
      .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
        border-bottom: 1px solid var(--app-border) !important;
        padding: 12px 16px;
        text-align: left;
        font-weight: 700;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--app-muted);
        background-color: var(--app-surface); 
        border-right: none !important;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
        padding: 14px 16px;
        border-bottom: 1px solid var(--app-border) !important;
        border-right: none !important;
        vertical-align: middle;
        background-color: var(--app-surface) !important; 
        transition: background-color 0.2s ease;
      }

      .rbc-agenda-view table.rbc-agenda-table tbody > tr:hover td {
        background-color: #f9fafb !important; 
      }

      .rbc-agenda-date-cell {
        font-weight: 600;
        color: var(--app-text) !important;
        font-size: 0.875rem;
        white-space: nowrap;
      }

      .rbc-agenda-time-cell {
        font-weight: 500;
        color: var(--app-muted) !important;
        font-size: 0.875rem;
        white-space: nowrap;
      }

      .rbc-agenda-empty {
        color: var(--app-muted);
        font-weight: 500;
        padding: 2rem;
        background-color: var(--app-surface);
      }
    `}
  </style>
);

const SharedCalendarView = ({ events = [], isLoading, variant = "all" }) => {
  const { data: settingsData } = useQuery({
    queryKey: ["workingDaysSettings"],
    queryFn: fetchWorkingDaysGeneralSettings,
    staleTime: 1000 * 60 * 5,
  });

  const activeWorkingDays = settingsData?.data?.activeWorkingDays || [
    1, 2, 3, 4, 5,
  ];

  const formattedEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }));
  }, [events]);

  const eventPropGetter = (event) => {
    return {
      style: {
        backgroundColor: getEventColor(event.status),
        color: "#ffffff",
      },
    };
  };

  const dayPropGetter = (date) => {
    const day = date.getDay();
    if (!activeWorkingDays.includes(day)) {
      return {
        style: {
          backgroundColor: "var(--app-surface-2)",
        },
      };
    }
    return {};
  };

  const calendarMessages = {
    agenda: "List",
    noEventsInRange: "No events found in this date range.",
  };

  const allowedViews =
    variant === "personal"
      ? ["month", "agenda"]
      : ["month", "week", "day", "agenda"];

  return (
    <div className="flex flex-col w-full gap-4">
      <CalendarThemeStyles />

      {/* =========================================
          TOP BAR: LEGEND & INFO
      ========================================= */}
      <div
        className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl border p-4 transition-colors duration-300 ease-out"
        style={{
          backgroundColor: "var(--app-surface)",
          borderColor: "var(--app-border)",
        }}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out mr-2"
            style={{ color: "var(--app-muted)" }}
          >
            Status:
          </span>
          {[
            { label: "Approved", color: "#16a34a" },
            { label: "Pending", color: "#d97706" },
            { label: "Pending Revocation", color: "#9333ea" }, // ✅ Updated Label
            { label: "Rejected", color: "#ef4444" },
            { label: "Cancelled", color: "#94a3b8" }, // ✅ Lighter Gray
            { label: "Revoked", color: "#334155" }, // ✅ Darker Gray
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span
                className="font-medium transition-colors duration-300 ease-out"
                style={{ color: "var(--app-text)" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4"
          style={{ borderColor: "var(--app-border)" }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out"
            style={{ color: "var(--app-muted)" }}
          >
            Types:
          </span>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-bold" style={{ color: "var(--app-text)" }}>
              [CTO]
            </span>
            <span style={{ color: "var(--app-muted)" }}>Time-Off</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-bold" style={{ color: "var(--app-text)" }}>
              [WLN]
            </span>
            <span style={{ color: "var(--app-muted)" }}>Wellness</span>
          </div>
        </div>
      </div>

      {/* =========================================
          MAIN CALENDAR AREA
      ========================================= */}
      <div className="w-full">
        {isLoading ? (
          <div
            className="w-full h-[650px] flex items-center justify-center rounded-xl border transition-colors duration-300 ease-out"
            style={{
              backgroundColor: "var(--app-surface-2)",
              borderColor: "var(--app-border)",
            }}
          >
            <div
              className="animate-pulse text-sm font-semibold transition-colors duration-300 ease-out"
              style={{ color: "var(--app-muted)" }}
            >
              Loading calendar events...
            </div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={formattedEvents}
            startAccessor="start"
            endAccessor="end"
            eventPropGetter={eventPropGetter}
            dayPropGetter={dayPropGetter}
            views={allowedViews}
            defaultView="month"
            messages={calendarMessages}
            popup={true}
            length={90}
            components={{
              agenda: {
                event: CustomAgendaEvent,
              },
            }}
            tooltipAccessor={(event) => {
              // Construct a tooltip prioritizing revocation info if applicable
              const baseTip = `${event.title}\nStatus: ${formatStatusLabel(event.status)}`;
              const reasonTip = `\nReason: ${event.details?.reason || "N/A"}`;
              const revokeTip = event.details?.revocationReason
                ? `\nRevocation Reason: ${event.details.revocationReason}`
                : "";
              const hrNoteTip = event.details?.revokeRemarks
                ? `\nHR Note: ${event.details.revokeRemarks}`
                : "";

              return baseTip + reasonTip + revokeTip + hrNoteTip;
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SharedCalendarView;

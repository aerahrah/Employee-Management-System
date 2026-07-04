import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyCalendarEvents } from "../../api/calendar";
import SharedCalendarView from "./sharedCalendarView";
import { toast } from "react-toastify";

import Breadcrumbs from "../breadCrumbs";
import ThemeSync from "../themeSync";
import ScrollbarsSync from "../../components/scrollbarSync";
import { useAuth } from "../../store/authStore";
import { CalendarDays, RotateCcw } from "lucide-react";

/* ------------------ Resolve theme ------------------ */
function resolveTheme(prefTheme) {
  if (prefTheme === "system") {
    const systemDark =
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    return systemDark ? "dark" : "light";
  }
  return prefTheme === "dark" ? "dark" : "light";
}

/* =========================
   UI Primitives
========================= */
const Card = ({ children, className = "", borderColor }) => (
  <div
    className={[
      "rounded-xl shadow-sm overflow-hidden transition-colors duration-300 ease-out",
      className,
    ].join(" ")}
    style={{
      backgroundColor: "var(--app-surface)",
      border: `1px solid ${borderColor}`,
    }}
  >
    {children}
  </div>
);

const MyCalendarPage = () => {
  // Theme State
  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useMemo(() => resolveTheme(prefTheme), [prefTheme]);

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.07)"
      : "rgba(15,23,42,0.10)";
  }, [resolvedTheme]);

  const {
    data: events = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["my-calendar-events"],
    queryFn: async () => {
      const res = await getMyCalendarEvents();

      return res.data.map((item) => ({
        ...item,
        title: `[${item.type === "CTO" ? "CTO" : "WLN"}] My Leave`,
        start: new Date(item.date),
        end: new Date(item.date),
        allDay: true,
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  React.useEffect(() => {
    if (!isLoading && events.length === 0) return;
  }, [isLoading, events]);

  React.useEffect(() => {
    const handleError = (error) => {
      toast.error("Failed to load your personal calendar.");
      console.error(error);
    };

    return () => {};
  }, []);

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch {
      toast.error("Failed to refresh calendar.");
    }
  };

  return (
    <div
      className="w-full max-w-6xl flex-1 flex h-full flex-col transition-colors duration-300 ease-out cto-scrollbar"
      style={{
        backgroundColor: "var(--app-bg, rgba(245,245,245,0.80))",
        color: "var(--app-text, #0f172a)",
      }}
    >
      <ThemeSync />
      <ScrollbarsSync />

      <div className="px-1 w-full mx-auto py-2 pb-6">
        <Breadcrumbs items={[{ label: "CALENDAR", to: "/app/my-calendar" }]} />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mt-2">
          <div className="min-w-0">
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight transition-colors duration-300 ease-out flex items-center gap-3"
              style={{ color: "var(--app-text)" }}
            >
              My <span className="font-bold">Leave Calendar</span>
            </h1>

            <p
              className="text-sm mt-1 transition-colors duration-300 ease-out"
              style={{ color: "var(--app-muted)" }}
            >
              View and manage your approved, pending, and upcoming leave dates.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors duration-200 ease-out disabled:opacity-40"
            style={{
              backgroundColor: "var(--app-surface)",
              border: `1px solid ${borderColor}`,
              color: "var(--accent)",
            }}
            type="button"
          >
            <RotateCcw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Calendar Container */}
        <div className="mt-5">
          <Card borderColor={borderColor}>
            <div
              className="px-4 py-3 border-b transition-colors duration-300 ease-out flex items-center gap-2"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <CalendarDays
                className="w-4 h-4"
                style={{ color: "var(--app-muted)" }}
              />

              <div
                className="text-sm font-semibold transition-colors duration-300 ease-out"
                style={{ color: "var(--app-text)" }}
              >
                Personal Leave Calendar
              </div>
            </div>

            <div className="p-4 md:p-6">
              <SharedCalendarView
                events={events}
                variant="personal"
                title="Leave Timeline"
                isLoading={isLoading}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyCalendarPage;

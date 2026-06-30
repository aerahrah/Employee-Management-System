// components/AuditLogTable.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getAuditLogs } from "../api/audit";
import Breadcrumbs from "../components/breadCrumbs";
import FullHeightCardContainer from "../components/pageContainer"; // Adjust import path as needed
import { useAuth } from "../store/authStore";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  FilterX,
  X,
  ArrowUp,
} from "lucide-react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const LIMIT_OPTIONS = [10, 20, 50, 100];

/* ------------------ Resolve theme ------------------ */
function resolveTheme(prefTheme) {
  if (prefTheme === "system") {
    const systemDark =
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    return systemDark ? "dark" : "light";
  }
  return prefTheme === "dark" ? "dark" : "light";
}

/* ------------------ Semantic badge styles ------------------ */
const getStatusBadgeStyle = (code, resolvedTheme) => {
  const isDark = resolvedTheme === "dark";

  if (code >= 200 && code < 300) {
    return {
      backgroundColor: isDark
        ? "rgba(16,185,129,0.14)"
        : "rgba(16,185,129,0.10)",
      color: isDark ? "#6ee7b7" : "#047857",
      borderColor: isDark ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.18)",
    };
  }
  if (code >= 300 && code < 400) {
    return {
      backgroundColor: isDark
        ? "rgba(59,130,246,0.14)"
        : "rgba(59,130,246,0.10)",
      color: isDark ? "#93c5fd" : "#1d4ed8",
      borderColor: isDark ? "rgba(59,130,246,0.28)" : "rgba(59,130,246,0.18)",
    };
  }
  if (code >= 400 && code < 500) {
    return {
      backgroundColor: isDark
        ? "rgba(245,158,11,0.14)"
        : "rgba(245,158,11,0.10)",
      color: isDark ? "#fcd34d" : "#b45309",
      borderColor: isDark ? "rgba(245,158,11,0.28)" : "rgba(245,158,11,0.18)",
    };
  }
  if (code >= 500) {
    return {
      backgroundColor: isDark ? "rgba(244,63,94,0.14)" : "rgba(244,63,94,0.10)",
      color: isDark ? "#fda4af" : "#be123c",
      borderColor: isDark ? "rgba(244,63,94,0.28)" : "rgba(244,63,94,0.18)",
    };
  }

  return {
    backgroundColor: isDark
      ? "rgba(148,163,184,0.14)"
      : "rgba(148,163,184,0.10)",
    color: isDark ? "#cbd5e1" : "#475569",
    borderColor: isDark ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.18)",
  };
};

const getMethodBadgeStyle = (method, resolvedTheme) => {
  const isDark = resolvedTheme === "dark";

  switch (method) {
    case "GET":
      return {
        backgroundColor: isDark
          ? "rgba(59,130,246,0.14)"
          : "rgba(59,130,246,0.10)",
        color: isDark ? "#93c5fd" : "#1d4ed8",
        borderColor: isDark ? "rgba(59,130,246,0.28)" : "rgba(59,130,246,0.18)",
      };
    case "POST":
      return {
        backgroundColor: isDark
          ? "rgba(16,185,129,0.14)"
          : "rgba(16,185,129,0.10)",
        color: isDark ? "#6ee7b7" : "#047857",
        borderColor: isDark ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.18)",
      };
    case "PUT":
      return {
        backgroundColor: isDark
          ? "rgba(245,158,11,0.14)"
          : "rgba(245,158,11,0.10)",
        color: isDark ? "#fcd34d" : "#b45309",
        borderColor: isDark ? "rgba(245,158,11,0.28)" : "rgba(245,158,11,0.18)",
      };
    case "PATCH":
      return {
        backgroundColor: isDark
          ? "rgba(168,85,247,0.14)"
          : "rgba(168,85,247,0.10)",
        color: isDark ? "#d8b4fe" : "#7c3aed",
        borderColor: isDark ? "rgba(168,85,247,0.28)" : "rgba(168,85,247,0.18)",
      };
    case "DELETE":
      return {
        backgroundColor: isDark
          ? "rgba(244,63,94,0.14)"
          : "rgba(244,63,94,0.10)",
        color: isDark ? "#fda4af" : "#be123c",
        borderColor: isDark ? "rgba(244,63,94,0.28)" : "rgba(244,63,94,0.18)",
      };
    default:
      return {
        backgroundColor: isDark
          ? "rgba(148,163,184,0.14)"
          : "rgba(148,163,184,0.10)",
        color: isDark ? "#cbd5e1" : "#475569",
        borderColor: isDark
          ? "rgba(148,163,184,0.22)"
          : "rgba(148,163,184,0.18)",
      };
  }
};

const getLeftStripStyleByStatus = (code) => {
  const c = Number(code);
  if (Number.isFinite(c)) {
    if (c >= 200 && c < 300) return { borderLeftColor: "#10b981" };
    if (c >= 300 && c < 400) return { borderLeftColor: "#3b82f6" };
    if (c >= 400 && c < 500) return { borderLeftColor: "#f59e0b" };
    if (c >= 500) return { borderLeftColor: "#f43f5e" };
  }
  return { borderLeftColor: "#94a3b8" };
};

/* =========================
   HOOK: DEBOUNCE (with flush)
========================= */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  const flush = useCallback(() => {
    setDebouncedValue(value);
  }, [value]);

  return { debouncedValue, flush };
}

/* =========================
   Pagination (compact)
========================= */
const CompactPagination = ({
  page,
  totalPages,
  total,
  startItem,
  endItem,
  onPrev,
  onNext,
  label = "items",
  rightSlot,
  borderColor,
}) => {
  return (
    <div
      className="px-4 md:px-6 py-3 border-t transition-colors duration-300 ease-out"
      style={{
        backgroundColor: "var(--app-surface)",
        borderColor,
      }}
    >
      {/* Mobile */}
      <div className="flex md:hidden items-center justify-between gap-3">
        <button
          onClick={onPrev}
          disabled={page === 1 || total === 0}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 border text-sm font-semibold disabled:opacity-30 transition-colors duration-200 ease-out"
          style={{
            borderColor,
            backgroundColor: "var(--app-surface)",
            color: "var(--app-text)",
          }}
          type="button"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>

        <div className="text-center min-w-0">
          <div
            className="text-xs font-mono font-semibold transition-colors duration-300 ease-out"
            style={{ color: "var(--app-text)" }}
          >
            {page} / {Math.max(totalPages, 1)}
          </div>
          <div
            className="text-[11px] transition-colors duration-300 ease-out"
            style={{ color: "var(--app-muted)" }}
          >
            {total === 0 ? `0 ${label}` : `${startItem}-${endItem} of ${total}`}
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={page >= totalPages || total === 0}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 border text-sm font-semibold disabled:opacity-30 transition-colors duration-200 ease-out"
          style={{
            borderColor,
            backgroundColor: "var(--app-surface)",
            color: "var(--app-text)",
          }}
          type="button"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <div
          className="text-xs font-medium transition-colors duration-300 ease-out"
          style={{ color: "var(--app-muted)" }}
        >
          Showing{" "}
          <span className="font-bold" style={{ color: "var(--app-text)" }}>
            {total === 0 ? 0 : `${startItem}-${endItem}`}
          </span>{" "}
          of{" "}
          <span className="font-bold" style={{ color: "var(--app-text)" }}>
            {total}
          </span>{" "}
          {label}
        </div>

        <div className="flex items-center gap-3">
          {rightSlot}
          <div
            className="flex items-center gap-1 p-1 rounded-lg border transition-colors duration-300 ease-out"
            style={{
              backgroundColor: "var(--app-surface-2)",
              borderColor,
            }}
          >
            <button
              onClick={onPrev}
              disabled={page === 1 || total === 0}
              className="p-1.5 rounded-md disabled:opacity-30 transition-colors duration-200 ease-out"
              style={{ color: "var(--app-muted)" }}
              aria-label="Previous"
              type="button"
              onMouseEnter={(e) => {
                if (page === 1 || total === 0) return;
                e.currentTarget.style.backgroundColor = "var(--app-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span
              className="text-xs font-mono font-medium px-3 transition-colors duration-300 ease-out"
              style={{ color: "var(--app-muted)" }}
            >
              {page} / {Math.max(totalPages, 1)}
            </span>

            <button
              onClick={onNext}
              disabled={page >= totalPages || total === 0}
              className="p-1.5 rounded-md disabled:opacity-30 transition-colors duration-200 ease-out"
              style={{ color: "var(--app-muted)" }}
              aria-label="Next"
              type="button"
              onMouseEnter={(e) => {
                if (page >= totalPages || total === 0) return;
                e.currentTarget.style.backgroundColor = "var(--app-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FieldLabel = ({ children }) => (
  <label
    className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1 transition-colors duration-300 ease-out"
    style={{ color: "var(--app-muted)" }}
  >
    {children}
  </label>
);

const Chip = ({ children }) => (
  <span
    className="px-2 py-0.5 rounded border text-[10px] font-semibold transition-colors duration-300 ease-out"
    style={{
      backgroundColor: "var(--accent-soft)",
      color: "var(--accent)",
      borderColor: "var(--accent-soft2)",
    }}
  >
    {children}
  </span>
);

const AuditLogTable = () => {
  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useMemo(() => resolveTheme(prefTheme), [prefTheme]);

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.07)"
      : "rgba(15,23,42,0.10)";
  }, [resolvedTheme]);

  const skeletonColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.08)"
      : "rgba(15,23,42,0.08)";
  }, [resolvedTheme]);

  const rowAltColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.02)"
      : "rgba(15,23,42,0.025)";
  }, [resolvedTheme]);

  const rowHoverColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "var(--accent-soft)"
      : "rgba(37,99,235,0.06)";
  }, [resolvedTheme]);

  const inputStyle = useMemo(
    () => ({
      backgroundColor: "var(--app-surface-2)",
      borderColor,
      color: "var(--app-text)",
    }),
    [borderColor],
  );

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ✅ New state to manage mobile filter toggle visibility
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [endpointInput, setEndpointInput] = useState("");
  const [statusInput, setStatusInput] = useState("");

  const { debouncedValue: email, flush: flushEmail } = useDebounce(
    emailInput,
    350,
  );
  const { debouncedValue: endpoint, flush: flushEndpoint } = useDebounce(
    endpointInput,
    350,
  );
  const { debouncedValue: statusCode, flush: flushStatus } = useDebounce(
    statusInput,
    350,
  );

  const [method, setMethod] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      email: email || undefined,
      method: method === "All" ? undefined : method || undefined,
      endpoint: endpoint || undefined,
      statusCode: statusCode || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, email, method, endpoint, statusCode, startDate, endDate],
  );

  const { data, isPending, isFetching, refetch, isPlaceholderData } = useQuery({
    queryKey: ["auditLogs", queryParams],
    queryFn: () => getAuditLogs(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setPage(1);
  }, [limit, email, endpoint, statusCode, method, startDate, endDate]);

  const total = data?.total || 0;
  const totalPages = Math.max(Math.ceil(total / limit) || 1, 1);

  useEffect(() => {
    setPage((p) => {
      if (p > totalPages) return totalPages;
      if (p < 1) return 1;
      return p;
    });
  }, [totalPages]);

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);

  const hasActiveFilters = Boolean(
    email ||
    endpoint ||
    statusCode ||
    (method && method !== "All") ||
    startDate ||
    endDate,
  );

  const rows = data?.data || [];

  const clearFilters = () => {
    setEmailInput("");
    setEndpointInput("");
    setStatusInput("");
    setMethod("All");
    setStartDate("");
    setEndDate("");
    setLimit(20);
    setPage(1);
  };

  const handleRefresh = useCallback(async () => {
    flushEmail();
    flushEndpoint();
    flushStatus();
    await Promise.resolve();
    refetch({ cancelRefetch: false });
  }, [flushEmail, flushEndpoint, flushStatus, refetch]);

  // ✅ Scroll-to-Top Logic
  const scrollRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    const st = el ? el.scrollTop : 0;
    setShowScrollTop(st > 320);
  }, []);

  const scrollToTop = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <FullHeightCardContainer>
      <div
        className="w-full flex-1 flex h-full flex-col min-h-0 md:p-0 transition-colors duration-300 ease-out"
        style={{
          backgroundColor: "var(--app-bg, rgba(245,245,245,0.80))",
          color: "var(--app-text, #0f172a)",
        }}
      >
        {/* ✅ Outer scrollable region (Mobile: scrolls / Desktop: contents bypass) */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain md:contents cto-scrollbar"
        >
          {/* HEADER */}
          <div className="pt-2 pb-3 sm:pb-6 px-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0 px-1">
                <Breadcrumbs rootLabel="home" rootTo="/app" />
                <h2
                  className="text-2xl md:text-3xl font-bold tracking-tight transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-text)" }}
                >
                  System Audit Logs
                </h2>
                <p
                  className="text-sm mt-1 max-w-2xl transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-muted)" }}
                >
                  Track and monitor system activities and security events.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleRefresh}
                  disabled={isFetching}
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60 w-full sm:w-auto"
                  style={{ backgroundColor: "var(--accent)" }}
                  title="Refresh"
                  onMouseEnter={(e) => {
                    if (isFetching) return;
                    e.currentTarget.style.filter = "brightness(0.95)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "none";
                  }}
                >
                  <RefreshCw
                    size={16}
                    className={isFetching ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* MAIN SURFACE */}
          <div
            className="flex flex-col rounded-xl shadow-sm overflow-visible md:flex-1 md:min-h-0 md:overflow-hidden border transition-colors duration-300 ease-out"
            style={{
              backgroundColor: "var(--app-surface)",
              borderColor,
            }}
          >
            {/* ✅ REDESIGNED TOOLBAR: Sticky on mobile, conditionally expands. Grid handles layout automatically. */}
            <div
              className="p-3 md:p-4 border-b sticky top-0 z-[11] backdrop-blur md:static md:z-auto transition-colors duration-300 ease-out shadow-sm md:shadow-none"
              style={{
                backgroundColor: "var(--app-surface-2)",
                borderColor,
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* 1. User (Email) - Always visible, acts as the primary search */}
                <div className="col-span-2 md:col-span-1">
                  <FieldLabel>User (Email)</FieldLabel>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--app-muted)" }}
                      />
                      <input
                        type="text"
                        placeholder="Search email…"
                        maxLength={100}
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full h-10 pl-9 pr-9 text-sm rounded-lg outline-none border transition-colors duration-200 ease-out"
                        style={inputStyle}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--accent)";
                          e.currentTarget.style.boxShadow =
                            "0 0 0 3px var(--accent-soft)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = borderColor;
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                      {emailInput && (
                        <button
                          onClick={() => setEmailInput("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors duration-200 ease-out"
                          style={{ color: "var(--app-muted)" }}
                          aria-label="Clear user"
                          title="Clear"
                          type="button"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                    {/* Mobile Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowMobileFilters(!showMobileFilters)}
                      className="md:hidden flex-none h-10 px-3 rounded-lg border transition-colors duration-200 ease-out flex items-center justify-center"
                      style={{
                        backgroundColor: showMobileFilters
                          ? "var(--accent-soft)"
                          : "var(--app-surface)",
                        color: showMobileFilters
                          ? "var(--accent)"
                          : "var(--app-muted)",
                        borderColor,
                      }}
                      title="Toggle Filters"
                    >
                      <Filter size={16} />
                    </button>
                  </div>
                </div>

                {/* 2. Endpoint - Hidden on mobile if not toggled */}
                <div
                  className={`col-span-2 md:col-span-1 ${
                    showMobileFilters ? "block" : "hidden"
                  } md:block`}
                >
                  <FieldLabel>Endpoint</FieldLabel>
                  <div className="relative">
                    <Filter
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--app-muted)" }}
                    />
                    <input
                      type="text"
                      placeholder="/api/v1/…"
                      value={endpointInput}
                      onChange={(e) => setEndpointInput(e.target.value)}
                      className="w-full h-10 pl-9 pr-9 text-sm rounded-lg outline-none border transition-colors duration-200 ease-out font-mono"
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)";
                        e.currentTarget.style.boxShadow =
                          "0 0 0 3px var(--accent-soft)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    {endpointInput && (
                      <button
                        onClick={() => setEndpointInput("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors duration-200 ease-out"
                        style={{ color: "var(--app-muted)" }}
                        aria-label="Clear endpoint"
                        title="Clear"
                        type="button"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Method */}
                <div
                  className={`col-span-1 ${
                    showMobileFilters ? "block" : "hidden"
                  } md:block`}
                >
                  <FieldLabel>Method</FieldLabel>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg outline-none cursor-pointer border transition-colors duration-200 ease-out"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--accent-soft)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = borderColor;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value="All">All</option>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Status */}
                <div
                  className={`col-span-1 ${
                    showMobileFilters ? "block" : "hidden"
                  } md:block`}
                >
                  <FieldLabel>Status</FieldLabel>
                  <input
                    type="number"
                    placeholder="e.g. 200"
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg outline-none border transition-colors duration-200 ease-out"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--accent-soft)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = borderColor;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* 5. Start Date */}
                <div
                  className={`col-span-1 ${
                    showMobileFilters ? "block" : "hidden"
                  } md:block`}
                >
                  <FieldLabel>Start Date</FieldLabel>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg outline-none border transition-colors duration-200 ease-out"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--accent-soft)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = borderColor;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* 6. End Date */}
                <div
                  className={`col-span-1 ${
                    showMobileFilters ? "block" : "hidden"
                  } md:block`}
                >
                  <FieldLabel>End Date</FieldLabel>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg outline-none border transition-colors duration-200 ease-out"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--accent-soft)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = borderColor;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Active filters + actions (Always visible if filters applied) */}
              <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-300 ease-out"
                    style={{ color: "var(--app-muted)" }}
                  >
                    Active
                  </span>

                  {!hasActiveFilters ? (
                    <span
                      className="text-xs transition-colors duration-300 ease-out"
                      style={{ color: "var(--app-muted)" }}
                    >
                      No filters applied
                    </span>
                  ) : (
                    <>
                      {email && <Chip>user: “{email}”</Chip>}
                      {endpoint && <Chip>endpoint: {endpoint}</Chip>}
                      {statusCode && <Chip>status: {statusCode}</Chip>}
                      {method !== "All" && <Chip>method: {method}</Chip>}
                      {startDate && <Chip>start: {startDate}</Chip>}
                      {endDate && <Chip>end: {endDate}</Chip>}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* <button
                    type="button"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters && limit === 20}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 transition-colors duration-200 ease-out"
                    style={{
                      borderColor,
                      backgroundColor: "var(--app-surface)",
                      color: "var(--app-text)",
                    }}
                    title="Clear filters"
                  >
                    <X size={14} style={{ color: "var(--app-muted)" }} />
                    Clear
                  </button> */}

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold transition-colors duration-200 ease-out"
                      style={{ color: "var(--accent)" }}
                      title="Reset all"
                      type="button"
                    >
                      <FilterX size={14} />
                      Reset all
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ Internal Data Scroll Region (Desktop handles internal scroll, mobile expands and scrolls with outer container) */}
            <div
              className="min-h-[calc(100dvh-26rem)] md:flex-1 md:overflow-auto transition-colors duration-300 ease-out cto-scrollbar relative"
              style={{ backgroundColor: "var(--app-surface)" }}
            >
              {/* TABLE (Desktop/Tablet) */}
              <div className="hidden sm:block w-full align-middle">
                <table className="w-full text-left border-collapse">
                  <thead
                    className="sticky top-0 z-[10] border-b transition-colors duration-300 ease-out"
                    style={{
                      backgroundColor: "var(--app-surface)",
                      borderColor,
                    }}
                  >
                    <tr
                      className="text-[10px] uppercase tracking-[0.14em] font-bold"
                      style={{ color: "var(--app-muted)" }}
                    >
                      <th className="px-4 md:px-6 py-4 w-44">Timestamp</th>
                      <th className="px-4 md:px-6 py-4 w-56">User</th>
                      <th className="px-4 md:px-6 py-4">Request Details</th>
                      <th className="px-4 md:px-6 py-4 hidden md:table-cell">
                        Summary
                      </th>
                      <th className="px-4 md:px-6 py-4 w-36 hidden lg:table-cell">
                        IP Address
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(isPending && !data) || (isFetching && !data) ? (
                      [...Array(6)].map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 md:px-6 py-4">
                            <div
                              className="h-4 rounded w-28 mb-1"
                              style={{ backgroundColor: skeletonColor }}
                            />
                            <div
                              className="h-3 rounded w-20"
                              style={{ backgroundColor: skeletonColor }}
                            />
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div
                              className="h-4 rounded w-36"
                              style={{ backgroundColor: skeletonColor }}
                            />
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="h-5 rounded w-14"
                                style={{ backgroundColor: skeletonColor }}
                              />
                              <div
                                className="h-4 rounded w-64"
                                style={{ backgroundColor: skeletonColor }}
                              />
                            </div>
                            <div
                              className="h-3 rounded w-28"
                              style={{ backgroundColor: skeletonColor }}
                            />
                          </td>
                          <td className="px-4 md:px-6 py-4 hidden md:table-cell">
                            <div
                              className="h-4 rounded w-44"
                              style={{ backgroundColor: skeletonColor }}
                            />
                          </td>
                          <td className="px-4 md:px-6 py-4 hidden lg:table-cell">
                            <div
                              className="h-4 rounded w-24"
                              style={{ backgroundColor: skeletonColor }}
                            />
                          </td>
                        </tr>
                      ))
                    ) : rows.length > 0 ? (
                      rows.map((log, idx) => {
                        const methodStyle = getMethodBadgeStyle(
                          log.method,
                          resolvedTheme,
                        );
                        const statusStyle = getStatusBadgeStyle(
                          log.statusCode,
                          resolvedTheme,
                        );
                        const bg =
                          idx % 2 === 0 ? "var(--app-surface)" : rowAltColor;

                        return (
                          <tr
                            key={log._id}
                            className="transition-colors duration-200 ease-out"
                            style={{ backgroundColor: bg }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                rowHoverColor;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = bg;
                            }}
                          >
                            <td
                              className="px-4 md:px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ease-out"
                              style={{ color: "var(--app-muted)" }}
                            >
                              <div className="flex flex-col">
                                <span
                                  className="font-semibold transition-colors duration-300 ease-out"
                                  style={{ color: "var(--app-text)" }}
                                >
                                  {new Date(log.timestamp).toLocaleDateString()}
                                </span>
                                <span
                                  className="text-xs transition-colors duration-300 ease-out"
                                  style={{ color: "var(--app-muted)" }}
                                >
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            </td>

                            <td
                              className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-semibold transition-colors duration-300 ease-out"
                              style={{ color: "var(--app-text)" }}
                            >
                              <span className="block max-w-[220px]">
                                {log.email || "Unknown user"}
                              </span>
                            </td>

                            <td className="px-4 md:px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                  <span
                                    className="px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider"
                                    style={methodStyle}
                                  >
                                    {log.method}
                                  </span>

                                  <span
                                    className="font-mono text-sm font-medium max-w-[520px] transition-colors duration-300 ease-out"
                                    style={{ color: "var(--app-text)" }}
                                    title={log.endpoint}
                                  >
                                    {log.endpoint}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 pl-0.5 min-w-0 flex-wrap">
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold"
                                    style={statusStyle}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                    {log.statusCode}
                                  </span>

                                  {log.url && log.url !== log.endpoint && (
                                    <span
                                      className="text-xs font-mono max-w-[520px] transition-colors duration-300 ease-out"
                                      style={{ color: "var(--app-muted)" }}
                                      title={log.url}
                                    >
                                      {log.url}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td
                              className="px-4 md:px-6 py-4 text-xs hidden md:table-cell transition-colors duration-300 ease-out"
                              style={{ color: "var(--app-muted)" }}
                            >
                              <div
                                className="max-w-[520px]"
                                title={log?.summary || ""}
                              >
                                {log?.summary || (
                                  <span
                                    className="italic transition-colors duration-300 ease-out"
                                    style={{ color: "var(--app-muted)" }}
                                  >
                                    No summary
                                  </span>
                                )}
                              </div>
                            </td>

                            <td
                              className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-mono hidden lg:table-cell transition-colors duration-300 ease-out"
                              style={{ color: "var(--app-muted)" }}
                            >
                              {log.ip}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-16 text-center transition-colors duration-300 ease-out"
                          style={{ color: "var(--app-muted)" }}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div
                              className="p-6 rounded-full mb-4 ring-1 transition-colors duration-300 ease-out"
                              style={{
                                backgroundColor: "var(--app-surface-2)",
                                borderColor,
                              }}
                            >
                              <Search
                                size={24}
                                style={{ color: "var(--app-muted)" }}
                              />
                            </div>
                            <p
                              className="text-lg font-bold transition-colors duration-300 ease-out"
                              style={{ color: "var(--app-text)" }}
                            >
                              No logs found
                            </p>
                            <p
                              className="text-sm mt-1 transition-colors duration-300 ease-out"
                              style={{ color: "var(--app-muted)" }}
                            >
                              Try adjusting your filters or search terms.
                            </p>
                            {hasActiveFilters && (
                              <button
                                onClick={clearFilters}
                                className="mt-6 text-sm font-bold underline transition-colors duration-200 ease-out"
                                style={{ color: "var(--accent)" }}
                                type="button"
                              >
                                Clear all filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE LIST */}
              <div className="sm:hidden p-3 space-y-2 w-full">
                {(isPending && !data) || (isFetching && !data) ? (
                  [...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="w-full min-w-0 rounded-xl p-3 animate-pulse border"
                      style={{
                        backgroundColor: "var(--app-surface)",
                        borderColor,
                      }}
                    >
                      <div
                        className="h-4 rounded w-40 mb-2"
                        style={{ backgroundColor: skeletonColor }}
                      />
                      <div
                        className="h-3 rounded w-24 mb-3"
                        style={{ backgroundColor: skeletonColor }}
                      />
                      <div
                        className="h-4 rounded w-full mb-2"
                        style={{ backgroundColor: skeletonColor }}
                      />
                      <div
                        className="h-3 rounded w-32"
                        style={{ backgroundColor: skeletonColor }}
                      />
                    </div>
                  ))
                ) : rows.length > 0 ? (
                  rows.map((log) => {
                    const leftStrip = getLeftStripStyleByStatus(log.statusCode);
                    const methodStyle = getMethodBadgeStyle(
                      log.method,
                      resolvedTheme,
                    );
                    const statusStyle = getStatusBadgeStyle(
                      log.statusCode,
                      resolvedTheme,
                    );

                    return (
                      <div
                        key={log._id}
                        className="w-full min-w-0 rounded-xl p-3 shadow-sm overflow-hidden border-l-4 border transition-colors duration-300 ease-out"
                        style={{
                          ...leftStrip,
                          borderTopColor: borderColor,
                          borderRightColor: borderColor,
                          borderBottomColor: borderColor,
                          backgroundColor: "var(--app-surface)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-sm font-semibold truncate transition-colors duration-300 ease-out"
                              style={{ color: "var(--app-text)" }}
                            >
                              {log.email || "Unknown user"}
                            </div>
                            <div
                              className="text-xs whitespace-nowrap transition-colors duration-300 ease-out"
                              style={{ color: "var(--app-muted)" }}
                            >
                              {new Date(log.timestamp).toLocaleDateString()} •{" "}
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </div>

                          <span
                            className="flex-none inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold"
                            style={statusStyle}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            {log.statusCode}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2 flex-wrap min-w-0">
                          <span
                            className="flex-none px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider"
                            style={methodStyle}
                          >
                            {log.method}
                          </span>

                          <span
                            className="min-w-0 flex-1 font-mono text-xs break-words transition-colors duration-300 ease-out"
                            style={{ color: "var(--app-text)" }}
                            title={log.endpoint}
                          >
                            {log.endpoint}
                          </span>
                        </div>

                        {log?.summary ? (
                          <div
                            className="mt-2 text-xs break-words transition-colors duration-300 ease-out"
                            style={{ color: "var(--app-muted)" }}
                          >
                            {log.summary}
                          </div>
                        ) : (
                          <div
                            className="mt-2 text-xs italic transition-colors duration-300 ease-out"
                            style={{ color: "var(--app-muted)" }}
                          >
                            No summary
                          </div>
                        )}

                        <div className="mt-2 text-[11px] flex items-start justify-between gap-2 min-w-0">
                          <span
                            className="min-w-0 flex-1 font-mono break-words transition-colors duration-300 ease-out"
                            style={{ color: "var(--app-muted)" }}
                            title={
                              log.url && log.url !== log.endpoint ? log.url : ""
                            }
                          >
                            {log.url && log.url !== log.endpoint ? log.url : ""}
                          </span>
                          <span
                            className="flex-none font-mono transition-colors duration-300 ease-out"
                            style={{ color: "var(--app-muted)" }}
                          >
                            {log.ip}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="px-4 py-14 text-center transition-colors duration-300 ease-out"
                    style={{ color: "var(--app-muted)" }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="p-6 rounded-full mb-4 ring-1 transition-colors duration-300 ease-out"
                        style={{
                          backgroundColor: "var(--app-surface-2)",
                          borderColor,
                        }}
                      >
                        <Search
                          size={24}
                          style={{ color: "var(--app-muted)" }}
                        />
                      </div>
                      <p
                        className="text-lg font-bold transition-colors duration-300 ease-out"
                        style={{ color: "var(--app-text)" }}
                      >
                        No logs found
                      </p>
                      <p
                        className="text-sm mt-1 transition-colors duration-300 ease-out"
                        style={{ color: "var(--app-muted)" }}
                      >
                        Try adjusting your filters or search terms.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-6 text-sm font-bold underline transition-colors duration-200 ease-out"
                          style={{ color: "var(--accent)" }}
                          type="button"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PAGINATION */}
            <CompactPagination
              page={page}
              totalPages={totalPages}
              total={total}
              startItem={startItem}
              endItem={endItem}
              label="logs"
              onPrev={() => setPage((p) => Math.max(p - 1, 1))}
              onNext={() => {
                if (!isPlaceholderData && page < totalPages)
                  setPage((p) => p + 1);
              }}
              borderColor={borderColor}
              rightSlot={
                <div className="hidden md:flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out"
                    style={{ color: "var(--app-muted)" }}
                  >
                    Show
                  </span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="text-xs rounded-lg block p-1.5 font-medium outline-none cursor-pointer border transition-colors duration-200 ease-out"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--accent-soft)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = borderColor;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {LIMIT_OPTIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              }
            />
          </div>
        </div>

        {/* ✅ Back-to-top Floating Button (Mobile Only) */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="md:hidden fixed bottom-5 right-5 z-[50] h-11 w-11 rounded-full shadow-lg active:scale-95 transition-all duration-200 ease-out flex items-center justify-center"
            style={{
              backgroundColor: "var(--accent, #2563EB)",
              color: "#ffffff",
            }}
            aria-label="Scroll to top"
            title="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </FullHeightCardContainer>
  );
};

export default AuditLogTable;

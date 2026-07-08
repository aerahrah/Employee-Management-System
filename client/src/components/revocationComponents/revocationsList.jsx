// RevocationsList.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  Undo,
  RotateCcw,
  CalendarDays,
} from "lucide-react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// ✅ Import both CTO and Wellness fetch functions using the updated API names
import {
  fetchAllCtoApplications,
  fetchAllWellnessApplications,
} from "../../../api/cto";
import { useAuth } from "../../../store/authStore";
import { StatusBadge } from "../../statusUtils";

/* ================================
   HOOK: DEBOUNCE
================================ */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/* ------------------ Resolve theme ------------------ */
function resolveTheme(prefTheme) {
  if (prefTheme === "system") {
    const systemDark =
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    return systemDark ? "dark" : "light";
  }
  return prefTheme === "dark" ? "dark" : "light";
}

function useResolvedTheme(prefTheme) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined")
      return prefTheme === "dark" ? "dark" : "light";
    return resolveTheme(prefTheme);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (prefTheme !== "system") {
      setTheme(prefTheme === "dark" ? "dark" : "light");
      return;
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setTheme(mq.matches ? "dark" : "light");
    update();

    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, [prefTheme]);

  return theme;
}

/* ================================
   HOOK: MEDIA QUERY (xl and up)
================================ */
function useIsXlUp() {
  const [isXlUp, setIsXlUp] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1280px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(min-width: 1280px)");
    const onChange = (e) => setIsXlUp(e.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return isXlUp;
}

/* ================================
   Compact Pagination
================================ */
const CompactPagination = ({
  page,
  totalPages,
  total,
  startItem,
  endItem,
  onPrev,
  onNext,
  label = "items",
  borderColor,
}) => {
  const hasTotal = typeof total === "number";
  const safeTotalPages = Math.max(totalPages || 1, 1);

  return (
    <div
      className="px-4 py-3 border-t transition-colors duration-300 ease-out"
      style={{
        backgroundColor: "var(--app-surface)",
        borderColor: borderColor,
      }}
    >
      <div className="flex md:hidden items-center justify-between gap-3">
        <button
          onClick={onPrev}
          disabled={page === 1 || safeTotalPages <= 1}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 border text-sm font-bold disabled:opacity-30 transition-colors duration-200 ease-out"
          style={{
            backgroundColor: "var(--app-surface)",
            borderColor: borderColor,
            color: "var(--app-text)",
          }}
          type="button"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>

        <div className="text-center min-w-0">
          <div
            className="text-xs font-mono font-semibold"
            style={{ color: "var(--app-text)" }}
          >
            {page} / {safeTotalPages}
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={page >= safeTotalPages || safeTotalPages <= 1}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 border text-sm font-bold disabled:opacity-30 transition-colors duration-200 ease-out"
          style={{
            backgroundColor: "var(--app-surface)",
            borderColor: borderColor,
            color: "var(--app-text)",
          }}
          type="button"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="hidden md:flex items-center justify-between gap-4">
        <div
          className="text-xs font-medium"
          style={{ color: "var(--app-muted)" }}
        >
          {hasTotal ? (
            <>
              Showing{" "}
              <span className="font-bold" style={{ color: "var(--app-text)" }}>
                {total === 0 ? 0 : `${startItem}-${endItem}`}
              </span>{" "}
              of{" "}
              <span className="font-bold" style={{ color: "var(--app-text)" }}>
                {total}
              </span>{" "}
              {label}
            </>
          ) : (
            <>
              Page{" "}
              <span className="font-bold" style={{ color: "var(--app-text)" }}>
                {page}
              </span>{" "}
              of{" "}
              <span className="font-bold" style={{ color: "var(--app-text)" }}>
                {safeTotalPages}
              </span>
            </>
          )}
        </div>

        <div
          className="flex items-center gap-1 p-1 rounded-lg border transition-colors duration-300 ease-out"
          style={{
            backgroundColor: "var(--app-surface-2)",
            borderColor: borderColor,
          }}
        >
          <button
            onClick={onPrev}
            disabled={page === 1 || safeTotalPages <= 1}
            className="p-1.5 rounded-md disabled:opacity-30 transition-colors duration-200 ease-out"
            style={{ color: "var(--app-muted)" }}
            type="button"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span
            className="text-xs font-mono font-semibold px-3"
            style={{ color: "var(--app-muted)" }}
          >
            {page} / {safeTotalPages}
          </span>

          <button
            onClick={onNext}
            disabled={page >= safeTotalPages || safeTotalPages <= 1}
            className="p-1.5 rounded-md disabled:opacity-30 transition-colors duration-200 ease-out"
            style={{ color: "var(--app-muted)" }}
            type="button"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const LIMIT_OPTIONS = [10, 20, 50];

const tabTone = {
  accent: {
    bg: "var(--accent-soft)",
    text: "var(--accent)",
    br: "var(--accent-soft2, rgba(37,99,235,0.18))",
  },
  purple: {
    bg: "rgba(168,85,247,0.16)",
    text: "#9333ea",
    br: "rgba(168,85,247,0.26)",
  },
  slate: {
    bg: "var(--app-surface-2)",
    text: "var(--app-text)",
    br: "var(--app-border)",
  },
};

const RevocationsList = () => {
  const navigate = useNavigate();
  const { id: selectedId } = useParams();
  const isXlUp = useIsXlUp();

  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useResolvedTheme(prefTheme);

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.07)"
      : "rgba(15,23,42,0.10)";
  }, [resolvedTheme]);

  const skeletonColors = useMemo(() => {
    const base =
      resolvedTheme === "dark"
        ? "rgba(255,255,255,0.06)"
        : "rgba(15,23,42,0.06)";
    const highlight =
      resolvedTheme === "dark"
        ? "rgba(255,255,255,0.10)"
        : "rgba(15,23,42,0.10)";

    return {
      baseColor: `var(--skeleton-base, ${base})`,
      highlightColor: `var(--skeleton-highlight, ${highlight})`,
    };
  }, [resolvedTheme]);

  const [searchTerm, setSearchTerm] = useState("");
  // Default to REVOCATION_REQUESTED since HR uses this as an inbox
  const [statusFilter, setStatusFilter] = useState("REVOCATION_REQUESTED");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounce(searchTerm, 450);

  // ✅ Fetch CTO Applications
  const {
    data: ctoData,
    isLoading: isCtoLoading,
    isError: isCtoError,
  } = useQuery({
    queryKey: [
      "allCtoApplicationsRevocationView",
      debouncedSearch,
      page,
      limit,
      statusFilter,
    ],
    queryFn: () =>
      fetchAllCtoApplications({
        search: debouncedSearch,
        page,
        limit,
        status: statusFilter || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  // ✅ Fetch Wellness Applications (Updated function call)
  const {
    data: wellnessData,
    isLoading: isWellnessLoading,
    isError: isWellnessError,
  } = useQuery({
    queryKey: [
      "allWellnessApplicationsRevocationView",
      debouncedSearch,
      page,
      limit,
      statusFilter,
    ],
    queryFn: () =>
      fetchAllWellnessApplications({
        search: debouncedSearch,
        page,
        limit,
        status: statusFilter || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const isLoading = isCtoLoading || isWellnessLoading;
  const isError = isCtoError || isWellnessError;

  // ✅ Merge and Sort Data
  const unifiedApps = useMemo(() => {
    const ctoApps = (ctoData?.data || []).map((app) => ({
      ...app,
      _appType: "CTO",
    }));
    const wellnessApps = (wellnessData?.data || []).map((app) => ({
      ...app,
      _appType: "WELLNESS",
    }));

    // Combine and sort by requested revocation date (or created date fallback)
    const combined = [...ctoApps, ...wellnessApps].sort((a, b) => {
      const dateA = a.revocationRequest?.requestedAt || a.createdAt;
      const dateB = b.revocationRequest?.requestedAt || b.createdAt;
      return new Date(dateB) - new Date(dateA);
    });

    // Ensure we strictly enforce the limit for the current page
    return combined.slice(0, limit);
  }, [ctoData, wellnessData, limit]);

  // ✅ Merge Totals & Status Counts
  const unifiedStats = useMemo(() => {
    const ctoCounts = ctoData?.statusCounts || {};
    const wellnessCounts = wellnessData?.statusCounts || {};

    const totalCto = ctoData?.pagination?.total || 0;
    const totalWellness = wellnessData?.pagination?.total || 0;
    const grandTotal = totalCto + totalWellness;

    return {
      REVOCATION_REQUESTED:
        (ctoCounts.REVOCATION_REQUESTED || 0) +
        (wellnessCounts.REVOCATION_REQUESTED || 0),
      REVOKED: (ctoCounts.REVOKED || 0) + (wellnessCounts.REVOKED || 0),
      total: grandTotal,
      totalPages: Math.max(Math.ceil(grandTotal / limit), 1),
    };
  }, [ctoData, wellnessData, limit]);

  const getCountForTab = (id) => {
    if (id === "")
      return unifiedStats.REVOCATION_REQUESTED + unifiedStats.REVOKED; // Only focusing on relevant revocation data
    return Number(unifiedStats?.[id]) || 0;
  };

  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (!isXlUp) return;
    if (!hasNavigatedRef.current && unifiedApps.length > 0 && !selectedId) {
      const firstApp = unifiedApps[0];
      const basePath =
        firstApp._appType === "CTO"
          ? "/app/cto-revocations"
          : "/app/wellness-revocations";
      navigate(`${basePath}/${firstApp._id}`, { replace: true });
      hasNavigatedRef.current = true;
    }
  }, [unifiedApps, selectedId, navigate, isXlUp]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, limit]);

  const startItem = unifiedStats.total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem =
    unifiedStats.total === 0 ? 0 : Math.min(page * limit, unifiedStats.total);

  const tabs = [
    {
      id: "REVOCATION_REQUESTED",
      label: "Pending Review",
      icon: Undo,
      tone: "purple",
    },
    { id: "REVOKED", label: "Revoked", icon: RotateCcw, tone: "slate" },
    { id: "", label: "All Revocations", icon: LayoutGrid, tone: "accent" },
  ];

  if (isError) {
    return (
      <div
        className="flex items-center justify-center h-full p-4 text-sm"
        style={{ color: "var(--app-muted)" }}
      >
        Failed to load applications
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full min-h-0 rounded-xl shadow-sm overflow-hidden min-w-0 border transition-colors duration-300 ease-out"
      style={{
        backgroundColor: "var(--app-surface)",
        borderColor: borderColor,
        color: "var(--app-text)",
      }}
    >
      <SkeletonTheme
        baseColor={skeletonColors.baseColor}
        highlightColor={skeletonColors.highlightColor}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b transition-colors duration-300 ease-out"
          style={{
            backgroundColor: "var(--app-surface-2)",
            borderColor: borderColor,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1
                className="text-lg font-bold"
                style={{ color: "var(--app-text)" }}
              >
                Global Revocations
              </h1>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                Process CTO and Wellness cancellation requests
              </p>
            </div>

            <div className="text-right">
              <div
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--app-muted)" }}
              >
                Total
              </div>
              <div
                className="text-sm font-extrabold"
                style={{ color: "var(--app-text)" }}
              >
                {isLoading ? <Skeleton width={40} /> : unifiedStats.total}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="px-3 pt-2"
          style={{ backgroundColor: "var(--app-surface)" }}
        >
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
            {tabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              const count = getCountForTab(tab.id);
              const t = tabTone[tab.tone] || tabTone.accent;

              return (
                <button
                  key={tab.id || "all"}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className="flex items-center gap-1 p-1.5 rounded-lg border transition-colors duration-200 whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? t.bg : "var(--app-surface)",
                    borderColor: isActive ? t.br : borderColor,
                    color: isActive ? t.text : "var(--app-muted)",
                  }}
                  onMouseEnter={(e) => {
                    if (isActive) return;
                    e.currentTarget.style.backgroundColor =
                      "var(--app-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    if (isActive) return;
                    e.currentTarget.style.backgroundColor =
                      "var(--app-surface)";
                  }}
                  aria-pressed={isActive}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {tab.label}
                  </span>
                  <span
                    className="px-1 py-0.5 rounded text-[9px] font-black leading-none"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.35)"
                        : "var(--app-surface-2)",
                      color: isActive ? "var(--app-text)" : "var(--app-muted)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search + Limit */}
        <div
          className="flex flex-col gap-2 px-3 py-2 border-b transition-colors duration-300 ease-out"
          style={{
            backgroundColor: "var(--app-surface)",
            borderColor: borderColor,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <div className="relative flex-1 group min-w-0">
              <Search
                className="absolute left-3 top-2.5 h-4 w-4 transition-colors"
                style={{ color: "var(--app-muted)" }}
              />
              <input
                type="text"
                placeholder="Search applicant..."
                value={searchTerm}
                maxLength={100}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 py-2 w-full rounded-lg text-sm outline-none border transition-colors duration-200 ease-out"
                style={{
                  backgroundColor: "var(--app-surface)",
                  borderColor: borderColor,
                  color: "var(--app-text)",
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 p-0.5 rounded-full transition-colors duration-200 ease-out"
                  style={{ color: "var(--app-muted)" }}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div
              className="flex items-center justify-between sm:justify-end gap-2 sm:pl-2 sm:border-l"
              style={{ borderColor: borderColor }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--app-muted)" }}
              >
                Show
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border rounded-lg px-2 py-2 text-xs font-semibold outline-none cursor-pointer transition-colors duration-200 ease-out"
                style={{
                  backgroundColor: "var(--app-surface)",
                  borderColor: borderColor,
                  color: "var(--app-text)",
                }}
              >
                {LIMIT_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-2 py-2"
          style={{ backgroundColor: "var(--app-surface)" }}
        >
          <ul className="flex flex-col gap-1">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="p-3">
                  <Skeleton height={60} borderRadius={12} />
                </li>
              ))
            ) : unifiedApps.length > 0 ? (
              unifiedApps.map((app) => {
                const isActive = selectedId === app._id;
                const initials = `${app.employee?.firstName?.[0] || ""}${
                  app.employee?.lastName?.[0] || ""
                }`;
                const isCto = app._appType === "CTO";

                const displayStatus = String(
                  app?.overallStatus || "",
                ).toUpperCase();

                // ✅ Styling logic for identifying CTO vs Wellness
                const tagColor = isCto ? "var(--accent)" : "#16a34a";
                const tagBg = isCto
                  ? "var(--accent-soft)"
                  : "rgba(34,197,94,0.14)";
                const tagBorder = isCto
                  ? "var(--accent-soft2)"
                  : "rgba(34,197,94,0.22)";

                return (
                  <li
                    key={app._id}
                    onClick={() => {
                      const basePath = isCto
                        ? "/app/cto-revocations"
                        : "/app/wellness-revocations";
                      navigate(`${basePath}/${app._id}`);
                    }}
                    className="group flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors duration-200"
                    style={{
                      backgroundColor: isActive
                        ? "var(--accent-soft)"
                        : "var(--app-surface)",
                      borderColor: isActive
                        ? "var(--accent-soft2, rgba(37,99,235,0.18))"
                        : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (isActive) return;
                      e.currentTarget.style.backgroundColor =
                        "var(--app-surface-2)";
                      e.currentTarget.style.borderColor = borderColor;
                    }}
                    onMouseLeave={(e) => {
                      if (isActive) return;
                      e.currentTarget.style.backgroundColor =
                        "var(--app-surface)";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <div
                      className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold shadow-sm transition-colors"
                      style={{
                        backgroundColor: isActive
                          ? "var(--accent)"
                          : "var(--app-surface-2)",
                        color: isActive ? "#fff" : "var(--app-muted)",
                      }}
                    >
                      {initials || "?"}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <span
                          className="text-sm font-semibold truncate"
                          style={{
                            color: "var(--app-text)",
                          }}
                        >
                          {app.employee?.firstName} {app.employee?.lastName}
                        </span>

                        <div className="flex flex-col items-end gap-1">
                          <div className="transform scale-[0.85] origin-top-right flex-none">
                            {displayStatus === "REVOCATION_REQUESTED" ? (
                              <StatusBadge status="REVOCATION_REQUESTED" />
                            ) : displayStatus === "REVOKED" ? (
                              <StatusBadge status="REVOKED" />
                            ) : (
                              <StatusBadge status={displayStatus} />
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className="text-xs truncate mt-0.5"
                        style={{ color: "var(--app-muted)" }}
                      >
                        {app.employee?.position || "No position"}
                      </span>

                      {/* ✅ Clear Identifiers for CTO vs Wellness */}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                          style={{
                            backgroundColor: tagBg,
                            color: tagColor,
                            borderColor: tagBorder,
                          }}
                        >
                          {isCto ? "CTO" : "Wellness"}
                        </span>

                        <div
                          className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: "var(--app-surface-2)",
                            borderColor: borderColor,
                            color: "var(--app-muted)",
                          }}
                        >
                          {isCto ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <CalendarDays className="h-3 w-3" />
                          )}
                          <span className="font-medium">
                            {isCto
                              ? `${app.requestedHours} hrs`
                              : `${app.totalDays} days`}
                          </span>
                        </div>

                        {app.revocationRequest?.requestedAt && (
                          <span
                            className="text-[10px] ml-auto"
                            style={{ color: "var(--app-muted)" }}
                          >
                            Req:{" "}
                            {new Date(
                              app.revocationRequest.requestedAt,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              <div
                className="flex flex-col items-center justify-center py-12"
                style={{ color: "var(--app-muted)" }}
              >
                <Search className="h-6 w-6 mb-2" style={{ opacity: 0.25 }} />
                <p className="text-xs font-medium uppercase tracking-tighter">
                  No requests found
                </p>
              </div>
            )}
          </ul>
        </div>

        <CompactPagination
          page={page}
          totalPages={unifiedStats.totalPages}
          total={unifiedStats.total}
          startItem={startItem}
          endItem={endItem}
          label="requests"
          onPrev={() => setPage((p) => Math.max(p - 1, 1))}
          onNext={() =>
            setPage((p) => Math.min(p + 1, unifiedStats.totalPages))
          }
          borderColor={borderColor}
        />
      </SkeletonTheme>
    </div>
  );
};

export default RevocationsList;

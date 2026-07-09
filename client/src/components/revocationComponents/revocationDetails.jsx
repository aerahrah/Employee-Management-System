import React, { useEffect, useMemo, useState } from "react";
import {
  Clock,
  FileText,
  BadgeCheck,
  CalendarDays,
  Check,
  ExternalLink,
  MessageCircle,
  XCircle,
  AlertCircle,
  Info,
  Ban,
  CheckCircle2,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileBadge,
  PenTool,
  Undo,
  Paperclip,
} from "lucide-react";
import { StatusIcon, StatusBadge } from "../statusUtils";
import { useAuth } from "../../store/authStore";
import { usePermissions } from "../../hooks/usePermissions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../modal";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import MemoList from "../ctoComponents/ctoMemoModal";
import { buildApiUrl } from "../../config/env";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { getMyProfile } from "../../api/employee";
// ✅ Import both CTO and Wellness APIs
// Adjust the import paths according to your actual file structure
import {
  getCtoApplicationById,
  processRevocationRequest as processCtoRevocation,
} from "../../api/cto";
import {
  getWellnessApplicationById,
  processRevocationWellnessRequest as processWellnessRevocation,
} from "../../api/wellnessApplication";

import CtoApplicationPdfModal from "../ctoComponents/ctoApplicationComponents/ctoApplicationPDFModal";
import OrganicApplicationPdfModal from "../ctoComponents/ctoApplicationComponents/organicApplicationPDFModal";

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

/* =========================
   Theme-aware icon chip styles
========================= */
function getIconChipStyle(kind, borderColor) {
  const map = {
    accent: {
      bg: "var(--accent-soft)",
      fg: "var(--accent)",
      br: "var(--accent-soft2, rgba(37,99,235,0.18))",
    },
    green: {
      bg: "rgba(34,197,94,0.14)",
      fg: "#16a34a",
      br: "rgba(34,197,94,0.22)",
    },
    red: {
      bg: "rgba(239,68,68,0.14)",
      fg: "#ef4444",
      br: "rgba(239,68,68,0.22)",
    },
    amber: {
      bg: "rgba(245,158,11,0.16)",
      fg: "#d97706",
      br: "rgba(245,158,11,0.26)",
    },
    purple: {
      bg: "rgba(168,85,247,0.16)",
      fg: "#9333ea",
      br: "rgba(168,85,247,0.26)",
    },
    slate: {
      bg: "rgba(148,163,184,0.18)",
      fg: "var(--app-text)",
      br: "rgba(148,163,184,0.24)",
    },
    neutral: {
      bg: "var(--app-surface-2)",
      fg: "var(--app-muted)",
      br: borderColor || "var(--app-border)",
    },
  };

  return map[kind] || map.neutral;
}

function getOverallIconChipKind(overallStatus) {
  const s = String(overallStatus || "").toUpperCase();
  if (s === "APPROVED") return "green";
  if (s === "REJECTED") return "red";
  if (s === "CANCELLED") return "slate";
  if (s === "REVOCATION_REQUESTED") return "purple";
  if (s === "REVOKED") return "slate";
  return "amber";
}

/* =========================
   LOADING SKELETON
========================= */
const RevocationDetailsSkeleton = ({ borderColor, resolvedTheme }) => {
  const skeletonBase =
    resolvedTheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const skeletonHighlight =
    resolvedTheme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

  const baseColor = `var(--skeleton-base, ${skeletonBase})`;
  const highlightColor = `var(--skeleton-highlight, ${skeletonHighlight})`;
  const bgFallback =
    resolvedTheme === "dark" ? "rgba(2,6,23,0.96)" : "rgba(245,245,245,0.80)";

  return (
    <div
      className="flex-1 h-full rounded-xl shadow-md w-full flex flex-col gap-2 max-w-6xl mx-auto min-w-0 border"
      aria-busy="true"
      style={{
        backgroundColor: `var(--app-bg, ${bgFallback})`,
        color: "var(--app-text, #0f172a)",
        borderColor: borderColor || "var(--app-border, rgba(15,23,42,0.10))",
      }}
    >
      <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
        <header
          className="flex md:rounded-t-xl flex-col md:flex-row md:items-center justify-between gap-3 border-b backdrop-blur px-3 sm:px-4 py-2 z-10"
          style={{
            backgroundColor: "var(--app-surface, rgba(255,255,255,0.9))",
            borderColor:
              borderColor || "var(--app-border, rgba(15,23,42,0.10))",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Skeleton height={48} width={48} borderRadius={12} />
              <div className="min-w-0 flex-1">
                <Skeleton height={18} width={"55%"} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Skeleton height={18} width={110} borderRadius={999} />
                  <Skeleton height={18} width={120} borderRadius={999} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2 sm:gap-3 pt-1">
            <Skeleton height={40} width={110} borderRadius={12} />
            <Skeleton height={40} width={160} borderRadius={12} />
          </div>
        </header>

        <div className="flex h-full flex-1 min-h-0 overflow-y-auto app-scrollbar flex-col gap-4 px-3 sm:px-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
            <div
              className="md:col-span-2 rounded-xl p-4 sm:p-6 relative overflow-hidden shadow-sm min-w-0"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent, #2563eb) 0%, rgba(255,255,255,0.16) 140%)",
              }}
            >
              <div className="relative z-10 flex gap-3 justify-between items-center min-w-0">
                <div className="min-w-0 flex-1">
                  <Skeleton height={12} width={140} borderRadius={8} />
                  <div className="mt-2">
                    <Skeleton height={26} width={"85%"} borderRadius={10} />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-none">
                  <div
                    className="backdrop-blur-md px-4 py-2 rounded-xl"
                    style={{ backgroundColor: "rgba(255,255,255,0.20)" }}
                  >
                    <Skeleton height={10} width={90} borderRadius={8} />
                    <div className="mt-2">
                      <Skeleton height={22} width={70} borderRadius={10} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="border rounded-xl p-4 flex justify-between items-center text-center gap-4 min-w-0"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <Skeleton height={56} width={56} borderRadius={18} />
              <div className="text-start min-w-0 flex-1">
                <Skeleton height={12} width={120} borderRadius={8} />
                <div className="mt-2">
                  <Skeleton height={22} width={140} borderRadius={10} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SkeletonTheme>
    </div>
  );
};

/* =========================
   Status & Timeline helpers
========================= */
const STATUS_META = {
  APPROVED: { label: "APPROVED", tone: "green" },
  REJECTED: { label: "REJECTED", tone: "red" },
  PENDING: { label: "PENDING", tone: "amber" },
  CANCELLED: { label: "CANCELLED", tone: "slate" },
  REVOCATION_REQUESTED: { label: "REVOKE REQ.", tone: "purple" },
  REVOKED: { label: "REVOKED", tone: "slate" },
};

const getTonePillStyle = (tone, borderColor) => {
  const t = getIconChipStyle(tone, borderColor);
  return {
    backgroundColor: t.bg,
    color: t.fg,
    borderColor: t.br,
  };
};

const StepDotIcon = ({ status }) => {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED")
    return <CheckCircle2 size={16} className="text-white" />;
  if (s === "REJECTED") return <XCircle size={16} className="text-white" />;
  if (s === "CANCELLED") return <Ban size={16} className="text-white" />;
  return <Users size={16} className="text-white" />;
};

const StepDotClass = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-500";
  if (s === "REJECTED") return "bg-red-500";
  if (s === "CANCELLED") return "bg-slate-400";
  return "bg-[color:var(--app-border)]";
};

const TimelineCard = ({ approval, index, isLast }) => {
  const status = String(approval?.status || "").toUpperCase();
  const isDenied = status === "REJECTED";
  const isPending = status === "PENDING";
  const isCancelled = status === "CANCELLED";

  const noteStyle = isDenied
    ? { bg: "rgba(239,68,68,0.10)", br: "rgba(239,68,68,0.20)", fg: "#ef4444" }
    : isCancelled
      ? {
          bg: "rgba(148,163,184,0.14)",
          br: "rgba(148,163,184,0.22)",
          fg: "var(--app-text)",
        }
      : {
          bg: "var(--app-surface-2)",
          br: "var(--app-border)",
          fg: "var(--app-text)",
        };

  const approverFName =
    approval.approverSnapshot?.firstName || approval.approver?.firstName;
  const approverLName =
    approval.approverSnapshot?.lastName || approval.approver?.lastName;
  const approverPosition =
    approval.approverSnapshot?.position ||
    approval.approver?.position ||
    "Approver";
  const signatureUrl =
    approval.approverSnapshot?.signatureUrl ||
    approval.approverSignature?.signatureUrl;
  const signedAt =
    approval.approverSnapshot?.signedAt || approval.approverSignature?.signedAt;

  return (
    <div className="relative flex gap-2 sm:gap-4 items-start min-w-0">
      {!isLast && (
        <div
          className="absolute left-5 top-10 bottom-0 w-0.5"
          style={{ backgroundColor: "var(--app-border)" }}
        />
      )}

      <div
        className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center border-4 shadow-md transition-transform hover:scale-110 flex-none ${StepDotClass(
          status,
        )}`}
        style={{ borderColor: "var(--app-surface)" }}
        title={status}
      >
        <StepDotIcon status={status} />
      </div>

      <div
        className={`flex-1 border rounded-2xl p-4 sm:p-5 shadow-xs min-w-0 transition-all ${
          isPending ? "opacity-90" : ""
        }`}
        style={{
          backgroundColor: "var(--app-surface)",
          borderColor: "var(--app-border)",
        }}
      >
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--app-muted)" }}
              >
                Approver {index + 1}
              </span>
            </div>
            <p
              className="text-sm font-semibold break-words mt-1"
              style={{ color: "var(--app-text)" }}
            >
              {approverFName} {approverLName}
            </p>
            <p
              className="text-xs font-medium break-words"
              style={{ color: "var(--accent)" }}
            >
              {approverPosition}
            </p>
          </div>
          <div className="flex-none">
            <StatusBadge status={status} size="sm" />
          </div>
        </div>

        {approval?.remarks && String(approval.remarks).trim() !== "" && (
          <div
            className="mt-4 rounded-xl p-3 text-xs leading-relaxed border flex items-start gap-2 min-w-0"
            style={{
              backgroundColor: noteStyle.bg,
              borderColor: noteStyle.br,
              color: noteStyle.fg,
            }}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p className="break-words">
              <strong>Note:</strong> {approval.remarks}
            </p>
          </div>
        )}

        {signatureUrl && (
          <div
            className="mt-4 border-t border-dashed"
            style={{ borderColor: "var(--app-border)" }}
          >
            {signedAt && (
              <p className="text-[10px] text-slate-500 mt-1">
                Signed on: {new Date(signedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================
   Calendar helpers
========================= */
const pad2 = (n) => String(n).padStart(2, "0");
const toDateKeyLocal = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const RequestedDatesCalendar = ({ dates = [] }) => {
  const requestedKeys = useMemo(() => {
    const set = new Set();
    (Array.isArray(dates) ? dates : []).forEach((x) => {
      const key = toDateKeyLocal(x);
      if (key) set.add(key);
    });
    return set;
  }, [dates]);

  const earliestRequested = useMemo(() => {
    const arr = (Array.isArray(dates) ? dates : [])
      .map((x) => new Date(x))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    return arr[0] || null;
  }, [dates]);

  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(earliestRequested || new Date()),
  );

  useEffect(() => {
    if (earliestRequested) setViewMonth(startOfMonth(earliestRequested));
  }, [earliestRequested]);

  const monthLabel = useMemo(() => {
    return viewMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewMonth]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const grid = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const last = endOfMonth(viewMonth);
    const leadingBlanks = first.getDay();
    const daysInMonth = last.getDate();
    const cells = [];

    for (let i = 0; i < leadingBlanks; i++)
      cells.push({ type: "blank", key: `b-${i}` });

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      const key = toDateKeyLocal(d);
      cells.push({
        type: "day",
        key,
        day,
        date: d,
        isRequested: key ? requestedKeys.has(key) : false,
        isToday: isSameDay(d, new Date()),
      });
    }

    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const trailing = 7 - remainder;
      for (let i = 0; i < trailing; i++)
        cells.push({ type: "blank", key: `t-${i}` });
    }
    return cells;
  }, [viewMonth, requestedKeys]);

  return (
    <div
      className="border rounded-xl p-2 sm:p-3 shadow-sm min-w-0"
      style={{
        backgroundColor: "var(--app-surface)",
        borderColor: "var(--app-border)",
        color: "var(--app-text)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--app-muted)" }}
          >
            Calendar
          </h4>
        </div>
        <div className="flex items-center gap-1.5 flex-none">
          <button
            type="button"
            onClick={() => setViewMonth((d) => addMonths(d, -1))}
            className="h-9 w-9 rounded-xl border flex items-center justify-center transition"
            style={{ borderColor: "var(--app-border)" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMonth((d) => addMonths(d, 1))}
            className="h-9 w-9 rounded-xl border flex items-center justify-center transition"
            style={{ borderColor: "var(--app-border)" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <CalendarDays
          size={16}
          className="flex-none"
          style={{ color: "var(--accent)" }}
        />
        <p className="text-sm font-bold truncate">{monthLabel}</p>
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-7 gap-1.5">
          {dayNames.map((dn) => (
            <div
              key={dn}
              className="text-[10px] font-bold uppercase tracking-wider text-center py-1"
              style={{ color: "var(--app-muted)" }}
            >
              {dn}
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {grid.map((cell, idx) => {
            if (cell.type === "blank")
              return (
                <div
                  key={cell.key || `blank-${idx}`}
                  className="h-9 bg-transparent"
                />
              );

            return (
              <div
                key={cell.key}
                className={`h-9 rounded-xl border text-sm font-semibold flex items-center justify-center ${
                  cell.isToday ? "ring-2 ring-blue-200 ring-offset-2" : ""
                }`}
                style={{
                  backgroundColor: cell.isRequested
                    ? "var(--accent)"
                    : "var(--app-surface)",
                  color: cell.isRequested ? "#fff" : "var(--app-text)",
                  borderColor: cell.isRequested
                    ? "var(--accent)"
                    : "var(--app-border)",
                }}
              >
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* =========================
   REVOCATION DETAILS (UNIFIED)
========================= */
const RevocationDetails = () => {
  const { admin } = useAuth();
  const { can } = usePermissions();
  const canManageApplication =
    can("cto.manage_application") || can("wellness.manage");
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useResolvedTheme(prefTheme);

  // ✅ Determine application type based on the URL path
  const isCtoRoute = location.pathname.includes("cto-revocations");

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.07)"
      : "rgba(15,23,42,0.10)";
  }, [resolvedTheme]);

  const [isProcessed, setIsProcessed] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [modalType, setModalType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memoModal, setMemoModal] = useState({ isOpen: false, memos: [] });
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isOrganicPdfOpen, setIsOrganicPdfOpen] = useState(false);

  const currentUserId = admin?.id || admin?._id;

  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    staleTime: 1000 * 60 * 5,
  });

  const hasSignature = Boolean(profileData?.signature || admin?.signature);

  // ✅ Dynamically Fetch Application Data
  const {
    data: application,
    isPending,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: [
      isCtoRoute ? "ctoApplication" : "wellnessApplication",
      currentUserId,
      id,
    ],
    queryFn: () =>
      isCtoRoute ? getCtoApplicationById(id) : getWellnessApplicationById(id),
    enabled: !!currentUserId && !!id,
  });

  const isOrganicApp =
    application?.employeeType === "Organic" ||
    application?.category === "Organic" ||
    !isCtoRoute; // Wellness is technically organic flow by default

  const requestedDatesLabel = useMemo(() => {
    const dates = application?.inclusiveDates || [];
    if (!dates.length) return "No dates set";
    return dates
      .map((d) =>
        new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      )
      .join(", ");
  }, [application?.inclusiveDates]);

  const sortedApprovals = useMemo(() => {
    if (!Array.isArray(application?.approvals)) return [];
    return [...application.approvals].sort(
      (a, b) => (a.level || 0) - (b.level || 0),
    );
  }, [application?.approvals]);

  // ✅ Dynamically setup Mutations based on Route
  const approveRevocationMutation = useMutation({
    mutationFn: (applicationId) =>
      isCtoRoute
        ? processCtoRevocation(applicationId, { action: "APPROVE", remarks })
        : processWellnessRevocation(applicationId, {
            action: "APPROVE",
            remarks,
          }),
    onSuccess: () => {
      setIsProcessed(true);
      setIsModalOpen(false);
      toast.success("Revocation approved successfully. Credits restored.");
      queryClient.invalidateQueries([
        isCtoRoute ? "ctoApplication" : "wellnessApplication",
        id,
      ]);
      queryClient.invalidateQueries(["allCtoApplicationsRevocationView"]);
      queryClient.invalidateQueries(["allWellnessApplicationsRevocationView"]);
    },
    onError: (err) =>
      toast.error(err.message || "Failed to approve revocation."),
  });

  const rejectRevocationMutation = useMutation({
    mutationFn: (applicationId) =>
      isCtoRoute
        ? processCtoRevocation(applicationId, { action: "REJECT", remarks })
        : processWellnessRevocation(applicationId, {
            action: "REJECT",
            remarks,
          }),
    onSuccess: () => {
      setRemarks("");
      setIsProcessed(true);
      setIsModalOpen(false);
      toast.success("Revocation rejected. Leave remains approved.");
      queryClient.invalidateQueries([
        isCtoRoute ? "ctoApplication" : "wellnessApplication",
        id,
      ]);
      queryClient.invalidateQueries(["allCtoApplicationsRevocationView"]);
      queryClient.invalidateQueries(["allWellnessApplicationsRevocationView"]);
    },
    onError: (err) =>
      toast.error(err.message || "Failed to reject revocation."),
  });

  const isMutating =
    approveRevocationMutation.isPending || rejectRevocationMutation.isPending;

  const handleAction = () => {
    if (!application) return;
    if (isMutating) return;

    if (modalType === "approve") {
      approveRevocationMutation.mutate(application._id);
    } else {
      if (!remarks.trim()) return toast.error("Please provide a reason.");
      rejectRevocationMutation.mutate(application._id);
    }
  };

  useEffect(() => {
    setIsProcessed(false);
    setRemarks("");
    setIsPdfOpen(false);
    setIsOrganicPdfOpen(false);
  }, [application]);

  if (isPending || (isFetching && !application))
    return (
      <RevocationDetailsSkeleton
        borderColor={borderColor}
        resolvedTheme={resolvedTheme}
      />
    );

  if (isError)
    return <p style={{ color: "var(--app-muted)" }}>Error: {error?.message}</p>;

  if (!application)
    return (
      <div
        className="flex flex-col items-center justify-center py-40 rounded-xl border-2 border-dashed m-4 sm:m-6"
        style={{
          backgroundColor: "var(--app-surface-2)",
          borderColor: "var(--app-border)",
          color: "var(--app-text)",
        }}
      >
        <FileText className="h-10 w-10" style={{ color: "var(--app-muted)" }} />
        <h3 className="font-semibold mt-2" style={{ color: "var(--app-text)" }}>
          No Application Found
        </h3>
      </div>
    );

  const initials = `${application.employee?.firstName?.[0] || ""}${
    application.employee?.lastName?.[0] || ""
  }`;

  // ✅ Show actions ONLY if the status is exactly REVOCATION_REQUESTED
  const canApproveOrReject =
    application.overallStatus === "REVOCATION_REQUESTED" && !isProcessed;

  const overallMeta =
    STATUS_META[String(application.overallStatus || "").toUpperCase()] ||
    STATUS_META.PENDING;

  const overallPillStyle = getTonePillStyle(overallMeta.tone, borderColor);
  const overallIconKind = getOverallIconChipKind(application.overallStatus);
  const overallIconChip = getIconChipStyle(overallIconKind, borderColor);

  const memos = Array.isArray(application.memo) ? application.memo : [];
  const memoCount = memos.length;

  return (
    <div
      className="flex-1 h-full rounded-xl shadow-md w-full flex flex-col gap-2 max-w-6xl mx-auto min-w-0 border"
      style={{
        backgroundColor: "var(--app-bg)",
        color: "var(--app-text)",
        borderColor: borderColor,
      }}
    >
      {/* HEADER */}
      <header
        className="flex md:rounded-t-xl flex-col md:flex-row md:items-center justify-between gap-3 border-b backdrop-blur px-3 sm:px-4 py-2 z-10"
        style={{
          backgroundColor: "var(--app-surface)",
          borderColor: borderColor,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate("/app/revocations")}
            className="mr-2 p-2 rounded-xl border shadow-sm transition hover:scale-105"
            style={{
              backgroundColor: "var(--app-surface)",
              borderColor: borderColor,
            }}
          >
            <ChevronLeft size={18} style={{ color: "var(--app-text)" }} />
          </button>

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div
              className="h-12 w-12 rounded-xl text-white flex items-center justify-center font-bold text-lg flex-none"
              style={{
                backgroundColor: isCtoRoute ? "var(--accent)" : "#16a34a",
              }}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <h2
                className="text-lg font-bold leading-tight truncate"
                style={{ color: "var(--app-text)" }}
              >
                {application.employee?.firstName}{" "}
                {application.employee?.lastName}
              </h2>

              <div
                className="flex flex-wrap items-center gap-2 text-xs font-medium mt-0.5"
                style={{ color: "var(--app-muted)" }}
              >
                <span
                  className="px-1.5 py-0.5 rounded border font-bold"
                  style={{
                    backgroundColor: isCtoRoute
                      ? "var(--accent-soft)"
                      : "rgba(34,197,94,0.14)",
                    color: isCtoRoute ? "var(--accent)" : "#16a34a",
                    borderColor: isCtoRoute
                      ? "var(--accent-soft2, rgba(37,99,235,0.18))"
                      : "rgba(34,197,94,0.22)",
                  }}
                >
                  {isCtoRoute ? "CTO" : "WELLNESS"}
                </span>

                <span
                  className="px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: "var(--app-surface-2)",
                    color: "var(--app-muted)",
                    borderColor: borderColor,
                  }}
                >
                  ID: {application.employee?.employeeId || "N/A"}
                </span>

                <span className="flex items-center gap-1">
                  <Clock size={12} />{" "}
                  {new Date(application.createdAt).toLocaleDateString()}
                </span>

                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold"
                  style={overallPillStyle}
                  title="Overall Status"
                >
                  {String(application.overallStatus || "").toUpperCase() ===
                  "CANCELLED" ? (
                    <Ban size={12} />
                  ) : null}
                  {application.overallStatus === "REVOCATION_REQUESTED"
                    ? "REVOCATION REQUEST"
                    : application.overallStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS (HR Only) */}
        <div className="flex flex-row items-center gap-2 sm:gap-3 pt-1 bg-transparent rounded-xl w-full md:w-auto">
          {canApproveOrReject ? (
            canManageApplication &&
            (isProfileLoading ? (
              <span
                className="text-sm font-medium px-4 py-2"
                style={{ color: "var(--app-muted)" }}
              >
                Checking status...
              </span>
            ) : !hasSignature ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border"
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  borderColor: "rgba(239,68,68,0.2)",
                  color: "#ef4444",
                }}
              >
                <AlertCircle size={14} /> Signature Required
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setModalType("reject");
                    setIsModalOpen(true);
                  }}
                  className="w-full sm:w-auto flex-1 md:flex-none px-4 py-2 rounded-lg font-semibold"
                  style={{
                    backgroundColor: "var(--app-surface-2)",
                    color: "var(--app-text)",
                    border: `1px solid ${borderColor}`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.filter = "brightness(0.98)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
                >
                  Reject Revocation
                </button>

                <button
                  onClick={() => {
                    setModalType("approve");
                    setIsModalOpen(true);
                  }}
                  disabled={approveRevocationMutation.isPending}
                  className="w-full sm:w-auto rounded-lg px-4 py-2 transition shadow-sm font-medium flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: "var(--accent)",
                    border: "1px solid var(--accent)",
                    color: "#fff",
                    opacity: approveRevocationMutation.isPending ? 0.8 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (approveRevocationMutation.isPending) return;
                    e.currentTarget.style.filter = "brightness(0.95)";
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
                >
                  {approveRevocationMutation.isPending
                    ? "Processing..."
                    : "Approve Revocation"}
                </button>
              </>
            ))
          ) : (
            <div
              className="px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border w-full sm:w-auto"
              style={{
                backgroundColor: "rgba(34,197,94,0.14)",
                color: "#16a34a",
                borderColor: "rgba(34,197,94,0.22)",
              }}
            >
              <BadgeCheck size={18} /> Action Completed
            </div>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex h-full flex-1 min-h-0 overflow-y-auto app-scrollbar flex-col gap-4 px-3 sm:px-4 py-2">
        {/* Missing Signature Banner */}
        {canApproveOrReject && !isProfileLoading && !hasSignature && (
          <div className="mb-2 p-4 bg-orange-50 border-l-4 border-orange-500 rounded flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 text-orange-800">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">E-Signature Required</h4>
                <p className="text-xs">
                  You do not currently have a digital signature configured. A
                  signature is required to process leave actions.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/app/my-profile")}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded shadow transition-colors"
            >
              <PenTool size={14} /> Upload Signature
            </button>
          </div>
        )}

        {/* QUICK STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
          <div
            className="md:col-span-2 rounded-xl p-4 sm:p-6 text-white flex gap-3 justify-between items-center relative overflow-hidden min-w-0"
            style={{
              background: `linear-gradient(135deg, ${isCtoRoute ? "var(--accent)" : "#16a34a"} 80%, rgba(255,255,255,0.16) 140%)`,
            }}
          >
            <CalendarDays className="absolute right-[-20px] top-[-20px] h-40 w-40 text-white/10 rotate-12" />
            <div className="min-w-0">
              <p className="text-white/90 text-xs font-bold uppercase tracking-widest mb-1">
                Requested Dates
              </p>
              <h3 className="text-xl md:text-2xl font-bold break-words">
                {requestedDatesLabel}
              </h3>
            </div>

            <div className="flex items-center gap-4 flex-none">
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl">
                <p className="text-[10px] text-white/90 uppercase font-bold">
                  Total Duration
                </p>
                <p className="text-xl font-bold">
                  {isCtoRoute
                    ? `${application.requestedHours} Hours`
                    : `${application.totalDays} Days`}
                </p>
              </div>
            </div>
          </div>

          <div
            className="border rounded-xl p-4 flex justify-between items-center text-center gap-4 min-w-0"
            style={{
              backgroundColor: "var(--app-surface)",
              borderColor: borderColor,
            }}
          >
            <div
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: overallIconChip.bg,
                borderColor: overallIconChip.br,
                color: overallIconChip.fg,
              }}
            >
              {String(application.overallStatus || "").toUpperCase() ===
              "CANCELLED" ? (
                <Ban size={28} className="h-6 w-6" />
              ) : String(application.overallStatus || "").toUpperCase() ===
                "REVOCATION_REQUESTED" ? (
                <Undo size={28} className="h-6 w-6" />
              ) : (
                <StatusIcon
                  status={application.overallStatus}
                  size={32}
                  className="h-6 w-6"
                />
              )}
            </div>

            <div className="text-start min-w-0">
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--app-muted)" }}
              >
                Global Status
              </p>
              <p
                className="text-xl font-black break-words"
                style={{ color: "var(--app-text)" }}
              >
                {application.overallStatus === "REVOCATION_REQUESTED"
                  ? "REVOKE REQ."
                  : application.overallStatus}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
          {/* MAIN */}
          <div className="lg:col-span-2 space-y-4 min-w-0">
            {/* ✅ REVOCATION REASON SECTION (Highly Prominent) */}
            {(application.overallStatus === "REVOCATION_REQUESTED" ||
              application.overallStatus === "REVOKED" ||
              application.revocationRequest?.reason) && (
              <section
                className="border rounded-xl p-3 shadow-sm min-w-0"
                style={{
                  backgroundColor: "rgba(168,85,247,0.03)", // Subtle purple tint
                  borderColor: "rgba(168,85,247,0.3)", // Purple border
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-10 w-10 rounded-xl flex items-center justify-center flex-none border"
                      style={{
                        backgroundColor: "rgba(168,85,247,0.16)",
                        color: "#9333ea", // Purple text
                        borderColor: "rgba(168,85,247,0.26)",
                      }}
                    >
                      <Undo size={20} />
                    </span>
                    <h3
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#9333ea" }}
                    >
                      Employee Revocation Request
                    </h3>
                  </div>
                  {application.revocationRequest?.requestedAt && (
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: "var(--app-muted)" }}
                    >
                      Requested on{" "}
                      {new Date(
                        application.revocationRequest.requestedAt,
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <p
                  className="leading-relaxed font-medium p-4 rounded-2xl border break-words"
                  style={{
                    color: "var(--app-text)",
                    backgroundColor: "var(--app-surface)",
                    borderColor: borderColor,
                  }}
                >
                  {application.revocationRequest?.reason ||
                    "No reason provided."}
                </p>

                {application.revocationRequest?.attachmentUrl && (
                  <div className="mt-4">
                    <a
                      href={buildApiUrl(
                        application.revocationRequest.attachmentUrl,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors hover:bg-slate-50"
                      style={{
                        color: "var(--app-text)",
                        borderColor: borderColor,
                        backgroundColor: "var(--app-surface-2)",
                      }}
                    >
                      <Paperclip size={16} style={{ color: "var(--accent)" }} />
                      View Attached Evidence
                      <ExternalLink
                        size={14}
                        style={{ color: "var(--app-muted)" }}
                      />
                    </a>
                  </div>
                )}
              </section>
            )}

            {/* ORIGINAL LEAVE REASON */}
            <section
              className="border rounded-xl p-3 shadow-sm min-w-0"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                {(() => {
                  const chip = getIconChipStyle("slate", borderColor);
                  return (
                    <span
                      className="h-8 w-8 rounded-lg flex items-center justify-center flex-none border"
                      style={{
                        backgroundColor: chip.bg,
                        color: chip.fg,
                        borderColor: chip.br,
                      }}
                    >
                      <MessageCircle size={16} />
                    </span>
                  );
                })()}

                <h3
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--app-muted)" }}
                >
                  Original Purpose of Leave
                </h3>
              </div>

              <p
                className="leading-relaxed italic p-3 rounded-xl border break-words text-sm"
                style={{
                  color: "var(--app-muted)", // Dimmed color for original reason
                  backgroundColor: "var(--app-surface-2)",
                  borderColor: borderColor,
                }}
              >
                "{application.reason || "No reason provided."}"
              </p>
            </section>

            {/* TIMELINE */}
            <section
              className="border rounded-xl p-3 shadow-sm min-w-0"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                {(() => {
                  const chip = getIconChipStyle("green", borderColor);
                  return (
                    <span
                      className="h-10 w-10 rounded-xl flex items-center justify-center flex-none border"
                      style={{
                        backgroundColor: chip.bg,
                        color: chip.fg,
                        borderColor: chip.br,
                      }}
                    >
                      <History size={18} />
                    </span>
                  );
                })()}

                <div className="min-w-0">
                  <h3
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--app-muted)" }}
                  >
                    Processing Timeline
                  </h3>
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--app-muted)" }}
                  >
                    Initial approval flow
                  </p>
                </div>
              </div>

              <div className="relative space-y-6 sm:space-y-8 t-1 min-w-0 opacity-80">
                <div
                  className="absolute left-5 top-2 bottom-2 w-0.5"
                  style={{ backgroundColor: "var(--app-border)" }}
                />

                {sortedApprovals.map((approval, idx) => (
                  <TimelineCard
                    key={approval?._id || idx}
                    approval={approval}
                    index={idx}
                    isLast={
                      idx === sortedApprovals.length - 1 &&
                      application.overallStatus !== "REVOKED"
                    }
                  />
                ))}

                {application.overallStatus === "REVOKED" && (
                  <div className="relative flex gap-2 sm:gap-4 items-start mt-8">
                    <div className="relative z-10 h-10 w-10 rounded-full bg-slate-500 flex items-center justify-center border-4 border-white shadow-md flex-none">
                      <Undo size={18} className="text-white" />
                    </div>
                    <div
                      className="flex-1 rounded-2xl p-4 shadow-sm border"
                      style={{
                        backgroundColor: "rgba(148,163,184,0.14)",
                        borderColor: "rgba(148,163,184,0.22)",
                      }}
                    >
                      <p
                        className="font-bold text-sm"
                        style={{ color: "var(--app-text)" }}
                      >
                        Application Revoked
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--app-muted)" }}
                      >
                        Credits have been restored to the employee's ledger.
                      </p>
                      {application.revokeReason && (
                        <p
                          className="mt-2 text-xs italic"
                          style={{ color: "var(--app-muted)" }}
                        >
                          HR Note: {application.revokeReason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-4 min-w-0">
            <RequestedDatesCalendar dates={application?.inclusiveDates || []} />

            <div
              className="border rounded-xl p-2 sm:p-3 shadow-sm min-w-0"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <h4
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--app-muted)" }}
                >
                  Documents
                </h4>
              </div>

              {/* General PDF Document */}
              <button
                type="button"
                onClick={() => setIsPdfOpen(true)}
                className="mt-3 w-full inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold hover:bg-[color:var(--app-surface-2)] transition"
                style={{
                  borderColor: borderColor,
                  backgroundColor: "var(--app-surface)",
                  color: "var(--app-text)",
                }}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-none border"
                    style={{
                      backgroundColor: "rgba(239,68,68,0.12)",
                      color: "#ef4444",
                      borderColor: "rgba(239,68,68,0.20)",
                    }}
                  >
                    <FileText size={16} />
                  </span>
                  <span className="truncate">General Form</span>
                </span>

                <span
                  className="text-[9px] font-bold px-2 py-1 rounded-lg flex-none border"
                  style={{
                    color: "var(--app-muted)",
                    borderColor: "var(--app-border)",
                    backgroundColor: "var(--app-surface-2)",
                  }}
                >
                  PDF
                </span>
              </button>

              {/* Form 6 (Always available for organic flows) */}
              {isOrganicApp && (
                <button
                  type="button"
                  onClick={() => setIsOrganicPdfOpen(true)}
                  className="mt-2 w-full inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold hover:bg-[color:var(--app-surface-2)] transition"
                  style={{
                    borderColor: borderColor,
                    backgroundColor: "var(--app-surface)",
                    color: "var(--app-text)",
                  }}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className="h-8 w-8 rounded-lg flex items-center justify-center flex-none border"
                      style={{
                        backgroundColor: "rgba(59,130,246,0.12)",
                        color: "#3b82f6",
                        borderColor: "rgba(59,130,246,0.20)",
                      }}
                    >
                      <FileBadge size={16} />
                    </span>
                    <span className="truncate">CSC Form 6</span>
                  </span>

                  <span
                    className="text-[9px] font-bold px-2 py-1 rounded-lg flex-none border"
                    style={{
                      color: "var(--app-muted)",
                      borderColor: "var(--app-border)",
                      backgroundColor: "var(--app-surface-2)",
                    }}
                  >
                    PDF
                  </span>
                </button>
              )}

              {/* Supporting Memos - ONLY RENDER IF IT IS A CTO APPLICATION */}
              {isCtoRoute && (
                <>
                  <div className="mt-5 md:mt-7 flex items-center justify-between gap-3">
                    <h4
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "var(--app-muted)" }}
                    >
                      Supporting Memos
                    </h4>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold flex-none border"
                      style={{
                        backgroundColor: "var(--app-surface-2)",
                        color: "var(--app-muted)",
                        borderColor: "var(--app-border)",
                      }}
                    >
                      {memoCount}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {memoCount > 0 ? (
                      memos.slice(0, 3).map((m, i) => (
                        <a
                          key={i}
                          href={buildApiUrl(m.uploadedMemo)}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-[color:var(--app-surface-2)] transition min-w-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center flex-none border"
                              style={{
                                backgroundColor: "rgba(239,68,68,0.12)",
                                color: "#ef4444",
                                borderColor: "rgba(239,68,68,0.20)",
                              }}
                            >
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: "var(--app-text)" }}
                              >
                                Memo {m.memoId?.memoNo || "—"}
                              </p>
                            </div>
                          </div>
                          <ExternalLink
                            size={14}
                            className="transition flex-none"
                            style={{ color: "var(--app-muted)" }}
                          />
                        </a>
                      ))
                    ) : (
                      <div
                        className="mt-2 rounded-xl border border-dashed px-3 py-4 text-center"
                        style={{
                          borderColor: "var(--app-border)",
                          backgroundColor: "var(--app-surface-2)",
                        }}
                      >
                        <p
                          className="text-xs font-medium"
                          style={{ color: "var(--app-muted)" }}
                        >
                          No memos attached
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      setMemoModal({
                        isOpen: true,
                        memos: memos,
                      })
                    }
                    disabled={memoCount === 0}
                    className={`mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-bold border transition ${
                      memoCount === 0 ? "cursor-not-allowed opacity-60" : ""
                    }`}
                    style={{
                      backgroundColor:
                        memoCount === 0
                          ? "var(--app-surface-2)"
                          : "var(--app-surface)",
                      color:
                        memoCount === 0
                          ? "var(--app-muted)"
                          : "var(--app-text)",
                      borderColor: borderColor,
                    }}
                  >
                    {memoCount === 0
                      ? "View all memos"
                      : `View all memos (${memoCount})`}
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>

        {/* MODAL ACTION FOR HR */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            modalType === "approve" ? "Approve Revocation" : "Reject Revocation"
          }
          maxWidth="max-w-lg"
          action={{
            show: true,
            label:
              modalType === "approve"
                ? approveRevocationMutation.isPending
                  ? "Processing..."
                  : "Approve & Refund Credits"
                : rejectRevocationMutation.isPending
                  ? "Rejecting..."
                  : "Reject Request",
            variant: modalType === "approve" ? "primary" : "delete",
            onClick: handleAction,
            disabled: isMutating || (modalType === "reject" && !remarks.trim()),
          }}
        >
          <div className="p-2 transition-colors duration-300 ease-out">
            <div
              className="mb-6 flex items-start gap-3 p-3 rounded-xl border transition-colors duration-300 ease-out"
              style={{
                backgroundColor: "var(--app-surface-2)",
                borderColor: borderColor,
              }}
            >
              <div
                className="mt-0.5 p-1.5 rounded-lg border shadow-sm transition-colors duration-300 ease-out"
                style={{
                  backgroundColor: "var(--app-surface)",
                  borderColor: borderColor,
                  color: "var(--app-muted)",
                }}
              >
                <Info size={16} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-muted)" }}
                >
                  Reviewing Request For
                </p>
                <p
                  className="text-sm font-bold break-words transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-text)" }}
                >
                  {application.employee?.firstName}{" "}
                  {application.employee?.lastName}
                </p>
              </div>
            </div>

            {modalType === "approve" ? (
              <div className="text-center py-4 max-w-sm mx-auto">
                <div
                  className="mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4 border-4 shadow-inner transition-colors duration-300 ease-out"
                  style={{
                    backgroundColor: "rgba(168, 85, 247, 0.1)", // Purple
                    color: "#9333ea",
                    borderColor: "rgba(168, 85, 247, 0.2)",
                  }}
                >
                  <Undo size={40} strokeWidth={3} />
                </div>
                <h2
                  className="text-lg font-semibold transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-text)" }}
                >
                  Refund Employee Credits?
                </h2>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--app-muted)" }}
                >
                  This action will change the status to REVOKED and restore the
                  employee's {isCtoRoute ? "CTO Hours" : "Wellness Days"}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className="flex items-center gap-2 transition-colors duration-300 ease-out"
                  style={{ color: "#ef4444" }}
                >
                  <AlertCircle size={18} />
                  <h3 className="font-bold text-sm">Reason for Rejection</h3>
                </div>

                <div className="relative">
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Why are you denying this revocation request? (e.g., Leave was already taken, missing proof)..."
                    className="w-full p-4 border-2 rounded-2xl outline-none min-h-[140px] text-sm transition-all duration-300 ease-out bg-transparent"
                    style={{
                      backgroundColor: "var(--app-surface)",
                      color: "var(--app-text)",
                      borderColor: remarks.trim()
                        ? borderColor
                        : "rgba(239, 68, 68, 0.4)",
                    }}
                  />
                  <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-bold uppercase transition-colors duration-300 ease-out"
                      style={{
                        color: remarks.trim() ? "var(--app-muted)" : "#ef4444",
                      }}
                    >
                      {remarks.length > 0
                        ? `${remarks.length} chars`
                        : "Required"}
                    </span>
                  </div>
                </div>

                <p
                  className="text-[11px] p-2.5 rounded-lg border italic transition-colors duration-300 ease-out"
                  style={{
                    color: "var(--app-muted)",
                    backgroundColor: "var(--app-surface-2)",
                    borderColor: borderColor,
                  }}
                >
                  Note: Rejecting this will keep the application marked as
                  APPROVED and the credits will remain deducted.
                </p>
              </div>
            )}
          </div>
        </Modal>

        {isCtoRoute && (
          <Modal
            isOpen={memoModal.isOpen}
            onClose={() => setMemoModal({ isOpen: false, memos: [] })}
            title="Attached Memos"
          >
            <MemoList
              memos={memoModal.memos}
              description={
                "Read-only view of CTO memos attached to this request."
              }
            />
          </Modal>
        )}
      </div>

      {isCtoRoute && (
        <CtoApplicationPdfModal
          app={application}
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
        />
      )}

      {isOrganicApp && (
        <OrganicApplicationPdfModal
          app={application}
          isOpen={isOrganicPdfOpen}
          onClose={() => setIsOrganicPdfOpen(false)}
        />
      )}
    </div>
  );
};

export default RevocationDetails;

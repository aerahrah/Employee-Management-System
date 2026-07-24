import React, { useState, useMemo, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  XCircle,
  History,
  FileX,
  Ban,
  Users,
  FileText,
  FileStack,
  Undo,
  Paperclip,
  Clock,
  RotateCcw,
  Download,
} from "lucide-react";
import { StatusBadge } from "../statusUtils";
import Modal from "../modal";
import MemoList from "../../components/ctoComponents/ctoMemoModal";
import { useAuth } from "../../store/authStore";

/* ------------------ Theme Resolvers ------------------ */
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

/* ------------------ Helper: Date Leaf ------------------ */
const DateLeaf = ({ dateString, borderColor }) => {
  const date = new Date(dateString);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.toLocaleDateString("en-US", { day: "numeric" });

  return (
    <div
      className="flex items-center gap-3 rounded-lg p-2 shadow-sm border transition-colors duration-300 ease-out"
      style={{
        backgroundColor: "var(--app-surface)",
        borderColor: borderColor,
      }}
    >
      <div
        className="rounded md:w-10 md:h-10 w-8 h-8 flex flex-col items-center justify-center shrink-0 border transition-colors duration-300 ease-out"
        style={{
          backgroundColor: "var(--app-surface-2)",
          borderColor: borderColor,
        }}
      >
        <span
          className="text-[8px] font-bold uppercase leading-none"
          style={{ color: "var(--app-muted)" }}
        >
          {month}
        </span>
        <span
          className="text-sm font-bold leading-none"
          style={{ color: "var(--app-text)" }}
        >
          {day}
        </span>
      </div>

      <div className="flex flex-col min-w-0">
        <span
          className="text-xs font-medium truncate"
          style={{ color: "var(--app-muted)" }}
        >
          {date.toLocaleDateString("en-US", { weekday: "long" })}
        </span>
        <span className="text-[10px]" style={{ color: "var(--app-muted)" }}>
          {date.getFullYear()}
        </span>
      </div>
    </div>
  );
};

/* =========================
   Timeline helpers (Matching admin design)
========================= */
const StepDotIcon = ({ status }) => {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED")
    return <CheckCircle2 size={16} className="text-white" />;
  if (s === "REJECTED") return <XCircle size={16} className="text-white" />;
  if (s === "CANCELLED") return <Ban size={16} className="text-white" />;
  if (s === "REVOCATION_REQUESTED")
    return <Undo size={16} className="text-white" />;
  if (s === "REVOKED") return <RotateCcw size={16} className="text-white" />;
  return <Users size={16} className="text-white" />;
};

const StepDotClass = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-500";
  if (s === "REJECTED") return "bg-red-500";
  if (s === "CANCELLED") return "bg-slate-400";
  if (s === "REVOCATION_REQUESTED") return "bg-purple-600";
  if (s === "REVOKED") return "bg-slate-500";
  return "bg-[color:var(--app-border)]";
};

const TimelineCard = ({ approval, index, isLast, borderColor }) => {
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
  const signedAt =
    approval.approverSnapshot?.signedAt ||
    approval.approverSignature?.signedAt ||
    approval.reviewedAt;

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

        {signedAt && (
          <div
            className="mt-4 pt-3 border-t border-dashed"
            style={{ borderColor: "var(--app-border)" }}
          >
            <p
              className="text-[10px] font-mono"
              style={{ color: "var(--app-muted)" }}
            >
              Signed on: {new Date(signedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================
   Main Component
========================= */
const RevocationApplicationFullDetails = ({ app }) => {
  const [memoModal, setMemoModal] = useState({ isOpen: false, memos: [] });

  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useResolvedTheme(prefTheme);

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.07)"
      : "rgba(15,23,42,0.10)";
  }, [resolvedTheme]);

  if (!app) return null;

  const isCTO = typeof app.requestedHours !== "undefined";
  const leaveUnitsLabel = isCTO ? "Hours" : "Days";
  const leaveUnitsValue = isCTO ? app.requestedHours : app.totalDays;
  const leaveTypeLabel = isCTO ? "CTO" : "Wellness";

  const hasOriginalMemos = Array.isArray(app.memo) && app.memo.length > 0;

  const revocationReq = app.revocationRequest || {};
  const hasRevocationAttachment = !!revocationReq.attachment?.fileUrl;

  const sortedApprovals = useMemo(() => {
    if (!Array.isArray(app.approvals)) return [];
    return [...app.approvals].sort((a, b) => (a.level || 0) - (b.level || 0));
  }, [app.approvals]);

  const status = String(app?.overallStatus || "").toUpperCase();
  const isRevoked = status === "REVOKED";

  const handleDownloadAttachment = () => {
    if (!hasRevocationAttachment) return;
    const url = revocationReq.attachment.fileUrl.replace(/\\/g, "/");
    const fullUrl = url.startsWith("http")
      ? url
      : `${process.env.REACT_APP_API_URL || ""}/${url}`;
    window.open(fullUrl, "_blank");
  };

  return (
    <div
      className="h-full flex flex-col transition-colors duration-300 ease-out"
      style={{
        backgroundColor: "var(--app-bg, rgba(245,245,245,0.80))",
        color: "var(--app-text, #0f172a)",
      }}
    >
      <div className="max-h-[75vh] overflow-y-auto cto-scrollbar p-2 md:p-6">
        {/* 1. Top Header: High-Level Stats */}
        <div
          className="rounded-xl p-5 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border transition-colors duration-300 ease-out"
          style={{
            backgroundColor: "var(--app-surface)",
            borderColor: borderColor,
          }}
        >
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--app-muted)" }}
            >
              Current Status
            </p>
            <StatusBadge
              status={app.overallStatus}
              className="text-lg px-4 py-1.5"
              showIcon
            />
          </div>

          <div className="flex gap-4 md:gap-6 flex-wrap">
            <div
              className="pr-4 md:px-4 text-left md:text-center"
              style={{ borderRight: `1px solid ${borderColor}` }}
            >
              <p
                className="text-[10px] font-bold uppercase"
                style={{ color: "var(--app-muted)" }}
              >
                Revoked {leaveUnitsLabel}
              </p>
              <p
                className="text-xl font-extrabold"
                style={{ color: "var(--app-text)" }}
              >
                {leaveUnitsValue}{" "}
                <span
                  className="text-xs font-normal lowercase"
                  style={{ color: "var(--app-muted)" }}
                >
                  {isCTO ? "hrs" : "days"}
                </span>
              </p>
            </div>

            <div
              className="pr-4 md:px-4 text-left md:text-center"
              style={{ borderRight: `1px solid ${borderColor}` }}
            >
              <p
                className="text-[10px] font-bold uppercase"
                style={{ color: "var(--app-muted)" }}
              >
                Original Date Filed
              </p>
              <p
                className="text-sm font-bold mt-1"
                style={{ color: "var(--app-text)" }}
              >
                {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="text-left md:text-center">
              <p
                className="text-[10px] font-bold uppercase"
                style={{ color: "var(--accent)" }}
              >
                Revocation Requested
              </p>
              <p
                className="text-sm font-bold mt-1"
                style={{ color: "var(--app-text)" }}
              >
                {revocationReq.requestedAt
                  ? new Date(revocationReq.requestedAt).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-1 space-y-4">
            {/* Revocation Reason Card (Highlighted) */}
            <div
              className="rounded-xl p-5 shadow-sm border transition-colors duration-300 ease-out"
              style={{
                backgroundColor: "rgba(147, 51, 234, 0.04)",
                borderColor: "rgba(147, 51, 234, 0.2)",
              }}
            >
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: "#9333ea" }}
              >
                <Undo size={14} /> Revocation Reason
              </h4>
              <p
                className="text-sm leading-relaxed font-semibold break-words"
                style={{ color: "var(--app-text)" }}
              >
                {revocationReq.reason || (
                  <span className="italic opacity-70">
                    No specific reason provided.
                  </span>
                )}
              </p>
            </div>

            {/* Original Reason Card */}
            <div
              className="rounded-xl p-5 shadow-sm border transition-colors duration-300 ease-out"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <h4
                className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
                style={{ color: "var(--app-muted)" }}
              >
                <FileText size={12} /> Original Purpose
              </h4>
              <p
                className="text-sm leading-relaxed font-medium break-words opacity-80"
                style={{ color: "var(--app-text)" }}
              >
                {app.reason || "N/A"}
              </p>
            </div>

            {/* Selected Dates */}
            <div
              className="rounded-xl p-5 shadow-sm border transition-colors duration-300 ease-out"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
                style={{ color: "var(--app-muted)" }}
              >
                <CalendarDays size={14} /> Dates to Restore
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 cto-scrollbar">
                {app.inclusiveDates?.length > 0 ? (
                  app.inclusiveDates.map((d, i) => (
                    <DateLeaf
                      key={i}
                      dateString={d}
                      borderColor={borderColor}
                    />
                  ))
                ) : (
                  <div
                    className="text-center py-4 text-sm border border-dashed rounded-lg"
                    style={{
                      color: "var(--app-muted)",
                      borderColor: borderColor,
                      backgroundColor: "var(--app-surface-2)",
                    }}
                  >
                    No dates selected
                  </div>
                )}
              </div>
            </div>

            {/* Document Attachments Section */}
            <div className="space-y-2">
              <h4
                className="text-[10px] font-bold uppercase tracking-widest px-1 flex items-center gap-2"
                style={{ color: "var(--app-muted)" }}
              >
                <Paperclip size={12} /> Attachments
              </h4>

              {/* 1. Revocation Attachment */}
              <div
                className="rounded-xl p-1 shadow-sm border transition-colors duration-300 ease-out"
                style={{
                  backgroundColor: "var(--app-surface)",
                  borderColor: borderColor,
                }}
              >
                <button
                  onClick={handleDownloadAttachment}
                  disabled={!hasRevocationAttachment}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ease-out"
                  type="button"
                  style={{
                    backgroundColor: "transparent",
                    opacity: hasRevocationAttachment ? 1 : 0.6,
                    cursor: hasRevocationAttachment ? "pointer" : "not-allowed",
                  }}
                  onMouseEnter={(e) => {
                    if (!hasRevocationAttachment) return;
                    e.currentTarget.style.backgroundColor =
                      "var(--app-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="p-2 rounded-lg border flex-none"
                      style={{
                        backgroundColor: hasRevocationAttachment
                          ? "rgba(147, 51, 234, 0.1)"
                          : "var(--app-surface-2)",
                        borderColor: hasRevocationAttachment
                          ? "rgba(147, 51, 234, 0.2)"
                          : borderColor,
                        color: hasRevocationAttachment
                          ? "#9333ea"
                          : "var(--app-muted)",
                      }}
                    >
                      {hasRevocationAttachment ? (
                        <FileText size={16} />
                      ) : (
                        <FileX size={16} />
                      )}
                    </div>

                    <div className="text-left min-w-0 pr-2">
                      <span
                        className="block text-xs font-bold truncate"
                        style={{ color: "var(--app-text)" }}
                      >
                        {hasRevocationAttachment
                          ? revocationReq.attachment.fileName
                          : "No Revocation Document"}
                      </span>
                      <span
                        className="text-[10px] truncate"
                        style={{ color: "var(--app-muted)" }}
                      >
                        {hasRevocationAttachment
                          ? "Revocation Support File"
                          : "Required by HR"}
                      </span>
                    </div>
                  </div>
                  {hasRevocationAttachment && (
                    <Download size={14} style={{ color: "var(--app-muted)" }} />
                  )}
                </button>
              </div>

              {/* 2. Original Memos (If CTO) */}
              {isCTO && (
                <div
                  className="rounded-xl p-1 shadow-sm border transition-colors duration-300 ease-out"
                  style={{
                    backgroundColor: "var(--app-surface)",
                    borderColor: borderColor,
                  }}
                >
                  <button
                    onClick={() =>
                      hasOriginalMemos &&
                      setMemoModal({ isOpen: true, memos: app.memo })
                    }
                    disabled={!hasOriginalMemos}
                    className="w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ease-out"
                    type="button"
                    style={{
                      backgroundColor: "transparent",
                      opacity: hasOriginalMemos ? 1 : 0.6,
                      cursor: hasOriginalMemos ? "pointer" : "not-allowed",
                    }}
                    onMouseEnter={(e) => {
                      if (!hasOriginalMemos) return;
                      e.currentTarget.style.backgroundColor =
                        "var(--app-surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg border transition-colors duration-300 ease-out"
                        style={{
                          backgroundColor: hasOriginalMemos
                            ? "var(--app-surface-2)"
                            : "var(--app-surface-2)",
                          borderColor: borderColor,
                          color: "var(--app-muted)",
                        }}
                      >
                        <FileStack size={16} />
                      </div>
                      <div className="text-left">
                        <span
                          className="block text-xs font-bold"
                          style={{ color: "var(--app-text)" }}
                        >
                          Original Memos
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--app-muted)" }}
                        >
                          {hasOriginalMemos
                            ? `${app.memo.length} documents attached`
                            : "None attached"}
                        </span>
                      </div>
                    </div>
                    {hasOriginalMemos && (
                      <ArrowRight
                        size={14}
                        style={{ color: "var(--app-muted)" }}
                      />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Timeline */}
          <div className="lg:col-span-2">
            <div
              className="rounded-xl p-3 shadow-sm border transition-colors duration-300 ease-out"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center flex-none border transition-colors duration-300 ease-out"
                  style={{
                    backgroundColor: "var(--app-surface-2)",
                    borderColor: borderColor,
                    color: "var(--app-muted)",
                  }}
                >
                  <History size={18} />
                </div>

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
                    Original workflow & current revocation status
                  </p>
                </div>
              </div>

              <div className="relative space-y-6 sm:space-y-8 t-1 min-w-0">
                <div
                  className="absolute left-5 top-2 bottom-2 w-0.5"
                  style={{ backgroundColor: "var(--app-border)" }}
                />

                {/* 1. ORIGINAL APPROVALS */}
                {sortedApprovals.map((approval, idx) => (
                  <TimelineCard
                    key={approval?._id || idx}
                    approval={approval}
                    index={idx}
                    isLast={false}
                    borderColor={borderColor}
                  />
                ))}

                {/* 2. REVOCATION REQUESTED STEP */}
                <div className="relative flex gap-2 sm:gap-4 items-start min-w-0">
                  <div
                    className="absolute left-5 top-10 bottom-0 w-0.5"
                    style={{ backgroundColor: "var(--app-border)" }}
                  />
                  <div
                    className="relative z-10 h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center border-4 shadow-md flex-none"
                    style={{ borderColor: "var(--app-surface)" }}
                  >
                    <Undo size={16} className="text-white" />
                  </div>
                  <div
                    className="flex-1 border rounded-2xl p-4 sm:p-5 shadow-xs min-w-0 transition-all"
                    style={{
                      backgroundColor: "rgba(147, 51, 234, 0.04)",
                      borderColor: "rgba(147, 51, 234, 0.2)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <span
                          className="text-xs font-bold uppercase tracking-wider"
                          style={{ color: "#9333ea" }}
                        >
                          Revocation Stage
                        </span>
                        <p
                          className="text-sm font-semibold break-words mt-1"
                          style={{ color: "var(--app-text)" }}
                        >
                          Revocation Requested
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--app-muted)" }}
                        >
                          Employee submitted a request to cancel this approved{" "}
                          {leaveTypeLabel}.
                        </p>
                      </div>
                      <div className="flex-none">
                        <StatusBadge status="REVOCATION_REQUESTED" size="sm" />
                      </div>
                    </div>
                    {revocationReq.requestedAt && (
                      <div
                        className="mt-4 pt-3 border-t border-dashed"
                        style={{ borderColor: "var(--app-border)" }}
                      >
                        <p
                          className="text-[10px] font-mono"
                          style={{ color: "var(--app-muted)" }}
                        >
                          Requested on:{" "}
                          {new Date(revocationReq.requestedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. HR PROCESSING STATUS */}
                <div className="relative flex gap-2 sm:gap-4 items-start min-w-0">
                  <div
                    className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center border-4 shadow-md flex-none ${
                      isRevoked
                        ? "bg-slate-500"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                    style={{ borderColor: "var(--app-surface)" }}
                  >
                    {isRevoked ? (
                      <RotateCcw size={16} className="text-white" />
                    ) : (
                      <Clock size={16} className="text-white" />
                    )}
                  </div>
                  <div
                    className="flex-1 border rounded-2xl p-4 sm:p-5 shadow-xs min-w-0 transition-all"
                    style={{
                      backgroundColor: isRevoked
                        ? "rgba(100, 116, 139, 0.08)"
                        : "var(--app-surface)",
                      borderColor: isRevoked
                        ? "rgba(100, 116, 139, 0.2)"
                        : "var(--app-border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <span
                          className="text-xs font-bold uppercase tracking-wider"
                          style={{ color: "var(--app-muted)" }}
                        >
                          HR Final Step
                        </span>
                        <p
                          className="text-sm font-semibold break-words mt-1"
                          style={{ color: "var(--app-text)" }}
                        >
                          {isRevoked ? "Revoked by HR" : "Pending HR Approval"}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--app-muted)" }}
                        >
                          {isRevoked
                            ? "HR has processed this request and restored the balances."
                            : `Awaiting Human Resources to review and restore the ${leaveUnitsLabel.toLowerCase()}.`}
                        </p>
                      </div>
                      <div className="flex-none">
                        <StatusBadge
                          status={isRevoked ? "REVOKED" : "PENDING"}
                          size="sm"
                        />
                      </div>
                    </div>

                    {isRevoked && app.revokeReason && (
                      <div
                        className="mt-4 rounded-xl p-3 text-xs leading-relaxed border flex items-start gap-2 min-w-0"
                        style={{
                          backgroundColor: "var(--app-surface-2)",
                          borderColor: borderColor,
                          color: "var(--app-text)",
                        }}
                      >
                        <AlertCircle
                          size={14}
                          className="shrink-0 mt-0.5"
                          style={{ color: "var(--app-muted)" }}
                        />
                        <p className="break-words">
                          <strong>HR Note:</strong> {app.revokeReason}
                        </p>
                      </div>
                    )}

                    {app.revokedAt && (
                      <div
                        className="mt-4 pt-3 border-t border-dashed"
                        style={{ borderColor: "var(--app-border)" }}
                      >
                        <p
                          className="text-[10px] font-mono"
                          style={{ color: "var(--app-muted)" }}
                        >
                          Processed on:{" "}
                          {new Date(app.revokedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Memos Modal */}
      {isCTO && (
        <Modal
          isOpen={memoModal.isOpen}
          onClose={() => setMemoModal({ isOpen: false, memos: [] })}
          title="Original Reference Documents"
          closeLabel="Close"
          maxWidth="max-w-4xl"
        >
          <MemoList
            memos={memoModal.memos}
            description="Documents originally attached when the leave was filed."
          />
        </Modal>
      )}
    </div>
  );
};

export default RevocationApplicationFullDetails;

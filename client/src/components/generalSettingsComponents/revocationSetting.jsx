// pages/settings/RevocationSettings.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Breadcrumbs from "../breadCrumbs";
import {
  fetchRevocationSettings,
  updateRevocationSettings,
} from "../../api/revocationApprover";
import {
  RotateCcw,
  Save,
  Info,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Users,
  Paperclip,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../store/authStore";

/* =========================
   Helpers
========================= */
const getErrMsg = (err, fallback = "Failed") =>
  err?.response?.data?.message || err?.message || fallback;

function resolveTheme(prefTheme) {
  if (prefTheme === "system") {
    const systemDark =
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    return systemDark ? "dark" : "light";
  }
  return prefTheme === "dark" ? "dark" : "light";
}

const getErrorStyles = (theme) =>
  theme === "dark"
    ? {
        wrapBg: "rgba(244,63,94,0.12)",
        wrapBorder: "rgba(244,63,94,0.22)",
        wrapText: "#fda4af",
      }
    : {
        wrapBg: "rgba(244,63,94,0.08)",
        wrapBorder: "rgba(244,63,94,0.18)",
        wrapText: "#be123c",
      };

const getNoticeToneStyles = (theme, tone = "neutral") => {
  const isDark = theme === "dark";

  const tones = {
    amber: isDark
      ? {
          wrapBg: "rgba(245,158,11,0.12)",
          wrapBorder: "rgba(245,158,11,0.20)",
          title: "#fde68a",
          text: "#fcd34d",
          icon: "#fbbf24",
        }
      : {
          wrapBg: "rgba(245,158,11,0.08)",
          wrapBorder: "rgba(245,158,11,0.16)",
          title: "#92400e",
          text: "#b45309",
          icon: "#d97706",
        },
    blue: isDark
      ? {
          wrapBg: "rgba(59,130,246,0.12)",
          wrapBorder: "rgba(59,130,246,0.20)",
          title: "#bfdbfe",
          text: "#93c5fd",
          icon: "#60a5fa",
        }
      : {
          wrapBg: "rgba(59,130,246,0.08)",
          wrapBorder: "rgba(59,130,246,0.16)",
          title: "#1e3a8a",
          text: "#1d4ed8",
          icon: "#2563eb",
        },
    green: isDark
      ? {
          wrapBg: "rgba(34,197,94,0.12)",
          wrapBorder: "rgba(34,197,94,0.20)",
          title: "#bbf7d0",
          text: "#86efac",
          icon: "#4ade80",
        }
      : {
          wrapBg: "rgba(34,197,94,0.08)",
          wrapBorder: "rgba(34,197,94,0.16)",
          title: "#166534",
          text: "#15803d",
          icon: "#16a34a",
        },
    neutral: isDark
      ? {
          wrapBg: "rgba(255,255,255,0.04)",
          wrapBorder: "rgba(255,255,255,0.08)",
          title: "var(--app-text)",
          text: "var(--app-muted)",
          icon: "var(--app-muted)",
        }
      : {
          wrapBg: "rgba(15,23,42,0.03)",
          wrapBorder: "rgba(15,23,42,0.08)",
          title: "#111827",
          text: "#4b5563",
          icon: "#6b7280",
        },
  };

  return tones[tone] || tones.neutral;
};

/* =========================
   UI primitives
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

const InlineError = ({ message, theme }) => {
  if (!message) return null;
  const s = getErrorStyles(theme);
  return (
    <div
      className="mt-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-300 ease-out"
      style={{
        backgroundColor: s.wrapBg,
        border: `1px solid ${s.wrapBorder}`,
        color: s.wrapText,
      }}
    >
      {message}
    </div>
  );
};

const SoftNotice = ({ icon: Icon, tone = "amber", title, children, theme }) => {
  const t = getNoticeToneStyles(theme, tone);
  return (
    <div
      className="rounded-xl px-4 py-3 flex gap-3 transition-colors duration-300 ease-out"
      style={{
        backgroundColor: t.wrapBg,
        border: `1px solid ${t.wrapBorder}`,
      }}
    >
      <div className="mt-0.5">
        <Icon className="w-4 h-4" style={{ color: t.icon }} />
      </div>
      <div className="min-w-0">
        {title && (
          <div className="text-xs font-semibold" style={{ color: t.title }}>
            {title}
          </div>
        )}
        <div className="text-xs leading-relaxed" style={{ color: t.text }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const PrimaryButton = ({
  children,
  disabled,
  onClick,
  className = "",
  borderColor,
  theme,
}) => {
  const disabledBg =
    theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2",
        "text-sm font-bold transition-colors duration-200 ease-out",
        className,
      ].join(" ")}
      style={{
        backgroundColor: disabled ? disabledBg : "var(--accent)",
        color: disabled ? "var(--app-muted)" : "#ffffff",
        border: `1px solid ${disabled ? borderColor : "var(--accent)"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  );
};

const GhostButton = ({
  children,
  disabled,
  onClick,
  className = "",
  borderColor,
  theme,
}) => {
  const disabledBg =
    theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2",
        "text-sm font-bold transition-colors duration-200 ease-out",
        className,
      ].join(" ")}
      style={{
        backgroundColor: disabled ? disabledBg : "var(--app-surface)",
        color: disabled ? "var(--app-muted)" : "var(--app-text)",
        border: `1px solid ${borderColor}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  );
};

const Toggle = ({
  checked,
  disabled,
  onChange,
  label,
  hint,
  borderColor,
  theme,
}) => {
  const offBg =
    theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-semibold break-words transition-colors duration-300 ease-out"
          style={{ color: "var(--app-text)" }}
        >
          {label}
        </div>
        {hint && (
          <div
            className="text-xs mt-0.5 leading-relaxed break-words transition-colors duration-300 ease-out"
            style={{ color: "var(--app-muted)" }}
          >
            {hint}
          </div>
        )}
      </div>
      <div className="flex-none shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(!checked)}
          className="relative inline-flex h-7 w-12 items-center rounded-full transition flex-none shrink-0"
          style={{
            backgroundColor: checked ? "var(--accent)" : offBg,
            border: `1px solid ${checked ? "var(--accent)" : borderColor}`,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.55 : 1,
          }}
          aria-pressed={checked}
        >
          <span
            className={[
              "inline-block h-5 w-5 transform rounded-full shadow transition",
              checked ? "translate-x-6" : "translate-x-1",
            ].join(" ")}
            style={{ backgroundColor: "#ffffff" }}
          />
        </button>
      </div>
    </div>
  );
};

const SkeletonLine = ({ width = "100%", height = 16, theme }) => (
  <div
    className="rounded animate-pulse"
    style={{
      width,
      height,
      backgroundColor:
        theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
    }}
  />
);

const SkeletonBlock = ({ theme }) => (
  <div className="p-4 space-y-3">
    <SkeletonLine width="33%" height={16} theme={theme} />
    <SkeletonLine width="100%" height={40} theme={theme} />
    <SkeletonLine width="100%" height={80} theme={theme} />
  </div>
);

/* =========================
   Main Page
========================= */
const QK_SETTINGS = ["revocationSettings"];

export default function RevocationSettings() {
  const queryClient = useQueryClient();

  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useMemo(() => resolveTheme(prefTheme), [prefTheme]);

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.07)"
      : "rgba(15,23,42,0.10)";
  }, [resolvedTheme]);

  const subtleBg = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.03)"
      : "rgba(15,23,42,0.03)";
  }, [resolvedTheme]);

  const [inlineError, setInlineError] = useState("");

  // form states
  const [isEnabled, setIsEnabled] = useState(true);
  const [isAttachmentRequired, setIsAttachmentRequired] = useState(false); // ✅ Added state

  // initial snapshot for dirty detection
  const [initial, setInitial] = useState(null);

  const settingsQuery = useQuery({
    queryKey: QK_SETTINGS,
    queryFn: fetchRevocationSettings,
    staleTime: 1000 * 60 * 5,
  });

  const doc = settingsQuery.data;
  const approvers = useMemo(() => doc?.approvers || [], [doc]);

  useEffect(() => {
    if (doc === undefined) return;

    const enabledStatus = doc?.isEnabled ?? true;
    const attachmentRequiredStatus = doc?.isAttachmentRequired ?? false; // ✅ Extracted from doc

    setIsEnabled(enabledStatus);
    setIsAttachmentRequired(attachmentRequiredStatus);
    setInitial({
      isEnabled: enabledStatus,
      isAttachmentRequired: attachmentRequiredStatus,
    });
  }, [doc]);

  const isDirty = useMemo(() => {
    if (!initial) return false;
    if (initial.isEnabled !== isEnabled) return true;
    if (initial.isAttachmentRequired !== isAttachmentRequired) return true; // ✅ Dirty check
    return false;
  }, [initial, isEnabled, isAttachmentRequired]);

  const refetch = useCallback(async () => {
    setInlineError("");
    await settingsQuery.refetch();
    toast.info("Settings refreshed");
  }, [settingsQuery]);

  const saveMutation = useMutation({
    mutationFn: (payload) => updateRevocationSettings(payload),
    onSuccess: async () => {
      setInlineError("");
      toast.success("Revocation settings saved");
      await queryClient.invalidateQueries({ queryKey: QK_SETTINGS });
      setInitial({
        isEnabled,
        isAttachmentRequired,
      });
    },
    onError: (err) => {
      const msg = getErrMsg(err, "Failed to save revocation settings");
      setInlineError(msg);
      toast.error(msg);
    },
  });

  const onSave = () => {
    setInlineError("");

    saveMutation.mutate({
      isEnabled,
      isAttachmentRequired, // ✅ Passed to mutation payload
    });
  };

  const onResetToDefault = () => {
    if (!initial) return;
    setInlineError("");
    setIsEnabled(initial.isEnabled);
    setIsAttachmentRequired(initial.isAttachmentRequired);
  };

  const isRefreshing = settingsQuery.isRefetching;
  const isSaving = saveMutation.isPending;

  return (
    <div
      className="w-full flex-1 flex h-full flex-col transition-colors duration-300 ease-out"
      style={{
        backgroundColor: "var(--app-bg, rgba(245,245,245,0.80))",
        color: "var(--app-text, #0f172a)",
      }}
    >
      <div className="px-1 w-full mx-auto py-2 pb-2">
        <Breadcrumbs items={[{ label: "SETTINGS", to: "/app/settings" }]} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight transition-colors duration-300 ease-out"
              style={{ color: "var(--app-text)" }}
            >
              HR Revocation <span className="font-bold">Settings</span>
            </h1>
            <p
              className="text-sm mt-1 transition-colors duration-300 ease-out"
              style={{ color: "var(--app-muted)" }}
            >
              Configure the availability and requirements of the leave
              revocation workflow.
            </p>
          </div>

          <button
            onClick={refetch}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors duration-200 ease-out disabled:opacity-40"
            style={{
              backgroundColor: "var(--app-surface)",
              border: `1px solid ${borderColor}`,
              color: "var(--accent)",
            }}
            type="button"
          >
            <RotateCcw className="w-4 h-4" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main card */}
          <div className="lg:col-span-2">
            <Card borderColor={borderColor}>
              <div
                className="px-4 py-3 border-b transition-colors duration-300 ease-out"
                style={{
                  backgroundColor: "var(--app-surface)",
                  borderColor: borderColor,
                }}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className="w-4 h-4"
                    style={{ color: "var(--app-muted)" }}
                  />
                  <div
                    className="text-sm font-semibold transition-colors duration-300 ease-out"
                    style={{ color: "var(--app-text)" }}
                  >
                    Revocation Workflow
                  </div>
                </div>
                <div
                  className="text-xs mt-1 transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-muted)" }}
                >
                  Manage the routing and rules of revocation requests submitted
                  by employees.
                </div>
              </div>

              {settingsQuery.isLoading ? (
                <SkeletonBlock theme={resolvedTheme} />
              ) : settingsQuery.isError ? (
                <div className="p-4">
                  <div
                    className="rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300 ease-out"
                    style={{
                      backgroundColor: getErrorStyles(resolvedTheme).wrapBg,
                      border: `1px solid ${
                        getErrorStyles(resolvedTheme).wrapBorder
                      }`,
                      color: getErrorStyles(resolvedTheme).wrapText,
                    }}
                  >
                    {getErrMsg(
                      settingsQuery.error,
                      "Failed to load revocation settings",
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-6">
                  <div className="space-y-6">
                    <Toggle
                      checked={isEnabled}
                      disabled={isSaving}
                      onChange={(v) => setIsEnabled(v)}
                      label="Enable Revocation Requests"
                      hint="Allow employees to submit requests to cancel previously approved leaves."
                      borderColor={borderColor}
                      theme={resolvedTheme}
                    />

                    {/* ✅ Added Attachment Requirement Toggle */}
                    <div className="pt-4 border-t border-[color:var(--app-border)]">
                      <Toggle
                        checked={isAttachmentRequired}
                        disabled={isSaving || !isEnabled}
                        onChange={(v) => setIsAttachmentRequired(v)}
                        label="Require Supporting Document"
                        hint="Force employees to upload a file (e.g., medical certificate or memo) when requesting a revocation."
                        borderColor={borderColor}
                        theme={resolvedTheme}
                      />
                    </div>
                  </div>

                  <SoftNotice
                    icon={isEnabled ? Info : ShieldAlert}
                    tone={isEnabled ? "blue" : "amber"}
                    title="System Behavior"
                    theme={resolvedTheme}
                  >
                    {isEnabled
                      ? `When an employee revokes an active leave, the request will immediately route to authorized HR staff for final processing.${isAttachmentRequired ? " Employees are strictly required to provide an attachment." : ""}`
                      : "Employees cannot currently submit revocation requests for approved leaves."}
                  </SoftNotice>

                  <InlineError message={inlineError} theme={resolvedTheme} />

                  <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-t mt-4 border-[color:var(--app-border)]">
                    <div
                      className="text-xs transition-colors duration-300 ease-out pt-3"
                      style={{ color: "var(--app-muted)" }}
                    >
                      {isDirty ? (
                        <span
                          className="font-medium"
                          style={{ color: "var(--app-text)" }}
                        >
                          You have unsaved changes.
                        </span>
                      ) : (
                        <span>Settings are up to date.</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3">
                      <GhostButton
                        onClick={onResetToDefault}
                        disabled={isSaving || !isDirty}
                        borderColor={borderColor}
                        theme={resolvedTheme}
                      >
                        Undo
                      </GhostButton>

                      <PrimaryButton
                        onClick={onSave}
                        disabled={!isDirty || isSaving}
                        borderColor={borderColor}
                        theme={resolvedTheme}
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-1">
            <Card borderColor={borderColor}>
              <div
                className="px-4 py-3 border-b transition-colors duration-300 ease-out"
                style={{
                  backgroundColor: "var(--app-surface)",
                  borderColor: borderColor,
                }}
              >
                <div
                  className="text-sm font-semibold transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-text)" }}
                >
                  Summary
                </div>
                <div
                  className="text-xs mt-1 transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-muted)" }}
                >
                  Current revocation routing configuration.
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Status Summary */}
                <div
                  className="rounded-xl p-4 transition-colors duration-300 ease-out"
                  style={{
                    backgroundColor: subtleBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out flex items-center gap-1"
                    style={{ color: "var(--app-muted)" }}
                  >
                    <ShieldCheck className="w-3 h-3" /> Feature Status
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {isEnabled ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                    )}
                    <div
                      className="text-sm font-semibold transition-colors duration-300 ease-out"
                      style={{ color: "var(--app-text)" }}
                    >
                      {isEnabled ? "Active" : "Disabled"}
                    </div>
                  </div>
                </div>

                {/* ✅ Attachment Requirement Summary Box */}
                <div
                  className="rounded-xl p-4 transition-colors duration-300 ease-out"
                  style={{
                    backgroundColor: subtleBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out flex items-center gap-1"
                    style={{ color: "var(--app-muted)" }}
                  >
                    <Paperclip className="w-3 h-3" /> Supporting Document
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {isAttachmentRequired ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Info className="w-4 h-4 text-gray-400" />
                    )}
                    <div
                      className="text-sm font-semibold transition-colors duration-300 ease-out"
                      style={{ color: "var(--app-text)" }}
                    >
                      {isAttachmentRequired ? "Mandatory" : "Optional"}
                    </div>
                  </div>
                </div>

                {/* Authorized Approvers List */}
                <div
                  className="rounded-xl p-4 transition-colors duration-300 ease-out"
                  style={{
                    backgroundColor: "var(--app-surface)",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out flex items-center gap-1 mb-3"
                    style={{ color: "var(--app-muted)" }}
                  >
                    <Users className="w-3 h-3" /> Authorized Approvers
                  </div>

                  {approvers.length > 0 ? (
                    <div className="space-y-2">
                      {approvers.map((appr) => {
                        const initials = `${appr.firstName?.charAt(0) || ""}${appr.lastName?.charAt(0) || ""}`;
                        const prefix = appr.prefixTitle
                          ? `${appr.prefixTitle} `
                          : "";
                        const extension = appr.nameExtension
                          ? ` ${appr.nameExtension}`
                          : "";

                        return (
                          <div
                            key={appr._id}
                            className="flex items-center gap-3 p-2 rounded-lg border transition-colors duration-300 ease-out"
                            style={{
                              backgroundColor: subtleBg,
                              borderColor: borderColor,
                            }}
                          >
                            <div className="h-8 w-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div
                                className="text-xs font-bold truncate transition-colors duration-300 ease-out"
                                style={{ color: "var(--app-text)" }}
                              >
                                {prefix}
                                {appr.firstName} {appr.lastName}
                                {extension}
                              </div>
                              <div
                                className="text-[10px] truncate transition-colors duration-300 ease-out"
                                style={{ color: "var(--app-muted)" }}
                              >
                                {appr.position}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className="text-xs italic py-2"
                      style={{ color: "var(--app-muted)" }}
                    >
                      No authorized approvers configured.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

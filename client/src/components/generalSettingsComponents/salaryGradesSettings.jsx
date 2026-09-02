// pages/settings/SalaryGradesSettings.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Breadcrumbs from "../breadCrumbs";

// ⚠️ Note: Make sure you create these API functions in your api folder!
import { fetchSalaryGrades, updateSalaryGrade } from "../../api/salaryGrade";

import {
  RotateCcw,
  Save,
  Info,
  Banknote,
  Edit2,
  X,
  Search,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../store/authStore";

/* =========================
   Helpers
========================= */
const getErrMsg = (err, fallback = "Failed") =>
  err?.response?.data?.message || err?.message || fallback;

const formatPHP = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

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
        {title ? (
          <div className="text-xs font-semibold" style={{ color: t.title }}>
            {title}
          </div>
        ) : null}
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
    <div className="flex gap-2">
      <SkeletonLine width={128} height={40} theme={theme} />
      <SkeletonLine width={128} height={40} theme={theme} />
    </div>
  </div>
);

/* =========================
   Main Page
========================= */
const QK = ["salaryGrades"];

export default function SalaryGradesSettings() {
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

  const inputBg = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.04)"
      : "rgba(15,23,42,0.03)";
  }, [resolvedTheme]);

  const disabledBg = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.05)"
      : "rgba(15,23,42,0.04)";
  }, [resolvedTheme]);

  const [search, setSearch] = useState("");
  const [inlineError, setInlineError] = useState("");

  // Selection State
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  const settingsQuery = useQuery({
    queryKey: QK,
    queryFn: fetchSalaryGrades,
    staleTime: 1000 * 60 * 5,
  });

  const rawGrades = settingsQuery.data?.data || [];

  const filteredGrades = useMemo(() => {
    if (!search.trim()) return rawGrades;
    const q = search.toLowerCase().trim();
    return rawGrades.filter(
      (g) => String(g.grade).includes(q) || String(g.amount).includes(q),
    );
  }, [rawGrades, search]);

  // Restructure the flat filtered data into a 2D matrix (Grades x Steps)
  const matrixData = useMemo(() => {
    const stepsSet = new Set();
    const gradesSet = new Set();
    const map = {};

    filteredGrades.forEach((sg) => {
      if (sg.step != null) stepsSet.add(sg.step);
      if (sg.grade != null) gradesSet.add(sg.grade);
      if (!map[sg.grade]) map[sg.grade] = {};
      map[sg.grade][sg.step] = sg;
    });

    const steps = Array.from(stepsSet).sort((a, b) => a - b);
    const grades = Array.from(gradesSet).sort((a, b) => a - b);

    return { steps, grades, map };
  }, [filteredGrades]);

  const refetch = useCallback(async () => {
    setInlineError("");
    await settingsQuery.refetch();
    toast.info("Salary grades refreshed");
  }, [settingsQuery]);

  const updateMutation = useMutation({
    mutationFn: ({ id, amount }) => updateSalaryGrade(id, amount),
    onSuccess: async () => {
      setInlineError("");
      toast.success("Salary Grade updated successfully");
      await queryClient.invalidateQueries({ queryKey: QK });
      setSelectedGrade(null);
      setEditAmount("");
    },
    onError: (err) => {
      const msg = getErrMsg(err, "Failed to update salary grade");
      setInlineError(msg);
      toast.error(msg);
    },
  });

  const handleEditClick = (grade) => {
    setInlineError("");
    setSelectedGrade(grade);
    setEditAmount(grade.amount);
  };

  const handleCancelEdit = () => {
    setInlineError("");
    setSelectedGrade(null);
    setEditAmount("");
  };

  const handleSaveEdit = () => {
    setInlineError("");
    const amountNum = Number(editAmount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      setInlineError("Please enter a valid positive number.");
      return;
    }
    updateMutation.mutate({ id: selectedGrade._id, amount: amountNum });
  };

  const isRefreshing = settingsQuery.isRefetching;
  const isSaving = updateMutation.isPending;

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
              Salary <span className="font-bold">Grades</span>
            </h1>
            <p
              className="text-sm mt-1 transition-colors duration-300 ease-out"
              style={{ color: "var(--app-muted)" }}
            >
              Manage Standardization Law base amounts and compensation matrices.
            </p>
          </div>

          <button
            onClick={refetch}
            disabled={isRefreshing || isSaving}
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

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Master Table */}
          <div className="lg:col-span-2">
            <Card borderColor={borderColor}>
              <div
                className="px-4 py-3 border-b transition-colors duration-300 ease-out flex items-center justify-between gap-4 flex-wrap"
                style={{
                  backgroundColor: "var(--app-surface)",
                  borderColor: borderColor,
                }}
              >
                <div className="flex items-center gap-2">
                  <Banknote
                    className="w-4 h-4"
                    style={{ color: "var(--app-muted)" }}
                  />
                  <div
                    className="text-sm font-semibold transition-colors duration-300 ease-out"
                    style={{ color: "var(--app-text)" }}
                  >
                    Salary Grade Matrix
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search grade or amount..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg text-sm outline-none transition-colors duration-200 ease-out"
                    style={{
                      backgroundColor: inputBg,
                      border: `1px solid ${borderColor}`,
                      color: "var(--app-text)",
                    }}
                  />
                </div>
              </div>

              {settingsQuery.isLoading ? (
                <SkeletonBlock theme={resolvedTheme} />
              ) : settingsQuery.isError ? (
                <div className="p-4">
                  <InlineError
                    message={getErrMsg(
                      settingsQuery.error,
                      "Failed to load salary grades",
                    )}
                    theme={resolvedTheme}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] no-scrollbar">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead
                      className="sticky top-0 z-20 backdrop-blur-md"
                      style={{
                        backgroundColor:
                          resolvedTheme === "dark"
                            ? "rgba(15,23,42,0.95)"
                            : "rgba(248,250,252,0.95)",
                        borderBottom: `1px solid ${borderColor}`,
                      }}
                    >
                      <tr>
                        <th
                          className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider sticky left-0 z-30"
                          style={{
                            backgroundColor:
                              resolvedTheme === "dark" ? "#0f172a" : "#f8fafc",
                            color: "var(--app-muted)",
                            borderRight: `1px solid ${borderColor}`,
                            borderBottom: `1px solid ${borderColor}`,
                          }}
                        >
                          Grade \ Step
                        </th>
                        {matrixData.steps.map((step) => (
                          <th
                            key={step}
                            className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-center transition-colors duration-300 ease-out"
                            style={{
                              color: "var(--app-muted)",
                              borderBottom: `1px solid ${borderColor}`,
                            }}
                          >
                            Step {step}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.grades.length === 0 ? (
                        <tr>
                          <td
                            colSpan={matrixData.steps.length + 1}
                            className="p-8 text-center"
                          >
                            <span
                              className="text-sm font-medium transition-colors"
                              style={{ color: "var(--app-muted)" }}
                            >
                              No salary grades found.
                            </span>
                          </td>
                        </tr>
                      ) : (
                        matrixData.grades.map((grade) => (
                          <tr
                            key={`grade-${grade}`}
                            className="transition-colors hover:bg-opacity-50"
                            style={{
                              borderBottom: `1px solid ${borderColor}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = subtleBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                          >
                            <td
                              className="px-3 py-1.5 text-xs font-bold sticky left-0 z-10 transition-colors duration-300 ease-out"
                              style={{
                                backgroundColor: "var(--app-surface)",
                                color: "var(--app-text)",
                                borderRight: `1px solid ${borderColor}`,
                              }}
                            >
                              SG {grade}
                            </td>
                            {matrixData.steps.map((step) => {
                              const sg = matrixData.map[grade][step];
                              return (
                                <td
                                  key={`cell-${grade}-${step}`}
                                  className="px-1 py-1 text-center"
                                >
                                  {sg ? (
                                    <button
                                      onClick={() => handleEditClick(sg)}
                                      disabled={isSaving}
                                      className="w-full group flex items-center justify-center gap-1 px-1.5 py-1 rounded transition-colors cursor-pointer"
                                      style={{ backgroundColor: "transparent" }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                          subtleBg;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                          "transparent";
                                      }}
                                    >
                                      <span
                                        className="text-xs font-medium transition-colors"
                                        style={{ color: "var(--app-text)" }}
                                      >
                                        {formatPHP(sg.amount)}
                                      </span>
                                      <Edit2
                                        className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: "var(--accent)" }}
                                      />
                                    </button>
                                  ) : (
                                    <span
                                      className="text-xs"
                                      style={{ color: "var(--app-muted)" }}
                                    >
                                      -
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Detail / Edit View */}
          <div className="lg:col-span-1">
            <Card borderColor={borderColor} className="sticky top-6">
              <div
                className="px-4 py-3 border-b transition-colors duration-300 ease-out flex items-center justify-between"
                style={{
                  backgroundColor: "var(--app-surface)",
                  borderColor: borderColor,
                }}
              >
                <div
                  className="text-sm font-semibold transition-colors duration-300 ease-out"
                  style={{ color: "var(--app-text)" }}
                >
                  {selectedGrade ? "Edit Salary Grade" : "Details"}
                </div>
                {selectedGrade && (
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: "var(--app-text)" }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {selectedGrade ? (
                  <>
                    <div
                      className="rounded-xl p-4 transition-colors duration-300 ease-out"
                      style={{
                        backgroundColor: subtleBg,
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out"
                        style={{ color: "var(--app-muted)" }}
                      >
                        Target
                      </div>
                      <div
                        className="mt-1 text-base font-semibold transition-colors duration-300 ease-out"
                        style={{ color: "var(--app-text)" }}
                      >
                        Salary Grade {selectedGrade.grade}
                      </div>
                      <div
                        className="mt-1 text-xs transition-colors duration-300 ease-out"
                        style={{ color: "var(--app-muted)" }}
                      >
                        Step {selectedGrade.step}
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5 transition-colors"
                        style={{ color: "var(--app-muted)" }}
                      >
                        Monthly Amount (PHP)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        disabled={isSaving}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full h-11 rounded-lg px-3 text-sm outline-none transition-colors duration-200 ease-out focus:ring-2 focus:ring-[var(--accent)]"
                        style={{
                          backgroundColor: isSaving ? disabledBg : inputBg,
                          border: `1px solid ${borderColor}`,
                          color: "var(--app-text)",
                        }}
                      />
                    </div>

                    <InlineError message={inlineError} theme={resolvedTheme} />

                    <div className="pt-2 flex flex-col gap-2">
                      <PrimaryButton
                        onClick={handleSaveEdit}
                        disabled={
                          isSaving ||
                          editAmount === "" ||
                          Number(editAmount) === selectedGrade.amount
                        }
                        borderColor={borderColor}
                        theme={resolvedTheme}
                        className="w-full"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </PrimaryButton>

                      <GhostButton
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        borderColor={borderColor}
                        theme={resolvedTheme}
                        className="w-full"
                      >
                        Cancel
                      </GhostButton>
                    </div>
                  </>
                ) : (
                  <>
                    <SoftNotice
                      icon={Info}
                      tone="blue"
                      title="How this works"
                      theme={resolvedTheme}
                    >
                      Select an amount cell from the table to modify a specific
                      Salary Grade amount.
                    </SoftNotice>

                    <div
                      className="rounded-xl p-4 transition-colors duration-300 ease-out mt-4"
                      style={{
                        backgroundColor: subtleBg,
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ease-out"
                        style={{ color: "var(--app-muted)" }}
                      >
                        Matrix Overview
                      </div>
                      <div
                        className="mt-2 text-xs leading-relaxed transition-colors duration-300 ease-out"
                        style={{ color: "var(--app-text)" }}
                      >
                        • Used to calculate basic compensation.
                        <br />
                        • Affects organic personnel only.
                        <br />• Amounts update dynamically across the system
                        when saved.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

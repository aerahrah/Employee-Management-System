// LeaveCreditsDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast } from "react-toastify";
import {
  PenTool,
  Check,
  X,
  ShieldAlert,
  Activity,
  Umbrella,
  CalendarDays,
} from "lucide-react";

import { useAuth } from "../../../store/authStore";
import { getEmployeeById } from "../../../api/employee"; // Adjust import
import { updateLeaveBalances } from "../../../api/leaveCredit"; // Adjust import

/* ================================
   THEME HELPER FUNCTIONS
================================ */
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

const LeaveCreditsDetailsSkeleton = ({ borderColor, resolvedTheme }) => {
  const skeletonBase =
    resolvedTheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const skeletonHighlight =
    resolvedTheme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
  const bgFallback =
    resolvedTheme === "dark" ? "rgba(2,6,23,0.96)" : "rgba(245,245,245,0.80)";

  return (
    <div
      className="flex-1 h-full rounded-xl shadow-md w-full flex flex-col gap-2 max-w-5xl mx-auto min-w-0 border"
      style={{
        backgroundColor: `var(--app-bg, ${bgFallback})`,
        borderColor: borderColor || "var(--app-border)",
      }}
    >
      <SkeletonTheme
        baseColor={skeletonBase}
        highlightColor={skeletonHighlight}
      >
        <header
          className="flex md:rounded-t-xl flex-col md:flex-row md:items-center justify-between gap-3 border-b px-3 sm:px-4 py-3 z-10"
          style={{ backgroundColor: "var(--app-surface)", borderColor }}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Skeleton height={48} width={48} borderRadius={12} />
            <div className="min-w-0 flex-1">
              <Skeleton height={20} width={180} />
              <div className="mt-1 flex gap-2">
                <Skeleton height={14} width={100} borderRadius={4} />
              </div>
            </div>
          </div>
          <Skeleton height={40} width={120} borderRadius={8} />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 gap-6 grid grid-cols-1 md:grid-cols-2">
          <Skeleton height={180} borderRadius={16} />
          <Skeleton height={180} borderRadius={16} />
        </div>
      </SkeletonTheme>
    </div>
  );
};

const LeaveCreditsDetails = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useResolvedTheme(prefTheme);

  const borderColor = useMemo(
    () =>
      resolvedTheme === "dark"
        ? "rgba(255,255,255,0.07)"
        : "rgba(15,23,42,0.10)",
    [resolvedTheme],
  );

  // EDIT STATE
  const [isEditing, setIsEditing] = useState(false);
  const [editVl, setEditVl] = useState("");
  const [editSl, setEditSl] = useState("");

  // FETCH EMPLOYEE DATA
  const {
    data: rawData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["employeeDetails", id],
    queryFn: () => getEmployeeById(id),
    enabled: !!id,
  });

  const employee = rawData?.data || rawData;
  const isOrganic = employee?.employeeType === "Organic";
  const balances = employee?.balances || {};

  // PRE-FILL INPUTS WHEN ENTERING EDIT MODE
  useEffect(() => {
    if (employee && !isEditing) {
      setEditVl(balances.vlDays ?? 0);
      setEditSl(balances.slDays ?? 0);
    }
  }, [employee, isEditing, balances]);

  // MUTATION FOR UPDATING BALANCES
  const updateBalancesMutation = useMutation({
    mutationFn: (payload) => updateLeaveBalances(id, payload),
    onSuccess: () => {
      toast.success("Leave balances updated successfully!");
      setIsEditing(false);
      queryClient.invalidateQueries(["employeeDetails", id]);
      queryClient.invalidateQueries(["employees"]); // refresh the list sidebar too
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to update balances.",
      );
    },
  });

  const handleSave = () => {
    if (!isOrganic) return;
    const vlDays = parseFloat(editVl);
    const slDays = parseFloat(editSl);

    if (isNaN(vlDays) || isNaN(slDays) || vlDays < 0 || slDays < 0) {
      toast.error("Please enter valid positive numbers for leave balances.");
      return;
    }

    updateBalancesMutation.mutate({ vlDays, slDays });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditVl(balances.vlDays ?? 0);
    setEditSl(balances.slDays ?? 0);
  };

  if (!id) {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1 rounded-xl border border-dashed m-4"
        style={{ backgroundColor: "var(--app-surface)", borderColor }}
      >
        <CalendarDays className="h-12 w-12 text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-500">
          Select an employee from the directory
        </h3>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LeaveCreditsDetailsSkeleton
        borderColor={borderColor}
        resolvedTheme={resolvedTheme}
      />
    );
  }

  if (isError || !employee) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed m-4"
        style={{ backgroundColor: "var(--app-surface)", borderColor }}
      >
        <h3 className="font-semibold text-red-500 mb-2">Error Loading Data</h3>
        <p className="text-sm text-slate-500">
          {error?.message || "Employee not found."}
        </p>
      </div>
    );
  }

  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`;

  return (
    <div
      className="flex-1 h-full rounded-xl shadow-md w-full flex flex-col gap-2 max-w-5xl mx-auto min-w-0 border"
      style={{
        backgroundColor: "var(--app-bg)",
        color: "var(--app-text)",
        borderColor: borderColor,
      }}
    >
      {/* HEADER */}
      <header
        className="flex md:rounded-t-xl flex-col md:flex-row md:items-center justify-between gap-3 border-b px-3 sm:px-5 py-4 z-10"
        style={{
          backgroundColor: "var(--app-surface)",
          borderColor: borderColor,
        }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="h-14 w-14 rounded-xl text-white flex items-center justify-center font-bold text-xl flex-none shadow-sm"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h2
              className="text-lg font-bold leading-tight truncate"
              style={{ color: "var(--app-text)" }}
            >
              {employee.firstName} {employee.lastName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium mt-1">
              <span style={{ color: "var(--app-muted)" }}>
                {employee.position}
              </span>
              <span
                className="px-2 py-0.5 rounded border uppercase text-[10px] font-bold"
                style={{
                  backgroundColor: isOrganic
                    ? "rgba(59,130,246,0.12)"
                    : "rgba(245,158,11,0.12)",
                  color: isOrganic ? "#3b82f6" : "#d97706",
                  borderColor: isOrganic
                    ? "rgba(59,130,246,0.20)"
                    : "rgba(245,158,11,0.20)",
                }}
              >
                {employee.employeeType || "Unknown"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              disabled={!isOrganic}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm ${
                !isOrganic
                  ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  : "bg-[color:var(--accent)] text-white hover:brightness-95"
              }`}
              title={
                !isOrganic
                  ? "Only Organic employees can be edited directly"
                  : "Edit leave balances"
              }
            >
              <PenTool size={16} />
              Edit Balances
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-sm font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor, color: "var(--app-text)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateBalancesMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
                style={{
                  backgroundColor: "rgba(34,197,94,0.14)",
                  color: "#16a34a",
                  borderColor: "rgba(34,197,94,0.22)",
                  borderWidth: "1px",
                  opacity: updateBalancesMutation.isPending ? 0.7 : 1,
                }}
              >
                {updateBalancesMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Check size={16} /> Save Changes
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 app-scrollbar flex flex-col gap-6">
        {/* WARNING FOR NON-ORGANIC */}
        {!isOrganic && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/50">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              Direct modification of leave balances is restricted to{" "}
              <strong>Organic</strong> employees. Job Order (JO) personnel do
              not accrue leave credits in this system.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* VACATION LEAVE CARD */}
          <div
            className="rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden min-w-0 transition-transform duration-300"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
              boxShadow: "0 10px 25px -5px rgba(37,99,235,0.3)",
              transform: isEditing ? "scale(1.02)" : "scale(1)",
            }}
          >
            <Umbrella className="absolute -right-4 -bottom-4 h-40 w-40 text-white/10 rotate-12" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/90 mb-1">
                <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                  <Umbrella size={18} />
                </span>
                <p className="text-xs font-bold uppercase tracking-widest">
                  Vacation Leave
                </p>
              </div>
              <p className="text-sm text-white/80 mt-2 font-medium">
                Available Days (VL)
              </p>
            </div>
            <div className="relative z-10 mt-6 flex items-baseline gap-2">
              {isEditing ? (
                <div className="flex items-center border-b-2 border-white/50 focus-within:border-white transition-colors">
                  <input
                    type="number"
                    step="0.01"
                    value={editVl}
                    onChange={(e) => setEditVl(e.target.value)}
                    className="w-24 bg-transparent text-5xl font-black outline-none placeholder:text-white/30 text-white"
                    placeholder="0"
                  />
                </div>
              ) : (
                <h3 className="text-5xl font-black tracking-tight">
                  {balances.vlDays ?? 0}
                </h3>
              )}
              <span className="text-lg font-bold text-white/80">Days</span>
            </div>
          </div>

          {/* SICK LEAVE CARD */}
          <div
            className="rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden min-w-0 transition-transform duration-300"
            style={{
              background: "linear-gradient(135deg, #ec4899 0%, #be123c 100%)",
              boxShadow: "0 10px 25px -5px rgba(225,29,72,0.3)",
              transform: isEditing ? "scale(1.02)" : "scale(1)",
            }}
          >
            <Activity className="absolute -right-4 -bottom-4 h-40 w-40 text-white/10 -rotate-12" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/90 mb-1">
                <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                  <Activity size={18} />
                </span>
                <p className="text-xs font-bold uppercase tracking-widest">
                  Sick Leave
                </p>
              </div>
              <p className="text-sm text-white/80 mt-2 font-medium">
                Available Days (SL)
              </p>
            </div>
            <div className="relative z-10 mt-6 flex items-baseline gap-2">
              {isEditing ? (
                <div className="flex items-center border-b-2 border-white/50 focus-within:border-white transition-colors">
                  <input
                    type="number"
                    step="0.01"
                    value={editSl}
                    onChange={(e) => setEditSl(e.target.value)}
                    className="w-24 bg-transparent text-5xl font-black outline-none placeholder:text-white/30 text-white"
                    placeholder="0"
                  />
                </div>
              ) : (
                <h3 className="text-5xl font-black tracking-tight">
                  {balances.slDays ?? 0}
                </h3>
              )}
              <span className="text-lg font-bold text-white/80">Days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveCreditsDetails;

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { addWellnessCreditRequest } from "../../../../api/wellnessApplication";
import { fetchApprovers } from "../../../../api/cto";
import Breadcrumbs from "../../../breadCrumbs";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Users,
  FileText,
  Calendar,
  X,
  AlertCircle,
} from "lucide-react";

import { useAuth } from "../../../../store/authStore";

const todayISO = () => new Date().toISOString().split("T")[0];

const isLikelyObjectId = (v) =>
  typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

const clampInt = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(Math.trunc(n), min), max);
};

// best effort UUID / idempotency key
const makeClientRequestId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID();
  } catch {}
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

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

/* ------------------ Banner Component ------------------ */
const Banner = ({ tone = "error", message, borderColor }) => {
  if (!message) return null;

  const palette =
    tone === "info"
      ? {
          bg: "rgba(37,99,235,0.10)",
          br: "rgba(37,99,235,0.18)",
          fg: "var(--app-text)",
          icon: "var(--accent)",
        }
      : tone === "success"
        ? {
            bg: "rgba(34,197,94,0.12)",
            br: "rgba(34,197,94,0.20)",
            fg: "var(--app-text)",
            icon: "#16a34a",
          }
        : {
            bg: "rgba(239,68,68,0.10)",
            br: "rgba(239,68,68,0.18)",
            fg: "var(--app-text)",
            icon: "#ef4444",
          };

  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs font-medium flex items-start gap-2 transition-colors duration-300 ease-out mb-6"
      role={tone === "error" ? "alert" : "status"}
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.br || borderColor || "var(--app-border)",
        color: palette.fg,
      }}
    >
      <AlertCircle
        className="w-4 h-4 mt-0.5 shrink-0 opacity-90"
        style={{ color: palette.icon }}
      />
      <div className="leading-relaxed">{message}</div>
    </div>
  );
};

/* ------------------ Main Form Component ------------------ */
const AddWellnessCreditForm = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  // Form State
  const [banner, setBanner] = useState({ tone: "error", message: "" });
  const clearBanner = () => setBanner({ tone: "error", message: "" });
  const showBanner = (tone, message) => setBanner({ tone, message });

  const submitInFlightRef = useRef(false);
  const successLatchRef = useRef(false);
  const [successLatchUI, setSuccessLatchUI] = useState(false);
  const [submitLockUI, setSubmitLockUI] = useState(false);

  const initialState = useMemo(
    () => ({
      employees: [],
      days: "",
      memoNo: "",
      dateApproved: "",
    }),
    [],
  );

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    return () => {
      submitInFlightRef.current = false;
      successLatchRef.current = false;
    };
  }, []);

  // Fetch Employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["wellnessCreditEmployees"],
    queryFn: fetchApprovers,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: addWellnessCreditRequest,
    retry: 0,
  });

  const isBusy = mutation.isPending || submitLockUI || successLatchUI;

  // Extract raw employees for filtering and display
  const rawEmployees = useMemo(() => {
    return employeesData?.data?.data || employeesData?.data || [];
  }, [employeesData]);

  const employeeOptions = useMemo(() => {
    return rawEmployees.map((emp) => ({
      value: emp._id,
      label: `${emp.firstName} ${emp.lastName}`.trim(),
    }));
  }, [rawEmployees]);

  // Quick Select Groups
  const organicIds = useMemo(() => {
    return rawEmployees
      .filter(
        (e) =>
          e.employeeType === "Organic" ||
          (!e.employeeType &&
            !/JO|Job Order|Contractual/i.test(e.position || "")),
      )
      .map((e) => e._id);
  }, [rawEmployees]);

  const joIds = useMemo(() => {
    return rawEmployees
      .filter(
        (e) =>
          e.employeeType === "Job Order" ||
          (!e.employeeType &&
            /JO|Job Order|Contractual/i.test(e.position || "")),
      )
      .map((e) => e._id);
  }, [rawEmployees]);

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    clearBanner();

    if (isBusy) return;

    if (name === "days") {
      const days = clampInt(value, 0, 365);
      setFormData((prev) => ({
        ...prev,
        days: String(days),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectGroup = (ids) => {
    clearBanner();
    setFormData((prev) => {
      const newSet = new Set([...prev.employees, ...ids]);
      return { ...prev, employees: Array.from(newSet) };
    });
  };

  const handleClearSelection = () => {
    clearBanner();
    setFormData((prev) => ({ ...prev, employees: [] }));
  };

  const handleRemoveEmployee = (idToRemove) => {
    clearBanner();
    setFormData((prev) => ({
      ...prev,
      employees: prev.employees.filter((id) => id !== idToRemove),
    }));
  };

  const sanitizeAndValidate = () => {
    const employees = Array.from(new Set(formData.employees || [])).filter(
      isLikelyObjectId,
    );

    if (employees.length === 0) {
      return { ok: false, msg: "Please select at least one employee." };
    }

    const days = clampInt(formData.days, 0, 365);
    if (days <= 0) {
      return {
        ok: false,
        msg: "Please enter a valid number of days to credit.",
      };
    }

    const dateApproved = String(formData.dateApproved || "").trim();
    if (!dateApproved) {
      return { ok: false, msg: "Please select the date approved." };
    }
    if (dateApproved > todayISO()) {
      return { ok: false, msg: "Date approved cannot be in the future." };
    }

    const memoNo = String(formData.memoNo || "")
      .trim()
      .slice(0, 100);

    if (!memoNo) {
      return { ok: false, msg: "Please enter the memo reference." };
    }

    const payload = {
      memoNo,
      dateApproved,
      employees,
      days,
      clientRequestId: makeClientRequestId(),
    };

    return { ok: true, payload };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    clearBanner();

    if (successLatchRef.current) return;
    if (submitInFlightRef.current) return;
    if (isBusy) return;

    submitInFlightRef.current = true;
    setSubmitLockUI(true);

    const { ok, msg, payload } = sanitizeAndValidate();
    if (!ok) {
      showBanner("error", msg);
      submitInFlightRef.current = false;
      setSubmitLockUI(false);
      return;
    }

    try {
      await mutation.mutateAsync(payload);

      successLatchRef.current = true;
      setSuccessLatchUI(true);

      toast.success("Wellness credit added successfully!");
      queryClient.invalidateQueries({ queryKey: ["wellnessCredits"] });
      queryClient.invalidateQueries({ queryKey: ["allWellnessCredits"] });

      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit credit request.";

      showBanner("error", errorMsg);
      toast.error(errorMsg);

      submitInFlightRef.current = false;
      successLatchRef.current = false;
      setSuccessLatchUI(false);
      setSubmitLockUI(false);
    }
  };

  return (
    <div
      className="w-full max-w-4xl transition-colors duration-300 ease-out pb-12"
      style={{ color: "var(--app-text)" }}
    >
      <SkeletonTheme
        baseColor={skeletonColors.baseColor}
        highlightColor={skeletonColors.highlightColor}
      >
        {/* Page Header */}
        <div className="pt-2 pb-6 px-4 md:px-0">
          <Breadcrumbs rootLabel="home" rootTo="/app" />
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight font-sans mt-2"
            style={{ color: "var(--app-text)" }}
          >
            Add Wellness Credit
          </h1>
          <p
            className="block text-sm mt-1 max-w-2xl"
            style={{ color: "var(--app-muted)" }}
          >
            Issue new Wellness Leave credits to selected employees in your
            organization.
          </p>
        </div>

        {/* Form Card */}
        <div
          className="w-full rounded-xl overflow-hidden border shadow-sm transition-colors duration-300 ease-out"
          style={{
            backgroundColor: "var(--app-surface)",
            borderColor: borderColor,
          }}
        >
          {/* Card Header */}
          <div
            className="px-6 py-5 border-b flex items-center justify-between gap-3 transition-colors duration-300 ease-out"
            style={{ borderColor: borderColor }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-300 ease-out"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  borderColor: "var(--accent-soft2, rgba(37,99,235,0.18))",
                  color: "var(--accent)",
                }}
              >
                <CalendarDays className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">
                  Crediting Details
                </h2>
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col"
          >
            <div className="px-6 py-6 space-y-8">
              <Banner
                tone={banner.tone}
                message={banner.message}
                borderColor={borderColor}
              />

              {/* Employees Selection Block */}
              <div
                className="space-y-4 border-b pb-8 transition-colors duration-300 ease-out"
                style={{ borderColor: borderColor }}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center border"
                    style={{
                      backgroundColor: "var(--app-surface-2)",
                      borderColor: borderColor,
                      color: "var(--app-muted)",
                    }}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  Select Employees
                </div>

                {/* Quick Select Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-[10px] uppercase font-bold mr-1"
                    style={{ color: "var(--app-muted)" }}
                  >
                    Quick Select:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectGroup(organicIds)}
                    disabled={isBusy || organicIds.length === 0}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors"
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      color: "#059669",
                      borderColor: "rgba(16, 185, 129, 0.2)",
                    }}
                  >
                    Organic ({organicIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectGroup(joIds)}
                    disabled={isBusy || joIds.length === 0}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors"
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.1)",
                      color: "#d97706",
                      borderColor: "rgba(245, 158, 11, 0.2)",
                    }}
                  >
                    Job Order ({joIds.length})
                  </button>
                </div>

                {/* Dropdown - Strictly for Searching & Adding */}
                {isLoading ? (
                  <Skeleton height={42} borderRadius={8} />
                ) : (
                  <Select
                    options={employeeOptions}
                    isMulti
                    controlShouldRenderValue={false}
                    hideSelectedOptions={true}
                    closeMenuOnSelect={false}
                    isDisabled={isBusy}
                    maxMenuHeight={250}
                    value={employeeOptions.filter((o) =>
                      (formData.employees || []).includes(o.value),
                    )}
                    onChange={(selected) => {
                      clearBanner();
                      setFormData((p) => ({
                        ...p,
                        employees: selected ? selected.map((s) => s.value) : [],
                      }));
                    }}
                    placeholder="Search and add employees..."
                    classNames={{
                      control: ({ isFocused }) =>
                        `min-h-[42px] rounded-lg border transition-colors duration-200 ${
                          isFocused
                            ? "border-blue-500 ring-1 ring-blue-200"
                            : "border-gray-300"
                        } ${isBusy ? "opacity-70" : ""}`,
                      menuList: () => "custom-scrollbar",
                      option: ({ isFocused, isSelected }) =>
                        `${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : isFocused
                              ? "bg-gray-100 text-gray-900"
                              : "bg-white text-gray-800"
                        } px-3 py-2 cursor-pointer transition-colors duration-150`,
                    }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        backgroundColor: isBusy
                          ? "var(--app-surface-2)"
                          : "var(--app-surface)",
                        borderColor: borderColor,
                        color: "var(--app-text)",
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: "var(--app-surface)",
                        border: `1px solid ${borderColor}`,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        zIndex: 50,
                      }),
                    }}
                  />
                )}

                {/* SEPARATE SELECTED EMPLOYEES BLOCK */}
                <div
                  className="rounded-lg overflow-hidden border shadow-sm flex flex-col transition-colors duration-300 ease-out"
                  style={{
                    backgroundColor: "var(--app-surface)",
                    borderColor: borderColor,
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b shrink-0 transition-colors duration-300 ease-out"
                    style={{
                      backgroundColor: "var(--app-surface-2)",
                      borderColor: borderColor,
                    }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--app-text)" }}
                    >
                      Selected Employees ({formData.employees.length})
                    </span>
                    {formData.employees.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        disabled={isBusy}
                        className="text-[11px] text-red-600 hover:text-red-700 font-bold disabled:opacity-50 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Fixed height scrollable area for selected chips */}
                  <div className="max-h-[250px] overflow-y-auto p-3 custom-scrollbar flex flex-wrap gap-2 content-start min-h-[80px]">
                    {formData.employees.length === 0 ? (
                      <div
                        className="text-xs flex items-center justify-center p-4 text-center w-full italic font-medium"
                        style={{ color: "var(--app-muted)" }}
                      >
                        No employees selected. Use the search bar or quick
                        select above.
                      </div>
                    ) : (
                      formData.employees.map((empId) => {
                        const emp = rawEmployees.find((e) => e._id === empId);
                        if (!emp) return null;
                        return (
                          <div
                            key={empId}
                            className="flex items-center gap-1.5 border px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors duration-300 ease-out animate-in fade-in zoom-in duration-200"
                            style={{
                              backgroundColor: "var(--accent-soft)",
                              borderColor:
                                "var(--accent-soft2, rgba(37,99,235,0.18))",
                              color: "var(--accent)",
                            }}
                          >
                            <span className="whitespace-nowrap">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRemoveEmployee(empId)}
                              className="transition-colors disabled:opacity-50 ml-1"
                              style={{ color: "var(--accent)" }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.color = "#ef4444")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color = "var(--accent)")
                              }
                              aria-label={`Remove ${emp.firstName}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Input Grid: Days & Date Approved */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div className="space-y-2">
                  <div
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: "var(--app-text)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center border"
                      style={{
                        backgroundColor: "var(--app-surface-2)",
                        borderColor: borderColor,
                        color: "var(--app-muted)",
                      }}
                    >
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    Credited Days
                  </div>

                  <input
                    type="number"
                    name="days"
                    placeholder="e.g. 5"
                    min={1}
                    value={formData.days}
                    onChange={handleChange}
                    disabled={isBusy}
                    className="w-full h-11 sm:h-10 px-3 rounded-lg outline-none border transition-colors duration-200 ease-out"
                    style={{
                      backgroundColor: isBusy
                        ? "var(--app-surface-2)"
                        : "var(--app-surface)",
                      borderColor: borderColor,
                      color: isBusy ? "var(--app-muted)" : "var(--app-text)",
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: "var(--app-text)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center border"
                      style={{
                        backgroundColor: "var(--app-surface-2)",
                        borderColor: borderColor,
                        color: "var(--app-muted)",
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    Date Approved
                  </div>

                  <input
                    type="date"
                    name="dateApproved"
                    value={formData.dateApproved}
                    onChange={handleChange}
                    max={todayISO()}
                    disabled={isBusy}
                    className="w-full h-11 sm:h-10 px-3 rounded-lg outline-none border transition-colors duration-200 ease-out text-[16px] sm:text-sm"
                    style={{
                      backgroundColor: isBusy
                        ? "var(--app-surface-2)"
                        : "var(--app-surface)",
                      borderColor: borderColor,
                      color: isBusy ? "var(--app-muted)" : "var(--app-text)",
                    }}
                  />
                </div>
              </div>

              {/* Memo Reference */}
              <div className="space-y-2">
                <div
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: "var(--app-text)" }}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center border"
                    style={{
                      backgroundColor: "var(--app-surface-2)",
                      borderColor: borderColor,
                      color: "var(--app-muted)",
                    }}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  Memo Reference
                </div>

                <input
                  type="text"
                  name="memoNo"
                  value={formData.memoNo}
                  onChange={handleChange}
                  placeholder="Enter memo or reference number"
                  maxLength={100}
                  disabled={isBusy}
                  className="w-full h-11 sm:h-10 px-3 rounded-lg outline-none border transition-colors duration-200 ease-out text-sm"
                  style={{
                    backgroundColor: isBusy
                      ? "var(--app-surface-2)"
                      : "var(--app-surface)",
                    borderColor: borderColor,
                    color: isBusy ? "var(--app-muted)" : "var(--app-text)",
                  }}
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div
              className="border-t px-6 py-4 flex flex-row items-stretch sm:items-center justify-end gap-3 sticky bottom-0 transition-colors duration-300 ease-out"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <button
                type="button"
                disabled={isBusy}
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 sm:py-2 rounded-lg border font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ease-out"
                style={{
                  backgroundColor: "var(--app-surface-2)",
                  borderColor: borderColor,
                  color: "var(--app-text)",
                }}
                onMouseEnter={(e) => {
                  if (e.currentTarget.disabled) return;
                  e.currentTarget.style.filter = "brightness(0.98)";
                }}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full sm:w-auto px-8 py-2.5 sm:py-2 rounded-lg font-bold disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-200 ease-out"
                style={{
                  backgroundColor: "var(--accent)",
                  border: "1px solid var(--accent)",
                  color: "#fff",
                }}
                onMouseEnter={(e) => {
                  if (e.currentTarget.disabled) return;
                  e.currentTarget.style.filter = "brightness(0.95)";
                }}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
              >
                {mutation.isPending
                  ? "Saving..."
                  : successLatchUI
                    ? "Saved"
                    : "Add Credit"}
              </button>
            </div>
          </form>
        </div>
      </SkeletonTheme>
    </div>
  );
};

export default AddWellnessCreditForm;

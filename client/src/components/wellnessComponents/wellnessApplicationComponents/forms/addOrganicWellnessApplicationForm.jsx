import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { addWellnessApplicationRequest } from "../../../../api/wellnessApplication";
import { fetchPublicWorkingDaysGeneralSettings } from "../../../../api/generalSettings";
import { fetchAllApprovalRoutes } from "../../../../api/approvalRoute";
import { getMyProfile } from "../../../../api/employee";
import { useAuth } from "../../../../store/authStore";
import { AlertCircle, X, UserCheck, PenTool, Loader2 } from "lucide-react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import Breadcrumbs from "../../../breadCrumbs";
import "react-loading-skeleton/dist/skeleton.css";
import { toast } from "react-toastify";
import * as yup from "yup";

// ✅ Import your newly extracted Forbidden403 component
import Forbidden403 from "../../../../pages/forbidden403_FormPage";

const MAX_REASON_LEN = 1000;

const clampInt = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const t = Math.trunc(n);
  return Math.min(Math.max(t, min), max);
};

const isWeekendISO = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay();
  return day === 0 || day === 6;
};

const isFullISODate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

const getMinSelectableDateISO = (leadTimeDays = 5) => {
  const lead = Number(leadTimeDays);
  const date = new Date();

  if (!Number.isFinite(lead) || lead <= 0) {
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  }

  let count = 0;
  while (count < lead) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split("T")[0];
};

const makeClientRequestId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID();
  } catch {}
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

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
      className="rounded-xl border px-3 py-2 text-xs font-medium flex items-start gap-2 mb-4"
      role={tone === "error" ? "alert" : "status"}
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.br || borderColor,
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

const AddOrganicWellnessApplicationForm = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ✅ LOCAL SESSION DATA: Used for immediate UI rendering (Name, Dept)
  const { admin } = useAuth();
  const sessionAdmin = admin || {};

  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useResolvedTheme(prefTheme);

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.15)"
      : "rgba(15,23,42,0.2)";
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

  const dateInputRef = useRef(null);

  const [dateValue, setDateValue] = useState("");
  const [dateError, setDateError] = useState("");

  const [banner, setBanner] = useState({ tone: "error", message: "" });
  const clearBanner = () => setBanner({ tone: "error", message: "" });
  const showBanner = (tone, message) => setBanner({ tone, message });

  const successLatchRef = useRef(false);
  const [successLatchUI, setSuccessLatchUI] = useState(false);
  const submitInFlightRef = useRef(false);

  const initialState = useMemo(
    () => ({
      leaveType: "Wellness Leave",
      commutation: "Not Requested", // Required choice for Organic
      inclusiveDates: [],
      reason: "",
      routeId: "",
    }),
    [],
  );

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    return () => {
      successLatchRef.current = false;
      submitInFlightRef.current = false;
    };
  }, []);

  // ✅ LIVE DATABASE DATA: Strictly used for signature, salary, and access controls
  const {
    data: profileDataResponse,
    isLoading: isProfileLoading,
    isFetching: isProfileFetching,
  } = useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    refetchOnMount: "always",
  });

  const liveProfile = profileDataResponse || {};

  // Strictly evaluate signature against live profile data
  const hasSignature = Boolean(liveProfile.signature);

  // Block the UI from assuming no signature if we are still loading
  const checkingProfile =
    isProfileLoading || (isProfileFetching && !hasSignature);

  // Pre-format Salary for Display using live profile data
  const salaryText = useMemo(() => {
    if (isProfileLoading) return "Loading...";
    const amt = liveProfile.salary?.amount;
    const sg = liveProfile.salary?.grade;
    if (amt && sg) {
      return `₱${Number(amt).toLocaleString("en-PH", { minimumFractionDigits: 2 })} (SG ${sg})`;
    } else if (amt) {
      return `₱${Number(amt).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
    } else if (sg) {
      return `SG ${sg}`;
    }
    return "N/A";
  }, [liveProfile, isProfileLoading]);

  const {
    data: workingDaysRes,
    isLoading: workingDaysLoading,
    isError: workingDaysIsError,
  } = useQuery({
    queryKey: ["workingDaysSettings"],
    queryFn: fetchPublicWorkingDaysGeneralSettings,
    staleTime: 1000 * 60 * 5,
  });

  const workingDoc = workingDaysRes?.data;

  const leadTimeDays = useMemo(() => {
    const enabled =
      typeof workingDoc?.workingDaysEnable === "boolean"
        ? workingDoc.workingDaysEnable
        : true;
    if (!enabled) return 0;
    return clampInt(workingDoc?.workingDaysValue, 1, 7, 5);
  }, [workingDoc]);

  const minDate = useMemo(
    () => getMinSelectableDateISO(leadTimeDays),
    [leadTimeDays],
  );

  useEffect(() => {
    if (workingDaysIsError) {
      showBanner(
        "info",
        "Could not load Working Days settings. Using default lead time.",
      );
    }
  }, [workingDaysIsError]);

  const { data: routesResponse } = useQuery({
    queryKey: ["approvalRoutes"],
    queryFn: fetchAllApprovalRoutes,
  });

  const mutation = useMutation({
    mutationFn: addWellnessApplicationRequest,
    retry: 0,
  });

  const isBusy = mutation.isPending || successLatchUI;
  const isFormDisabled = !hasSignature || checkingProfile || isBusy;

  // Find approval route based on live profile ID, falling back to session ID
  const userId =
    liveProfile._id || liveProfile.id || sessionAdmin._id || sessionAdmin.id;

  const myRoute = useMemo(() => {
    if (!routesResponse || !Array.isArray(routesResponse) || !userId)
      return null;
    return routesResponse.find(
      (r) => String(r.createdBy?._id || r.createdBy) === String(userId),
    );
  }, [routesResponse, userId]);

  const hasValidApprovalRoute = useMemo(() => {
    if (!myRoute) return false;
    if (!myRoute.steps || myRoute.steps.length === 0) return false;
    return myRoute.steps.some(
      (step) => step.isEnabled !== false && step.approver,
    );
  }, [myRoute]);

  useEffect(() => {
    if (myRoute && !formData.routeId) {
      setFormData((prev) => ({ ...prev, routeId: myRoute._id }));
    }
  }, [myRoute, formData.routeId]);

  const leadTimeMsg = useMemo(() => {
    if (leadTimeDays <= 0)
      return "Applications must be filed at least 1 day in advance.";
    return `Applications must be filed at least ${leadTimeDays} working day(s) in advance.`;
  }, [leadTimeDays]);

  useEffect(() => {
    if (!formData.inclusiveDates?.length) return;
    const filtered = formData.inclusiveDates.filter((d) => d >= minDate);
    if (filtered.length !== formData.inclusiveDates.length) {
      setFormData((prev) => ({ ...prev, inclusiveDates: filtered }));
      showBanner("info", "Some selected dates were removed (lead-time rule).");
    }
  }, [minDate]);

  const validateDateLogic = useCallback(
    (value) => {
      if (!value) return "";
      if (!isFullISODate(value)) return "";

      if (value < minDate) return leadTimeMsg;
      if (isWeekendISO(value)) return "Please select a working day (Mon–Fri).";
      if (formData.inclusiveDates.includes(value))
        return "That date is already selected.";

      return "";
    },
    [formData.inclusiveDates, minDate, leadTimeMsg],
  );

  useEffect(() => {
    setDateError(validateDateLogic(dateValue));
  }, [dateValue, validateDateLogic]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    clearBanner();

    if (name === "reason") {
      setFormData((prev) => ({
        ...prev,
        reason: value.slice(0, MAX_REASON_LEN),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateInput = (e) => {
    clearBanner();
    const v = e.target.value;
    setDateValue(v);
    setDateError(validateDateLogic(v));
  };

  const handleDateCommit = (e) => {
    clearBanner();
    const v = e.target.value;
    setDateValue(v);

    const err = validateDateLogic(v);
    setDateError(err);
    if (!isFullISODate(v)) return;

    if (workingDaysLoading) {
      showBanner("info", "Working-days settings are still loading.");
      return;
    }
    if (err) return;

    setFormData((prev) => ({
      ...prev,
      inclusiveDates: [...prev.inclusiveDates, v].sort(),
    }));
    setDateValue("");
    setDateError("");
    try {
      dateInputRef.current?.focus?.();
    } catch {}
  };

  const handleDateRemove = (date) => {
    if (isFormDisabled) return;
    clearBanner();
    setFormData((prev) => ({
      ...prev,
      inclusiveDates: prev.inclusiveDates.filter((d) => d !== date).sort(),
    }));
  };

  // ✅ Make validation specific to catch empty reasons on the frontend
  const validationSchema = useMemo(() => {
    return yup.object().shape({
      commutation: yup
        .string()
        .required("Commutation is required for Organic employees."),
      reason: yup
        .string()
        .trim()
        .required("Reason / Additional Justification is required.")
        .max(
          MAX_REASON_LEN,
          `Remarks cannot exceed ${MAX_REASON_LEN} characters.`,
        ),
      routeId: yup
        .string()
        .required("Please select an approval route.")
        .test(
          "has-active-steps",
          "Your approval workflow has no active approvers.",
          () => hasValidApprovalRoute,
        ),
      inclusiveDates: yup
        .array()
        .of(yup.string())
        .min(1, "Please select at least one inclusive date.")
        .test("lead-time", leadTimeMsg, (dates) =>
          !dates ? true : !dates.some((d) => d < minDate),
        )
        .test("no-weekends", "Dates must be Mon-Fri.", (dates) =>
          !dates ? true : !dates.some((d) => isWeekendISO(d)),
        ),
    });
  }, [minDate, leadTimeMsg, hasValidApprovalRoute]);

  const startSubmit = async () => {
    clearBanner();
    if (
      successLatchRef.current ||
      submitInFlightRef.current ||
      mutation.isPending ||
      successLatchUI ||
      !hasSignature
    )
      return;
    submitInFlightRef.current = true;

    try {
      // Backend infers totalDays from inclusiveDates.length
      const rawPayload = {
        // Employee type evaluated from live profile, fallback to session
        employeeType:
          liveProfile.employeeType || sessionAdmin.employeeType || "Organic",
        commutation: formData.commutation,
        reason: String(formData.reason || "").trim(),
        inclusiveDates: Array.from(
          new Set((formData.inclusiveDates || []).filter(Boolean)),
        ).sort(),
        routeId: formData.routeId,
        type: "WELLNESS", // explicit tag for the endpoint
      };

      await validationSchema.validate(rawPayload, { abortEarly: false });
      rawPayload.clientRequestId = makeClientRequestId();

      await mutation.mutateAsync(rawPayload);
      successLatchRef.current = true;
      setSuccessLatchUI(true);

      toast.success("Organic Wellness application submitted successfully!");

      // Invalidate relevant unified queries
      queryClient.invalidateQueries({ queryKey: ["organicApplications"] });
      queryClient.invalidateQueries({ queryKey: ["wellnessApplications"] });

      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      // ✅ Specific Yup error handling
      if (err instanceof yup.ValidationError) {
        showBanner("error", err.errors[0]);
        toast.error(err.errors[0]);
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to submit application.";
        showBanner("error", msg);
        toast.error(msg);
      }
      submitInFlightRef.current = false;
      successLatchRef.current = false;
      setSuccessLatchUI(false);
    }
  };

  // ------------------------------------------------------------------
  // 403 Forbidden Access Guard
  // Wait until profile is finished loading before evaluating type
  // ------------------------------------------------------------------
  const currentEmployeeType =
    liveProfile.employeeType || sessionAdmin.employeeType;
  if (
    !isProfileLoading &&
    profileDataResponse &&
    currentEmployeeType !== "Organic"
  ) {
    return (
      <Forbidden403
        employeeType={currentEmployeeType}
        borderColor={borderColor}
      />
    );
  }

  return (
    <div
      className="w-full max-w-5xl transition-colors duration-300 ease-out pb-12"
      style={{ color: "var(--app-text)" }}
    >
      <SkeletonTheme
        baseColor={skeletonColors.baseColor}
        highlightColor={skeletonColors.highlightColor}
      >
        <div className="pt-2 pb-6 px-4 md:px-0">
          <Breadcrumbs rootLabel="home" rootTo="/app" />
        </div>

        <div
          className="w-full bg-white text-black shadow-lg rounded-sm overflow-hidden"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {/* Header Block */}
          <div className="text-center py-6 border-b-2 border-black">
            <h1 className="text-2xl font-bold uppercase tracking-wide">
              Application for Leave
            </h1>
            <p className="text-xs mt-1 text-gray-600">
              Civil Service Form No. 6 (Wellness Leave Edition)
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              startSubmit();
            }}
            className="flex flex-col"
          >
            <div className="px-6 py-4">
              {/* Missing Signature Warning Block */}
              {checkingProfile ? (
                <div className="mb-6 p-4 bg-gray-50 border-l-4 border-gray-300 rounded flex items-center gap-3 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    Checking signature configuration...
                  </span>
                </div>
              ) : !hasSignature ? (
                <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3 text-orange-800">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">
                        E-Signature Required
                      </h4>
                      <p className="text-xs">
                        You do not currently have a digital signature
                        configured. A signature is required to file a leave
                        application.
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
              ) : null}

              <Banner
                tone={banner.tone}
                message={banner.message}
                borderColor={borderColor}
              />

              {/* ✅ Employee Information Header (with Middle Name & Salary) */}
              <div className="border border-black mb-6 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-black text-sm">
                <div className="p-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    1. Office/Department
                  </span>
                  <div className="font-semibold mt-1">
                    {/* Prefer live profile, fallback to session, default to ADMIN */}
                    {liveProfile.division ||
                      liveProfile.department ||
                      sessionAdmin.division ||
                      sessionAdmin.department ||
                      "ADMIN AND FINANCE"}
                  </div>
                </div>
                <div className="p-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    2. Name (Last, First, Middle)
                  </span>
                  <div className="font-semibold mt-1 uppercase">
                    {`${liveProfile.lastName || sessionAdmin.lastName || ""}, ${liveProfile.firstName || sessionAdmin.firstName || ""} ${liveProfile.middleName || sessionAdmin.middleName || ""}`.trim()}
                  </div>
                </div>
                <div className="p-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    3. Position
                  </span>
                  <div className="font-semibold mt-1">
                    {liveProfile.position || sessionAdmin.position || "N/A"}
                  </div>
                </div>
                <div className="p-2 bg-green-50/50">
                  <span className="text-[10px] text-green-700 uppercase block font-semibold">
                    4. Salary
                  </span>
                  <div className="font-semibold mt-1 text-green-900">
                    {salaryText}
                  </div>
                </div>
              </div>

              {/* DETAILS OF APPLICATION */}
              <div
                className={`border border-black ${isFormDisabled ? "opacity-60 pointer-events-none" : ""}`}
              >
                <div className="bg-gray-200 border-b border-black text-center font-bold py-1.5 uppercase text-sm tracking-widest">
                  6. Details of Application
                </div>

                {/* ROW 1: Type of Leave */}
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-black border-b border-black">
                  <div className="flex-1 p-4">
                    <h3 className="text-xs font-bold uppercase mb-3">
                      6.A Type of Leave to be Availed of
                    </h3>
                    <div className="flex items-start gap-2 text-sm bg-green-50 p-3 rounded border border-green-100">
                      <input
                        type="checkbox"
                        checked={true}
                        readOnly
                        className="mt-1 shrink-0 accent-green-600"
                      />
                      <span className="font-bold text-green-900">
                        Wellness Leave
                      </span>
                    </div>
                  </div>
                </div>

                {/* ROW 2: Days / Commutation */}
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-black border-b border-black">
                  {/* Number of Days */}
                  <div className="flex-1 p-4 relative">
                    <h3 className="text-xs font-bold uppercase mb-4">
                      6.C Number of Working Days Applied For
                    </h3>

                    <div className="flex flex-col items-center">
                      <div className="border-b-2 border-black w-32 text-center bg-transparent font-bold text-lg mb-1 py-1">
                        {formData.inclusiveDates.length}
                      </div>
                      <span className="text-[10px] text-gray-500 uppercase">
                        Day(s)
                      </span>
                    </div>

                    <div className="mt-6 border-t border-black pt-4">
                      <h3 className="text-xs font-bold uppercase mb-2">
                        Inclusive Dates
                      </h3>

                      <div className="flex items-center gap-2 mb-3">
                        <input
                          ref={dateInputRef}
                          type="date"
                          min={minDate}
                          value={dateValue}
                          onInput={handleDateInput}
                          onChange={handleDateCommit}
                          disabled={isFormDisabled}
                          className={`border outline-none p-1.5 text-xs bg-transparent w-full disabled:bg-gray-100 disabled:opacity-50 ${
                            dateError ? "border-red-500" : "border-gray-400"
                          }`}
                        />
                      </div>

                      {dateError && (
                        <div className="text-[10px] text-red-600 font-bold mb-2">
                          {dateError}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 min-h-[40px] border border-dashed border-gray-300 p-2">
                        {formData.inclusiveDates.length === 0 ? (
                          <span className="text-[10px] text-gray-400 italic">
                            No dates selected
                          </span>
                        ) : (
                          formData.inclusiveDates.map((date) => (
                            <div
                              key={date}
                              className="flex items-center gap-1 bg-gray-200 px-2 py-0.5 rounded text-[11px] border border-gray-400"
                            >
                              {date}
                              <button
                                type="button"
                                disabled={isFormDisabled}
                                onClick={() => handleDateRemove(date)}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Commutation */}
                  <div className="flex-1 p-4 flex flex-col justify-start">
                    <div className="mb-6">
                      <h3 className="text-xs font-bold uppercase mb-3">
                        6.D Commutation
                      </h3>
                      <div className="space-y-2">
                        <label
                          className={`flex items-center gap-2 text-xs ${!isFormDisabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                        >
                          <input
                            type="radio"
                            name="commutation"
                            value="Not Requested"
                            checked={formData.commutation === "Not Requested"}
                            onChange={handleChange}
                            disabled={isFormDisabled}
                            className="accent-black"
                          />
                          Not Requested
                        </label>
                        <label
                          className={`flex items-center gap-2 text-xs ${!isFormDisabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                        >
                          <input
                            type="radio"
                            name="commutation"
                            value="Requested"
                            checked={formData.commutation === "Requested"}
                            onChange={handleChange}
                            disabled={isFormDisabled}
                            className="accent-black"
                          />
                          Requested
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROW 3: Reason / Custom Digital Fields */}
                <div className="p-4 border-b border-black">
                  <h3 className="text-xs font-bold uppercase mb-2">
                    Reason / Additional Justification
                  </h3>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    rows="2"
                    maxLength={MAX_REASON_LEN}
                    disabled={isFormDisabled}
                    className="w-full border border-gray-400 p-2 text-xs outline-none resize-none bg-transparent disabled:opacity-50 disabled:bg-gray-50"
                    placeholder="Enter justification for leave..."
                  />
                </div>

                {/* ROW 4: Approval Workflow Selection */}
                <div className="p-4 bg-green-50/50">
                  <h3 className="text-xs font-bold uppercase mb-2 text-green-800 flex items-center gap-1">
                    <UserCheck size={14} /> Workflow Approvers
                  </h3>

                  {!hasValidApprovalRoute ? (
                    <div className="text-xs text-red-600 italic">
                      No active approval route found. Please configure your
                      settings.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      {myRoute?.steps
                        ?.filter((s) => s.isEnabled !== false)
                        ?.map((step, idx) => (
                          <div
                            key={idx}
                            className="border border-green-200 bg-white px-3 py-1.5 text-xs flex items-center gap-2 min-w-[200px]"
                          >
                            <span className="font-bold text-green-700">
                              {idx + 1}.
                            </span>
                            <div>
                              <div className="font-bold">
                                {step.approver
                                  ? `${step.approver.firstName} ${step.approver.lastName}`
                                  : "Unassigned"}
                              </div>
                              <div className="text-[10px] text-gray-500 uppercase">
                                {step.approver?.position}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Submit Footer */}
            <div className="border-t border-gray-300 px-6 py-4 flex flex-row items-center justify-end gap-3 sticky bottom-0 bg-white z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => navigate(-1)}
                className="px-6 py-2 rounded border border-gray-300 font-semibold text-sm disabled:opacity-50 text-black hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isFormDisabled ||
                  (workingDaysLoading && !workingDaysIsError) ||
                  !hasValidApprovalRoute
                }
                className="px-8 py-2 rounded font-semibold text-sm disabled:opacity-70 disabled:cursor-not-allowed text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                {checkingProfile
                  ? "Checking Status..."
                  : !hasSignature
                    ? "Signature Required"
                    : workingDaysLoading
                      ? "Loading..."
                      : mutation.isPending
                        ? "Submitting..."
                        : successLatchUI
                          ? "Submitted"
                          : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      </SkeletonTheme>
    </div>
  );
};

export default AddOrganicWellnessApplicationForm;

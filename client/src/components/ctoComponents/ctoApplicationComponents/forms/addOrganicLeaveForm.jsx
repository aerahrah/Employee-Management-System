import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { addApplicationRequest, fetchMyCtoMemos } from "../../../../api/cto";
import { fetchPublicWorkingDaysGeneralSettings } from "../../../../api/generalSettings";
import { fetchAllApprovalRoutes } from "../../../../api/approvalRoute";
import { getMyProfile } from "../../../../api/employee"; // Ensure this path matches your directory structure
import { useAuth } from "../../../../store/authStore";
import { AlertCircle, X, UserCheck, PenTool, Loader2 } from "lucide-react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import Breadcrumbs from "../../../breadCrumbs";
import "react-loading-skeleton/dist/skeleton.css";
import { toast } from "react-toastify";
import * as yup from "yup";

import SelectCtoMemoModal from "./selectCtoMemoModal";

const MAX_REASON_LEN = 1000;

const clampNumber = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
};

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

const AddOrganicCtoApplicationForm = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { admin } = useAuth();

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

  // CTO Specific States
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [selectedMemos, setSelectedMemos] = useState([]);
  const [maxRequestedHours, setMaxRequestedHours] = useState(0);

  const initialState = useMemo(
    () => ({
      leaveType: "Compensatory Time-Off (CTO)", // Locked to CTO
      requestedHours: "",
      memos: [],
      commutation: "Not Requested", // Hardcoded standard fields for Organic
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

  // Fetch live profile to check for signature
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Evaluate signature availability (fallback to store data just in case)
  const hasSignature = Boolean(profileData?.signature || admin?.signature);

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

  const { data: memoResponse, isLoading: memoLoading } = useQuery({
    queryKey: ["myCtoMemos"],
    queryFn: fetchMyCtoMemos,
  });

  const validMemos = useMemo(() => {
    const list = memoResponse?.memos || [];
    return list.filter(
      (memo) =>
        memo.status?.toLowerCase() !== "rolledback" &&
        Number(memo.remainingHours) > 0,
    );
  }, [memoResponse]);

  useEffect(() => {
    const totalRemaining = validMemos.reduce(
      (sum, m) => sum + Number(m.remainingHours || 0),
      0,
    );
    setMaxRequestedHours(totalRemaining);
  }, [validMemos]);

  // Pointing to the unified API application endpoint
  const mutation = useMutation({
    mutationFn: addApplicationRequest,
    retry: 0,
  });

  const isBusy = mutation.isPending || successLatchUI;
  const isFormDisabled = !hasSignature || isProfileLoading || isBusy;

  const myRoute = useMemo(() => {
    if (!routesResponse || !Array.isArray(routesResponse)) return null;
    return routesResponse.find(
      (r) =>
        String(r.createdBy?._id || r.createdBy) ===
        String(admin?.id || admin?._id),
    );
  }, [routesResponse, admin]);

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

  const requiredDays = useMemo(() => {
    return Math.ceil(Number(formData.requestedHours || 0) / 8);
  }, [formData.requestedHours]);

  useEffect(() => {
    if (!formData.inclusiveDates?.length) return;
    const filtered = formData.inclusiveDates.filter((d) => d >= minDate);
    if (filtered.length !== formData.inclusiveDates.length) {
      setFormData((prev) => ({ ...prev, inclusiveDates: filtered }));
      showBanner("info", "Some selected dates were removed (lead-time rule).");
    }
  }, [minDate]);

  useEffect(() => {
    if (!requiredDays) return;
    if (formData.inclusiveDates.length <= requiredDays) return;
    setFormData((prev) => ({
      ...prev,
      inclusiveDates: prev.inclusiveDates.slice(0, requiredDays),
    }));
    showBanner(
      "info",
      `Selected dates were trimmed to ${requiredDays} day(s) based on your input.`,
    );
  }, [requiredDays]);

  const validateDateLogic = useCallback(
    (value) => {
      if (!value) return "";
      if (!isFullISODate(value)) return "";

      const rh = Number(formData.requestedHours || 0);
      if (!rh || rh <= 0) return "Please enter requested hours first.";

      if (value < minDate) return leadTimeMsg;
      if (isWeekendISO(value)) return "Please select a working day (Mon–Fri).";
      if (formData.inclusiveDates.includes(value))
        return "That date is already selected.";

      if (requiredDays > 0 && formData.inclusiveDates.length >= requiredDays) {
        return `You must select exactly ${requiredDays} day(s).`;
      }
      return "";
    },
    [
      formData.requestedHours,
      formData.inclusiveDates,
      minDate,
      leadTimeMsg,
      requiredDays,
    ],
  );

  useEffect(() => {
    setDateError(validateDateLogic(dateValue));
  }, [dateValue, validateDateLogic]);

  const allocateMemosForHours = useCallback(
    (hours) => {
      let remaining = hours;
      const newSelected = [];
      const newFormMemos = [];

      for (const memo of validMemos) {
        if (remaining <= 0) break;
        const memoId = memo.id || memo._id || memo.memoId;
        const remainingHours = Number(memo.remainingHours || 0);
        const applied = Math.min(remainingHours, remaining);

        if (!memoId || applied <= 0) continue;
        remaining -= applied;
        newSelected.push({ ...memo, id: memoId, appliedHours: applied });
        newFormMemos.push({ memoId, appliedHours: applied });
      }
      return { newSelected, newFormMemos };
    },
    [validMemos],
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    clearBanner();

    if (name === "requestedHours") {
      const cap = Math.min(maxRequestedHours || 0, 300);
      const requested = value === "" ? "" : clampNumber(value, 1, cap);

      if (memoLoading) {
        setFormData((prev) => ({
          ...prev,
          requestedHours: String(requested),
          inclusiveDates: [],
          memos: [],
        }));
        setSelectedMemos([]);
        setDateValue("");
        setDateError("");
        return;
      }

      const { newSelected, newFormMemos } = allocateMemosForHours(
        Number(requested),
      );
      setSelectedMemos(newSelected);
      setFormData((prev) => ({
        ...prev,
        requestedHours: String(requested),
        inclusiveDates: [],
        memos: newFormMemos,
      }));
      setDateValue("");
      setDateError("");
      return;
    }

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

    if (requiredDays > 0 && formData.inclusiveDates.length >= requiredDays) {
      setDateError(`You must select exactly ${requiredDays} day(s).`);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      inclusiveDates: [...prev.inclusiveDates, v],
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
      inclusiveDates: prev.inclusiveDates.filter((d) => d !== date),
    }));
  };

  const validationSchema = useMemo(() => {
    return yup.object().shape({
      requestedHours: yup
        .number()
        .typeError("Must be a valid number.")
        .required("Please enter requested hours.")
        .min(1, "Minimum is 1 hour.")
        .max(
          Math.min(maxRequestedHours || 0, 300),
          "Exceeds available balance.",
        )
        .test(
          "memos-loaded",
          "Please wait while memos are loading.",
          () => !memoLoading,
        ),
      commutation: yup
        .string()
        .required("Commutation is required for Organic employees."),
      reason: yup
        .string()
        .trim()
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
        .test("required-days-match", function (dates) {
          const reqDays = Math.ceil(
            Number(this.parent.requestedHours || 0) / 8,
          );
          if (reqDays <= 0)
            return this.createError({
              message: "Please enter requested hours.",
            });
          if (!dates || dates.length !== reqDays) {
            return this.createError({
              message: `Please select exactly ${reqDays} date(s).`,
            });
          }
          return true;
        })
        .test("lead-time", leadTimeMsg, (dates) =>
          !dates ? true : !dates.some((d) => d < minDate),
        )
        .test("no-weekends", "Dates must be Mon-Fri.", (dates) =>
          !dates ? true : !dates.some((d) => isWeekendISO(d)),
        ),
      memos: yup
        .array()
        .test(
          "sufficient-credits",
          "Insufficient memo credits to cover requested hours.",
          function (memos) {
            const reqHours = this.parent.requestedHours;
            if (!reqHours) return true;
            const sum = (memos || []).reduce(
              (acc, m) => acc + (Number(m.appliedHours) || 0),
              0,
            );
            return sum >= reqHours;
          },
        ),
    });
  }, [
    minDate,
    leadTimeMsg,
    hasValidApprovalRoute,
    maxRequestedHours,
    memoLoading,
  ]);

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
      const rawPayload = {
        employeeType: admin?.employeeType || "Organic",
        commutation: formData.commutation,
        reason: String(formData.reason || "").trim(),
        inclusiveDates: Array.from(
          new Set((formData.inclusiveDates || []).filter(Boolean)),
        ).sort(),
        routeId: formData.routeId,
        requestedHours: Number(formData.requestedHours || 0),
        memos: (formData.memos || [])
          .map((m) => ({
            memoId: m.memoId,
            appliedHours: Number(m.appliedHours || 0),
          }))
          .filter((m) => m.memoId && m.appliedHours > 0),
      };

      await validationSchema.validate(rawPayload, { abortEarly: false });
      rawPayload.clientRequestId = makeClientRequestId();

      await mutation.mutateAsync(rawPayload);
      successLatchRef.current = true;
      setSuccessLatchUI(true);

      toast.success("Organic CTO application submitted successfully!");

      // Invalidate relevant unified queries
      queryClient.invalidateQueries({ queryKey: ["ctoApplications"] });
      queryClient.invalidateQueries({ queryKey: ["myCtoMemos"] });

      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        showBanner("error", err.errors[0]);
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

  const dateDisabled = !formData.requestedHours || isFormDisabled;

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
              Civil Service Form No. 6 (Organic CTO Edition)
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
              {isProfileLoading ? (
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

              {/* Employee Information Header */}
              <div className="border border-black mb-6 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-black text-sm">
                <div className="flex-1 p-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    1. Office/Department
                  </span>
                  <div className="font-semibold mt-1">
                    {admin?.office || "N/A"}
                  </div>
                </div>
                <div className="flex-1 p-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    2. Name (Last, First, Middle)
                  </span>
                  <div className="font-semibold mt-1 uppercase">
                    {admin?.lastName}, {admin?.firstName}
                  </div>
                </div>
                <div className="flex-1 p-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    3. Position
                  </span>
                  <div className="font-semibold mt-1">
                    {admin?.position || "N/A"}
                  </div>
                </div>
                <div className="flex-1 p-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    4. Employee Type
                  </span>
                  <div className="font-semibold mt-1 text-blue-800">
                    {admin?.employeeType || "Organic"}
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
                    <div className="flex items-start gap-2 text-sm bg-blue-50 p-3 rounded border border-blue-100">
                      <input
                        type="checkbox"
                        checked={true}
                        readOnly
                        className="mt-1 shrink-0 accent-blue-600"
                      />
                      <span className="font-bold text-blue-900">
                        Compensatory Time-Off (CTO)
                      </span>
                    </div>
                  </div>
                </div>

                {/* ROW 2: Hours / Commutation */}
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-black border-b border-black">
                  {/* Number of Hours */}
                  <div className="flex-1 p-4 relative">
                    <h3 className="text-xs font-bold uppercase mb-4">
                      6.C Number of Hours Applied For
                    </h3>

                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        name="requestedHours"
                        value={formData.requestedHours}
                        onChange={handleChange}
                        min={1}
                        step={1}
                        max={300}
                        disabled={isFormDisabled}
                        className="border-b-2 border-black w-32 text-center outline-none bg-transparent font-bold text-lg mb-1 disabled:opacity-50"
                      />
                      <span className="text-[10px] text-gray-500 uppercase">
                        Hours
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
                          disabled={dateDisabled}
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

                  {/* Commutation & Memos */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
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

                    <div className="border-t border-black pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase text-blue-700">
                          CTO Memos Required
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsMemoModalOpen(true)}
                          disabled={isFormDisabled}
                          className="text-[10px] border border-blue-700 text-blue-700 px-2 py-1 hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                          Select Memos
                        </button>
                      </div>
                      {selectedMemos.length === 0 ? (
                        <div className="text-[10px] italic text-gray-500">
                          No memos attached. Required for CTO.
                        </div>
                      ) : (
                        <div className="text-[10px]">
                          {selectedMemos.map((m) => (
                            <div
                              key={m.id}
                              className="flex justify-between border-b border-dashed border-gray-300 py-1"
                            >
                              <span>{m.memoNo}</span>
                              <span className="font-bold">
                                -{m.appliedHours}h
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
                <div className="p-4 bg-blue-50/50">
                  <h3 className="text-xs font-bold uppercase mb-2 text-blue-800 flex items-center gap-1">
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
                            className="border border-blue-200 bg-white px-3 py-1.5 text-xs flex items-center gap-2 min-w-[200px]"
                          >
                            <span className="font-bold text-blue-700">
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
                className="px-8 py-2 rounded font-semibold text-sm disabled:opacity-70 disabled:cursor-not-allowed text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {isProfileLoading
                  ? "Checking Status..."
                  : !hasSignature
                    ? "Signature Required"
                    : workingDaysLoading
                      ? "Loading..."
                      : mutation.isPending
                        ? "Submitting..."
                        : successLatchUI
                          ? "Submitted"
                          : "Submit CTO Application"}
              </button>
            </div>
          </form>

          <SelectCtoMemoModal
            isOpen={isMemoModalOpen}
            onClose={() => setIsMemoModalOpen(false)}
            requestedHours={formData.requestedHours}
            memos={memoResponse?.memos || []}
            selectedMemos={selectedMemos}
            readOnly={true}
            showProgress={true}
          />
        </div>
      </SkeletonTheme>
    </div>
  );
};

export default AddOrganicCtoApplicationForm;

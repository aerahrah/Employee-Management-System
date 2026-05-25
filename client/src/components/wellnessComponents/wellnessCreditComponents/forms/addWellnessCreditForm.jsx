import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Users, CalendarDays, FileText, Calendar, X } from "lucide-react";
import Select from "react-select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { addWellnessCreditRequest } from "../../../../api/wellnessApplication";
import { fetchApprovers } from "../../../../api/cto";
import { toast } from "react-toastify";

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

const AddWellnessCreditForm = ({ onClose, onPendingChange }) => {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ Rapid-click guard
  const submitInFlightRef = useRef(false);

  // ✅ Success latch
  const successLatchRef = useRef(false);
  const [successLatchUI, setSuccessLatchUI] = useState(false);

  // UI lock
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

  const resetForm = useCallback(() => {
    setFormData(initialState);
    setMenuOpen(false);

    submitInFlightRef.current = false;
    successLatchRef.current = false;
    setSuccessLatchUI(false);
    setSubmitLockUI(false);
  }, [initialState]);

  useEffect(() => {
    return () => {
      submitInFlightRef.current = false;
      successLatchRef.current = false;
    };
  }, []);

  const {
    data: employeesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["wellnessCreditEmployees"],
    queryFn: fetchApprovers,
    enabled: menuOpen,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (menuOpen) refetch();
  }, [menuOpen, refetch]);

  const mutation = useMutation({
    mutationFn: addWellnessCreditRequest,
    retry: 0,
  });

  const busy = mutation.isPending || submitLockUI || successLatchUI;

  useEffect(() => {
    onPendingChange?.(busy);
  }, [busy, onPendingChange]);

  // Extract raw employees for filtering and display
  const rawEmployees = useMemo(() => {
    return employeesData?.data?.data || employeesData?.data || [];
  }, [employeesData]);

  // Options for react-select
  const employeeOptions = useMemo(() => {
    return rawEmployees.map((emp) => ({
      value: emp._id,
      label: `${emp.firstName} ${emp.lastName}`.trim(),
    }));
  }, [rawEmployees]);

  // ✅ Group employees for Quick Select buttons
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (busy) return;

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

  // ✅ Selection Handlers
  const handleSelectGroup = (ids) => {
    setFormData((prev) => {
      const newSet = new Set([...prev.employees, ...ids]);
      return { ...prev, employees: Array.from(newSet) };
    });
  };

  const handleClearSelection = () => {
    setFormData((prev) => ({ ...prev, employees: [] }));
  };

  const handleRemoveEmployee = (idToRemove) => {
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
      toast.error("Please select at least one employee.");
      return { ok: false };
    }

    const days = clampInt(formData.days, 0, 365);
    if (days <= 0) {
      toast.error("Please enter a valid number of days to credit.");
      return { ok: false };
    }

    const dateApproved = String(formData.dateApproved || "").trim();
    if (!dateApproved) {
      toast.error("Please select the date approved.");
      return { ok: false };
    }
    if (dateApproved > todayISO()) {
      toast.error("Date approved cannot be in the future.");
      return { ok: false };
    }

    const memoNo = String(formData.memoNo || "")
      .trim()
      .slice(0, 100);

    if (!memoNo) {
      toast.error("Please enter the memo reference.");
      return { ok: false };
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

    if (successLatchRef.current) return;
    if (submitInFlightRef.current) return;
    if (busy) return;

    submitInFlightRef.current = true;
    setSubmitLockUI(true);

    const { ok, payload } = sanitizeAndValidate();
    if (!ok) {
      submitInFlightRef.current = false;
      setSubmitLockUI(false);
      return;
    }

    try {
      await mutation.mutateAsync(payload);

      successLatchRef.current = true;
      setSuccessLatchUI(true);

      toast.success("Wellness credit added successfully");
      queryClient.invalidateQueries({ queryKey: ["wellnessCredits"] });
      queryClient.invalidateQueries({ queryKey: ["allWellnessCredits"] });

      onClose?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to submit credit request",
      );

      submitInFlightRef.current = false;
      successLatchRef.current = false;
      setSuccessLatchUI(false);
      setSubmitLockUI(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-screen">
      {/* Header */}
      <div className="px-4 py-4 border-b flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <CalendarDays className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Add Wellness Credit
          </h2>
          <p className="text-xs text-gray-500">Assign Wellness Leave Credits</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="px-4 py-5 space-y-7 overflow-y-auto custom-scrollbar flex-1">
          {/* Employees Selection Block */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              Select Employees
            </div>

            {/* Quick Select Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">
                Quick Select:
              </span>
              <button
                type="button"
                onClick={() => handleSelectGroup(organicIds)}
                disabled={busy || organicIds.length === 0}
                className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                Organic ({organicIds.length})
              </button>
              <button
                type="button"
                onClick={() => handleSelectGroup(joIds)}
                disabled={busy || joIds.length === 0}
                className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                Job Order ({joIds.length})
              </button>
            </div>

            {/* Dropdown - Strictly for Searching & Adding */}
            <Select
              options={employeeOptions}
              isMulti
              controlShouldRenderValue={false} // ✅ Hides selected items from the input box
              hideSelectedOptions={true} // ✅ Removes selected items from the dropdown list
              closeMenuOnSelect={false} // ✅ Keeps dropdown open to click multiple people rapidly
              isLoading={isLoading}
              isDisabled={busy}
              maxMenuHeight={250}
              value={employeeOptions.filter((o) =>
                (formData.employees || []).includes(o.value),
              )}
              onChange={(selected) =>
                setFormData((p) => ({
                  ...p,
                  employees: selected ? selected.map((s) => s.value) : [],
                }))
              }
              onMenuOpen={() => setMenuOpen(true)}
              placeholder="Search and add employees..."
              classNames={{
                control: ({ isFocused }) =>
                  `min-h-[42px] rounded-lg border ${
                    isFocused
                      ? "border-blue-500 ring-1 ring-blue-200"
                      : "border-gray-300"
                  } ${busy ? "opacity-70" : ""}`,
                menuList: () => "custom-scrollbar",
                option: ({ isFocused, isSelected }) =>
                  `${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : isFocused
                        ? "bg-gray-100"
                        : "bg-white"
                  } px-3 py-2 cursor-pointer`,
              }}
            />

            {/* ✅ SEPARATE SELECTED EMPLOYEES BLOCK */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 shrink-0">
                <span className="text-xs font-semibold text-gray-700">
                  Selected Employees ({formData.employees.length})
                </span>
                {formData.employees.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    disabled={busy}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold disabled:opacity-50"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Fixed height scrollable area for selected chips */}
              <div className="max-h-[200px] overflow-y-auto p-2 custom-scrollbar bg-white flex flex-wrap gap-2 content-start">
                {formData.employees.length === 0 ? (
                  <div className="text-xs text-gray-400 p-2 text-center w-full italic">
                    No employees selected. Use the search bar or quick select
                    above.
                  </div>
                ) : (
                  formData.employees.map((empId) => {
                    const emp = rawEmployees.find((e) => e._id === empId);
                    if (!emp) return null;
                    return (
                      <div
                        key={empId}
                        className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2 py-1 rounded-md"
                      >
                        <span className="font-medium whitespace-nowrap">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRemoveEmployee(empId)}
                          className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
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

          <hr className="border-gray-100" />

          {/* Duration & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-gray-600" />
                </div>
                Credited Days
              </div>

              <div className="flex gap-3">
                <input
                  type="number"
                  name="days"
                  placeholder="Days"
                  min="1"
                  value={formData.days}
                  onChange={handleChange}
                  disabled={busy}
                  className="w-full h-10 px-3 border-neutral-400 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-gray-600" />
                </div>
                Date Approved
              </div>

              <input
                type="date"
                name="dateApproved"
                value={formData.dateApproved}
                onChange={handleChange}
                max={todayISO()}
                disabled={busy}
                className="w-full h-10 px-3 border-neutral-400 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Memo No */}

          <div className="h-4" />
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white/95 backdrop-blur px-4 py-3 shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (!successLatchRef.current && !mutation.isPending)
                  resetForm();
                onClose?.();
              }}
              disabled={busy}
              className={`w-full px-4 py-2 rounded border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 cursor-pointer ${
                busy ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              Close
            </button>

            <button
              type="submit"
              disabled={busy}
              className={`w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer ${
                busy ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {mutation.isPending
                ? "Saving..."
                : successLatchUI
                  ? "Saved"
                  : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddWellnessCreditForm;

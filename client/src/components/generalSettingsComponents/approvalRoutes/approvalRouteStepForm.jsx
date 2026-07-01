import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../store/authStore";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchAllApprovalRoutes,
  upsertMyApprovalRoute,
  // ✅ IMPORTANT: Make sure to export this function from your API file
  fetchApprovalRoles,
} from "../../../api/approvalRoute";
import { fetchApprovers } from "../../../api/cto";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { FileSignature, Route as RouteIcon, ArrowLeft } from "lucide-react";
import Select, { components } from "react-select";

import Breadcrumbs from "../../breadCrumbs";

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

// ✅ Custom Input component to enforce maxLength on the react-select search bar
const CustomInput = (props) => {
  return <components.Input {...props} maxLength={100} />;
};

// ✅ Helper function to capitalize the first letter of each word
const capitalizeName = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

const ApprovalRouteStepForm = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { approverId } = useParams();

  const isEditing = Boolean(approverId && approverId !== "new");

  const { admin } = useAuth();
  const currentUserId = admin?.id || admin?._id;

  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useResolvedTheme(prefTheme);

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.07)"
      : "rgba(15,23,42,0.10)";
  }, [resolvedTheme]);

  const skeletonColors = useMemo(() => {
    return {
      baseColor:
        resolvedTheme === "dark"
          ? "rgba(255,255,255,0.06)"
          : "rgba(15,23,42,0.06)",
      highlightColor:
        resolvedTheme === "dark"
          ? "rgba(255,255,255,0.10)"
          : "rgba(15,23,42,0.10)",
    };
  }, [resolvedTheme]);

  // Form State
  const [modalData, setModalData] = useState({
    approver: "",
    role: "", // Will be defaulted to the first fetched role
  });

  // Submit lock to prevent double-clicks
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Routes
  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ["approvalRoutes"],
    queryFn: fetchAllApprovalRoutes,
  });

  // Fetch Approvers
  const { data: approversRaw = [], isLoading: approversLoading } = useQuery({
    queryKey: ["approvers"],
    queryFn: fetchApprovers,
  });

  // Fetch Dynamic Roles
  const { data: rolesRaw, isLoading: rolesLoading } = useQuery({
    queryKey: ["approvalRoles"],
    queryFn: fetchApprovalRoles,
  });

  // Safely map dynamic roles from backend
  const normalizedRoles = useMemo(() => {
    const list = Array.isArray(rolesRaw?.data)
      ? rolesRaw.data
      : Array.isArray(rolesRaw)
        ? rolesRaw
        : [];

    return list.map((r) => ({
      id: r.value || r.id || r.name || r, // Handles object or simple string array
      label: r.label || r.name || r.value || r.id || String(r),
      desc: r.description || r.desc || "Assigned approval role.",
    }));
  }, [rolesRaw]);

  // Calculate the current active steps for this user
  const myRoute = useMemo(() => {
    return routes.find(
      (r) => String(r.createdBy?._id || r.createdBy) === String(currentUserId),
    );
  }, [routes, currentUserId]);

  const steps = useMemo(() => {
    if (!myRoute) return [];
    return myRoute.steps.map((s) => ({
      id: Math.random().toString(36).substr(2, 9),
      level: s.level,
      approver: String(s.approver?._id || s.approver),
      role: s.role || "",
      isEnabled: s.isEnabled !== false,
    }));
  }, [myRoute]);

  // Populate form if we are editing an existing step, OR default the role if new
  useEffect(() => {
    if (isEditing && steps.length > 0) {
      const stepToEdit = steps.find((s) => s.approver === approverId);
      if (stepToEdit) {
        setModalData({
          approver: stepToEdit.approver,
          role: stepToEdit.role || "",
        });
      }
    } else if (!isEditing && normalizedRoles.length > 0 && !modalData.role) {
      // Default to the first available dynamic role
      setModalData((p) => ({ ...p, role: normalizedRoles[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, approverId, steps.length, normalizedRoles.length]);

  const approverOptions = useMemo(() => {
    const list = Array.isArray(approversRaw?.data?.data)
      ? approversRaw.data.data
      : Array.isArray(approversRaw?.data)
        ? approversRaw.data
        : Array.isArray(approversRaw)
          ? approversRaw
          : [];

    return (
      list
        .filter((emp) => emp?._id && (emp?.firstName || emp?.lastName))
        .map((emp) => {
          const empId = String(emp._id);

          // Prevent selecting someone who is already in another step
          const isAlreadySelected = steps.some(
            (s) => s.approver === empId && s.approver !== approverId,
          );

          // ✅ Format each part with capitalization
          const prefix = capitalizeName(emp.prefix);
          const firstName = capitalizeName(emp.firstName);
          const lastName = capitalizeName(emp.lastName);
          // Fallback for extension/suffix depending on backend key naming
          const extension = capitalizeName(emp.extension || emp.suffix);

          // Combine all available parts, filter out empties, and join with a space
          const middleInitial = emp.middleName
            ? `${emp.middleName.trim().charAt(0).toUpperCase()}.`
            : "";

          const fullName = [
            prefix,
            firstName,
            middleInitial,
            lastName,
            extension,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

          return {
            value: empId,
            label: fullName,
            email: emp.email || "",
            position: emp.position || emp.designation?.name || "Staff",
            isDisabled: isAlreadySelected,
          };
        })
        // ✅ Automatically sorts alphabetically based on the newly formatted full name
        .sort((a, b) => a.label.localeCompare(b.label))
    );
  }, [approversRaw, steps, approverId]);

  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        border: `1px solid ${borderColor}`,
        borderRadius: "0.5rem",
        backgroundColor: "var(--app-surface-2)",
        boxShadow: state.isFocused ? "0 0 0 2px var(--accent-soft)" : "none",
        minHeight: "44px",
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? "var(--accent-soft)" : "transparent",
        color: state.isDisabled ? "var(--app-muted)" : "var(--app-text)",
        cursor: state.isDisabled ? "not-allowed" : "pointer",
        opacity: state.isDisabled ? 0.5 : 1,
      }),
      singleValue: (base) => ({
        ...base,
        color: "var(--app-text)",
        fontWeight: "600",
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: "var(--app-surface)",
        border: `1px solid ${borderColor}`,
        zIndex: 9999,
      }),
    }),
    [borderColor],
  );

  const mutation = useMutation({
    mutationFn: (payload) => upsertMyApprovalRoute(payload),
  });

  const reindexSteps = (rawSteps) =>
    rawSteps.map((s, i) => ({ ...s, level: i + 1 }));

  const handleSave = (createAnother = false) => {
    if (isSubmitting || mutation.isPending) return;
    setIsSubmitting(true);

    if (!modalData.approver) {
      toast.error("Please select a designated approver.");
      setIsSubmitting(false);
      return;
    }

    if (!modalData.role) {
      toast.error("Please select a role assignment.");
      setIsSubmitting(false);
      return;
    }

    const isDuplicateApprover = steps.some(
      (s) => s.approver === modalData.approver && s.approver !== approverId,
    );

    if (isDuplicateApprover) {
      toast.error("This approver is already assigned to another step.");
      setIsSubmitting(false);
      return;
    }

    // Enforce Role Uniqueness: Check if the role is already used in this workflow by someone else
    const isDuplicateRole = steps.some(
      (s) => s.role === modalData.role && s.approver !== approverId,
    );

    if (isDuplicateRole) {
      toast.error(
        "This role is already assigned to another step. Each role can only be used once.",
      );
      setIsSubmitting(false);
      return;
    }

    let newSteps;
    if (isEditing) {
      newSteps = steps.map((s) =>
        s.approver === approverId ? { ...s, ...modalData } : s,
      );
    } else {
      newSteps = [
        ...steps,
        {
          id: Date.now().toString(),
          level: steps.length + 1,
          isEnabled: true,
          ...modalData,
        },
      ];
    }

    const finalSteps = reindexSteps(newSteps);

    const payload = {
      name: `${admin?.firstName || "Personal"}'s Workflow`,
      isPublic: false,
      steps: finalSteps.map((s) => ({
        level: s.level,
        approver: s.approver,
        role: s.role || "",
        isEnabled: s.isEnabled !== false,
      })),
    };

    mutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["approvalRoutes"] });
        toast.success(
          isEditing ? "Step updated successfully!" : "Step added successfully!",
        );

        if (createAnother) {
          // Reset form to stay on the page and create a new one
          setModalData({
            approver: "",
            role: normalizedRoles.length > 0 ? normalizedRoles[0].id : "",
          });
          setIsSubmitting(false);
        } else {
          // Navigate back (lock automatically clears on unmount)
          setIsSubmitting(false);
          navigate("/app/approval-routes");
        }
      },
      onError: (err) => {
        toast.error(err?.message || "Failed to save workflow");
        setIsSubmitting(false);
      },
    });
  };

  const isBusy = mutation.isPending || isSubmitting;

  // Determine current sequence level for UI
  const displayLevel = useMemo(() => {
    if (isEditing) {
      const existing = steps.find((s) => s.approver === approverId);
      return existing ? existing.level : steps.length + 1;
    }
    return steps.length + 1;
  }, [isEditing, steps, approverId]);

  if (routesLoading || approversLoading || rolesLoading) {
    return (
      <div
        className="w-full h-full p-8"
        style={{ backgroundColor: "var(--app-bg)" }}
      >
        <SkeletonTheme
          baseColor={skeletonColors.baseColor}
          highlightColor={skeletonColors.highlightColor}
        >
          <Skeleton height={30} width={200} className="mb-6" />
          <Skeleton height={400} borderRadius={16} />
        </SkeletonTheme>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-screen flex flex-col transition-colors duration-300 ease-out cto-scrollbar"
      style={{
        backgroundColor: "var(--app-bg, rgba(245,245,245,0.80))",
        color: "var(--app-text, #0f172a)",
      }}
    >
      <div className="pt-2 pb-6 px-4 max-w-6xl w-full">
        {/* Header */}
        <div className="flex flex-col mb-6">
          <Breadcrumbs rootLabel="home" rootTo="/app" />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => {
                if (isBusy) return;
                navigate("/app/approval-routes");
              }}
              disabled={isBusy}
              className="p-2 rounded-lg border transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor,
                color: "var(--app-muted)",
              }}
              onMouseEnter={(e) => {
                if (isBusy) return;
                e.currentTarget.style.backgroundColor = "var(--app-surface-2)";
              }}
              onMouseLeave={(e) => {
                if (isBusy) return;
                e.currentTarget.style.backgroundColor = "var(--app-surface)";
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight font-sans"
              style={{ color: "var(--app-text)" }}
            >
              {isEditing ? "Edit Step Configuration" : "Add Routing Step"}
            </h1>
          </div>
          <p
            className="text-sm mt-1 ml-11 max-w-2xl"
            style={{ color: "var(--app-muted)" }}
          >
            Select an approver and map their signature role.
          </p>
        </div>

        {/* Card Body */}
        <div
          className="rounded-2xl border shadow-sm overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: "var(--app-surface)", borderColor }}
        >
          <div className="p-6 space-y-8">
            {/* Core Config */}
            <div
              className="rounded-xl border p-5 shadow-sm"
              style={{ backgroundColor: "var(--app-surface-2)", borderColor }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: "var(--app-muted)" }}
                  >
                    <RouteIcon size={14} /> Sequence Level
                  </label>
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
                    style={{
                      backgroundColor: "var(--app-surface)",
                      borderColor,
                    }}
                  >
                    <span className="text-sm font-medium opacity-50 text-[color:var(--app-text)]">
                      Level
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "var(--accent)" }}
                    >
                      {displayLevel}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--app-muted)" }}
                  >
                    Approver <span className="text-red-500">*</span>
                  </label>
                  <Select
                    components={{ Input: CustomInput }}
                    options={approverOptions}
                    value={
                      approverOptions.find(
                        (o) => o.value === modalData.approver,
                      ) || null
                    }
                    onChange={(v) =>
                      setModalData((p) => ({ ...p, approver: v?.value }))
                    }
                    styles={selectStyles}
                    placeholder="Search an approver..."
                    isOptionDisabled={(option) => option.isDisabled || isBusy}
                    isDisabled={isBusy}
                  />
                </div>
              </div>
            </div>

            {/* Role Assignments */}
            <div>
              <div className="mb-4">
                <h3
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: "var(--app-text)" }}
                >
                  <FileSignature size={16} style={{ color: "var(--accent)" }} />{" "}
                  Role Assignments
                </h3>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: "var(--app-muted)" }}
                >
                  Select the authority assigned to this step. This controls form
                  validation and PDF signature mapping.
                </p>
              </div>

              {normalizedRoles.length === 0 ? (
                <div
                  className="p-4 rounded-xl border text-center text-sm font-medium"
                  style={{
                    borderColor,
                    color: "var(--app-muted)",
                    backgroundColor: "var(--app-surface-2)",
                  }}
                >
                  No roles available from the server.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {normalizedRoles.map((role) => {
                    const isSelected = modalData.role === role.id;

                    // Disable the role option visually if it is already taken by another step
                    const isRoleTaken = steps.some(
                      (s) => s.role === role.id && s.approver !== approverId,
                    );

                    return (
                      <div
                        key={role.id}
                        onClick={() => {
                          if (isBusy || isRoleTaken) return;
                          setModalData((p) => ({ ...p, role: role.id }));
                        }}
                        className={`flex gap-3 p-3.5 rounded-xl border transition-all ${
                          isBusy || isRoleTaken
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? "var(--accent-soft)"
                            : "var(--app-surface-2)",
                          borderColor: isSelected
                            ? "var(--accent)"
                            : borderColor,
                        }}
                      >
                        <div className="pt-0.5">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-[color:var(--accent)]"
                                : "border-[color:var(--app-muted)]"
                            }`}
                          >
                            {isSelected && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: "var(--accent)" }}
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <p
                            className="text-sm font-bold"
                            style={{
                              color: isSelected
                                ? "var(--accent)"
                                : "var(--app-text)",
                            }}
                          >
                            {role.label} {isRoleTaken && "(Already Assigned)"}
                          </p>
                          <p
                            className="text-[11px] mt-1 leading-relaxed"
                            style={{ color: "var(--app-muted)" }}
                          >
                            {role.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="p-5 border-t flex flex-col sm:flex-row justify-end gap-3 transition-colors duration-300"
            style={{ backgroundColor: "var(--app-surface-2)", borderColor }}
          >
            <button
              onClick={() => navigate("/app/approval-routes")}
              disabled={isBusy}
              className="px-5 py-2.5 rounded-xl font-bold border transition-colors w-full sm:w-auto disabled:opacity-50"
              style={{
                borderColor,
                backgroundColor: "var(--app-surface)",
                color: "var(--app-text)",
              }}
              onMouseEnter={(e) => {
                if (isBusy) return;
                e.currentTarget.style.backgroundColor = "var(--app-surface-2)";
              }}
              onMouseLeave={(e) => {
                if (isBusy) return;
                e.currentTarget.style.backgroundColor = "var(--app-surface)";
              }}
            >
              Cancel
            </button>

            {!isEditing && (
              <button
                onClick={() => handleSave(true)}
                disabled={isBusy}
                className="px-6 py-2.5 rounded-xl font-bold border transition-all w-full sm:w-auto disabled:opacity-60 disabled:hover:scale-100"
                style={{
                  backgroundColor: "transparent",
                  borderColor: "var(--accent)",
                  color: "var(--accent)",
                }}
                onMouseEnter={(e) => {
                  if (!isBusy)
                    e.currentTarget.style.backgroundColor =
                      "var(--accent-soft)";
                }}
                onMouseLeave={(e) => {
                  if (!isBusy)
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {isBusy ? "Saving..." : "Add & Create Another"}
              </button>
            )}

            <button
              onClick={() => handleSave(false)}
              disabled={isBusy}
              className="px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto disabled:opacity-60 disabled:hover:scale-100"
              style={{
                backgroundColor: "var(--accent)",
                border: "1px solid var(--accent)",
              }}
            >
              {isBusy ? "Saving..." : isEditing ? "Update Step" : "Add Step"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalRouteStepForm;

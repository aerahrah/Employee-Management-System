// RevocationPlaceholder.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Undo,
  MousePointerClick,
  Filter,
  CheckCircle2,
  MessageSquare,
  History,
  Search,
} from "lucide-react";
import { useAuth } from "../../store/authStore";
import ThemeSync from "../themeSync";
import ScrollbarsSync from "../../components/scrollbarSync";

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

const RevocationPlaceholder = ({
  title = "No Revocation Request Selected",
  description = "Pick a revocation request from the list to review the employee's reason, verify evidence, and process credit refunds.",
  bullets = [
    { icon: MessageSquare, label: "Employee reason & attached evidence" },
    { icon: Undo, label: "Refund CTO hours or Wellness days" },
    { icon: History, label: "Original approval timeline & memos" },
  ],
  tips = [
    { icon: MousePointerClick, label: "Select a request on the left panel" },
    { icon: CheckCircle2, label: "Approving automatically restores credits" },
    { icon: Filter, label: "Use tabs to filter by Pending or Revoked" },
  ],
  className = "",
}) => {
  const prefTheme = useAuth((s) => s.preferences?.theme || "system");
  const resolvedTheme = useResolvedTheme(prefTheme);

  const borderColor = useMemo(() => {
    return resolvedTheme === "dark"
      ? "rgba(255,255,255,0.07)"
      : "rgba(15,23,42,0.10)";
  }, [resolvedTheme]);

  // Using a purple tint for revocation to match the REVOCATION_REQUESTED status
  const decoA =
    resolvedTheme === "dark"
      ? "rgba(168,85,247,0.15)"
      : "rgba(168,85,247,0.08)";
  const decoB =
    resolvedTheme === "dark" ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.06)";
  const gridDot =
    resolvedTheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
    <div
      className={[
        "relative h-full w-full min-h-[440px] overflow-hidden rounded-xl shadow-md",
        "border",
        className,
      ].join(" ")}
      style={{
        backgroundColor: "var(--app-surface)",
        borderColor: borderColor,
        color: "var(--app-text)",
      }}
    >
      <ThemeSync />
      <ScrollbarsSync />

      {/* Decorative background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundColor: decoA }}
        />
        <div
          className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundColor: decoB }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${gridDot} 1px, transparent 0)`,
            backgroundSize: "18px 18px",
            opacity: 0.6,
          }}
        />
      </div>

      <div className="relative flex h-full w-full flex-col items-center justify-center px-6 py-10 text-center">
        {/* Icon */}
        <div className="group relative mb-6">
          <div
            className="absolute inset-0 rounded-3xl blur-xl transition-opacity group-hover:opacity-80"
            style={{ backgroundColor: "rgba(168,85,247,0.18)" }}
          />
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-3xl backdrop-blur border shadow-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderColor: borderColor,
            }}
          >
            <div
              className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-2xl shadow-md ring-4"
              style={{
                backgroundColor: "#9333ea", // Purple to match revocation theme
                color: "#fff",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                outline: "none",
              }}
            >
              <Search className="h-4 w-4 text-white" />
            </div>

            <Undo
              className="h-9 w-9 transition-colors"
              style={{ color: "var(--app-muted)" }}
            />
          </div>
        </div>

        {/* Title + description */}
        <h3
          className="text-lg sm:text-xl font-black"
          style={{ color: "var(--app-text)" }}
        >
          {title}
        </h3>
        <p
          className="mt-2 max-w-md text-sm leading-relaxed"
          style={{ color: "var(--app-muted)" }}
        >
          {description}
        </p>

        {/* What you'll see */}
        <div className="mt-7 w-full max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {bullets.map((b, idx) => {
              const Icon = b.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderColor: borderColor,
                  }}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl flex-none border"
                    style={{
                      backgroundColor: "rgba(168,85,247,0.12)",
                      color: "#9333ea",
                      borderColor: "rgba(168,85,247,0.20)",
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p
                    className="text-xs font-bold leading-snug"
                    style={{ color: "var(--app-text)" }}
                  >
                    {b.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick tips */}
        <div
          className="mt-6 w-full max-w-xl rounded-2xl border px-4 py-4 shadow-sm backdrop-blur"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            borderColor: borderColor,
          }}
        >
          <div
            className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
            style={{ color: "var(--app-muted)" }}
          >
            <span
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: "var(--app-border)" }}
            />
            Helpful tips
            <span
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: "var(--app-border)" }}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {tips.map((t, idx) => {
              const Icon = t.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-xl border px-3 py-2 text-left"
                  style={{
                    backgroundColor: "var(--app-surface-2)",
                    borderColor: "rgba(255,255,255,0.00)",
                  }}
                >
                  <Icon
                    className="h-4 w-4 mt-0.5 flex-none"
                    style={{ color: "var(--app-muted)" }}
                  />
                  <p
                    className="text-[11px] font-semibold leading-snug"
                    style={{ color: "var(--app-muted)" }}
                  >
                    {t.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-[11px]" style={{ color: "var(--app-muted)" }}>
          Select a request to unlock approve/reject actions and view full
          details.
        </p>
      </div>
    </div>
  );
};

export default RevocationPlaceholder;

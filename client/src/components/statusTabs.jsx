import React from "react";

const StatusTabs = ({ tabs = [], activeStatus, onStatusChange }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = activeStatus === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id || "all-status"}
            onClick={() => onStatusChange(tab.id)}
            className={`px-1.5  py-1.5 text-xs font-bold rounded-full border transition-colors duration-200 ease-out whitespace-nowrap flex items-center gap-0.5
              ${
                isActive
                  ? tab.activeColor // Parent passes the active Tailwind classes here
                  : "bg-[color:var(--app-surface)] text-[color:var(--app-muted)] border-[color:var(--app-border)] hover:bg-[color:var(--app-surface-2)]"
              }`}
            aria-pressed={isActive}
            type="button"
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors duration-200 ease-out"
              style={{
                backgroundColor: isActive
                  ? "var(--app-surface)"
                  : "var(--app-surface-2)",
                color: isActive ? "var(--app-text)" : "var(--app-muted)",
              }}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default StatusTabs;

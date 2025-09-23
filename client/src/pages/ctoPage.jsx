import { useState } from "react";
import CtoCredits from "../components/ctoComponents/ctoCredits";

const CtoPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Define all tabs in one place
  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "credit", label: "Credit CTO" },
    { key: "apply", label: "Apply CTO Leave" },
    { key: "approvals", label: "Pending Approvals" },
    { key: "records", label: "All CTO Records" },
  ];

  return (
    <div className="pt-26 w-full bg-neutral-200 flex gap-4 p-6">
      <div className="min-h-136 w-full">
        <div className="flex gap-4 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 rounded-sm font-medium ${
                activeTab === tab.key
                  ? "bg-neutral-800 text-white"
                  : "bg-white border text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className=" rounded-lg">
          {activeTab === "dashboard" && <p>📊 Dashboard content here</p>}
          {activeTab === "credit" && <CtoCredits />}
          {activeTab === "apply" && <p>📝 Apply CTO Leave form here</p>}
          {activeTab === "approvals" && <p>✅ Pending Approvals list here</p>}
          {activeTab === "records" && <p>✅ Pending Approvals list here</p>}
        </div>
      </div>
    </div>
  );
};

export default CtoPage;

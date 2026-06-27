import React, { useMemo } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { X } from "lucide-react";
import Modal from "../../modal";
import WellnessLeavePdf from "./wellnessApplicationPDF";

export default function WellnessLeavePdfModal({ app, isOpen, onClose }) {
  const fileName = useMemo(() => {
    const ref = app?._id ? app._id.slice(-6).toUpperCase() : "DRAFT";
    return `Wellness_Leave_Application_${ref}.pdf`;
  }, [app]);

  if (!isOpen || !app) return null;

  console.log(app);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={null}
      showFooter={false}
      maxWidth="max-w-5xl"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pl-1">
        <h2
          className="text-lg md:text-xl font-bold transition-colors duration-300 ease-out truncate pr-4"
          style={{ color: "var(--app-text, #0f172a)" }}
        >
          Wellness Leave Application PDF
        </h2>

        {/* Modern Circular Close Button */}
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ease-out flex-shrink-0 border shadow-sm"
          style={{
            backgroundColor: "var(--app-surface-2, #f3f4f6)",
            color: "var(--app-text, #2a0f0f)",
            borderColor: "var(--app-border, #e2e8f0)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = "brightness(0.92)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "none";
            e.currentTarget.style.transform = "scale(1)";
          }}
          aria-label="Close PDF viewer"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* PDF Viewer */}
      <div
        className="w-full h-[75vh] sm:h-[85vh] rounded-xl overflow-hidden border transition-colors duration-300 ease-out"
        style={{ borderColor: "var(--app-border, #e2e8f0)" }}
      >
        <PDFViewer
          width="100%"
          height="100%"
          className="border-none"
          showToolbar
        >
          <WellnessLeavePdf app={app} />
        </PDFViewer>
      </div>
    </Modal>
  );
}

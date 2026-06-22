import React, { useMemo } from "react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import Modal from "../../modal"; // Adjust this path if necessary
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
      title="Wellness Leave Application PDF"
      maxWidth="max-w-4xl"
    >
      <div className="w-full">
        {/* <div className="flex items-center justify-end gap-2 mb-3">
          <PDFDownloadLink
            document={<WellnessLeavePdf app={app} />}
            fileName={fileName}
          >
            {({ loading }) => (
              <button
                type="button"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 disabled:opacity-50"
              >
                {loading ? "Preparing PDF..." : "Download PDF"}
              </button>
            )}
          </PDFDownloadLink>
        </div> */}

        <div className="w-full h-[70vh] border border-gray-200 rounded-lg overflow-hidden bg-white">
          <PDFViewer style={{ width: "100%", height: "100%" }} showToolbar>
            <WellnessLeavePdf app={app} />
          </PDFViewer>
        </div>
      </div>
    </Modal>
  );
}

import React from "react";
import Modal from "../../modal"; // Adjust path to your Modal component
import { PDFViewer } from "@react-pdf/renderer";
import OrganicApplicationPdf from "./organicApplicationPDF"; // Your PDF layout component from the previous step

const OrganicApplicationPdfModal = ({ app, isOpen, onClose }) => {
  if (!isOpen || !app) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`CSC Form 6 - ${app.employee?.lastName || "Application"}`}
      maxWidth="max-w-5xl"
    >
      <div className="w-full h-[75vh] sm:h-[85vh] rounded-xl overflow-hidden border border-slate-200">
        <PDFViewer width="100%" height="100%" className="border-none">
          <OrganicApplicationPdf
            app={app}
            logoSrc="/public/logo_dict.png" // Adjust logo path if needed
          />
        </PDFViewer>
      </div>
    </Modal>
  );
};

export default OrganicApplicationPdfModal;

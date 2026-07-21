import React, { useState, useEffect } from "react";
import Modal from "../../components/modal";
import { Info, Undo, UploadCloud, X, FileText } from "lucide-react";
import { toast } from "react-toastify";

const RevokeRequestModal = ({
  isOpen,
  onClose,
  app,
  onSubmit,
  isBusy,
  isAttachmentRequired,
  borderColor = "rgba(15,23,42,0.10)",
}) => {
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setFile(null);
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      // 1. Validate file type
      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Invalid file type. Please upload a PDF, JPG, or PNG.");
        e.target.value = null; // Reset input
        return;
      }

      // 2. Validate file size (Max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (selectedFile.size > maxSize) {
        toast.error("File is too large. Maximum size is 5MB.");
        e.target.value = null; // Reset input
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleClearFile = () => setFile(null);

  const handleSubmitClick = () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the revocation.");
      return;
    }

    // Strict check if attachment is required by global settings
    if (isAttachmentRequired && !file) {
      toast.error(
        "An attachment (e.g., Memo or Medical Certificate) is required by HR.",
      );
      return;
    }

    // Pass data back to the parent component.
    // The parent's mutation will handle the actual server upload before submitting the final request.
    onSubmit({ reason, file });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Revocation"
      maxWidth="max-w-lg"
      preventCloseWhenBusy={true}
      isBusy={isBusy}
      action={{
        show: true,
        variant: "primary",
        label: isBusy ? "Submitting..." : "Submit Request",
        onClick: handleSubmitClick,
        // Disable button if busy, reason is empty, or if file is required but missing
        disabled: isBusy || !reason.trim() || (isAttachmentRequired && !file),
      }}
    >
      <div className="p-2 space-y-4" style={{ color: "var(--app-text)" }}>
        {/* Header Strip */}
        <div
          className="flex items-start gap-3 p-3 rounded-xl border"
          style={{
            backgroundColor: "var(--app-surface-2)",
            borderColor: borderColor,
          }}
        >
          <div
            className="mt-0.5 p-1.5 rounded-lg border shadow-sm flex-none"
            style={{
              backgroundColor: "var(--app-surface)",
              borderColor: borderColor,
              color: "var(--app-muted)",
            }}
          >
            <Info size={16} />
          </div>
          <div className="min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--app-muted)" }}
            >
              Revoking Approved Request
            </p>
            <p
              className="text-sm font-bold break-words truncate"
              style={{ color: "var(--app-text)" }}
            >
              Ref: {app?._id ? `#${app._id.slice(-6).toUpperCase()}` : "-"}
            </p>
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-bold">
            <Undo size={16} style={{ color: "var(--accent)" }} />
            Reason for Revocation <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isBusy}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you need to revoke this approved leave..."
            className="w-full rounded-xl border p-3 text-sm outline-none transition-colors duration-200 min-h-[100px]"
            style={{
              backgroundColor: "var(--app-surface)",
              borderColor: borderColor,
              color: "var(--app-text)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = borderColor)}
          />
        </div>

        {/* File Upload Section */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-bold">
            <UploadCloud size={16} style={{ color: "var(--app-muted)" }} />
            Supporting Document
            {isAttachmentRequired ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-[10px] font-normal text-gray-400 ml-1">
                (Optional)
              </span>
            )}
          </label>

          {!file ? (
            <div
              className="relative w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                borderColor: borderColor,
                backgroundColor: "var(--app-surface-2)",
              }}
            >
              <input
                type="file"
                disabled={isBusy}
                accept=".pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <UploadCloud
                size={24}
                style={{ color: "var(--app-muted)" }}
                className="mb-2"
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--app-text)" }}
              >
                Click or drag file here
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--app-muted)" }}>
                PDF, JPG, PNG (Max 5MB)
              </p>
            </div>
          ) : (
            <div
              className="flex items-center justify-between p-3 rounded-xl border"
              style={{
                backgroundColor: "var(--app-surface)",
                borderColor: borderColor,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: "var(--app-surface-2)" }}
                >
                  <FileText size={16} style={{ color: "var(--accent)" }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--app-text)" }}
                  >
                    {file.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearFile}
                disabled={isBusy}
                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <p
          className="text-xs italic mt-2"
          style={{ color: "var(--app-muted)" }}
        >
          Note: Submitting this will change the status to "Revocation
          Requested". HR will review the request before updating your balances.
        </p>
      </div>
    </Modal>
  );
};

export default RevokeRequestModal;

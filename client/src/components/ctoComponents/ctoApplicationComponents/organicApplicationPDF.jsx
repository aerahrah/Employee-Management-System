import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// ✅ Import your buildApiUrl utility so the PDF can construct absolute URLs for the signatures
import { buildApiUrl } from "../../../config/env";

/* =========================
   Helpers
========================= */
function fmtDateLong(d) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatInclusiveDates(dates) {
  if (!Array.isArray(dates) || dates.length === 0) return "";
  const sorted = dates
    .map((x) => new Date(x))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (sorted.length === 0) return "";
  if (sorted.length === 1) return fmtDateLong(sorted[0]);

  return `${fmtDateLong(sorted[0])} to ${fmtDateLong(sorted[sorted.length - 1])}`;
}

// ✅ Safe URL Wrapper to prevent Buffer errors on relative signature paths
function safeImageUrl(url) {
  if (!url) return null;
  // If it's already an absolute HTTP URL, return it. Otherwise, prepend backend URL.
  return url.startsWith("http") ? url : buildApiUrl(url);
}

/* =========================
   Styles
========================= */
const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    fontFamily: "Helvetica",
  },

  /* --- Header --- */
  headerWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerLogoArea: {
    flexDirection: "row",
    alignItems: "center",
    width: "70%",
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: "#eee",
    marginRight: 10,
  },
  stampBox: {
    width: 100,
    height: 35,
    borderWidth: 1,
    borderColor: "#000",
    padding: 2,
  },
  stampText: {
    fontSize: 6,
    textAlign: "center",
  },
  formTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 5,
  },

  /* --- Grid System --- */
  formBorder: {
    borderWidth: 1,
    borderColor: "#000",
    width: "100%",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  colRightBorder: {
    borderRightWidth: 1,
    borderRightColor: "#000",
  },

  /* --- Cell Padding & Text --- */
  labelTitle: {
    fontSize: 8,
    fontFamily: "Helvetica",
  },
  valueText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingVertical: 3,
    backgroundColor: "#f4f4f4",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },

  /* --- Custom Underlines --- */
  inputUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    minHeight: 12,
    justifyContent: "flex-end",
    paddingBottom: 1,
    flex: 1,
    marginLeft: 5,
  },
  inputUnderlineCenter: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    minHeight: 12,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 1,
    paddingHorizontal: 5,
  },

  /* --- Checkboxes --- */
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 4,
    marginTop: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  checkMark: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  cbLabel: {
    fontSize: 8,
    flex: 1,
  },
  cbLaw: {
    fontSize: 6,
    fontFamily: "Helvetica",
  },

  /* --- Tables inside cells --- */
  innerTable: {
    borderWidth: 1,
    borderColor: "#000",
    marginTop: 5,
  },
  innerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  innerHeaderCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 2,
    alignItems: "center",
  },
  innerCellLabel: {
    flex: 1.5,
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 2,
    fontFamily: "Helvetica-Oblique",
    fontSize: 7,
  },

  /* --- Signatures --- */
  sigBlock: {
    alignItems: "center",
    marginTop: 15,
  },
  sigLine: {
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    width: "80%",
    minHeight: 15,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sigName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 2,
  },
  sigRole: {
    fontSize: 8,
    marginTop: 2,
    textAlign: "center",
  },
  digitalSigInfo: {
    fontSize: 5,
    position: "absolute",
    right: 10,
    bottom: 12,
    textAlign: "right",
  },
  applicantSignature: {
    height: 35,
    width: 120,
    objectFit: "contain",
    position: "absolute",
    bottom: 2,
  },
  approverSignatureAbove: {
    height: 35,
    width: 120,
    objectFit: "contain",
    position: "absolute",
    bottom: 12,
  },
  approverInitialBeside: {
    height: 20,
    width: 40,
    objectFit: "contain",
    marginRight: 4,
    marginBottom: -2,
  },
});

/* =========================
   Sub-components
========================= */
const CheckboxItem = ({ label, law, checked }) => (
  <View style={styles.checkboxRow}>
    <View style={styles.checkbox}>
      <Text style={styles.checkMark}>{checked ? "✓" : ""}</Text>
    </View>
    <Text style={styles.cbLabel}>
      {label} {law && <Text style={styles.cbLaw}>{law}</Text>}
    </Text>
  </View>
);

const SlotSignatures = ({
  approvals,
  fallbackName,
  fallbackRole,
  marginTop = 15,
}) => {
  if (!approvals || approvals.length === 0) {
    return (
      <View style={[styles.sigBlock, { marginTop }]}>
        <View style={styles.sigLine}>
          <Text style={styles.sigName}>{fallbackName}</Text>
        </View>
        <Text style={styles.sigRole}>{fallbackRole}</Text>
      </View>
    );
  }

  const mainApprover =
    approvals.find((a) => a.role?.toLowerCase().includes("signature")) ||
    approvals[approvals.length - 1];

  const otherApprovers = approvals.filter((a) => a._id !== mainApprover._id);
  const isMainInitial = mainApprover.role?.toLowerCase().includes("initial");

  // Use Approver Snapshot if available, fallback to live profile or placeholder
  const mainName = mainApprover.approverSnapshot
    ? `${mainApprover.approverSnapshot.firstName} ${mainApprover.approverSnapshot.lastName}`.toUpperCase()
    : mainApprover.approver
      ? `${mainApprover.approver.firstName} ${mainApprover.approver.lastName}`.toUpperCase()
      : fallbackName;

  const mainRole =
    mainApprover.approverSnapshot?.position ||
    mainApprover.approver?.position ||
    fallbackRole;

  const rawMainSigUrl =
    mainApprover.status === "APPROVED"
      ? mainApprover.approverSnapshot?.signatureUrl ||
        mainApprover.approverSignature?.signatureUrl
      : null;
  const mainSigUrl = safeImageUrl(rawMainSigUrl);

  return (
    <View style={[styles.sigBlock, { marginTop }]}>
      <View style={styles.sigLine}>
        {!isMainInitial && mainSigUrl && (
          <Image src={mainSigUrl} style={styles.approverSignatureAbove} />
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {otherApprovers.map((appr, idx) => {
            const rawUrl =
              appr.status === "APPROVED"
                ? appr.approverSnapshot?.signatureUrl ||
                  appr.approverSignature?.signatureUrl
                : null;
            const url = safeImageUrl(rawUrl);
            if (!url) return null;
            return (
              <Image key={idx} src={url} style={styles.approverInitialBeside} />
            );
          })}

          {isMainInitial && mainSigUrl && (
            <Image src={mainSigUrl} style={styles.approverInitialBeside} />
          )}

          <Text style={styles.sigName}>{mainName}</Text>
        </View>
      </View>
      <Text style={styles.sigRole}>{mainRole}</Text>
    </View>
  );
};

/* =========================
   Main Component
========================= */
export default function OrganicApplicationPdf({ app, logoSrc, signatureSrc }) {
  // ✅ Extract data from Applicant Snapshot for historical accuracy
  const snapshot = app?.applicantSnapshot || {};
  const emp = app?.employee || {}; // Fallback for legacy records

  const office = emp.division || emp.department || "ADMIN AND FINANCE";
  const lastName = snapshot.lastName || emp.lastName || "";
  const firstName = snapshot.firstName || emp.firstName || "";
  const middleName = snapshot.middleName || emp.middleName || "";
  const position = snapshot.position || emp.position || "";

  // ✅ Format Salary Amount to show ONLY the monetary value (e.g., ₱59,153.00)
  const amt = snapshot.salaryAmount;

  let salaryText = "";
  console.log(amt);
  if (amt) {
    salaryText = `${Number(amt).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  }

  const dateOfFiling = fmtDateLong(app?.createdAt);
  const leaveType = app?.type || "Others";
  const daysApplied = app?.totalDays || app?.requestedDays || 1;
  const inclusiveDates = formatInclusiveDates(app?.inclusiveDates || []);

  const isCommutationReq = app?.commutation === "Requested";
  const isCommutationNotReq =
    app?.commutation === "Not Requested" || !isCommutationReq;

  const rawFinalSignatureSrc =
    app?.applicantSignatureUrl || signatureSrc || emp.signature || null;
  const finalSignatureSrc = safeImageUrl(rawFinalSignatureSrc);

  const hrmoApprovals = [];
  const recommendingApprovals = [];
  const finalApprovals = [];

  (app?.approvals || []).forEach((a) => {
    const r = (a.role || "").toLowerCase();
    if (r.includes("hrmo")) {
      hrmoApprovals.push(a);
    } else if (
      r.includes("rd") ||
      r.includes("regional director") ||
      r.includes("ard")
    ) {
      finalApprovals.push(a);
    } else {
      recommendingApprovals.push(a);
    }
  });

  return (
    <Document title={`Leave Application - ${lastName}`}>
      <Page size="A4" style={styles.page}>
        {/* --- HEADER --- */}
        <View style={styles.headerWrapper}>
          <View style={styles.headerLogoArea}>
            {logoSrc ? (
              <Image
                src={logoSrc}
                style={{
                  height: 45,
                  width: 250,
                  objectFit: "contain",
                  objectPosition: "left",
                }}
              />
            ) : (
              <View style={styles.logoPlaceholder} />
            )}
          </View>
          <View style={styles.stampBox}>
            <Text style={styles.stampText}>Stamp of Date of Receipt</Text>
          </View>
        </View>

        <Text style={styles.formTitle}>APPLICATION FOR LEAVE</Text>

        {/* --- MAIN FORM BORDER --- */}
        <View style={styles.formBorder}>
          {/* Row 1: Office & Name */}
          <View style={styles.row}>
            <View style={[styles.colRightBorder, { width: "40%", padding: 2 }]}>
              <Text style={styles.labelTitle}>
                1. OFFICE/DEPARTMENT - DISTRICT/SCHOOL
              </Text>
              <Text style={[styles.valueText, { marginTop: 4 }]}>{office}</Text>
            </View>
            <View style={{ width: "60%", padding: 2 }}>
              <Text style={styles.labelTitle}>2. NAME :</Text>
              <View style={{ flexDirection: "row", marginTop: 4 }}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={styles.valueText}>{lastName}</Text>
                  <Text style={{ fontSize: 7, marginTop: 1 }}>(Last)</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={styles.valueText}>{firstName}</Text>
                  <Text style={{ fontSize: 7, marginTop: 1 }}>(First)</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={styles.valueText}>{middleName}</Text>
                  <Text style={{ fontSize: 7, marginTop: 1 }}>(Middle)</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Row 2: Date, Position, Salary */}
          <View style={styles.row}>
            <View
              style={[
                styles.colRightBorder,
                { width: "30%", padding: 4, flexDirection: "row" },
              ]}
            >
              <Text style={styles.labelTitle}>3. DATE OF FILING </Text>
              <View style={styles.inputUnderlineCenter}>
                <Text style={styles.valueText}>{dateOfFiling}</Text>
              </View>
            </View>
            <View
              style={[
                styles.colRightBorder,
                { width: "40%", padding: 4, flexDirection: "row" },
              ]}
            >
              <Text style={styles.labelTitle}>4. POSITION </Text>
              <View style={styles.inputUnderlineCenter}>
                <Text style={styles.valueText}>{position}</Text>
              </View>
            </View>
            <View style={{ width: "30%", padding: 4, flexDirection: "row" }}>
              <Text style={styles.labelTitle}>5. SALARY </Text>
              <View style={styles.inputUnderlineCenter}>
                <Text style={styles.valueText}>{salaryText}</Text>
              </View>
            </View>
          </View>

          {/* Section 6 Title */}
          <Text style={styles.sectionTitle}>6. DETAILS OF APPLICATION</Text>

          {/* Row 3: 6A and 6B */}
          <View style={styles.row}>
            {/* 6.A TYPE OF LEAVE */}
            <View style={[styles.colRightBorder, { width: "50%", padding: 4 }]}>
              <Text style={[styles.labelTitle, { marginBottom: 6 }]}>
                6.A TYPE OF LEAVE TO BE AVAILED OF
              </Text>

              <CheckboxItem
                label="Vacation Leave"
                law="(Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)"
                checked={leaveType === "Vacation"}
              />
              <CheckboxItem
                label="Mandatory/Forced Leave"
                law="(Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)"
                checked={leaveType === "Mandatory"}
              />
              <CheckboxItem
                label="Sick Leave"
                law="(Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)"
                checked={leaveType === "Sick"}
              />
              <CheckboxItem
                label="Maternity Leave"
                law="(R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)"
                checked={leaveType === "Maternity"}
              />
              <CheckboxItem
                label="Paternity Leave"
                law="(R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)"
                checked={leaveType === "Paternity"}
              />
              <CheckboxItem
                label="Special Privilege Leave"
                law="(Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)"
                checked={leaveType === "SPL"}
              />
              <CheckboxItem
                label="Solo Parent Leave"
                law="(RA No. 8972 / CSC MC No. 8, s. 2004)"
                checked={leaveType === "Solo Parent"}
              />
              <CheckboxItem
                label="Study Leave"
                law="(Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)"
                checked={leaveType === "Study"}
              />
              <CheckboxItem
                label="10-Day VAWC Leave"
                law="(RA No. 9262 / CSC MC No. 15, s. 2005)"
                checked={leaveType === "VAWC"}
              />
              <CheckboxItem
                label="Rehabilitation Privilege"
                law="(Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)"
                checked={leaveType === "Rehabilitation"}
              />
              <CheckboxItem
                label="Special Leave Benefits for Women"
                law="(RA No. 9710 / CSC MC No. 25, s. 2010)"
                checked={leaveType === "Women"}
              />
              <CheckboxItem
                label="Special Emergency (Calamity) Leave"
                law="(CSC MC No. 2, s. 2012, as amended)"
                checked={leaveType === "Calamity"}
              />
              <CheckboxItem
                label="Adoption Leave"
                law="(R.A. No. 8552)"
                checked={leaveType === "Adoption"}
              />

              <Text
                style={[
                  styles.labelTitle,
                  { marginTop: 6, fontStyle: "italic" },
                ]}
              >
                Others:
              </Text>
              <View
                style={[
                  styles.inputUnderlineCenter,
                  { marginHorizontal: 20, marginTop: 4 },
                ]}
              >
                <Text style={styles.valueText}>
                  Compensatory Time-Off (CTO)
                </Text>
              </View>
            </View>

            {/* 6.B DETAILS OF LEAVE */}
            <View style={{ width: "50%", padding: 4 }}>
              <Text style={[styles.labelTitle, { marginBottom: 6 }]}>
                6.B DETAILS OF LEAVE
              </Text>

              <Text
                style={[
                  styles.labelTitle,
                  { fontStyle: "italic", marginBottom: 2 },
                ]}
              >
                In case of Vacation/Special Privilege Leave:
              </Text>
              <View style={{ paddingLeft: 10, marginBottom: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                  <View style={styles.checkbox}>
                    <Text style={styles.checkMark}></Text>
                  </View>
                  <Text style={styles.labelTitle}>Within the Philippines </Text>
                  <View style={styles.inputUnderline}>
                    <Text style={styles.valueText}>{app?.location || ""}</Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    marginTop: 4,
                  }}
                >
                  <View style={styles.checkbox}>
                    <Text style={styles.checkMark}></Text>
                  </View>
                  <Text style={styles.labelTitle}>Abroad (Specify) </Text>
                  <View style={styles.inputUnderline}>
                    <Text style={styles.valueText}></Text>
                  </View>
                </View>
              </View>

              <Text
                style={[
                  styles.labelTitle,
                  { fontStyle: "italic", marginBottom: 2 },
                ]}
              >
                In case of Sick Leave:
              </Text>
              <View style={{ paddingLeft: 10, marginBottom: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                  <View style={styles.checkbox}>
                    <Text style={styles.checkMark}></Text>
                  </View>
                  <Text style={styles.labelTitle}>
                    In Hospital (Specify Illness){" "}
                  </Text>
                  <View style={styles.inputUnderline}>
                    <Text style={styles.valueText}></Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    marginTop: 4,
                  }}
                >
                  <View style={styles.checkbox}>
                    <Text style={styles.checkMark}></Text>
                  </View>
                  <Text style={styles.labelTitle}>
                    Out Patient (Specify Illness){" "}
                  </Text>
                  <View style={styles.inputUnderline}>
                    <Text style={styles.valueText}></Text>
                  </View>
                </View>
              </View>

              <Text
                style={[
                  styles.labelTitle,
                  { fontStyle: "italic", marginBottom: 2 },
                ]}
              >
                In case of Special Leave Benefits for Women:
              </Text>
              <View
                style={{
                  paddingLeft: 10,
                  marginBottom: 4,
                  flexDirection: "row",
                  alignItems: "flex-end",
                }}
              >
                <Text style={styles.labelTitle}>(Specify Illness) </Text>
                <View style={styles.inputUnderline}>
                  <Text style={styles.valueText}></Text>
                </View>
              </View>

              <Text
                style={[
                  styles.labelTitle,
                  { fontStyle: "italic", marginBottom: 2 },
                ]}
              >
                In case of Study Leave:
              </Text>
              <View style={{ paddingLeft: 10, marginBottom: 4 }}>
                <CheckboxItem
                  label="Completion of Master's Degree"
                  checked={false}
                />
                <CheckboxItem
                  label="BAR/Board Examination Review"
                  checked={false}
                />
              </View>

              <Text
                style={[
                  styles.labelTitle,
                  { fontStyle: "italic", marginBottom: 2 },
                ]}
              >
                Other purpose:
              </Text>
              <View style={{ paddingLeft: 10, marginBottom: 4 }}>
                <CheckboxItem
                  label="Monetization of Leave Credits"
                  checked={false}
                />
                <CheckboxItem label="Terminal Leave" checked={false} />
              </View>
            </View>
          </View>

          {/* Row 4: 6C and 6D */}
          <View style={styles.row}>
            <View style={[styles.colRightBorder, { width: "50%", padding: 4 }]}>
              <Text style={styles.labelTitle}>
                6.C NUMBER OF WORKING DAYS APPLIED FOR
              </Text>
              <View
                style={[
                  styles.inputUnderlineCenter,
                  { marginHorizontal: 20, marginTop: 4 },
                ]}
              >
                <Text style={styles.valueText}>
                  {daysApplied} day{daysApplied > 1 ? "s" : ""}
                </Text>
              </View>

              <Text style={[styles.labelTitle, { marginTop: 8 }]}>
                INCLUSIVE DATES
              </Text>
              <View
                style={[
                  styles.inputUnderlineCenter,
                  { marginHorizontal: 20, marginTop: 4 },
                ]}
              >
                <Text style={styles.valueText}>{inclusiveDates}</Text>
              </View>
            </View>

            <View style={{ width: "50%", padding: 4 }}>
              <Text style={styles.labelTitle}>6.D COMMUTATION</Text>
              <View style={{ paddingLeft: 10, marginTop: 4 }}>
                <CheckboxItem
                  label="Not Requested"
                  checked={isCommutationNotReq}
                />
                <CheckboxItem label="Requested" checked={isCommutationReq} />
              </View>

              {/* Applicant Signature */}
              <View style={[styles.sigBlock, { marginTop: 10 }]}>
                <View style={styles.sigLine}>
                  {finalSignatureSrc ? (
                    <Image
                      src={finalSignatureSrc}
                      style={styles.applicantSignature}
                    />
                  ) : (
                    <Text style={styles.sigName}></Text>
                  )}
                </View>
                <Text style={styles.sigRole}>(Signature of Applicant)</Text>
                {app?.overallStatus === "APPROVED" && (
                  <View style={styles.digitalSigInfo}>
                    <Text>Digitally signed by {lastName}</Text>
                    <Text>
                      {firstName} {middleName}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Section 7 Title */}
          <Text style={styles.sectionTitle}>
            7. DETAILS OF ACTION ON APPLICATION
          </Text>

          {/* Row 5: 7A and 7B */}
          <View style={styles.row}>
            {/* 7.A - HRMO Signature Block */}
            <View style={[styles.colRightBorder, { width: "50%", padding: 4 }]}>
              <Text style={styles.labelTitle}>
                7.A CERTIFICATION OF LEAVE CREDITS
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 4,
                }}
              >
                <Text style={styles.labelTitle}>As of </Text>
                <View
                  style={[styles.inputUnderlineCenter, { width: 80 }]}
                ></View>
              </View>

              <View style={styles.innerTable}>
                <View style={styles.innerRow}>
                  <View style={styles.innerCellLabel}>
                    <Text></Text>
                  </View>
                  <View style={styles.innerHeaderCell}>
                    <Text style={styles.labelTitle}>Vacation Leave</Text>
                  </View>
                  <View
                    style={[styles.innerHeaderCell, { borderRightWidth: 0 }]}
                  >
                    <Text style={styles.labelTitle}>Sick Leave</Text>
                  </View>
                </View>
                <View style={styles.innerRow}>
                  <View style={styles.innerCellLabel}>
                    <Text style={{ textAlign: "center" }}>Total Earned</Text>
                  </View>
                  <View style={styles.innerCell}>
                    <Text style={styles.labelTitle}>
                      {app?.balances?.vacation || ""}
                    </Text>
                  </View>
                  <View style={[styles.innerCell, { borderRightWidth: 0 }]}>
                    <Text style={styles.labelTitle}>
                      {app?.balances?.sick || ""}
                    </Text>
                  </View>
                </View>
                <View style={styles.innerRow}>
                  <View style={styles.innerCellLabel}>
                    <Text style={{ textAlign: "center" }}>
                      Less this application
                    </Text>
                  </View>
                  <View style={styles.innerCell}>
                    <Text style={styles.labelTitle}></Text>
                  </View>
                  <View style={[styles.innerCell, { borderRightWidth: 0 }]}>
                    <Text style={styles.labelTitle}></Text>
                  </View>
                </View>
                <View style={[styles.innerRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.innerCellLabel}>
                    <Text style={{ textAlign: "center" }}>Balance</Text>
                  </View>
                  <View style={styles.innerCell}>
                    <Text style={styles.labelTitle}></Text>
                  </View>
                  <View style={[styles.innerCell, { borderRightWidth: 0 }]}>
                    <Text style={styles.labelTitle}></Text>
                  </View>
                </View>
              </View>

              {/* Dynamic 7A Approvers */}
              <SlotSignatures
                approvals={hrmoApprovals}
                fallbackName="JAYFER T. AMMASI"
                fallbackRole="HRMO II"
                marginTop={15}
              />
            </View>

            {/* 7.B - Recommending Signatures Block */}
            <View style={{ width: "50%", padding: 4 }}>
              <Text style={styles.labelTitle}>7.B RECOMMENDATION</Text>
              <View style={{ paddingLeft: 10, marginTop: 4 }}>
                <CheckboxItem
                  label="For approval"
                  checked={app?.overallStatus === "APPROVED"}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    marginTop: 4,
                  }}
                >
                  <View style={styles.checkbox}>
                    <Text style={styles.checkMark}>
                      {app?.overallStatus === "REJECTED" ? "✓" : ""}
                    </Text>
                  </View>
                  <Text style={styles.labelTitle}>For disapproval due to </Text>
                  <View style={styles.inputUnderline}>
                    <Text style={styles.valueText}></Text>
                  </View>
                </View>
                <View
                  style={[styles.inputUnderlineCenter, { marginTop: 8 }]}
                ></View>
                <View
                  style={[styles.inputUnderlineCenter, { marginTop: 8 }]}
                ></View>
              </View>

              {/* Dynamic 7B Approvers */}
              <SlotSignatures
                approvals={recommendingApprovals}
                fallbackName="MINA FLOR T. VILLAFUERTE"
                fallbackRole="Chief, Admin and Finance Division"
                marginTop={25}
              />
            </View>
          </View>

          {/* Row 6: 7C and 7D */}
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={[styles.colRightBorder, { width: "50%", padding: 4 }]}>
              <Text style={styles.labelTitle}>7.C APPROVED FOR:</Text>
              <View style={{ paddingLeft: 10, marginTop: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    marginBottom: 4,
                  }}
                >
                  <View
                    style={[
                      styles.inputUnderlineCenter,
                      { width: 30, marginRight: 4 },
                    ]}
                  >
                    <Text style={styles.valueText}>{daysApplied}</Text>
                  </View>
                  <Text style={styles.labelTitle}>days with pay</Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    marginBottom: 4,
                  }}
                >
                  <View
                    style={[
                      styles.inputUnderlineCenter,
                      { width: 30, marginRight: 4 },
                    ]}
                  >
                    <Text style={styles.valueText}></Text>
                  </View>
                  <Text style={styles.labelTitle}>days without pay</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                  <View
                    style={[
                      styles.inputUnderlineCenter,
                      { width: 30, marginRight: 4 },
                    ]}
                  >
                    <Text style={styles.valueText}></Text>
                  </View>
                  <Text style={styles.labelTitle}>others (Specify)</Text>
                </View>
              </View>
            </View>

            <View style={{ width: "50%", padding: 4 }}>
              <Text style={styles.labelTitle}>7.D DISAPPROVED DUE TO:</Text>
              <View style={{ paddingLeft: 10, marginTop: 4 }}>
                <View style={[styles.inputUnderlineCenter, { marginTop: 4 }]}>
                  <Text style={styles.valueText}>
                    {app?.overallStatus === "REJECTED" ? app?.remarks : ""}
                  </Text>
                </View>
                <View
                  style={[styles.inputUnderlineCenter, { marginTop: 8 }]}
                ></View>
                <View
                  style={[styles.inputUnderlineCenter, { marginTop: 8 }]}
                ></View>
              </View>
            </View>
          </View>

          {/* Bottom Final Signature (7C/7D Approvers) */}
          <View style={{ padding: 10, marginBottom: 10 }}>
            <SlotSignatures
              approvals={finalApprovals}
              fallbackName="Engr. PINKY T. JIMENEZ, PECE, Ph.D."
              fallbackRole="Regional Director"
              marginTop={10}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}

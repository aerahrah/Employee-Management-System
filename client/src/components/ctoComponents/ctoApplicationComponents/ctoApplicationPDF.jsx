import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

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

function toMidnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatInclusiveDates(dates) {
  if (!Array.isArray(dates) || dates.length === 0) return "";

  const sorted = dates
    .map((x) => toMidnight(x))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (sorted.length === 0) return "";

  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  const isNextDay = (a, b) => {
    const dayMs = 24 * 60 * 60 * 1000;
    return toMidnight(b).getTime() - toMidnight(a).getTime() === dayMs;
  };

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (isNextDay(end, cur)) {
      end = cur;
    } else {
      ranges.push([start, end]);
      start = cur;
      end = cur;
    }
  }
  ranges.push([start, end]);

  const monthLong = (d) => d.toLocaleDateString("en-US", { month: "long" });
  const monthShort = (d) => d.toLocaleDateString("en-US", { month: "short" });

  const fmtRange = (s, e) => {
    const sameDay = s.getTime() === e.getTime();
    const sameMonth =
      s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    const sameYear = s.getFullYear() === e.getFullYear();

    if (sameDay) {
      return `${monthLong(s)} ${s.getDate()}, ${s.getFullYear()}`;
    }
    if (sameMonth) {
      return `${monthLong(s)} ${s.getDate()}-${e.getDate()}, ${s.getFullYear()}`;
    }
    if (sameYear) {
      return `${monthShort(s)} ${s.getDate()} - ${monthShort(e)} ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${monthShort(s)} ${s.getDate()}, ${s.getFullYear()} - ${monthShort(e)} ${e.getDate()}, ${e.getFullYear()}`;
  };

  return ranges.map(([s, e]) => fmtRange(s, e)).join(", ");
}

function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function safeImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : buildApiUrl(url);
}

function getApproverDetails(approval, fallbackName = "") {
  if (!approval) {
    return { name: fallbackName, sigUrl: null, text: null };
  }

  const snap = approval.approverSnapshot;
  const live = approval.approver;

  const firstName = snap?.firstName || live?.firstName || "";
  const lastName = snap?.lastName || live?.lastName || "";

  let name = fallbackName;
  if (firstName || lastName) {
    name = `${firstName} ${lastName}`.trim().toUpperCase();
  }

  let sigUrl = null;
  let text = null;

  if (approval.status === "APPROVED") {
    sigUrl = safeImageUrl(
      snap?.signatureUrl || approval.approverSignature?.signatureUrl,
    );
    if (!sigUrl) {
      text = `Digitally signed\nby ${lastName}\n${firstName}`;
    }
  }

  return { name, sigUrl, text };
}

function memoRowLabel(memoItem) {
  const memo = memoItem?.memoId || {};
  const hours =
    memo?.hoursEarned ??
    memo?.earnedHours ??
    memo?.totalHours ??
    memoItem?.appliedHours ??
    "";
  const date =
    memo?.earnedDate ||
    memo?.creditDate ||
    memo?.dateEarned ||
    memo?.createdAt ||
    "";
  const dateStr = date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : "";
  const hrsStr = hours !== "" ? `${hours} hrs` : "";
  if (!dateStr && !hrsStr) return "";
  return [dateStr, hrsStr].filter(Boolean).join(" – ");
}

/* =========================
   Underlined field components
========================= */
function UnderlineBox({
  value,
  width,
  flex = 1,
  align = "center",
  minHeight = 12,
  paddingBottom = 1,
  textStyle,
  boxStyle,
  signatureText,
  signatureUrl,
}) {
  return (
    <View
      style={[
        styles.underlineBox,
        { flex, width: width ?? undefined, minHeight, paddingBottom },
        boxStyle,
      ]}
    >
      {signatureUrl ? (
        <Image src={signatureUrl} style={styles.signatureImageBox} />
      ) : signatureText ? (
        <Text style={styles.digitalSignatureText}>{signatureText}</Text>
      ) : null}
      <Text style={[styles.underlineText, { textAlign: align }, textStyle]}>
        {String(value || "")}
      </Text>
    </View>
  );
}

function LabeledUnderlineRow({
  label,
  value,
  lineWidth,
  lineFlex = 1,
  labelStyle,
  align = "center",
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.label, styles.fieldLabel, labelStyle]}>{label}</Text>
      <UnderlineBox
        value={value}
        width={lineWidth}
        flex={lineFlex}
        align={align}
      />
    </View>
  );
}

/* =========================
   Styles 
========================= */
const styles = StyleSheet.create({
  page: {
    padding: "18 28 24 28",
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.25,
  },
  header: { alignItems: "center", justifyContent: "center", marginBottom: 8 },
  logo: { width: 190, height: 55, objectFit: "contain" },
  formTitle: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 10,
    fontSize: 10,
  },
  topBox: {
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "row",
    width: "100%",
    minHeight: 210,
  },
  topLeft: {
    width: "58%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 10,
  },
  topRight: { width: "42%", padding: 10 },
  label: { fontWeight: "bold" },
  fieldRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 6 },
  fieldLabel: { marginRight: 6, flexShrink: 0 },
  underlineBox: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    justifyContent: "flex-end",
    position: "relative",
  },
  underlineText: { fontSize: 10, paddingHorizontal: 2, zIndex: 2 },
  signatureImageBox: {
    height: 30,
    width: 100,
    objectFit: "contain",
    position: "absolute",
    top: 10,
    alignSelf: "center",
    zIndex: 1,
  },
  initialSignatureImageBox: {
    height: 35,
    width: 80,
    objectFit: "contain",
    alignSelf: "center",
    marginTop: 2,
  },
  digitalSignatureText: {
    fontSize: 7,
    color: "#333",
    textAlign: "center",
    lineHeight: 1.1,
    marginBottom: 4,
  },
  actionTitle: { fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  actionRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { fontSize: 12, fontWeight: "bold" },
  actionText: { flexDirection: "row", alignItems: "flex-end", flex: 1 },
  approvalLabelLeft: { marginTop: 18, marginBottom: 6 },
  nameLine: { alignSelf: "center", marginTop: 10 },
  roleLabel: { textAlign: "center", fontSize: 9, marginTop: 2 },
  detachRow: { marginTop: 10, marginBottom: 6 },
  detachText: { fontSize: 9 },
  dashedLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderStyle: "dashed",
    marginBottom: 10,
  },
  certificateTitle: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 10,
    marginBottom: 6,
  },
  certBox: { borderWidth: 1, borderColor: "#000", width: "100%" },
  gridRow: { flexDirection: "row" },
  gridHeaderCell: {
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 5,
    fontWeight: "bold",
    textAlign: "center",
  },
  gridCell: {
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 5,
  },
  col1: { width: "28%" },
  col2: { width: "20%" },
  col3: { width: "16%" },
  col4: { width: "18%" },
  col5: { width: "18%", borderRightWidth: 0 },
  certFooter: {
    minHeight: 150,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  footerBlock: { width: 200, alignItems: "center" },
  footerRole: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  footerDateLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    width: 140,
    height: 14,
  },
  footerDateLabel: { textAlign: "center", fontSize: 9, marginTop: 2 },
});

/* =========================
   PDF Component
========================= */
export default function CtoApplicationPdf({
  app,
  logoSrc = "/public/logo_dict.png",
  recommendingApproverLabel = "Chief, Technical Operations Division",
  approvedLabel = "Regional Director",
  adminFinanceLabel = "Chief, Admin. & Finance Div.",
}) {
  const applicantSnap = app?.applicantSnapshot || {};
  const emp = app?.employee || {};
  const firstName = applicantSnap.firstName || emp.firstName || "";
  const lastName = applicantSnap.lastName || emp.lastName || "";
  const middleName = applicantSnap.middleName || emp.middleName || "";

  let employeeName =
    firstName || lastName
      ? `${firstName} ${middleName} ${lastName}`
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase()
      : "";

  const position = applicantSnap.position || emp.position || "";
  const officeDivision = emp.officeDivision || emp.division || emp.office || "";
  const dateOfFiling = fmtDateLong(app?.createdAt) || "";
  const requestedHours = safeNumber(app?.requestedHours) || "";
  const inclusiveDates = formatInclusiveDates(app?.inclusiveDates) || "";
  const reason = app?.reason || "";

  const dayCount = Array.isArray(app?.inclusiveDates)
    ? app.inclusiveDates.length
    : "";
  const applicantSigUrl = safeImageUrl(
    app?.applicantSignatureUrl || emp.signature,
  );
  let applicantSigText =
    !applicantSigUrl && (lastName || firstName)
      ? `Digitally signed\nby ${lastName}\n${firstName}`
      : null;

  const approvals = app?.approvals || [];

  // FIXED MAPPING LOGIC: Using exact role name matches to prevent overlap
  const recInitialApproval = approvals.find(
    (a) => a.role === "Recommending Approval Initial",
  );
  const recApproval = approvals.find((a) => a.role === "Recommending Approval");
  const adminApproval = approvals.find((a) => a.role === "AFD Chief Signature");
  const finalApproval = approvals.find(
    (a) => a.role === "Regional Director Signature",
  );

  const recInitialDetails = getApproverDetails(recInitialApproval);
  const recDetails = getApproverDetails(recApproval);
  const adminDetails = getApproverDetails(adminApproval);
  const finalDetails = getApproverDetails(finalApproval);

  const memos = Array.isArray(app?.memo) ? app.memo : [];
  const rows = memos.length
    ? memos.map((m) => ({
        col1: memoRowLabel(m),
        col2: inclusiveDates || "",
        col3: m?.appliedHours != null ? String(m.appliedHours) : "",
        col4: m?.memoId?.remainingHours ?? m?.memoId?.remaining ?? "",
        col5: m?.memoId?.remarks ?? "",
      }))
    : new Array(6)
        .fill(null)
        .map(() => ({ col1: "", col2: "", col3: "", col4: "", col5: "" }));

  return (
    <Document title={`CTO Application - ${lastName || "Applicant"}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoSrc} style={styles.logo} />
        </View>

        <Text style={styles.formTitle}>
          APPLICATION FOR AVAILMENT OF COMPENSATORY TIME-OFF (CTO)
        </Text>

        <View style={styles.topBox}>
          <View style={styles.topLeft}>
            <LabeledUnderlineRow
              label="Name:"
              value={employeeName}
              lineFlex={1}
              align="left"
            />
            <View style={styles.fieldRow}>
              <Text style={[styles.label, styles.fieldLabel]}>Signature:</Text>
              <UnderlineBox
                value=""
                flex={1}
                align="center"
                minHeight={55}
                signatureText={applicantSigText}
                signatureUrl={applicantSigUrl}
              />
            </View>
            <LabeledUnderlineRow
              label="Position:"
              value={position}
              lineFlex={1}
              align="left"
            />
            <LabeledUnderlineRow
              label="Office/Division:"
              value={officeDivision}
              lineFlex={1}
              align="left"
            />
            <LabeledUnderlineRow
              label="Date of Filing:"
              value={dateOfFiling}
              lineFlex={1}
              align="center"
            />
            <LabeledUnderlineRow
              label="No. of working hours applied for:"
              value={requestedHours ? `${requestedHours} Hours` : ""}
              lineFlex={1}
              align="center"
            />
            <LabeledUnderlineRow
              label="Inclusive Date/s:"
              value={inclusiveDates}
              lineFlex={1}
              align="center"
            />
            <LabeledUnderlineRow
              label="Purpose/Reason:"
              value={reason}
              lineFlex={1}
              align="left"
            />
          </View>

          <View style={styles.topRight}>
            <Text style={styles.actionTitle}>ACTION OF APPLICATION</Text>
            <View style={styles.actionRow}>
              <View style={styles.checkbox}>
                {app?.overallStatus !== "REJECTED" && dayCount ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </View>
              <View style={styles.actionText}>
                <Text>Approval for </Text>
                <UnderlineBox
                  value={
                    app?.overallStatus !== "REJECTED" && dayCount
                      ? String(dayCount)
                      : ""
                  }
                  width={20}
                  flex={1}
                  align="center"
                  minHeight={10}
                />
                <Text> day/s</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <View style={styles.checkbox}>
                {app?.overallStatus === "REJECTED" ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </View>
              <View style={styles.actionText}>
                <Text>Disapproved due to </Text>
                <UnderlineBox
                  value={app?.overallStatus === "REJECTED" ? app?.remarks : ""}
                  flex={1}
                  align="center"
                  minHeight={10}
                />
              </View>
            </View>

            <Text style={styles.approvalLabelLeft}>Recommending Approval:</Text>
            <UnderlineBox
              value={recDetails.name}
              flex={0}
              width={180}
              minHeight={55}
              align="center"
              textStyle={{ fontWeight: "bold" }}
              boxStyle={styles.nameLine}
              signatureText={recDetails.text}
              signatureUrl={recDetails.sigUrl}
            />
            <Text style={styles.roleLabel}>{recommendingApproverLabel}</Text>

            {/* Recommending Initial Signature (No Name/Underline) */}
            {(recInitialDetails.sigUrl || recInitialDetails.text) && (
              <View style={{ alignItems: "center", marginTop: 5 }}>
                {recInitialDetails.sigUrl ? (
                  <Image
                    src={recInitialDetails.sigUrl}
                    style={styles.initialSignatureImageBox}
                  />
                ) : (
                  <Text style={styles.digitalSignatureText}>
                    {recInitialDetails.text}
                  </Text>
                )}
              </View>
            )}

            <Text style={styles.approvalLabelLeft}>Approved:</Text>
            <UnderlineBox
              value={finalDetails.name}
              flex={0}
              width={190}
              minHeight={55}
              align="center"
              textStyle={{ fontWeight: "bold" }}
              boxStyle={styles.nameLine}
              signatureText={finalDetails.text}
              signatureUrl={finalDetails.sigUrl}
            />
            <Text style={styles.roleLabel}>{approvedLabel}</Text>
          </View>
        </View>

        <View style={styles.detachRow}>
          <Text style={styles.detachText}>Detach for Time Keeper’s Record</Text>
        </View>
        <View style={styles.dashedLine} />

        <Text style={styles.certificateTitle}>
          CERTIFICATE OF COMPENSATORY CREDITS
        </Text>

        <View style={styles.certBox}>
          <View style={styles.gridRow}>
            <View style={[styles.gridHeaderCell, styles.col1]}>
              <Text>Total No. of Hours Earned...</Text>
            </View>
            <View style={[styles.gridHeaderCell, styles.col2]}>
              <Text>Date of CTO</Text>
            </View>
            <View style={[styles.gridHeaderCell, styles.col3]}>
              <Text>Used COCs</Text>
            </View>
            <View style={[styles.gridHeaderCell, styles.col4]}>
              <Text>Remaining COCs</Text>
            </View>
            <View style={[styles.gridHeaderCell, styles.col5]}>
              <Text>Remarks</Text>
            </View>
          </View>

          {rows.map((r, idx) => (
            <View style={styles.gridRow} key={idx}>
              <View style={[styles.gridCell, styles.col1]}>
                <Text>{r.col1}</Text>
              </View>
              <View style={[styles.gridCell, styles.col2]}>
                <Text>{r.col2}</Text>
              </View>
              <View style={[styles.gridCell, styles.col3]}>
                <Text>{r.col3 ? `${r.col3} Hours` : ""}</Text>
              </View>
              <View style={[styles.gridCell, styles.col4]}>
                <Text>{r.col4}</Text>
              </View>
              <View style={[styles.gridCell, styles.col5]}>
                <Text>{r.col5}</Text>
              </View>
            </View>
          ))}

          <View style={styles.certFooter}>
            <View style={styles.footerBlock}>
              <UnderlineBox
                value={adminDetails.name}
                flex={0}
                width={150}
                minHeight={55}
                align="center"
                textStyle={{ fontWeight: "bold" }}
                boxStyle={styles.nameLine}
                signatureText={adminDetails.text}
                signatureUrl={adminDetails.sigUrl}
              />
              <Text style={styles.footerRole}>{adminFinanceLabel}</Text>
              <View style={styles.footerDateLine}>
                <Text />
              </View>
              <Text style={styles.footerDateLabel}>Date</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

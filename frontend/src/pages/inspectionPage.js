import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import GeneralInfo from "../components/generalInfo";
import LeakageSection from "../components/LeakageSection";
import DefectSection from "../components/DefectSection";
import SpatterSection from "../components/SpatterSection";

import {
  SHEETS,
  createInitialForm,
  createInitialSheetStatus,
  getSheetData as getSheetDataFromUtils,
} from "../utils/inspectionData";

import {
  createInspection,
  getInspection,
  saveInspectionSheet,
  passInspectionSheet,
} from "../utils/inspectionApi";

function InspectionPage({ navigate }) {
  const operatorStage =
    localStorage.getItem("operator_stage") || "STAGE_1";

  const operatorName =
    localStorage.getItem("operator_name") ||
    localStorage.getItem("operator_id") ||
    "Operator";

  const [recordId, setRecordId] = useState(null);
  const [activeSheet, setActiveSheet] = useState("sheet1");

  const [currentStage, setCurrentStage] =
    useState(operatorStage);

  const [sheetStatus, setSheetStatus] =
    useState(createInitialSheetStatus());

  const [form, setForm] =
    useState(createInitialForm());

  const [savingSheet, setSavingSheet] = useState(false);
  const [passingSheet, setPassingSheet] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // =====================================================
  // INPUT
  // =====================================================

  const handleInput = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =====================================================
  // SPATTER
  // =====================================================

  const addSpatter = () => {
    setForm((prev) => ({
      ...prev,
      spatter_locations: [
        ...(prev.spatter_locations || []),
        {
          frame_centre_member_no: "",
          location: "",
          remark: "",
        },
      ],
    }));
  };

  const removeSpatter = (index) => {
    setForm((prev) => ({
      ...prev,
      spatter_locations:
        (prev.spatter_locations || []).filter(
          (_, i) => i !== index
        ),
    }));
  };

  const handleSpatterChange = (
    index,
    field,
    value
  ) => {
    setForm((prev) => {
      const locations = [
        ...(prev.spatter_locations || []),
      ];

      locations[index] = {
        ...locations[index],
        [field]: value,
      };

      return {
        ...prev,
        spatter_locations: locations,
      };
    });
  };

  // =====================================================
  // ERROR HANDLER
  // =====================================================

  const showApiError = (
    error,
    defaultMessage
  ) => {
    console.error(error);

    const detail =
      error?.response?.data?.detail;

    if (typeof detail === "string") {
      alert(detail);
      return;
    }

    if (
      detail &&
      typeof detail === "object"
    ) {
      let message =
        detail.message ||
        defaultMessage;

      if (
        Array.isArray(detail.missing) &&
        detail.missing.length
      ) {
        message +=
          "\n\nMissing:\n" +
          detail.missing.join("\n");
      }

      if (
        Array.isArray(detail.invalid) &&
        detail.invalid.length
      ) {
        message +=
          "\n\nInvalid:\n" +
          detail.invalid.join("\n");
      }

      alert(message);
      return;
    }

    if (
      Array.isArray(detail)
    ) {
      alert(
        detail
          .map(
            (item) =>
              item?.msg ||
              JSON.stringify(item)
          )
          .join("\n")
      );
      return;
    }

    alert(
      error?.message ||
      defaultMessage
    );
  };

  // =====================================================
  // LOAD INSPECTION
  // =====================================================

  const loadInspection = async (id) => {
    try {
      const record =
        await getInspection(id);

      const stage = operatorStage;

      setRecordId(id);
      setCurrentStage(stage);

      const stageData =
        record.stages?.[stage];

      if (!stageData) {
        alert(
          "This frame does not contain inspection data for your stage."
        );
        return;
      }

      const sheets =
        stageData.sheets || {};

      setSheetStatus({
        sheet1:
          sheets.sheet1?.status ||
          "IN_PROGRESS",

        sheet2:
          sheets.sheet2?.status ||
          "IN_PROGRESS",

        sheet3:
          sheets.sheet3?.status ||
          "IN_PROGRESS",
      });

      const allData = {};

      Object.keys(sheets).forEach(
        (sheetKey) => {
          const sheetData =
            sheets[sheetKey]?.data || {};

          Object.assign(
            allData,
            sheetData
          );
        }
      );

      setForm((prev) => ({
        ...prev,

        frame_no:
          record.frame_no ||
          prev.frame_no,

        date:
          record.date ||
          prev.date,

        shift:
          record.shift ||
          prev.shift,

        ...allData,
      }));
    } catch (error) {
      showApiError(
        error,
        "Could not load inspection."
      );
    }
  };

  // =====================================================
  // SHEET DATA
  // =====================================================

  const getSheetData = (sheetName) => {
    return getSheetDataFromUtils(
      sheetName,
      form
    );
  };

  // =====================================================
  // SAVE SHEET
  // =====================================================

  const saveSheet = async () => {
    if (!recordId) {
      alert(
        "Create/open a frame first."
      );
      return;
    }

    if (currentSheetPassed) {
      alert(
        "This sheet has already been passed."
      );
      return;
    }

    try {
      setSavingSheet(true);

      await saveInspectionSheet(
        recordId,
        activeSheet,
        getSheetData(activeSheet)
      );

      alert(
        "Sheet saved successfully."
      );
    } catch (error) {
      showApiError(
        error,
        "Could not save sheet."
      );
    } finally {
      setSavingSheet(false);
    }
  };

  // =====================================================
  // PASS SHEET
  // =====================================================

  const passSheet = async () => {
    if (!recordId) {
      alert(
        "Create/open a frame first."
      );
      return;
    }

    if (currentSheetPassed) {
      alert(
        "This sheet has already been passed."
      );
      return;
    }

    try {
      setPassingSheet(true);

      // Save latest values first
      await saveInspectionSheet(
        recordId,
        activeSheet,
        getSheetData(activeSheet)
      );

      // Pass current sheet
      const response =
        await passInspectionSheet(
          recordId,
          activeSheet
        );

      // Lock this sheet immediately
      setSheetStatus((prev) => ({
        ...prev,
        [activeSheet]: "PASSED",
      }));

      const resultStatus =
        response?.result_status ||
        response?.overall_status ||
        "PASSED";

      if (
        resultStatus ===
          "OP60_REWORK" ||
        response?.current_station ===
          "OP60"
      ) {
        alert(
          "Inspection completed.\n\nNOK found.\nFrame sent to OP60 for rework."
        );

        localStorage.setItem(
          "op60_frame_id",
          recordId
        );

        localStorage.setItem(
          "op60_frame_no",
          form.frame_no || ""
        );

        return;
      }

      if (
        response?.current_station === "OP40" &&
        response?.current_stage &&
        response.current_stage !== operatorStage
      ) {
        alert(
          `OP40 ${operatorStage.replace("_", " ")} completed.\n` +
          `Next: ${response.current_stage.replace("_", " ")}.`
        );
        return;
      }

      alert(
        `Sheet passed successfully.\nResult: ${resultStatus}`
      );

      await loadInspection(recordId);
    } catch (error) {
      showApiError(
        error,
        "Could not pass sheet."
      );
    } finally {
      setPassingSheet(false);
    }
  };

  // =====================================================
  // CREATE FRAME
  // =====================================================

  const createFrame = async () => {
    const frameNo =
      String(form.frame_no || "").trim();

    if (!frameNo) {
      alert(
        "Please enter Frame No."
      );
      return;
    }

    // Only OP40 stage operators can create frames.
    // Any OP40 stage can open the active frame; only STAGE_1 can create a new frame.
    const allowedStages = [
      "STAGE_1",
      "STAGE_2",
      "STAGE_3",
    ];

    if (
      !allowedStages.includes(
        String(operatorStage).toUpperCase()
      )
    ) {
      alert(
        "Only OP40 stage operators can create a frame."
      );
      return;
    }

    try {
      const data =
        await createInspection({
          frame_no: frameNo,
          date: form.date,
          shift: form.shift,
        });

      const newRecordId =
        data.record_id || data._id;

      if (!newRecordId) {
        throw new Error(
          "Frame created but record ID was not returned by the server."
        );
      }

      setRecordId(newRecordId);

      // Current frame belongs to logged-in operator's stage.
      setCurrentStage(operatorStage);

      setActiveSheet("sheet1");

      setSheetStatus(
        createInitialSheetStatus()
      );

      localStorage.setItem(
        "op40_record_id",
        newRecordId
      );

      alert(
        `Frame ${frameNo} created successfully.\nStage: ${operatorStage.replace(
          "_",
          " "
        )}`
      );
    } catch (error) {
      showApiError(
        error,
        "Could not create frame."
      );
    }
  };

  // =====================================================
  // NEW FRAME
  // =====================================================

  const resetForm = () => {
    setRecordId(null);
    setActiveSheet("sheet1");

    setCurrentStage(
      operatorStage
    );

    setSheetStatus(
      createInitialSheetStatus()
    );

    setForm(
      createInitialForm()
    );

    localStorage.removeItem(
      "op40_record_id"
    );
  };

  // =====================================================
  // CHANGE SHEET
  // =====================================================

  const changeSheet = (sheetKey) => {
    setActiveSheet(sheetKey);
  };

  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  const exportExcel = () => {
    if (!recordId) {
      alert(
        "Please create/open a frame first."
      );
      return;
    }

    try {
      setExportingExcel(true);

      const workbook =
        XLSX.utils.book_new();

      const createExcelSheet = (
        data
      ) => {
        const rows = [];

        Object.entries(
          data || {}
        ).forEach(
          ([field, value]) => {
            let excelValue = value;

            if (
              value === null ||
              value === undefined
            ) {
              excelValue = "";
            } else if (
              Array.isArray(value) ||
              typeof value === "object"
            ) {
              excelValue =
                JSON.stringify(
                  value,
                  null,
                  2
                );
            }

            rows.push({
              Field: field,
              Value: excelValue,
            });
          }
        );

        return XLSX.utils.json_to_sheet(
          rows
        );
      };

      const leakageSheet =
        createExcelSheet(
          getSheetData("sheet1")
        );

      leakageSheet["!cols"] = [
        { wch: 40 },
        { wch: 45 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        leakageSheet,
        "Leakage"
      );

      const defectSheet =
        createExcelSheet(
          getSheetData("sheet2")
        );

      defectSheet["!cols"] = [
        { wch: 45 },
        { wch: 45 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        defectSheet,
        "Defects"
      );

      const spatterData =
        getSheetData("sheet3");

      const spatterRows = [
        {
          Field: "Spatter Present",
          Value:
            spatterData?.spatter_present ||
            "",
        },
      ];

      const locations =
        spatterData?.spatter_locations ||
        [];

      if (locations.length) {
        spatterRows.push({});
        spatterRows.push({
          "Sr. No.": "Spatter Locations",
          "Frame Centre Member No.": "",
          Location: "",
          Remark: "",
        });

        locations.forEach(
          (location, index) => {
            spatterRows.push({
              "Sr. No.": index + 1,
              "Frame Centre Member No.":
                location.frame_centre_member_no ||
                "",
              Location:
                location.location || "",
              Remark:
                location.remark || "",
            });
          }
        );
      }

      const spatterSheet =
        XLSX.utils.json_to_sheet(
          spatterRows
        );

      spatterSheet["!cols"] = [
        { wch: 12 },
        { wch: 32 },
        { wch: 30 },
        { wch: 40 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        spatterSheet,
        "Spatter"
      );

      const safeFrameNo =
        String(
          form.frame_no ||
            "Inspection"
        ).replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

      XLSX.writeFile(
        workbook,
        `OP40_Inspection_${safeFrameNo}.xlsx`
      );

      alert(
        "Excel file exported successfully."
      );
    } catch (error) {
      console.error(
        "Excel export failed:",
        error
      );

      alert(
        "Could not export Excel file."
      );
    } finally {
      setExportingExcel(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem(
      "operator_token"
    );

    localStorage.removeItem(
      "operator_id"
    );

    localStorage.removeItem(
      "operator_name"
    );

    localStorage.removeItem(
      "operator_stage"
    );

    localStorage.removeItem(
      "op40_record_id"
    );

    if (navigate) {
      navigate("/login");
    } else {
      window.location.href =
        "/login";
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    // Do NOT automatically load previous OP40 frame.
    // A previous frame may belong to another stage.
    setCurrentStage(operatorStage);
  }, [operatorStage]);

  // =====================================================
  // CURRENT SHEET
  // =====================================================

  const currentSheetPassed =
    sheetStatus[activeSheet] ===
    "PASSED";

  // =====================================================
  // RENDER SHEET
  // =====================================================

  const renderSheet = () => {
    switch (activeSheet) {
      case "sheet1":
        return (
          <LeakageSection
            form={form}
            handleInput={handleInput}
          />
        );

      case "sheet2":
        return (
          <DefectSection
            form={form}
            handleInput={handleInput}
          />
        );

      case "sheet3":
        return (
          <SpatterSection
            form={form}
            handleInput={handleInput}
            addSpatter={addSpatter}
            removeSpatter={removeSpatter}
            handleSpatterChange={
              handleSpatterChange
            }
          />
        );

      default:
        return null;
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div style={styles.page}>

      <div style={styles.topBar}>
        <div>
          <h2 style={{ margin: 0 }}>
            OP40 Inspection
          </h2>

          <div style={styles.subtitle}>
            Digital Inspection System
          </div>
        </div>

        <div style={styles.operatorInfo}>
          <span>
            Operator:{" "}
            <strong>
              {operatorName}
            </strong>
          </span>

          <span>
            Stage:{" "}
            <strong>
              {currentStage.replace(
                "_",
                " "
              )}
            </strong>
          </span>

          <span>
            Shift:{" "}
            <strong>
              {form.shift || "-"}
            </strong>
          </span>

          <div style={styles.headerButtons}>
            <button
              onClick={() => {
                if (navigate) {
                  navigate(
                    "/admin/login"
                  );
                } else {
                  window.location.href =
                    "/admin/login";
                }
              }}
              style={styles.adminButton}
            >
              ADMIN
            </button>

            <button
              onClick={handleLogout}
              style={styles.logoutButton}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      <div style={styles.frameActions}>
        <GeneralInfo
          form={form}
          handleInput={handleInput}
        />

        <button
          onClick={createFrame}
          disabled={!!recordId}
          style={{
            ...styles.primaryButton,
            ...(recordId
              ? styles.disabled
              : {}),
          }}
        >
          {recordId
            ? "FRAME CREATED"
            : "CREATE FRAME"}
        </button>

        <button
          onClick={resetForm}
          style={
            styles.secondaryButton
          }
        >
          NEW FRAME
        </button>

        {recordId && (
          <span
            style={styles.recordId}
          >
            Record ID: {recordId}
          </span>
        )}
      </div>

      <div style={styles.sheetTabs}>
        {SHEETS.map((sheet) => {
          const status =
            sheetStatus[sheet.key];

          const active =
            activeSheet ===
            sheet.key;

          return (
            <button
              key={sheet.key}
              onClick={() =>
                changeSheet(
                  sheet.key
                )
              }
              style={{
                ...styles.sheetTab,

                ...(active
                  ? styles.activeTab
                  : {}),

                ...(status ===
                "PASSED"
                  ? styles.passedTab
                  : {}),
              }}
            >
              {sheet.name}

              {status ===
                "PASSED" &&
                " ✓"}
            </button>
          );
        })}
      </div>

      <div style={styles.sheetContent}>

        {currentSheetPassed && (
          <div
            style={
              styles.passedMessage
            }
          >
            ✓ This sheet has already been
            passed. It is available for
            viewing only.
          </div>
        )}

        {!recordId && (
          <div
            style={
              styles.warningMessage
            }
          >
            Please create a frame before
            entering inspection data.
          </div>
        )}

        {/* =================================================
            IMPORTANT:
            A PASSED sheet is completely VIEW ONLY.
            Before passing, all fields remain editable.
            ================================================= */}
        <fieldset
          disabled={currentSheetPassed}
          style={{
            border: "none",
            padding: 0,
            margin: 0,
            minWidth: 0,
          }}
        >
          {renderSheet()}
        </fieldset>

      </div>

      <div style={styles.actions}>

        <button
          onClick={saveSheet}
          disabled={
            savingSheet ||
            passingSheet ||
            exportingExcel ||
            !recordId ||
            currentSheetPassed
          }
          style={{
            ...styles.saveButton,

            ...(savingSheet ||
            passingSheet ||
            exportingExcel ||
            !recordId ||
            currentSheetPassed
              ? styles.disabled
              : {}),
          }}
        >
          {savingSheet
            ? "Saving..."
            : "SAVE SHEET"}
        </button>

        <button
          onClick={passSheet}
          disabled={
            passingSheet ||
            savingSheet ||
            exportingExcel ||
            !recordId ||
            currentSheetPassed
          }
          style={{
            ...styles.passButton,

            ...(passingSheet ||
            savingSheet ||
            exportingExcel ||
            !recordId ||
            currentSheetPassed
              ? styles.disabled
              : {}),
          }}
        >
          {passingSheet
            ? "Passing..."
            : "PASS SHEET"}
        </button>

        <button
          onClick={exportExcel}
          disabled={
            !recordId ||
            exportingExcel
          }
          style={{
            ...styles.exportButton,

            ...(!recordId ||
            exportingExcel
              ? styles.disabled
              : {}),
          }}
        >
          {exportingExcel
            ? "EXPORTING..."
            : "EXPORT EXCEL"}
        </button>

      </div>
    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    paddingBottom: "40px",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 20px",
    background: "#0f172a",
    color: "#fff",
    gap: "20px",
    flexWrap: "wrap",
  },

  subtitle: {
    marginTop: "4px",
    fontSize: "12px",
    opacity: 0.8,
  },

  operatorInfo: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    fontSize: "13px",
    flexWrap: "wrap",
  },

  headerButtons: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "10px",
  },

  adminButton: {
    padding: "9px 16px",
    background: "#ffffff",
    color: "#0f172a",
    border: "none",
    borderRadius: "6px",
    fontWeight: "700",
    cursor: "pointer",
  },

  logoutButton: {
    padding: "9px 16px",
    background: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "700",
    cursor: "pointer",
  },

  frameActions: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "15px 20px",
    flexWrap: "wrap",
    background: "#fff",
    borderBottom:
      "1px solid #e2e8f0",
  },

  primaryButton: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "5px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "10px 18px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "5px",
    background: "#fff",
    color: "#334155",
    fontWeight: "600",
    cursor: "pointer",
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  recordId: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },

  sheetTabs: {
    display: "flex",
    gap: "5px",
    padding: "0 20px",
    borderBottom:
      "1px solid #cbd5e1",
    overflowX: "auto",
    background: "#f8fafc",
  },

  sheetTab: {
    padding: "11px 20px",
    border:
      "1px solid #cbd5e1",
    borderBottom: "none",
    borderRadius:
      "6px 6px 0 0",
    background: "#e2e8f0",
    cursor: "pointer",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },

  activeTab: {
    background: "#fff",
    fontWeight: "700",
    borderTop:
      "3px solid #2563eb",
  },

  passedTab: {
    background: "#dcfce7",
    color: "#166534",
  },

  sheetContent: {
    padding: "20px",
  },

  passedMessage: {
    padding: "12px 16px",
    marginBottom: "15px",
    borderRadius: "6px",
    background: "#dcfce7",
    border:
      "1px solid #86efac",
    color: "#166534",
    fontWeight: "600",
  },

  warningMessage: {
    padding: "14px 18px",
    marginBottom: "15px",
    borderRadius: "6px",
    background: "#fef3c7",
    border:
      "1px solid #fcd34d",
    color: "#92400e",
    fontWeight: "600",
  },

  actions: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "15px",
    padding: "20px",
    flexWrap: "wrap",
  },

  saveButton: {
    minWidth: "130px",
    padding: "12px 25px",
    border: "none",
    borderRadius: "5px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
  },

  passButton: {
    minWidth: "150px",
    padding: "12px 25px",
    border: "none",
    borderRadius: "5px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
  },

  exportButton: {
    minWidth: "150px",
    padding: "12px 25px",
    border:
      "1px solid #16a34a",
    borderRadius: "5px",
    background: "#ffffff",
    color: "#15803d",
    fontWeight: "700",
    cursor: "pointer",
  },
};

export default InspectionPage;
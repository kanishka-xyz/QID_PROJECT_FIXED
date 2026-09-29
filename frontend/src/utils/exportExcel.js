import * as XLSX from "xlsx";
import {
  getSheetData,
} from "./inspectionData";


// =====================================================
// CONVERT VALUE FOR EXCEL
// =====================================================

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "YES" : "NO";
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
};


// =====================================================
// CREATE NORMAL SHEET
// =====================================================

const createNormalSheet = (data) => {
  const rows = [];

  Object.entries(data || {}).forEach(
    ([field, value]) => {
      if (Array.isArray(value)) {
        return;
      }

      rows.push({
        Field: field,
        Value: formatValue(value),
      });
    }
  );

  return XLSX.utils.json_to_sheet(rows);
};


// =====================================================
// CREATE SPATTER SHEET
// =====================================================

const createSpatterSheet = (data) => {
  const rows = [];

  // Spatter Present
  rows.push({
    Field: "Spatter Present",
    Value: formatValue(
      data?.spatter_present
    ),
  });

  // Remarks
  if (data?.spatter_remark !== undefined) {
    rows.push({
      Field: "Remark",
      Value: formatValue(
        data.spatter_remark
      ),
    });
  }

  // Spatter locations
  const locations =
    data?.spatter_locations || [];

  if (locations.length > 0) {
    rows.push({});
    rows.push({
      Field: "Spatter Locations",
      Value: "",
    });

    locations.forEach(
      (location, index) => {
        rows.push({
          "Sr. No.": index + 1,
          "Frame Centre Member No.":
            location.frame_centre_member_no || "",
          Location:
            location.location || "",
          Remark:
            location.remark || "",
        });
      }
    );
  }

  return XLSX.utils.json_to_sheet(rows);
};


// =====================================================
// EXPORT INSPECTION TO EXCEL
// =====================================================

export const exportInspectionToExcel = (
  form,
  frameNo
) => {
  try {
    const workbook =
      XLSX.utils.book_new();


    // =================================================
    // SHEET 1 - LEAKAGE
    // =================================================

    const leakageData =
      getSheetData(
        "sheet1",
        form
      );

    const leakageSheet =
      createNormalSheet(
        leakageData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      leakageSheet,
      "Leakage"
    );


    // =================================================
    // SHEET 2 - DEFECTS
    // =================================================

    const defectData =
      getSheetData(
        "sheet2",
        form
      );

    const defectSheet =
      createNormalSheet(
        defectData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      defectSheet,
      "Defects"
    );


    // =================================================
    // SHEET 3 - SPATTER
    // =================================================

    const spatterData =
      getSheetData(
        "sheet3",
        form
      );

    const spatterSheet =
      createSpatterSheet(
        spatterData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      spatterSheet,
      "Spatter"
    );


    // =================================================
    // SHEET 4 - PDI
    // =================================================

    const pdiData =
      getSheetData(
        "sheet4",
        form
      );

    const pdiSheet =
      createNormalSheet(
        pdiData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      pdiSheet,
      "PDI"
    );


    // =================================================
    // COLUMN WIDTHS
    // =================================================

    workbook.Sheets["Leakage"]["!cols"] = [
      { wch: 38 },
      { wch: 30 },
    ];

    workbook.Sheets["Defects"]["!cols"] = [
      { wch: 42 },
      { wch: 30 },
    ];

    workbook.Sheets["Spatter"]["!cols"] = [
      { wch: 32 },
      { wch: 32 },
      { wch: 30 },
      { wch: 35 },
    ];

    workbook.Sheets["PDI"]["!cols"] = [
      { wch: 30 },
      { wch: 30 },
    ];


    // =================================================
    // FILE NAME
    // =================================================

    const safeFrameNo =
      String(frameNo || "Inspection")
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

    const fileName =
      `OP40_Inspection_${safeFrameNo}.xlsx`;


    // =================================================
    // DOWNLOAD
    // =================================================

    XLSX.writeFile(
      workbook,
      fileName
    );

  } catch (error) {
    console.error(
      "Excel export failed:",
      error
    );

    alert(
      "Could not export inspection data."
    );
  }
};
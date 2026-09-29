// =====================================================
// INSPECTION DATA
// =====================================================

// -----------------------------------------------------
// SHEETS
// -----------------------------------------------------

export const SHEETS = [
  {
    key: "sheet1",
    name: "Leakage",
  },
  {
    key: "sheet2",
    name: "Defects",
  },
  {
    key: "sheet3",
    name: "Spatter",
  },
];

// -----------------------------------------------------
// INITIAL SHEET STATUS
// -----------------------------------------------------

export const INITIAL_SHEET_STATUS = {
  sheet1: "IN_PROGRESS",
  sheet2: "IN_PROGRESS",
  sheet3: "IN_PROGRESS",
};

// -----------------------------------------------------
// INITIAL FORM
// -----------------------------------------------------

export const INITIAL_FORM = {
  // ===================================================
  // GENERAL
  // ===================================================

  frame_no: "",
  date: "",
  shift: "",

  // ===================================================
  // SHEET 1 - LEAKAGE
  // ===================================================

  top_T1: "",
  top_T3_I: "",
  top_T1_O: "",

  top_T2: "",
  top_T2_I: "",
  top_T2_O: "",

  top_T3: "",
  top_T3_I_2: "",
  top_T3_O: "",

  top_T4: "",
  top_T4_I: "",
  top_T4_O: "",

  bottom_B1: "",
  bottom_B2: "",
  bottom_B3: "",
  bottom_B4: "",

  vent_valve_I: "",

  fm_cm: "",
  rm_cm: "",
  leakage_ok: "",

  leakage_remark: "",

  // ===================================================
  // SHEET 2 - DEFECTS
  // ===================================================

  porosity_above_2mm: "",
  excess_welding_BDU: "",
  welding_lump: "",
  protrusion_inside_cm: "",
  no_masking_tape: "",
  excess_welding_top_corner: "",
  loose_burr_rivet: "",
  excess_welding_top_surface: "",
  leak_of_frame: "",
  centre_member_dowel_damage: "",
  top_side_corner_unfilled: "",
  chips_header_unit: "",
  spatter_burr_sleeve_cm: "",
  cm4_top_m6_thread_damage: "",
  dent_top_sleeve: "",

  defect_remark: "",

  // ===================================================
  // SHEET 3 - SPATTER
  // ===================================================

  spatter_present: "",
  spatter_remark: "",

  spatter_locations: [],


  // ===================================================
  // FINAL
  // ===================================================

  final_status: "OK",
  rework_required: false,
};

// -----------------------------------------------------
// CREATE A FRESH FORM
// -----------------------------------------------------

export const createInitialForm = () => ({
  ...INITIAL_FORM,
  spatter_locations: [],
});

// -----------------------------------------------------
// CREATE FRESH SHEET STATUS
// -----------------------------------------------------

export const createInitialSheetStatus = () => ({
  ...INITIAL_SHEET_STATUS,
});

// -----------------------------------------------------
// SHEET 1 DATA
// -----------------------------------------------------

export const getLeakageData = (form) => ({
  top_T1: form.top_T1,
  top_T3_I: form.top_T3_I,
  top_T1_O: form.top_T1_O,

  top_T2: form.top_T2,
  top_T2_I: form.top_T2_I,
  top_T2_O: form.top_T2_O,

  top_T3: form.top_T3,
  top_T3_I_2: form.top_T3_I_2,
  top_T3_O: form.top_T3_O,

  top_T4: form.top_T4,
  top_T4_I: form.top_T4_I,
  top_T4_O: form.top_T4_O,

  bottom_B1: form.bottom_B1,
  bottom_B2: form.bottom_B2,
  bottom_B3: form.bottom_B3,
  bottom_B4: form.bottom_B4,

  vent_valve_I: form.vent_valve_I,

  fm_cm: form.fm_cm,
  rm_cm: form.rm_cm,
  leakage_ok: form.leakage_ok,

  leakage_remark: form.leakage_remark,
});

// -----------------------------------------------------
// SHEET 2 DATA
// -----------------------------------------------------

export const getDefectData = (form) => ({
  porosity_above_2mm: form.porosity_above_2mm,
  excess_welding_BDU: form.excess_welding_BDU,
  welding_lump: form.welding_lump,
  protrusion_inside_cm: form.protrusion_inside_cm,
  no_masking_tape: form.no_masking_tape,
  excess_welding_top_corner:
    form.excess_welding_top_corner,
  loose_burr_rivet: form.loose_burr_rivet,
  excess_welding_top_surface:
    form.excess_welding_top_surface,
  leak_of_frame: form.leak_of_frame,
  centre_member_dowel_damage:
    form.centre_member_dowel_damage,
  top_side_corner_unfilled:
    form.top_side_corner_unfilled,
  chips_header_unit: form.chips_header_unit,
  spatter_burr_sleeve_cm:
    form.spatter_burr_sleeve_cm,
  cm4_top_m6_thread_damage:
    form.cm4_top_m6_thread_damage,
  dent_top_sleeve: form.dent_top_sleeve,

  defect_remark: form.defect_remark,
});

// -----------------------------------------------------
// SHEET 3 DATA
// -----------------------------------------------------

export const getSpatterData = (form) => ({
  spatter_present: form.spatter_present,

  spatter_locations:
    form.spatter_locations,

  spatter_remark:
    form.spatter_remark,
});

// -----------------------------------------------------
// GET DATA FOR CURRENT SHEET
// -----------------------------------------------------

export const getSheetData = (
  sheetName,
  form
) => {
  switch (sheetName) {
    case "sheet1":
      return getLeakageData(form);

    case "sheet2":
      return getDefectData(form);

    case "sheet3":
      return getSpatterData(form);

    default:
      return {};
  }
};
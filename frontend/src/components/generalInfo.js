import React, { useEffect, useState } from "react";
import axios from "axios";

export default function GeneralInfo({ form, handleInput }) {
  // =====================================================
  // STATE
  // =====================================================

  const [isNewOperator, setIsNewOperator] = useState(false);
  const [isNewShift, setIsNewShift] = useState(false);

  const [operators, setOperators] = useState([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  // =====================================================
  // API
  // =====================================================

  const API = "http://localhost:8000";

  // =====================================================
  // LOAD ACTIVE OPERATORS
  // =====================================================

  const loadOperators = async () => {
    try {
      setLoadingOperators(true);

      const response = await axios.get(
        `${API}/admin/public/operators`
      );

      setOperators(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error(
        "Could not load operators:",
        error
      );
    } finally {
      setLoadingOperators(false);
    }
  };

  // =====================================================
  // INITIAL LOAD + AUTO REFRESH
  // =====================================================

  useEffect(() => {
    loadOperators();

    const interval = setInterval(() => {
      loadOperators();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =====================================================
  // FILTER OPERATORS BY STAGE + SHIFT
  // =====================================================

  const filteredOperators = operators.filter((operator) => {
    const stageMatches =
      !form.stage ||
      operator.stage === form.stage;

    const shiftMatches =
      !form.shift ||
      operator.shift === form.shift;

    return stageMatches && shiftMatches;
  });

  // =====================================================
  // VALIDATION
  // =====================================================

  const frameNoFilled =
    form.frame_no &&
    form.frame_no.trim() !== "";

  const operatorFilled =
    form.operator_name &&
    form.operator_name.trim() !== "";

  const shiftFilled =
    form.shift &&
    form.shift.trim() !== "";

  const stageFilled =
    form.stage &&
    form.stage.trim() !== "";

  // =====================================================
  // OPERATOR CHANGE
  // =====================================================

  const handleOperatorChange = (e) => {
    const value = e.target.value;

    if (value === "__new_operator__") {
      setIsNewOperator(true);

      handleInput(
        "operator_name",
        ""
      );
    } else {
      setIsNewOperator(false);

      handleInput(
        "operator_name",
        value
      );
    }
  };

  // =====================================================
  // SHIFT CHANGE
  // =====================================================

  const handleShiftChange = (e) => {
    const value = e.target.value;

    if (value === "__new_shift__") {
      setIsNewShift(true);

      handleInput(
        "shift",
        ""
      );
    } else {
      setIsNewShift(false);

      handleInput(
        "shift",
        value
      );
    }
  };

  // =====================================================
  // STAGE CHANGE
  // =====================================================

  const handleStageChange = (e) => {
    const value = e.target.value;

    handleInput(
      "stage",
      value
    );

    // Clear operator if it doesn't belong
    // to the newly selected stage
    if (
      form.operator_name &&
      !operators.some(
        (operator) =>
          operator.name === form.operator_name &&
          operator.stage === value &&
          operator.shift === form.shift
      )
    ) {
      handleInput(
        "operator_name",
        ""
      );
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <section style={sectionStyle}>

      {/* =================================================
          HEADER
      ================================================= */}

      <div style={headerStyle}>

        <div>
          <div style={titleStyle}>
            General Inspection Information
          </div>

          <div style={subtitleStyle}>
            Enter the frame and operator details
            before starting the inspection.
          </div>
        </div>

        <div
          style={{
            ...statusBadgeStyle,
            background:
              frameNoFilled &&
              stageFilled &&
              shiftFilled &&
              operatorFilled
                ? "#ecfdf5"
                : "#fff7ed",
            color:
              frameNoFilled &&
              stageFilled &&
              shiftFilled &&
              operatorFilled
                ? "#047857"
                : "#c2410c",
            border:
              frameNoFilled &&
              stageFilled &&
              shiftFilled &&
              operatorFilled
                ? "1px solid #a7f3d0"
                : "1px solid #fed7aa",
          }}
        >
          <span style={statusDotStyle}>
            ●
          </span>

          {frameNoFilled &&
          stageFilled &&
          shiftFilled &&
          operatorFilled
            ? "READY"
            : "INCOMPLETE"}
        </div>

      </div>


      {/* =================================================
          FORM
      ================================================= */}

      <div style={formGridStyle}>

        {/* FRAME NUMBER */}

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Frame Centre Member No.
            <span style={requiredStyle}>*</span>
          </label>

          <input
            style={{
              ...inputStyle,
              ...(frameNoFilled
                ? {}
                : invalidInputStyle),
            }}
            value={form.frame_no || ""}
            placeholder="Enter frame number"
            onChange={(e) =>
              handleInput(
                "frame_no",
                e.target.value
              )
            }
            required
          />

          {!frameNoFilled && (
            <small style={errorStyle}>
              Frame Centre Member No. is required.
            </small>
          )}
        </div>


        {/* DATE */}

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Date
          </label>

          <input
            type="date"
            style={inputStyle}
            value={form.date || ""}
            onChange={(e) =>
              handleInput(
                "date",
                e.target.value
              )
            }
          />
        </div>


        {/* STAGE */}

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Stage
            <span style={requiredStyle}>*</span>
          </label>

          <select
            style={{
              ...inputStyle,
              ...(stageFilled
                ? {}
                : invalidInputStyle),
            }}
            value={form.stage || ""}
            onChange={handleStageChange}
            required
          >
            <option value="">
              Select Stage
            </option>

            <option value="STAGE_1">
              Stage 1
            </option>

            <option value="STAGE_2">
              Stage 2
            </option>

            <option value="STAGE_3">
              Stage 3
            </option>
          </select>

          {!stageFilled && (
            <small style={errorStyle}>
              Stage is required.
            </small>
          )}
        </div>


        {/* SHIFT */}

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Shift
            <span style={requiredStyle}>*</span>
          </label>

          {!isNewShift ? (
            <>
              <select
                style={{
                  ...inputStyle,
                  ...(shiftFilled
                    ? {}
                    : invalidInputStyle),
                }}
                value={
                  ["A", "B", "C"].includes(
                    form.shift
                  )
                    ? form.shift
                    : ""
                }
                onChange={handleShiftChange}
                required
              >
                <option value="">
                  Select Shift
                </option>

                <option value="A">
                  Shift A
                </option>

                <option value="B">
                  Shift B
                </option>

                <option value="C">
                  Shift C
                </option>

                <option value="__new_shift__">
                  + New Shift
                </option>
              </select>

              {!shiftFilled && (
                <small style={errorStyle}>
                  Shift is required.
                </small>
              )}
            </>
          ) : (
            <>
              <input
                style={{
                  ...inputStyle,
                  ...(shiftFilled
                    ? {}
                    : invalidInputStyle),
                }}
                value={form.shift || ""}
                placeholder="Enter new shift"
                autoFocus
                onChange={(e) =>
                  handleInput(
                    "shift",
                    e.target.value
                  )
                }
                required
              />

              <button
                type="button"
                onClick={() => {
                  setIsNewShift(false);

                  handleInput(
                    "shift",
                    ""
                  );
                }}
                style={changeButtonStyle}
              >
                ← Select existing shift
              </button>

              {!shiftFilled && (
                <small style={errorStyle}>
                  Shift is required.
                </small>
              )}
            </>
          )}
        </div>


        {/* =================================================
            OPERATOR
        ================================================= */}

        <div
          style={{
            ...fieldStyle,
            gridColumn:
              "1 / -1",
          }}
        >
          <div style={operatorHeaderStyle}>

            <label style={labelStyle}>
              Operator Name
              <span style={requiredStyle}>*</span>
            </label>

            <span style={syncBadgeStyle}>
              <span style={syncDotStyle}>
                ●
              </span>
              Admin Synced
            </span>

          </div>

          {!isNewOperator ? (
            <>
              <select
                style={{
                  ...inputStyle,
                  ...(operatorFilled
                    ? {}
                    : invalidInputStyle),
                }}
                value={
                  filteredOperators.some(
                    (operator) =>
                      operator.name ===
                      form.operator_name
                  )
                    ? form.operator_name
                    : ""
                }
                onChange={handleOperatorChange}
                required
              >
                <option value="">
                  {loadingOperators
                    ? "Loading operators..."
                    : filteredOperators.length === 0
                    ? "No operators available for selected Stage / Shift"
                    : "Select Operator"}
                </option>

                {filteredOperators.map(
                  (operator) => (
                    <option
                      key={
                        operator.operator_id
                      }
                      value={
                        operator.name
                      }
                    >
                      {operator.name}
                      {" "}
                      ({operator.operator_id})
                      {" "}
                      - Shift {operator.shift}
                    </option>
                  )
                )}

                <option value="__new_operator__">
                  + New Operator
                </option>
              </select>

              {!operatorFilled && (
                <small style={errorStyle}>
                  Operator Name is required.
                </small>
              )}

              {form.stage &&
                form.shift &&
                filteredOperators.length === 0 && (
                  <div style={noOperatorStyle}>
                    <span style={{ fontSize: "16px" }}>
                      ℹ
                    </span>

                    <span>
                      No active operator is assigned
                      to {form.stage.replace("_", " ")}
                      {" "}and Shift {form.shift}.
                    </span>
                  </div>
                )}
            </>
          ) : (
            <>
              <input
                style={{
                  ...inputStyle,
                  ...(operatorFilled
                    ? {}
                    : invalidInputStyle),
                }}
                value={
                  form.operator_name || ""
                }
                placeholder="Enter new operator name"
                autoFocus
                onChange={(e) =>
                  handleInput(
                    "operator_name",
                    e.target.value
                  )
                }
                required
              />

              <button
                type="button"
                onClick={() => {
                  setIsNewOperator(false);

                  handleInput(
                    "operator_name",
                    ""
                  );
                }}
                style={changeButtonStyle}
              >
                ← Select existing operator
              </button>

              {!operatorFilled && (
                <small style={errorStyle}>
                  Operator Name is required.
                </small>
              )}
            </>
          )}

          <div style={helperStyle}>
            Active operators are automatically
            synchronized with the Admin panel.
          </div>
        </div>

      </div>


      {/* =================================================
          COMPLETION / WARNING
      ================================================= */}

      {!(
        frameNoFilled &&
        stageFilled &&
        shiftFilled &&
        operatorFilled
      ) && (
        <div style={warningStyle}>
          <div style={warningIconStyle}>
            ⚠
          </div>

          <div>
            <div style={warningTitleStyle}>
              Inspection details incomplete
            </div>

            <div style={warningTextStyle}>
              Please enter the required information
              before proceeding with the inspection.
            </div>
          </div>
        </div>
      )}

      {frameNoFilled &&
        stageFilled &&
        shiftFilled &&
        operatorFilled && (
          <div style={successStyle}>
            <span style={successIconStyle}>
              ✓
            </span>

            <div>
              <strong>
                Inspection details ready
              </strong>

              <span style={successTextStyle}>
                {" "}You can proceed with the inspection.
              </span>
            </div>
          </div>
        )}

    </section>
  );
}


/* =====================================================
   STYLES
===================================================== */

const sectionStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#ffffff",
  border: "1px solid #dbe3ee",
  borderRadius: "14px",
  padding: "26px 28px",
  marginBottom: "22px",
  boxShadow:
    "0 2px 8px rgba(15, 23, 42, 0.05)",
};


/* HEADER */

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "26px",
  paddingBottom: "18px",
  borderBottom:
    "1px solid #e5eaf1",
};

const titleStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#172033",
  letterSpacing: "-0.3px",
};

const subtitleStyle = {
  marginTop: "5px",
  fontSize: "13px",
  color: "#64748b",
};

const statusBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "7px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.5px",
  whiteSpace: "nowrap",
};

const statusDotStyle = {
  fontSize: "9px",
};


/* FORM */

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(180px, 1fr))",
  gap: "20px 18px",
};

const fieldStyle = {
  minWidth: 0,
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#334155",
  marginBottom: "7px",
};

const requiredStyle = {
  color: "#dc2626",
  marginLeft: "4px",
  fontWeight: "700",
};

const inputStyle = {
  display: "block",
  width: "100%",
  height: "44px",
  boxSizing: "border-box",
  padding: "0 12px",
  border:
    "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#172033",
  fontSize: "14px",
  outline: "none",
  transition:
    "border-color 0.2s ease, box-shadow 0.2s ease",
};

const invalidInputStyle = {
  border:
    "1px solid #ef4444",
  background: "#fffafa",
};


/* OPERATOR */

const operatorHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "7px",
};

const syncBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 8px",
  borderRadius: "12px",
  background: "#f0fdf4",
  color: "#15803d",
  border:
    "1px solid #bbf7d0",
  fontSize: "10px",
  fontWeight: "600",
};

const syncDotStyle = {
  fontSize: "7px",
};

const helperStyle = {
  marginTop: "7px",
  color: "#64748b",
  fontSize: "11px",
};


/* ERRORS */

const errorStyle = {
  display: "block",
  color: "#dc2626",
  fontSize: "11px",
  marginTop: "5px",
};


/* NEW BUTTON */

const changeButtonStyle = {
  marginTop: "7px",
  padding: "4px 0",
  border: "none",
  background: "transparent",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "500",
};


/* NO OPERATOR */

const noOperatorStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginTop: "8px",
  padding: "9px 11px",
  borderRadius: "7px",
  background: "#fffbeb",
  border:
    "1px solid #fde68a",
  color: "#92400e",
  fontSize: "11px",
};


/* WARNING */

const warningStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginTop: "22px",
  padding: "12px 15px",
  borderRadius: "8px",
  background: "#fff7ed",
  border:
    "1px solid #fed7aa",
};

const warningIconStyle = {
  width: "27px",
  height: "27px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ffedd5",
  color: "#ea580c",
  fontSize: "14px",
  flexShrink: 0,
};

const warningTitleStyle = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#9a3412",
};

const warningTextStyle = {
  marginTop: "2px",
  fontSize: "11px",
  color: "#c2410c",
};


/* SUCCESS */

const successStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginTop: "22px",
  padding: "11px 14px",
  borderRadius: "8px",
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  color: "#166534",
  fontSize: "12px",
};

const successIconStyle = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dcfce7",
  color: "#16a34a",
  fontWeight: "700",
};

const successTextStyle = {
  color: "#15803d",
  fontWeight: "400",
};

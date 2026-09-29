import React from "react";

const fields = [
  ["top_T1", "FM to LH: T1"],
  ["top_T3_I", "FM to LH: T3 (I)"],
  ["top_T1_O", "FM to LH: T1 (O)"],
  ["top_T2", "FM to RH: T2"],
  ["top_T2_I", "FM to RH: T2 (I)"],
  ["top_T2_O", "FM to RH: T2 (O)"],
  ["top_T3", "RM to RH: T3"],
  ["top_T3_I_2", "RM to RH: T3 (I)"],
  ["top_T3_O", "RM to RH: T3 (O)"],
  ["top_T4", "RM to LH: T4"],
  ["top_T4_I", "RM to LH: T4 (I)"],
  ["top_T4_O", "RM to LH: T4 (O)"],
  ["bottom_B1", "Bottom B1"],
  ["bottom_B2", "Bottom B2"],
  ["bottom_B3", "Bottom B3"],
  ["bottom_B4", "Bottom B4"],
  ["vent_valve_I", "Vent Valve (I)"],
];

export default function LeakageSection({
  form,
  handleInput,
}) {
  return (
    <section style={cardStyle}>

      {/* HEADER */}
      <div style={headerStyle}>
        <h2>1. Top & Bottom Face Leakage Check</h2>

        <strong>
          Status: {form.leakage_ok || "NOT FILLED"}
        </strong>
      </div>

      {/* YES / NO INSPECTION BOXES */}
      <div style={gridStyle}>

        {fields.map(([id, label]) => {

          const value = form[id];

          return (
            <div
              key={id}
              style={{
                ...inspectionBoxStyle,

                ...(value === "YES"
                  ? yesBoxStyle
                  : value === "NO"
                  ? noBoxStyle
                  : {}),
              }}
            >

              <span style={labelStyle}>
                {label}
              </span>

              <div style={buttonContainerStyle}>

                <button
                  type="button"
                  onClick={() =>
                    handleInput(id, "YES")
                  }
                  style={{
                    ...yesNoButtonStyle,
                    ...(value === "YES"
                      ? selectedYesStyle
                      : {}),
                  }}
                >
                  YES
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleInput(id, "NO")
                  }
                  style={{
                    ...yesNoButtonStyle,
                    ...(value === "NO"
                      ? selectedNoStyle
                      : {}),
                  }}
                >
                  NO
                </button>

              </div>

            </div>
          );
        })}

      </div>

      {/* FM-CM / RM-CM / REMARK */}
      <div style={bottomGrid}>

        <div>
          <label>FM-CM</label>

          <select
            style={inputStyle}
            value={form.fm_cm || ""}
            onChange={(e) =>
              handleInput(
                "fm_cm",
                e.target.value
              )
            }
          >
            <option value="">
              Select
            </option>

            <option value="YES">
              YES
            </option>

            <option value="NO">
              NO
            </option>
          </select>
        </div>

        <div>
          <label>RM-CM</label>

          <select
            style={inputStyle}
            value={form.rm_cm || ""}
            onChange={(e) =>
              handleInput(
                "rm_cm",
                e.target.value
              )
            }
          >
            <option value="">
              Select
            </option>

            <option value="YES">
              YES
            </option>

            <option value="NO">
              NO
            </option>
          </select>
        </div>

        <div>
          <label>Remark</label>

          <input
            style={inputStyle}
            value={form.leakage_remark || ""}
            onChange={(e) =>
              handleInput(
                "leakage_remark",
                e.target.value
              )
            }
          />
        </div>

      </div>

    </section>
  );
}


/* =========================
   STYLES
========================= */

const cardStyle = {
  background: "#fff",
  padding: "20px",
  marginBottom: "20px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "15px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "10px",
};

const inspectionBoxStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  background: "#fff",
  minHeight: "48px",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: "500",
  flex: 1,
};

const buttonContainerStyle = {
  display: "flex",
  gap: "5px",
};

const yesNoButtonStyle = {
  minWidth: "48px",
  padding: "6px 9px",
  border: "1px solid #94a3b8",
  borderRadius: "4px",
  background: "#fff",
  fontSize: "11px",
  fontWeight: "600",
  cursor: "pointer",
};

const selectedYesStyle = {
  background: "#16a34a",
  color: "#fff",
  borderColor: "#16a34a",
};

const selectedNoStyle = {
  background: "#dc2626",
  color: "#fff",
  borderColor: "#dc2626",
};

const yesBoxStyle = {
  borderColor: "#16a34a",
  background: "#f0fdf4",
};

const noBoxStyle = {
  borderColor: "#dc2626",
  background: "#fef2f2",
};

const bottomGrid = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr 2fr",
  gap: "12px",
  marginTop: "15px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px",
  marginTop: "5px",
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
};
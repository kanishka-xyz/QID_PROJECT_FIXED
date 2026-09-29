import React from "react";

const checkpoints = [
  ["pdi_cp1", "Ext/Int weld, mounting hole, bottom cover"],
  ["pdi_cp2", "Check machining appearance"],
  ["pdi_cp3", "Frame bottom surface appearance"],
  ["pdi_cp4", "No sharp edges / cut marks / clamping marks"],
  ["pdi_cp5", "Weld suit clean & consistent"],
  ["pdi_cp6", "Ext/Int welds free from excess, porosity, crack"],
  ["pdi_cp7", "Burn through or hole at corners of weld"],
  ["pdi_cp8", "Free from oily surface & blackish spots"],
  ["pdi_cp9", "Mounting holes deburring done"],
  ["pdi_cp10", "Mounting hole free from burr & sharp edges"],
  ["pdi_cp11", "Loose metal chips / burr / sharp edges"],
  ["pdi_cp12", "Frame inside pocket appearance"],
  ["pdi_cp13", "All holes clean, no dent/damage"],
  ["pdi_cp14", "BDU boss & ground cable welding appearance"],
  ["pdi_cp15", "Porosity in block support"],
  ["pdi_cp16", "Block support welding appearance"],
  ["pdi_cp17", "Cooling plate resting area"],
  ["pdi_cp18", "Excess welding in centre member"],
  ["pdi_cp19", "Extra material near cooling plate corners"],
];

export default function PDISection({
  form,
  handleInput,
}) {
  return (
    <section style={cardStyle}>

      <h2>4. PDI In-Process Inspection</h2>

      <div style={gridStyle}>

        {checkpoints.map(([id, label]) => (
          <div
            key={id}
            style={{
              ...checkStyle,
              ...(form[id] === "YES"
                ? yesBoxStyle
                : form[id] === "NO"
                ? noBoxStyle
                : {}),
            }}
          >

            <div style={labelStyle}>
              {label}
            </div>

            <div style={buttonContainerStyle}>

              <button
                type="button"
                onClick={() =>
                  handleInput(id, "YES")
                }
                style={{
                  ...yesNoButton,
                  ...(form[id] === "YES"
                    ? yesActiveStyle
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
                  ...yesNoButton,
                  ...(form[id] === "NO"
                    ? noActiveStyle
                    : {}),
                }}
              >
                NO
              </button>

            </div>

          </div>
        ))}

      </div>

      <input
        style={remarkStyle}
        placeholder="PDI remark..."
        value={form.pdi_remark || ""}
        onChange={(e) =>
          handleInput(
            "pdi_remark",
            e.target.value
          )
        }
      />

    </section>
  );
}

const cardStyle = {
  background: "#fff",
  padding: "20px",
  marginBottom: "20px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "12px",
};

const checkStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  background: "#fff",
};

const yesBoxStyle = {
  borderColor: "#16a34a",
  background: "#f0fdf4",
};

const noBoxStyle = {
  borderColor: "#dc2626",
  background: "#fef2f2",
};

const labelStyle = {
  flex: 1,
  fontSize: "13px",
  lineHeight: "1.4",
};

const buttonContainerStyle = {
  display: "flex",
  gap: "6px",
};

const yesNoButton = {
  minWidth: "55px",
  padding: "7px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
  background: "#fff",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "12px",
};

const yesActiveStyle = {
  background: "#16a34a",
  color: "#fff",
  borderColor: "#16a34a",
};

const noActiveStyle = {
  background: "#dc2626",
  color: "#fff",
  borderColor: "#dc2626",
};

const remarkStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: "15px",
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
};
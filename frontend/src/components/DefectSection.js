import React from "react";

const defects = [
  ["porosity_above_2mm", "Porosity above 2mm"],
  ["excess_welding_BDU", "Excess welding BDU"],
  ["welding_lump", "Welding lump on frame"],
  ["protrusion_inside_cm", "Protrusion inside CM"],
  ["no_masking_tape", "No masking tape"],
  ["excess_welding_top_corner", "Excess welding top corner"],
  ["loose_burr_rivet", "Loose burr / rivet"],
  ["excess_welding_top_surface", "Excess welding top surface"],
  ["leak_of_frame", "Leak of frame"],
  ["centre_member_dowel_damage", "Centre member dowel damage"],
  ["top_side_corner_unfilled", "Top side corner unfilled"],
  ["chips_header_unit", "Chips in header unit"],
  ["spatter_burr_sleeve_cm", "Spatter/burr sleeve CM"],
  ["cm4_top_m6_thread_damage", "CM4 top M6 thread damage"],
  ["dent_top_sleeve", "Dent top sleeve"],
];

export default function DefectSection({
  form,
  handleInput,
}) {
  return (
    <section style={cardStyle}>

      {/* =========================
          HEADER
      ========================= */}

      <div style={headerStyle}>

        <h2 style={titleStyle}>
          2. Inspection Checklist / Defects
        </h2>

        <strong
          style={{
            color:
              form.defect_ok === "OK"
                ? "#16a34a"
                : form.defect_ok === "NOK"
                ? "#dc2626"
                : "#64748b",
          }}
        >
          Status: {form.defect_ok || "NOT FILLED"}
        </strong>

      </div>


      {/* =========================
          INSTRUCTIONS
      ========================= */}

      <div style={instructionStyle}>
        Select <strong>YES</strong> or <strong>NO</strong> for every
        inspection point.
      </div>


      {/* =========================
          DEFECT CHECKLIST
      ========================= */}

      <div style={gridStyle}>

        {defects.map(([id, label]) => {

          const value = form[id] || "";

          return (
            <div
              key={id}
              style={{
                ...inspectionBoxStyle,

                ...(value === "YES"
                  ? yesBoxStyle
                  : value === "NO"
                  ? noBoxStyle
                  : emptyBoxStyle),
              }}
            >

              {/* LABEL */}

              <span style={labelStyle}>
                {label}
              </span>


              {/* YES / NO */}

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


      {/* =========================
          REMARK
      ========================= */}

      <div style={remarkContainerStyle}>

        <label style={remarkLabelStyle}>
          Defect Inspection Remark
        </label>

        <input
          type="text"
          style={remarkStyle}
          placeholder="Enter remark if required..."
          value={form.defect_remark || ""}
          onChange={(e) =>
            handleInput(
              "defect_remark",
              e.target.value
            )
          }
        />

      </div>

    </section>
  );
}


/* =====================================================
   STYLES
===================================================== */

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
  gap: "20px",
};


const titleStyle = {
  margin: 0,
  fontSize: "20px",
};


const instructionStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  padding: "10px 12px",
  marginBottom: "15px",
  fontSize: "13px",
  color: "#475569",
};


const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "10px",
};


const inspectionBoxStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  minHeight: "52px",
  boxSizing: "border-box",
  borderRadius: "6px",
  transition: "0.15s",
};


const emptyBoxStyle = {
  background: "#fff",
  border: "1px solid #cbd5e1",
};


const yesBoxStyle = {
  background: "#f0fdf4",
  border: "1px solid #16a34a",
};


const noBoxStyle = {
  background: "#fef2f2",
  border: "1px solid #dc2626",
};


const labelStyle = {
  flex: 1,
  fontSize: "13px",
  fontWeight: "500",
  lineHeight: "1.3",
};


const buttonContainerStyle = {
  display: "flex",
  gap: "5px",
  flexShrink: 0,
};


const yesNoButtonStyle = {
  minWidth: "50px",
  height: "32px",
  padding: "5px 8px",
  border: "1px solid #94a3b8",
  borderRadius: "4px",
  background: "#fff",
  color: "#334155",
  fontSize: "11px",
  fontWeight: "700",
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


const remarkContainerStyle = {
  marginTop: "15px",
};


const remarkLabelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  marginBottom: "5px",
};


const remarkStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
  outline: "none",
};
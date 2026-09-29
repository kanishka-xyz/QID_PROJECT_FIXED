import React from "react";

export default function FinalStatus({
  form,
  handleInput,
  submit,
}) {
  const isOK = form.final_status === "OK";

  return (
    <section
      style={{
        ...cardStyle,
        borderColor: isOK ? "#86efac" : "#fca5a5",
      }}
    >
      {/* HEADER */}
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>
          Final Inspection Status
        </h2>

        <strong
          style={{
            color: isOK ? "#166534" : "#991b1b",
            fontSize: "18px",
          }}
        >
          {form.final_status || "NOT SET"}
        </strong>
      </div>

      {/* REWORK CHECKBOX */}
      <label style={checkStyle}>
        <input
          type="checkbox"
          checked={Boolean(form.rework_required)}
          onChange={(e) =>
            handleInput({
              target: {
                name: "rework_required",
                value: e.target.checked,
              },
            })
          }
        />

        <span>Rework Required</span>
      </label>

      {/* SUBMIT BUTTON */}
      <button
        type="button"
        style={submitStyle}
        onClick={submit}
      >
        Submit Inspection Data
      </button>
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
  border: "1px solid",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "15px",
};

const checkStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  margin: "15px 0",
  cursor: "pointer",
};

const submitStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "6px",
  fontWeight: "600",
  cursor: "pointer",
};
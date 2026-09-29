import React from "react";

function YesNoField({
  label,
  value,
  onChange,
}) {
  return (
    <div className="yes-no-field">

      <span className="yes-no-label">
        {label}
      </span>

      <div className="yes-no-buttons">

        <button
          type="button"
          className={value === "YES" ? "selected" : ""}
          onClick={() => onChange("YES")}
        >
          YES
        </button>

        <button
          type="button"
          className={value === "NO" ? "selected" : ""}
          onClick={() => onChange("NO")}
        >
          NO
        </button>

      </div>

    </div>
  );
}

export default YesNoField;
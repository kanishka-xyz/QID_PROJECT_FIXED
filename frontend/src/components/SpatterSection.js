import React from "react";

export default function SpatterSection({
  form,
  handleInput,
  addSpatter,
  removeSpatter,
  handleSpatterChange,
}) {
  return (
    <section style={cardStyle}>
      <div style={headerStyle}>
        <h2>3. Spatter Record</h2>

        <button
          type="button"
          onClick={addSpatter}
          style={buttonStyle}
        >
          + Add Location
        </button>
      </div>

      {/* Spatter Present */}
      <div style={questionStyle}>
        <span style={labelStyle}>Spatter Present</span>

        <div style={yesNoContainer}>
          <button
            type="button"
            onClick={() =>
              handleInput("spatter_present", "YES")
            }
            style={{
              ...yesNoButton,
              ...(form.spatter_present === "YES"
                ? yesActiveStyle
                : {}),
            }}
          >
            YES
          </button>

          <button
            type="button"
            onClick={() =>
              handleInput("spatter_present", "NO")
            }
            style={{
              ...yesNoButton,
              ...(form.spatter_present === "NO"
                ? noActiveStyle
                : {}),
            }}
          >
            NO
          </button>
        </div>
      </div>

      {/* Spatter Locations */}
      {form.spatter_locations &&
        form.spatter_locations.length > 0 && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Sr.</th>
                <th style={thStyle}>
                  Frame Centre Member No.
                </th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Remark</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {form.spatter_locations.map(
                (item, index) => (
                  <tr key={index}>
                    <td style={tdStyle}>
                      {index + 1}
                    </td>

                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={
                          item.frame_centre_member_no || ""
                        }
                        onChange={(e) =>
                          handleSpatterChange(
                            index,
                            "frame_centre_member_no",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={item.location || ""}
                        onChange={(e) =>
                          handleSpatterChange(
                            index,
                            "location",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={item.remark || ""}
                        onChange={(e) =>
                          handleSpatterChange(
                            index,
                            "remark",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td style={tdStyle}>
                      <button
                        type="button"
                        style={removeStyle}
                        onClick={() =>
                          removeSpatter(index)
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
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

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const buttonStyle = {
  padding: "8px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const questionStyle = {
  marginTop: "20px",
  display: "flex",
  alignItems: "center",
  gap: "25px",
  flexWrap: "wrap",
};

const labelStyle = {
  fontWeight: "600",
  minWidth: "150px",
};

const yesNoContainer = {
  display: "flex",
  gap: "10px",
};

const yesNoButton = {
  minWidth: "80px",
  padding: "9px 18px",
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
  background: "#fff",
  cursor: "pointer",
  fontWeight: "600",
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

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "20px",
};

const thStyle = {
  border: "1px solid #cbd5e1",
  padding: "10px",
  background: "#f1f5f9",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #cbd5e1",
  padding: "8px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
};

const removeStyle = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "none",
  padding: "6px 10px",
  borderRadius: "4px",
  cursor: "pointer",
};
import React, {
  useEffect,
  useState,
} from "react";

import {
  getCurrentAdmin,
  getAdminOperators,
  createOperator,
  deactivateOperator,
  adminLogout,
} from "../utils/adminApi";


function AdminOperatorsPage({
  navigate,
}) {

  const [admin, setAdmin] =
    useState(null);

  const [operators, setOperators] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  // =====================================================
  // FORM
  // =====================================================

  const [form, setForm] =
    useState({
      operator_id: "",
      name: "",
      pin: "",
      station: "OP40",
      stage: "STAGE_1",
      shift: "A",
    });


  // =====================================================
  // ERROR MESSAGE
  // =====================================================

  const getErrorMessage = (
    err,
    fallback
  ) => {

    const detail =
      err?.response?.data?.detail;

    if (
      typeof detail === "string"
    ) {
      return detail;
    }

    if (
      Array.isArray(detail)
    ) {
      return detail
        .map(
          (item) =>
            item?.msg ||
            JSON.stringify(item)
        )
        .join("\n");
    }

    if (
      detail &&
      typeof detail === "object"
    ) {
      return (
        detail.message ||
        detail.msg ||
        fallback
      );
    }

    return (
      err?.message ||
      fallback
    );
  };


  // =====================================================
  // LOAD OPERATORS
  // =====================================================

  const loadOperators =
    async () => {

      try {

        setError("");

        const adminData =
          await getCurrentAdmin();

        setAdmin(
          adminData
        );

        const data =
          await getAdminOperators();

        setOperators(
          Array.isArray(data)
            ? data
            : data?.operators ||
              []
        );

      } catch (err) {

        console.error(
          "Operators page error:",
          err
        );

        if (
          err?.response
            ?.status === 401 ||
          err?.response
            ?.status === 403
        ) {

          navigate(
            "/admin/login"
          );

          return;
        }

        setError(
          getErrorMessage(
            err,
            "Could not load operators."
          )
        );

      } finally {

        setLoading(false);
      }
    };


  useEffect(() => {
    loadOperators();
  }, []);


  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (
    field,
    value
  ) => {

    setForm(
      (previous) => ({
        ...previous,
        [field]:
          value,
      })
    );
  };


  // =====================================================
  // STATION CHANGE
  // =====================================================

  const handleStationChange =
    (value) => {

      // -------------------------------------------------
      // OP40
      // -------------------------------------------------

      if (
        value === "OP40"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "OP40",
            stage:
              previous.station ===
                "OP40" &&
              [
                "STAGE_1",
                "STAGE_2",
                "STAGE_3",
              ].includes(
                previous.stage
              )
                ? previous.stage
                : "STAGE_1",
          })
        );

        return;
      }


      // -------------------------------------------------
      // OP60
      // -------------------------------------------------

      if (
        value === "OP60"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "OP60",
            stage:
              "OP60",
          })
        );

        return;
      }


      // -------------------------------------------------
      // PDI STATION 3
      // -------------------------------------------------

      if (
        value ===
        "PDI_STATION_3"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "PDI_STATION_3",
            stage:
              "PDI_STATION_3",
          })
        );

        return;
      }

      // -------------------------------------------------
      // PDI STATION 4
      // -------------------------------------------------

      if (
        value ===
        "PDI_STATION_4"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "PDI_STATION_4",
            stage:
              "PDI_STATION_4",
          })
        );

        return;
      }


      // -------------------------------------------------
      // FIREWALL
      // -------------------------------------------------

      if (
        value ===
        "FIREWALL"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "FIREWALL",
            stage:
              "FIREWALL",
          })
        );

        return;
      }


      // -------------------------------------------------
      // DOCK STATION 1
      // -------------------------------------------------

      if (
        value ===
        "DOCK_STATION_1"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "DOCK_STATION_1",
            stage:
              "DOCK_STATION_1",
          })
        );

        return;
      }


      // -------------------------------------------------
      // DOCK STATION 2
      // -------------------------------------------------

      if (
        value ===
        "DOCK_STATION_2"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "DOCK_STATION_2",
            stage:
              "DOCK_STATION_2",
          })
        );

        return;
      }


      // -------------------------------------------------
      // DOCK STATION 3
      // -------------------------------------------------

      if (
        value ===
        "DOCK_STATION_3"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "DOCK_STATION_3",
            stage:
              "DOCK_STATION_3",
          })
        );

        return;
      }


      // -------------------------------------------------
      // DOCK STATION 4
      // -------------------------------------------------

      if (
        value ===
        "DOCK_STATION_4"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "DOCK_STATION_4",
            stage:
              "DOCK_STATION_4",
          })
        );

        return;
      }


      // -------------------------------------------------
      // DOCK STATION 5
      // -------------------------------------------------

      if (
        value ===
        "DOCK_STATION_5"
      ) {

        setForm(
          (previous) => ({
            ...previous,
            station:
              "DOCK_STATION_5",
            stage:
              "DOCK_STATION_5",
          })
        );

        return;
      }
    };


  // =====================================================
  // STATION LABEL
  // =====================================================

  const getStationLabel =
    (station) => {

      switch (station) {

        case "OP40":
          return "OP40";

        case "OP60":
          return "OP60";

        case "PDI_STATION_3":
          return "PDI STATION 3";

        case "PDI_STATION_4":
          return "PDI STATION 4";


        case "FIREWALL":
          return "FIREWALL";

        case "DOCK_STATION_1":
          return "DOCK STATION 1";

        case "DOCK_STATION_2":
          return "DOCK STATION 2";

        case "DOCK_STATION_3":
          return "DOCK STATION 3";

        case "DOCK_STATION_4":
          return "DOCK STATION 4";

        case "DOCK_STATION_5":
          return "DOCK STATION 5";

        default:
          return (
            station ||
            "OP40"
          );
      }
    };


  // =====================================================
  // STATION STYLE
  // =====================================================

  const getStationStyle =
    (station) => {

      if (
        station ===
        "OP60"
      ) {

        return {
          background:
            "#ffedd5",
          color:
            "#9a3412",
        };
      }


      if (
        station ===
          "PDI_STATION_3"
      ) {

        return {
          background:
            "#dcfce7",
          color:
            "#166534",
        };
      }


      if (
        station ===
        "FIREWALL"
      ) {

        return {
          background:
            "#ede9fe",
          color:
            "#6d28d9",
        };
      }


      if (
        station ===
          "DOCK_STATION_1" ||
        station ===
          "DOCK_STATION_2" ||
        station ===
          "DOCK_STATION_3" ||
        station ===
          "DOCK_STATION_4" ||
        station ===
          "DOCK_STATION_5"
      ) {

        return {
          background:
            "#fef3c7",
          color:
            "#92400e",
        };
      }


      return {
        background:
          "#dbeafe",
        color:
          "#1d4ed8",
      };
    };


  // =====================================================
  // VALIDATE OPERATOR
  // =====================================================

  const validateForm =
    () => {

      if (
        !form.operator_id.trim()
      ) {

        setError(
          "Operator ID is required."
        );

        return false;
      }


      if (
        !form.name.trim()
      ) {

        setError(
          "Operator name is required."
        );

        return false;
      }


      if (
        !form.pin.trim()
      ) {

        setError(
          "Operator PIN is required."
        );

        return false;
      }


      if (
        !form.station
      ) {

        setError(
          "Station is required."
        );

        return false;
      }


      if (
        !form.stage
      ) {

        setError(
          "Stage is required."
        );

        return false;
      }


      // -------------------------------------------------
      // OP40
      // -------------------------------------------------

      if (
        form.station ===
          "OP40" &&
        ![
          "STAGE_1",
          "STAGE_2",
          "STAGE_3",
        ].includes(
          form.stage
        )
      ) {

        setError(
          "OP40 station must use STAGE_1, STAGE_2 or STAGE_3."
        );

        return false;
      }


      // -------------------------------------------------
      // OP60
      // -------------------------------------------------

      if (
        form.station ===
          "OP60" &&
        form.stage !==
          "OP60"
      ) {

        setError(
          "OP60 station must use OP60 stage."
        );

        return false;
      }


      // -------------------------------------------------
      // PDI STATION 3
      // -------------------------------------------------

      if (
        form.station ===
          "PDI_STATION_3" &&
        form.stage !==
          "PDI_STATION_3"
      ) {

        setError(
          "PDI Station 3 must use PDI_STATION_3 stage."
        );

        return false;
      }


      // -------------------------------------------------
      // FIREWALL
      // -------------------------------------------------

      if (
        form.station ===
          "FIREWALL" &&
        form.stage !==
          "FIREWALL"
      ) {

        setError(
          "Firewall station must use FIREWALL stage."
        );

        return false;
      }


      // -------------------------------------------------
      // DOCK
      // -------------------------------------------------

      const dockStations = [
        "DOCK_STATION_1",
        "DOCK_STATION_2",
        "DOCK_STATION_3",
        "DOCK_STATION_4",
        "DOCK_STATION_5",
      ];


      if (
        dockStations.includes(
          form.station
        ) &&
        form.stage !==
          form.station
      ) {

        setError(
          `${getStationLabel(
            form.station
          )} must use ${form.station} stage.`
        );

        return false;
      }


      return true;
    };


  // =====================================================
  // ADD OPERATOR
  // =====================================================

  const handleAddOperator =
    async () => {

      setError("");

      if (
        !validateForm()
      ) {
        return;
      }


      try {

        setSaving(true);


        await createOperator({

          operator_id:
            form.operator_id.trim(),

          name:
            form.name.trim(),

          pin:
            form.pin.trim(),

          station:
            form.station,

          stage:
            form.stage,

          shift:
            form.shift,

          active:
            true,
        });


        setForm({
          operator_id: "",
          name: "",
          pin: "",
          station: "OP40",
          stage: "STAGE_1",
          shift: "A",
        });


        await loadOperators();


        alert(
          "Operator added successfully."
        );

      } catch (err) {

        console.error(
          "Add operator error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Could not add operator."
          )
        );

      } finally {

        setSaving(false);
      }
    };


  // =====================================================
  // REMOVE OPERATOR
  // =====================================================

  const handleRemoveOperator =
    async (
      operator
    ) => {

      const confirmed =
        window.confirm(
          `Remove operator "${operator.name}"?`
        );


      if (!confirmed) {
        return;
      }


      try {

        setError("");

        await deactivateOperator(
          operator.operator_id
        );

        await loadOperators();

      } catch (err) {

        console.error(
          "Remove operator error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Could not remove operator."
          )
        );
      }
    };


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout =
    async () => {

      try {

        await adminLogout();

      } catch (err) {

        console.error(err);
      }


      navigate(
        "/admin/login"
      );
    };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div
        style={{
          minHeight:
            "100vh",
          display:
            "flex",
          justifyContent:
            "center",
          alignItems:
            "center",
          fontSize:
            "22px",
          fontWeight:
            "700",
        }}
      >
        Loading Admin Dashboard...
      </div>
    );
  }


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div
      className="qid-page qid-admin-operators"
      style={{
        minHeight:
          "100vh",
        background:
          "#f1f5f9",
      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        style={{
          background:
            "#0f172a",
          color:
            "white",
          padding:
            "20px 35px",
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
        }}
      >

        <div>

          <div
            style={{
              color:
                "#60a5fa",
              fontWeight:
                "900",
              letterSpacing:
                "2px",
              fontSize:
                "13px",
            }}
          >
            QID
          </div>


          <h1
            style={{
              margin:
                "5px 0",
              fontSize:
                "27px",
            }}
          >
            Admin Dashboard
          </h1>


          <div
            style={{
              color:
                "#94a3b8",
              fontSize:
                "14px",
            }}
          >
            Operator Management
          </div>

        </div>


        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "14px",
          }}
        >

          <button
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
            style={
              styles.navButton
            }
          >
            RECORDS
          </button>


          <div
            style={{
              textAlign:
                "right",
            }}
          >

            <div
              style={{
                fontWeight:
                  "700",
              }}
            >
              {admin?.username}
            </div>


            <small
              style={{
                color:
                  "#60a5fa",
              }}
            >
              ADMIN
            </small>

          </div>


          <button
            onClick={
              handleLogout
            }
            style={
              styles.logoutButton
            }
          >
            LOGOUT
          </button>

        </div>

      </header>


      {/* =================================================
          CONTENT
      ================================================= */}

      <main
        style={{
          maxWidth:
            "1250px",
          margin:
            "0 auto",
          padding:
            "30px",
        }}
      >

        {error && (

          <div
            style={
              styles.error
            }
          >
            {error}
          </div>

        )}


        {/* =================================================
            ADD OPERATOR
        ================================================= */}

        <section
          style={
            styles.card
          }
        >

          <h2
            style={{
              marginTop:
                0,
            }}
          >
            Add Operator
          </h2>


          <p
            style={{
              color:
                "#64748b",
              fontSize:
                "14px",
            }}
          >
            Create operators for OP40,
            OP60, PDI Station 3,
            PDI Station 4, Firewall,
            or any Dock station.
          </p>


          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap:
                "15px",
              marginTop:
                "20px",
            }}
          >

            {/* OPERATOR ID */}

            <input
              type="text"
              placeholder="Operator ID"
              value={
                form.operator_id
              }
              onChange={(e) =>
                handleChange(
                  "operator_id",
                  e.target.value
                )
              }
              style={
                styles.input
              }
            />


            {/* NAME */}

            <input
              type="text"
              placeholder="Operator Name"
              value={
                form.name
              }
              onChange={(e) =>
                handleChange(
                  "name",
                  e.target.value
                )
              }
              style={
                styles.input
              }
            />


            {/* PIN */}

            <input
              type="password"
              placeholder="PIN"
              value={
                form.pin
              }
              onChange={(e) =>
                handleChange(
                  "pin",
                  e.target.value
                )
              }
              style={
                styles.input
              }
            />


            {/* =================================================
                STATION
            ================================================= */}

            <select
              value={
                form.station
              }
              onChange={(e) =>
                handleStationChange(
                  e.target.value
                )
              }
              style={
                styles.input
              }
            >

              <option value="OP40">
                OP40
              </option>

              <option value="OP60">
                OP60
              </option>

              <option value="PDI_STATION_3">
                PDI STATION 3
              </option>
              <option value="PDI_STATION_4">
                PDI STATION 4
              </option>

              <option value="FIREWALL">
                FIREWALL
              </option>

              {/* DOCK */}

              <option value="DOCK_STATION_1">
                DOCK STATION 1
              </option>

              <option value="DOCK_STATION_2">
                DOCK STATION 2
              </option>

              <option value="DOCK_STATION_3">
                DOCK STATION 3
              </option>

              <option value="DOCK_STATION_4">
                DOCK STATION 4
              </option>

              <option value="DOCK_STATION_5">
                DOCK STATION 5
              </option>

            </select>


            {/* =================================================
                STAGE
            ================================================= */}

            <select
              value={
                form.stage
              }
              onChange={(e) =>
                handleChange(
                  "stage",
                  e.target.value
                )
              }
              disabled={
                form.station !==
                "OP40"
              }
              style={{
                ...styles.input,
                background:
                  form.station !==
                  "OP40"
                    ? "#f1f5f9"
                    : "#ffffff",
              }}
            >

              {form.station ===
              "OP40" ? (

                <>

                  <option value="STAGE_1">
                    STAGE 1
                  </option>

                  <option value="STAGE_2">
                    STAGE 2
                  </option>

                  <option value="STAGE_3">
                    STAGE 3
                  </option>

                </>

              ) : (

                <option
                  value={
                    form.stage
                  }
                >
                  {
                    getStationLabel(
                      form.stage
                    )
                  }
                </option>

              )}

            </select>


            {/* =================================================
                SHIFT
            ================================================= */}

            <select
              value={
                form.shift
              }
              onChange={(e) =>
                handleChange(
                  "shift",
                  e.target.value
                )
              }
              style={
                styles.input
              }
            >

              <option value="A">
                Shift A
              </option>

              <option value="B">
                Shift B
              </option>

              <option value="C">
                Shift C
              </option>

            </select>

          </div>


          {/* =================================================
              STATION INFO
          ================================================= */}

          <div
            style={{
              marginTop:
                "15px",
              padding:
                "12px 15px",
              background:
                form.station.startsWith(
                  "DOCK_"
                )
                  ? "#fffbeb"
                  : form.station ===
                    "FIREWALL"
                  ? "#f5f3ff"
                  : "#eff6ff",
              color:
                form.station.startsWith(
                  "DOCK_"
                )
                  ? "#92400e"
                  : form.station ===
                    "FIREWALL"
                  ? "#6d28d9"
                  : "#1e40af",
              borderRadius:
                "6px",
              fontSize:
                "13px",
              fontWeight:
                "600",
            }}
          >

            {form.station.startsWith(
              "DOCK_"
            )
              ? `${getStationLabel(
                  form.station
                )} has its own dedicated operator. Stage is automatically set to ${form.station}.`

              : form.station ===
                "FIREWALL"

              ? "Firewall has ONE station only. The operator will work on PDI-rework frames that have completed OP60."

              : form.station ===
                "OP60"

              ? "OP60 operators handle NOK rework."

              : form.station ===
                "PDI_STATION_3"

              ? "PDI Station 3 includes the mandatory Gauge inspection."

              : `OP40 operator works on ${form.stage.replace(
                  "_",
                  " "
                )}.`
            }

          </div>


          {/* =================================================
              ADD BUTTON
          ================================================= */}

          <button
            onClick={
              handleAddOperator
            }
            disabled={
              saving
            }
            style={{
              ...styles.addButton,
              opacity:
                saving
                  ? 0.6
                  : 1,
            }}
          >
            {saving
              ? "ADDING..."
              : "ADD OPERATOR"}
          </button>

        </section>


        {/* =================================================
            OPERATOR LIST
        ================================================= */}

        <section
          style={
            styles.card
          }
        >

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                "20px",
            }}
          >

            <div>

              <h2
                style={{
                  margin:
                    0,
                }}
              >
                Operators
              </h2>

              <p
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "14px",
                }}
              >
                Manage active operators.
              </p>

            </div>


            <strong>
              {
                operators.length
              }{" "}
              Operators
            </strong>

          </div>


          <div
            style={{
              overflowX:
                "auto",
            }}
          >

            <table
              style={{
                width:
                  "100%",
                borderCollapse:
                  "collapse",
                minWidth:
                  "1000px",
              }}
            >

              <thead>

                <tr>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Operator ID
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Name
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Station
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Stage
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Shift
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Status
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {operators.map(
                  (
                    operator
                  ) => {

                    const operatorStation =
                      operator.station ||
                      "OP40";


                    const stationStyle =
                      getStationStyle(
                        operatorStation
                      );


                    return (

                      <tr
                        key={
                          operator.operator_id
                        }
                      >

                        <td
                          style={
                            styles.td
                          }
                        >
                          <strong>
                            {
                              operator.operator_id
                            }
                          </strong>
                        </td>


                        <td
                          style={
                            styles.td
                          }
                        >
                          {
                            operator.name
                          }
                        </td>


                        <td
                          style={
                            styles.td
                          }
                        >

                          <span
                            style={{
                              padding:
                                "6px 10px",
                              borderRadius:
                                "5px",
                              background:
                                stationStyle.background,
                              color:
                                stationStyle.color,
                              fontWeight:
                                "800",
                              fontSize:
                                "12px",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              getStationLabel(
                                operatorStation
                              )
                            }
                          </span>

                        </td>


                        <td
                          style={
                            styles.td
                          }
                        >
                          {
                            operator.stage ||
                            "-"
                          }
                        </td>


                        <td
                          style={
                            styles.td
                          }
                        >
                          Shift{" "}
                          {
                            operator.shift ||
                            "-"
                          }
                        </td>


                        <td
                          style={
                            styles.td
                          }
                        >

                          <span
                            style={{
                              padding:
                                "5px 10px",
                              borderRadius:
                                "20px",
                              background:
                                operator.active
                                  ? "#dcfce7"
                                  : "#fee2e2",
                              color:
                                operator.active
                                  ? "#166534"
                                  : "#991b1b",
                              fontSize:
                                "11px",
                              fontWeight:
                                "800",
                            }}
                          >
                            {
                              operator.active
                                ? "ACTIVE"
                                : "REMOVED"
                            }
                          </span>

                        </td>


                        <td
                          style={
                            styles.td
                          }
                        >

                          {operator.active && (

                            <button
                              onClick={() =>
                                handleRemoveOperator(
                                  operator
                                )
                              }
                              style={
                                styles.removeButton
                              }
                            >
                              REMOVE
                            </button>

                          )}

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>


            {operators.length ===
              0 && (

              <div
                style={{
                  textAlign:
                    "center",
                  padding:
                    "40px",
                  color:
                    "#64748b",
                }}
              >
                No operators found.
              </div>

            )}

          </div>

        </section>

      </main>

    </div>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = {

  card: {
    background:
      "#ffffff",
    padding:
      "30px",
    borderRadius:
      "10px",
    marginBottom:
      "25px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.06)",
  },


  input: {
    width:
      "100%",
    boxSizing:
      "border-box",
    padding:
      "13px",
    border:
      "1px solid #cbd5e1",
    borderRadius:
      "6px",
    fontSize:
      "15px",
    background:
      "#ffffff",
  },


  addButton: {
    marginTop:
      "20px",
    padding:
      "12px 25px",
    background:
      "#2563eb",
    color:
      "white",
    border:
      "none",
    borderRadius:
      "6px",
    fontWeight:
      "700",
    cursor:
      "pointer",
  },


  removeButton: {
    padding:
      "7px 14px",
    background:
      "#fee2e2",
    color:
      "#b91c1c",
    border:
      "none",
    borderRadius:
      "5px",
    fontWeight:
      "700",
    cursor:
      "pointer",
  },


  navButton: {
    padding:
      "10px 20px",
    background:
      "#1e293b",
    color:
      "white",
    border:
      "1px solid #475569",
    borderRadius:
      "6px",
    fontWeight:
      "700",
    cursor:
      "pointer",
    fontSize:
      "14px",
  },


  logoutButton: {
    padding:
      "10px 18px",
    background:
      "#dc2626",
    color:
      "white",
    border:
      "none",
    borderRadius:
      "6px",
    fontWeight:
      "700",
    cursor:
      "pointer",
  },


  error: {
    background:
      "#fee2e2",
    color:
      "#991b1b",
    padding:
      "14px",
    borderRadius:
      "6px",
    marginBottom:
      "20px",
    whiteSpace:
      "pre-line",
    border:
      "1px solid #fecaca",
  },


  th: {
    textAlign:
      "left",
    padding:
      "13px",
    background:
      "#f8fafc",
    borderBottom:
      "2px solid #e2e8f0",
    fontSize:
      "12px",
  },


  td: {
    padding:
      "13px",
    borderBottom:
      "1px solid #e2e8f0",
  },

};


export default AdminOperatorsPage;
import React, { useEffect, useState } from "react";
import axios from "axios";
import { adminLogin } from "../utils/adminApi";

const API = "http://localhost:8000";

function LoginPage({ navigate }) {
  const [mode, setMode] = useState("operator");

  const [operators, setOperators] = useState([]);
  const [operatorId, setOperatorId] = useState("");
  const [pin, setPin] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingOperators, setLoadingOperators] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // ERROR MESSAGE
  // =====================================================

  const getErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || "Validation error")
        .join(", ");
    }

    if (
      typeof detail === "object" &&
      detail !== null
    ) {
      return (
        detail.message ||
        detail.msg ||
        JSON.stringify(detail)
      );
    }

    return (
      detail ||
      err?.response?.data?.message ||
      err?.message ||
      fallback
    );
  };

  // =====================================================
  // LOAD ACTIVE OPERATORS
  // =====================================================

  useEffect(() => {
    loadOperators();
  }, []);

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
    } catch (err) {
      console.error(
        "Unable to load operators:",
        err
      );

      setOperators([]);
    } finally {
      setLoadingOperators(false);
    }
  };

  // =====================================================
  // SELECTED OPERATOR
  // =====================================================

  const selectedOperator = operators.find(
    (operator) =>
      operator.operator_id === operatorId
  );

  // =====================================================
  // OPERATOR LOGIN
  // =====================================================

  const handleOperatorLogin = async (e) => {
    e.preventDefault();

    if (!operatorId || !pin) {
      setError(
        "Please enter Operator ID and PIN."
      );
      return;
    }

    if (!selectedOperator) {
      setError(
        "Please select a valid operator."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      // =================================================
      // OPERATOR DETAILS
      // =================================================

      const station =
        selectedOperator.station || "OP40";

      const stage =
        selectedOperator.stage || station;

      const shift =
        selectedOperator.shift || "";

      console.log(
        "LOGIN REQUEST:",
        {
          operator_id: operatorId,
          station,
          stage,
          shift,
        }
      );

      // =================================================
      // LOGIN
      // =================================================

      const response = await axios.post(
        `${API}/auth/login`,
        {
          operator_id:
            operatorId.trim(),

          pin:
            pin.trim(),

          station:
            station,

          stage:
            stage,

          shift:
            shift,
        }
      );

      console.log(
        "LOGIN RESPONSE:",
        response.data
      );

      // =================================================
      // TOKEN
      // =================================================

      const token =
        response.data.token ||
        response.data.access_token;

      console.log(
        "LOGIN TOKEN:",
        token
      );

      if (!token) {
        throw new Error(
          "Authentication token was not returned."
        );
      }

      // =================================================
      // AUTHENTICATED OPERATOR
      // =================================================

      const authenticatedOperator =
        response.data.operator;

      console.log(
        "AUTHENTICATED OPERATOR:",
        authenticatedOperator
      );

      if (!authenticatedOperator) {
        throw new Error(
          "Operator information was not returned."
        );
      }

      // =================================================
      // AUTHENTICATED STATION
      // =================================================

      const authenticatedStation =
        String(
          authenticatedOperator.station ||
            station ||
            ""
        )
          .trim()
          .toUpperCase();

      const authenticatedStage =
        String(
          authenticatedOperator.stage ||
            stage ||
            ""
        )
          .trim()
          .toUpperCase();

      const authenticatedShift =
        String(
          authenticatedOperator.shift ||
            shift ||
            ""
        )
          .trim()
          .toUpperCase();

      // =================================================
      // SAVE AUTHENTICATION
      // =================================================

      localStorage.setItem(
        "operator_token",
        token
      );

      localStorage.setItem(
        "operator_id",
        authenticatedOperator.operator_id ||
          operatorId
      );

      localStorage.setItem(
        "operator_name",
        authenticatedOperator.name || ""
      );

      // =================================================
      // SAVE STATION
      // =================================================

      localStorage.setItem(
        "operator_station",
        authenticatedStation
      );

      // =================================================
      // SAVE STAGE
      // =================================================

      localStorage.setItem(
        "operator_stage",
        authenticatedStage
      );

      // =================================================
      // SAVE SHIFT
      // =================================================

      localStorage.setItem(
        "operator_shift",
        authenticatedShift
      );

      // =================================================
      // SAVE COMPLETE OPERATOR INFO
      // =================================================

      localStorage.setItem(
        "operator_info",
        JSON.stringify(
          authenticatedOperator
        )
      );

      // =================================================
      // COMPATIBILITY STORAGE
      // =================================================

      // OP60
      if (
        authenticatedStation ===
        "OP60"
      ) {
        localStorage.setItem(
          "op60_operator",
          JSON.stringify(
            authenticatedOperator
          )
        );

        localStorage.removeItem(
          "op40_operator"
        );
      }

      // OP40
      else if (
        authenticatedStation ===
        "OP40"
      ) {
        localStorage.setItem(
          "op40_operator",
          JSON.stringify(
            authenticatedOperator
          )
        );

        localStorage.removeItem(
          "op60_operator"
        );
      }

      // Other stations
      else {
        localStorage.removeItem(
          "op40_operator"
        );

        localStorage.removeItem(
          "op60_operator"
        );
      }

      // =================================================
      // VERIFY AUTHENTICATION WAS SAVED
      // =================================================

      console.log(
        "AUTH SAVED:",
        {
          hasToken:
            !!localStorage.getItem(
              "operator_token"
            ),

          operatorId:
            localStorage.getItem(
              "operator_id"
            ),

          operatorName:
            localStorage.getItem(
              "operator_name"
            ),

          station:
            localStorage.getItem(
              "operator_station"
            ),

          stage:
            localStorage.getItem(
              "operator_stage"
            ),

          shift:
            localStorage.getItem(
              "operator_shift"
            ),
        }
      );

      // =================================================
      // OP40
      // =================================================

      if (
        authenticatedStation ===
        "OP40"
      ) {
        navigate("/");
        return;
      }

      // =================================================
      // OP60
      // =================================================

      if (
        authenticatedStation ===
        "OP60"
      ) {
        navigate("/records");
        return;
      }

      // =================================================
      // PDI STATION 1
      // =================================================

      if (
        authenticatedStation ===
        "PDI_STATION_1"
      ) {
        navigate("/pdi/station-1");
        return;
      }

      // =================================================
      // PDI STATION 2
      // =================================================

      if (
        authenticatedStation ===
        "PDI_STATION_2"
      ) {
        navigate("/pdi/station-2");
        return;
      }

      // =================================================
      // PDI STATION 3
      // =================================================

      if (
        authenticatedStation ===
        "PDI_STATION_3"
      ) {
        navigate("/pdi/station-3");
        return;
      }

      // =================================================
      // FIREWALL
      // =================================================

      if (
        authenticatedStation ===
        "FIREWALL"
      ) {
        navigate("/firewall");
        return;
      }

      // =================================================
      // FIREWALL TOP-1
      // =================================================

      if (
        authenticatedStation ===
        "FIREWALL_TOP_1"
      ) {
        navigate("/firewall");
        return;
      }

      // =================================================
      // FIREWALL TOP-2
      // =================================================

      if (
        authenticatedStation ===
        "FIREWALL_TOP_2"
      ) {
        navigate("/firewall");
        return;
      }

      // =================================================
      // FIREWALL BOTTOM-1
      // =================================================

      if (
        authenticatedStation ===
        "FIREWALL_BOTTOM_1"
      ) {
        navigate("/firewall");
        return;
      }

      // =================================================
      // FIREWALL BOTTOM-2
      // =================================================

      if (
        authenticatedStation ===
        "FIREWALL_BOTTOM_2"
      ) {
        navigate("/firewall");
        return;
      }

      // =================================================
      // DOCK STATION 1
      // =================================================

      if (
        authenticatedStation ===
        "DOCK_STATION_1"
      ) {
        navigate("/dock");
        return;
      }

      // =================================================
      // DOCK STATION 2
      // =================================================

      if (
        authenticatedStation ===
        "DOCK_STATION_2"
      ) {
        navigate("/dock");
        return;
      }

      // =================================================
      // DOCK STATION 3
      // =================================================

      if (
        authenticatedStation ===
        "DOCK_STATION_3"
      ) {
        navigate("/dock");
        return;
      }

      // =================================================
      // DOCK STATION 4
      // =================================================

      if (
        authenticatedStation ===
        "DOCK_STATION_4"
      ) {
        navigate("/dock");
        return;
      }

      // =================================================
      // DOCK STATION 5
      // =================================================

      if (
        authenticatedStation ===
        "DOCK_STATION_5"
      ) {
        navigate("/dock");
        return;
      }

      // =================================================
      // UNKNOWN STATION
      // =================================================

      setError(
        `Unknown operator station: ${
          authenticatedStation ||
          "Not assigned"
        }`
      );

      // Only remove the token for an
      // actually invalid/unknown station.
      localStorage.removeItem(
        "operator_token"
      );

    } catch (err) {
      console.error(
        "Operator login error:",
        err
      );

      console.error(
        "Login response:",
        err?.response?.data
      );

      setError(
        getErrorMessage(
          err,
          "Invalid Operator ID or PIN."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ADMIN LOGIN
  // =====================================================

  const handleAdminLogin = async (e) => {
    e.preventDefault();

    if (
      !username.trim() ||
      !password
    ) {
      setError(
        "Please enter username/email and password."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      await adminLogin(
        username.trim(),
        password
      );

      navigate("/admin/dashboard");

    } catch (err) {
      console.error(
        "Admin login error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Invalid admin username or password."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SWITCH MODE
  // =====================================================

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setPin("");
    setPassword("");
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div style={styles.page}>

      {/* =================================================
          LEFT PANEL
      ================================================= */}

      <div style={styles.leftPanel}>

        <div style={styles.brand}>

          <div style={styles.logo}>
            QID
          </div>

          <div>
            <h1 style={styles.brandTitle}>
              Quality Inspection
            </h1>

            <p style={styles.brandSubtitle}>
              Digital OP40 Inspection System
            </p>
          </div>

        </div>

        <div style={styles.leftContent}>

          <div style={styles.bigText}>
            Secure.
            <br />
            Simple.
            <br />
            Digital.
          </div>

          <p style={styles.description}>
            Manage inspections, operators and
            quality records from one secure system.
          </p>

        </div>

      </div>

      {/* =================================================
          RIGHT PANEL
      ================================================= */}

      <div style={styles.rightPanel}>

        <div style={styles.loginCard}>

          <div style={styles.mobileLogo}>
            QID
          </div>

          <h2 style={styles.title}>
            Welcome Back
          </h2>

          <p style={styles.subtitle}>
            Sign in to continue to the inspection
            system
          </p>

          {/* =================================================
              LOGIN MODE
          ================================================= */}

          <div style={styles.tabs}>

            <button
              type="button"
              onClick={() =>
                switchMode("operator")
              }
              style={{
                ...styles.tab,
                ...(mode === "operator"
                  ? styles.activeTab
                  : {}),
              }}
            >
              Operator
            </button>

            <button
              type="button"
              onClick={() =>
                switchMode("admin")
              }
              style={{
                ...styles.tab,
                ...(mode === "admin"
                  ? styles.activeTab
                  : {}),
              }}
            >
              Admin
            </button>

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div style={styles.error}>
              {String(error)}
            </div>
          )}

          {/* =================================================
              OPERATOR LOGIN
          ================================================= */}

          {mode === "operator" && (

            <form
              onSubmit={
                handleOperatorLogin
              }
            >

              <label style={styles.label}>
                Operator ID
              </label>

              <select
                value={operatorId}
                onChange={(e) => {
                  setOperatorId(
                    e.target.value
                  );
                  setError("");
                }}
                style={styles.input}
                disabled={
                  loadingOperators ||
                  loading
                }
              >

                <option value="">
                  {loadingOperators
                    ? "Loading operators..."
                    : "Select Operator"}
                </option>

                {operators.map(
                  (operator) => (

                    <option
                      key={
                        operator.operator_id
                      }
                      value={
                        operator.operator_id
                      }
                    >
                      {operator.name} (
                      {operator.operator_id})
                    </option>

                  )
                )}

              </select>

              {/* =================================================
                  OPERATOR INFORMATION
              ================================================= */}

              {selectedOperator && (

                <div
                  style={
                    styles.operatorInfo
                  }
                >

                  <div
                    style={
                      styles.operatorInfoBox
                    }
                  >
                    <span
                      style={
                        styles.infoLabel
                      }
                    >
                      Station
                    </span>

                    <strong
                      style={
                        styles.infoValue
                      }
                    >
                      {selectedOperator.station ||
                        "OP40"}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.operatorInfoBox
                    }
                  >
                    <span
                      style={
                        styles.infoLabel
                      }
                    >
                      Stage
                    </span>

                    <strong
                      style={
                        styles.infoValue
                      }
                    >
                      {selectedOperator.stage ||
                        "-"}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.operatorInfoBox
                    }
                  >
                    <span
                      style={
                        styles.infoLabel
                      }
                    >
                      Shift
                    </span>

                    <strong
                      style={
                        styles.infoValue
                      }
                    >
                      {selectedOperator.shift ||
                        "-"}
                    </strong>
                  </div>

                </div>

              )}

              {/* =================================================
                  PIN
              ================================================= */}

              <label style={styles.label}>
                PIN
              </label>

              <input
                type="password"
                inputMode="numeric"
                maxLength={20}
                placeholder="Enter your PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError("");
                }}
                style={styles.input}
                autoComplete="current-password"
                disabled={loading}
              />

              {/* =================================================
                  LOGIN BUTTON
              ================================================= */}

              <button
                type="submit"
                disabled={
                  loading ||
                  loadingOperators
                }
                style={{
                  ...styles.loginButton,
                  ...(loading ||
                  loadingOperators
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {loading
                  ? "Signing in..."
                  : "LOGIN"}
              </button>

            </form>

          )}

          {/* =================================================
              ADMIN LOGIN
          ================================================= */}

          {mode === "admin" && (

            <form
              onSubmit={
                handleAdminLogin
              }
            >

              <label style={styles.label}>
                Username or Email
              </label>

              <input
                type="text"
                placeholder="Enter username or email"
                value={username}
                onChange={(e) => {
                  setUsername(
                    e.target.value
                  );
                  setError("");
                }}
                style={styles.input}
                autoComplete="username"
                disabled={loading}
              />

              <label style={styles.label}>
                Password
              </label>

              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(
                    e.target.value
                  );
                  setError("");
                }}
                style={styles.input}
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.loginButton,
                  ...(loading
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {loading
                  ? "Signing in..."
                  : "ADMIN LOGIN"}
              </button>

            </form>

          )}

          {/* =================================================
              SECURITY
          ================================================= */}

          <div style={styles.security}>
            🔒 Secure authenticated access
          </div>

        </div>

      </div>

    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {

  page: {
    minHeight: "100vh",
    display: "flex",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#f5f7fa",
  },

  leftPanel: {
    width: "48%",
    background:
      "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
    color: "white",
    padding: "55px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  logo: {
    width: "52px",
    height: "52px",
    borderRadius: "12px",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "800",
  },

  brandTitle: {
    margin: 0,
    fontSize: "21px",
  },

  brandSubtitle: {
    margin: "4px 0 0",
    color: "#9ca3af",
    fontSize: "13px",
  },

  leftContent: {
    marginTop: "150px",
    maxWidth: "500px",
  },

  bigText: {
    fontSize: "60px",
    lineHeight: "1.08",
    fontWeight: "800",
    letterSpacing: "-2px",
  },

  description: {
    marginTop: "28px",
    color: "#9ca3af",
    fontSize: "16px",
    lineHeight: "1.6",
    maxWidth: "430px",
  },

  rightPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px",
    boxSizing: "border-box",
  },

  loginCard: {
    width: "100%",
    maxWidth: "430px",
    background: "white",
    borderRadius: "18px",
    padding: "40px",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },

  mobileLogo: {
    display: "none",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    color: "#111827",
  },

  subtitle: {
    margin: "8px 0 25px",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  tabs: {
    display: "flex",
    background: "#f3f4f6",
    borderRadius: "10px",
    padding: "4px",
    marginBottom: "22px",
  },

  tab: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "11px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    color: "#6b7280",
  },

  activeTab: {
    background: "white",
    color: "#2563eb",
    boxShadow:
      "0 2px 5px rgba(0,0,0,0.08)",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    marginTop: "17px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },

  input: {
    width: "100%",
    padding: "13px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    background: "white",
  },

  operatorInfo: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
  },

  operatorInfoBox: {
    flex: 1,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "9px 11px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  infoLabel: {
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "700",
  },

  infoValue: {
    fontSize: "13px",
    color: "#1e293b",
  },

  loginButton: {
    width: "100%",
    marginTop: "25px",
    padding: "14px",
    border: "none",
    borderRadius: "9px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  error: {
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "11px 13px",
    fontSize: "13px",
    marginBottom: "12px",
    whiteSpace: "pre-line",
  },

  security: {
    textAlign: "center",
    marginTop: "22px",
    color: "#9ca3af",
    fontSize: "12px",
  },
};

export default LoginPage;
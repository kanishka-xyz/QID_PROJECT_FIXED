import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentAdmin,
  getAdminRecords,
  adminLogout,
} from "../utils/adminApi";


function AdminDashboardPage({
  navigate,
}) {

  const [admin, setAdmin] =
    useState(null);

  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [stageFilter, setStageFilter] =
    useState("ALL");


  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  const loadDashboard = async () => {

    try {

      setLoading(true);
      setError("");

      // Check admin session
      const adminData =
        await getCurrentAdmin();

      setAdmin(adminData);

      // Load records
      const data =
        await getAdminRecords();

      setRecords(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      console.error(
        "ADMIN DASHBOARD ERROR:",
        err
      );

      console.error(
        "STATUS:",
        err?.response?.status
      );

      console.error(
        "DATA:",
        err?.response?.data
      );

      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Could not load admin dashboard."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    loadDashboard();

  }, []);


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {

    try {

      await adminLogout();

    } catch (err) {

      console.error(
        "Logout error:",
        err
      );

    }

    navigate("/login");
  };


  // =====================================================
  // STATISTICS
  // =====================================================

  const statistics = useMemo(() => {

    const total =
      records.length;

    const inProgress =
      records.filter(
        (record) =>
          String(
            record.status ||
            record.overall_status ||
            ""
          ).toUpperCase() ===
          "IN_PROGRESS"
      ).length;

    const rework =
      records.filter(
        (record) =>
          String(
            record.status ||
            record.overall_status ||
            ""
          ).toUpperCase() ===
          "OP60_REWORK"
      ).length;

    const completed =
      records.filter(
        (record) =>
          String(
            record.status ||
            record.overall_status ||
            ""
          ).toUpperCase() ===
          "COMPLETED"
      ).length;

    const nok =
      records.reduce(
        (sum, record) =>
          sum +
          Number(
            record.pending_nok_count || 0
          ),
        0
      );

    return {
      total,
      inProgress,
      rework,
      completed,
      nok,
    };

  }, [records]);


  // =====================================================
  // FILTER
  // =====================================================

  const filteredRecords =
    useMemo(() => {

      const searchText =
        search
          .trim()
          .toLowerCase();

      return records.filter(
        (record) => {

          const frame =
            String(
              record.frame_no || ""
            ).toLowerCase();

          const status =
            String(
              record.status ||
              record.overall_status ||
              ""
            ).toUpperCase();

          const stage =
            String(
              record.current_stage ||
              record.stage ||
              ""
            ).toUpperCase();

          const searchMatch =
            !searchText ||
            frame.includes(
              searchText
            );

          const statusMatch =
            statusFilter === "ALL" ||
            status === statusFilter;

          const stageMatch =
            stageFilter === "ALL" ||
            stage === stageFilter;

          return (
            searchMatch &&
            statusMatch &&
            stageMatch
          );
        }
      );

    }, [
      records,
      search,
      statusFilter,
      stageFilter,
    ]);


  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle =
    (status) => {

      const value =
        String(
          status || ""
        ).toUpperCase();

      if (
        value === "COMPLETED"
      ) {

        return {
          background: "#dcfce7",
          color: "#166534",
        };

      }

      if (
        value === "OP60_REWORK"
      ) {

        return {
          background: "#ffedd5",
          color: "#9a3412",
        };

      }

      if (
        value === "IN_PROGRESS"
      ) {

        return {
          background: "#dbeafe",
          color: "#1d4ed8",
        };

      }

      return {
        background: "#f1f5f9",
        color: "#475569",
      };
    };


  // =====================================================
  // DATE
  // =====================================================

  const formatDate =
    (value) => {

      if (!value) {
        return "-";
      }

      try {

        return new Date(
          value
        ).toLocaleString();

      } catch {

        return String(value);

      }
    };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f1f5f9",
          fontSize: "22px",
          fontWeight: "700",
        }}
      >
        Loading Admin Dashboard...
      </div>

    );
  }


  // =====================================================
  // DASHBOARD
  // =====================================================

  return (

    <div
      className="qid-page qid-admin-dashboard"
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        style={{
          background: "#0f172a",
          color: "white",
          padding: "18px 35px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

        <div>

          <div
            style={{
              color: "#60a5fa",
              fontWeight: "900",
              letterSpacing: "2px",
              fontSize: "13px",
            }}
          >
            QID
          </div>

          <h1
            style={{
              margin: "5px 0",
              fontSize: "27px",
            }}
          >
            Admin Dashboard
          </h1>

          <div
            style={{
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            Inspection Records
          </div>

        </div>


        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >

          <button
            onClick={() =>
              navigate(
                "/admin/operators"
              )
            }
            style={styles.navButton}
          >
            OPERATORS
          </button>

          <button
              onClick={() =>
                navigate(
                  "/admin/frame-history"
                )
              }
              style={styles.navButton}
            >
              FRAME HISTORY
          </button>


          <div
            style={{
              textAlign: "right",
            }}
          >

            <div>
              {admin?.username || "Admin"}
            </div>

            <small
              style={{
                color: "#60a5fa",
              }}
            >
              ADMIN
            </small>

          </div>


          <button
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            LOGOUT
          </button>

        </div>

      </header>


      <main
        style={{
          maxWidth: "1450px",
          margin: "0 auto",
          padding: "30px",
        }}
      >

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px",
              whiteSpace: "pre-line",
            }}
          >

            <strong>
              Dashboard Error
            </strong>

            <div
              style={{
                marginTop: "6px",
              }}
            >
              {error}
            </div>

          </div>

        )}


        {/* =================================================
            STATISTICS
        ================================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(5, 1fr)",
            gap: "18px",
            marginBottom: "25px",
          }}
        >

          <StatCard
            title="TOTAL FRAMES"
            value={statistics.total}
            icon="▣"
          />

          <StatCard
            title="IN PROGRESS"
            value={statistics.inProgress}
            icon="◷"
          />

          <StatCard
            title="OP60 REWORK"
            value={statistics.rework}
            icon="↻"
          />

          <StatCard
            title="COMPLETED"
            value={statistics.completed}
            icon="✓"
          />

          <StatCard
            title="PENDING NOK"
            value={statistics.nok}
            icon="!"
          />

        </div>


        {/* =================================================
            FILTERS
        ================================================= */}

        <section
          style={{
            background: "white",
            padding: "22px",
            borderRadius: "10px",
            marginBottom: "20px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "2fr 1fr 1fr auto",
              gap: "15px",
            }}
          >

            <input
              type="text"
              placeholder="Search Frame Number..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              style={styles.input}
            />


            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              style={styles.input}
            >

              <option value="ALL">
                All Status
              </option>

              <option value="IN_PROGRESS">
                In Progress
              </option>

              <option value="OP60_REWORK">
                OP60 Rework
              </option>

              <option value="COMPLETED">
                Completed
              </option>

            </select>


            <select
              value={stageFilter}
              onChange={(e) =>
                setStageFilter(
                  e.target.value
                )
              }
              style={styles.input}
            >

              <option value="ALL">
                All Stages
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


            <button
              onClick={loadDashboard}
              style={styles.refreshButton}
            >
              REFRESH
            </button>

          </div>

        </section>


        {/* =================================================
            RECORDS
        ================================================= */}

        <section
          style={{
            background: "white",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >

          <div
            style={{
              padding: "22px 25px",
              borderBottom:
                "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
            }}
          >

            <div>

              <h2
                style={{
                  margin: 0,
                }}
              >
                Inspection Records
              </h2>

              <p
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  marginBottom: 0,
                }}
              >
                Showing{" "}
                {filteredRecords.length}
                {" "}of{" "}
                {records.length}
                {" "}records
              </p>

            </div>

          </div>


          <div
            style={{
              overflowX: "auto",
            }}
          >

            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: "1050px",
              }}
            >

              <thead>

                <tr>

                  <th style={styles.th}>
                    Frame No.
                  </th>

                  <th style={styles.th}>
                    Date
                  </th>

                  <th style={styles.th}>
                    Shift
                  </th>

                  <th style={styles.th}>
                    Stage
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                  <th style={styles.th}>
                    NOK
                  </th>

                  <th style={styles.th}>
                    Rework
                  </th>

                  <th style={styles.th}>
                    Updated
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredRecords.map(
                  (record) => {

                    const status =
                      record.status ||
                      record.overall_status ||
                      "IN_PROGRESS";

                    const stage =
                      record.current_stage ||
                      record.stage ||
                      "-";

                    return (

                      <tr
                        key={
                          record.id ||
                          record._id ||
                          record.frame_no
                        }
                      >

                        <td style={styles.td}>
                          <strong>
                            {
                              record.frame_no ||
                              "-"
                            }
                          </strong>
                        </td>

                        <td style={styles.td}>
                          {
                            record.date ||
                            "-"
                          }
                        </td>

                        <td style={styles.td}>
                          {
                            record.shift ||
                            "-"
                          }
                        </td>

                        <td style={styles.td}>
                          {stage}
                        </td>

                        <td style={styles.td}>

                          <span
                            style={{
                              ...getStatusStyle(
                                status
                              ),
                              padding:
                                "6px 10px",
                              borderRadius:
                                "20px",
                              fontSize:
                                "11px",
                              fontWeight:
                                "800",
                            }}
                          >
                            {status}
                          </span>

                        </td>

                        <td
                          style={{
                            ...styles.td,
                            fontWeight: "800",
                            color:
                              Number(
                                record.pending_nok_count ||
                                0
                              ) > 0
                                ? "#dc2626"
                                : "#16a34a",
                          }}
                        >
                          {
                            record.pending_nok_count ||
                            0
                          }
                        </td>

                        <td style={styles.td}>
                          {
                            record.rework_status ||
                            "NONE"
                          }
                        </td>

                        <td style={styles.td}>
                          {
                            formatDate(
                              record.updated_at
                            )
                          }
                        </td>

                      </tr>

                    );

                  }
                )}

              </tbody>

            </table>


            {filteredRecords.length === 0 && (

              <div
                style={{
                  textAlign: "center",
                  padding: "60px",
                  color: "#64748b",
                }}
              >
                No inspection records found.
              </div>

            )}

          </div>

        </section>

      </main>

    </div>
  );
}


// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  title,
  value,
  icon,
}) {

  return (

    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        boxShadow:
          "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

        <div>

          <div
            style={{
              color: "#64748b",
              fontSize: "11px",
              fontWeight: "800",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: "30px",
              fontWeight: "900",
              marginTop: "8px",
            }}
          >
            {value}
          </div>

        </div>

        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "20px",
            fontWeight: "900",
          }}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = {

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "14px",
    background: "white",
  },

  refreshButton: {
    padding: "12px 18px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "700",
    cursor: "pointer",
  },

  navButton: {
    padding: "9px 15px",
    background: "#1e293b",
    color: "white",
    border: "1px solid #475569",
    borderRadius: "6px",
    fontWeight: "700",
    cursor: "pointer",
  },

  logoutButton: {
    padding: "10px 18px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "700",
    cursor: "pointer",
  },

  th: {
    textAlign: "left",
    padding: "13px",
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

};


export default AdminDashboardPage;
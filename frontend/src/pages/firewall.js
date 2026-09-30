// =========================================================
// FirewallPage.js
// FIREWALL INSPECTION
// SINGLE FIREWALL STATION
// =========================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

const API =
  "http://localhost:8000";

const STATION =
  "FIREWALL";

// =========================================================
// DEFAULTS
// =========================================================

const createEmptyRow = (
  sno = 1,
  frameNo = ""
) => ({
  sno,
  frame_no: frameNo,
  defect_observation: "",
  skip_by_station: "",
  status_after_rework: "",
});

const createEmptyHeader = () => ({
  shift_leader: "",
  red: "",
  firewall_inspector: "",
  total_qty_welding_defects: 0,
  total_spatter_count: 0,
  date: "",
  shift: "",
});

const createEmptyPersonnel = () => ({
  inspector_name: "",
  welder_name: "",
  quality_inspector_name: "",
});

// =========================================================
// HELPERS
// =========================================================

function getToken() {
  return localStorage.getItem(
    "operator_token"
  );
}

function getOperator() {
  try {
    const raw =
      localStorage.getItem("operator") ||
      localStorage.getItem(
        "operator_info"
      );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getRecordId(record) {
  return (
    record?.record_id ||
    record?._id ||
    record?.id ||
    ""
  );
}

function getFrameNumber(record) {
  return (
    record?.frame_no ??
    record?.frame_number ??
    record?.frameId ??
    record?.frame_id ??
    "-"
  );
}

function formatDate(value) {
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
}

function getError(
  err,
  fallback
) {
  const detail =
    err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map(
        (item) =>
          item?.msg ||
          "Validation error"
      )
      .join(", ");
  }

  if (
    detail &&
    typeof detail === "object"
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
}

// =========================================================
// COMPONENT
// =========================================================

function FirewallPage({
  navigate,
}) {
  // =======================================================
  // AUTH
  // =======================================================

  const token = getToken();

  const operator = useMemo(
    () => getOperator(),
    []
  );

  // ONLY ONE FIREWALL STATION
  const station =
    STATION;

  // =======================================================
  // STATE
  // =======================================================

  const [
    queue,
    setQueue,
  ] = useState([]);

  const [
    selectedRecordId,
    setSelectedRecordId,
  ] = useState("");

  const [
    record,
    setRecord,
  ] = useState(null);

  const [
    stationData,
    setStationData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingRecord,
    setLoadingRecord,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    passing,
    setPassing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    header,
    setHeader,
  ] = useState(
    createEmptyHeader()
  );

  const [
    rows,
    setRows,
  ] = useState([]);

  const [
    personnel,
    setPersonnel,
  ] = useState(
    createEmptyPersonnel()
  );

  // =======================================================
  // AUTH HEADERS
  // =======================================================

  const authHeaders = useMemo(
    () => ({
      Authorization:
        `Bearer ${token}`,

      "X-Operator-ID":
        operator?.operator_id ||
        "",
    }),
    [
      token,
      operator?.operator_id,
    ]
  );

  // =======================================================
  // APPLY RECORD DATA TO UI
  //
  // Used both for:
  //
  // 1. Queue item
  // 2. Backend detail response
  // =======================================================

  const applyRecordData =
    useCallback(
      (
        loadedRecord,
        explicitStationData = null
      ) => {
        if (!loadedRecord) {
          return;
        }

        const loadedFirewall =
          loadedRecord
            ?.firewall ||
          {};

        const loadedStation =
          explicitStationData ||
          loadedFirewall
            ?.stations
            ?.[STATION] ||
          null;

        setRecord(
          loadedRecord
        );

        setStationData(
          loadedStation
        );

        // -------------------------------------------------
        // HEADER
        // -------------------------------------------------

        setHeader({
          ...createEmptyHeader(),

          ...(loadedStation
            ?.header || {}),
        });

        // -------------------------------------------------
        // ROWS
        // -------------------------------------------------

        const loadedRows =
          Array.isArray(
            loadedStation
              ?.rows
          )
            ? loadedStation.rows
            : [];

        if (
          loadedRows.length >
          0
        ) {
          setRows(
            loadedRows
          );
        } else {
          setRows([
            createEmptyRow(
              1,
              getFrameNumber(
                loadedRecord
              )
            ),
          ]);
        }

        // -------------------------------------------------
        // PERSONNEL
        // -------------------------------------------------

        const storedPersonnel =
          loadedStation
            ?.signatures ||
          {};

        setPersonnel({
          ...createEmptyPersonnel(),

          ...storedPersonnel,

          // Backward compatibility
          inspector_name:
            storedPersonnel
              ?.inspector_name ??
            storedPersonnel
              ?.inspector ??
            "",

          welder_name:
            storedPersonnel
              ?.welder_name ??
            storedPersonnel
              ?.welder_sign ??
            "",

          quality_inspector_name:
            storedPersonnel
              ?.quality_inspector_name ??
            storedPersonnel
              ?.quality_inspector_sign ??
            "",
        });
      },
      []
    );

  // =======================================================
  // LOAD FIREWALL QUEUE
  //
  // NO PDI-REWORK FILTER
  //
  // Backend is the source of truth.
  // =======================================================

  const loadQueue =
    useCallback(
      async () => {
        if (!token) {
          navigate("/login");
          return;
        }

        try {
          setLoading(true);
          setError("");

          const response =
            await axios.get(
              `${API}/firewall/queue`,
              {
                headers:
                  authHeaders,

                params: {
                  station:
                    STATION,

                  _:
                    Date.now(),
                },
              }
            );

          const data =
            response?.data;

          let records =
            [];

          if (
            Array.isArray(
              data
            )
          ) {
            records =
              data;
          } else if (
            Array.isArray(
              data?.records
            )
          ) {
            records =
              data.records;
          } else if (
            Array.isArray(
              data?.data
            )
          ) {
            records =
              data.data;
          } else if (
            Array.isArray(
              data?.items
            )
          ) {
            records =
              data.items;
          }

          console.log(
            "========== FIREWALL QUEUE =========="
          );

          console.log(
            "FIREWALL QUEUE RESPONSE:",
            records
          );

          console.log(
            "FIREWALL QUEUE COUNT:",
            records.length
          );

          setQueue(
            records
          );
        } catch (err) {
          console.error(
            "FIREWALL QUEUE ERROR:",
            err
          );

          setQueue([]);

          setError(
            getError(
              err,
              "Failed to load Firewall queue."
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [
        token,
        authHeaders,
        navigate,
      ]
    );

  // =======================================================
// LOAD FIREWALL RECORD
//
// IMPORTANT:
// The queue already contains the complete record needed
// for Firewall inspection.
//
// We DO NOT automatically call:
//     GET /firewall/{recordId}
//
// because an older backend endpoint can incorrectly return
// the obsolete PDI-rework warning.
//
// The queue record is used directly.
// =======================================================

const loadRecord =
  useCallback(
    async (
      recordId,
      fallbackRecord = null
    ) => {
      if (!recordId) {
        return;
      }

      setLoadingRecord(
        false
      );

      // ---------------------------------------------------
      // Prefer the queue record.
      // ---------------------------------------------------

      if (fallbackRecord) {
        const fallbackStation =
          fallbackRecord
            ?.firewall
            ?.stations
            ?.[STATION] ||
          null;

        applyRecordData(
          fallbackRecord,
          fallbackStation
        );

        return;
      }

      // ---------------------------------------------------
      // No fallback record means there is nothing more
      // to load.
      // ---------------------------------------------------

      console.warn(
        "No fallback Firewall record available for:",
        recordId
      );
    },
    [
      applyRecordData,
    ]
  );

 
  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadQueue();
  }, [
    loadQueue,
  ]);

  // =======================================================
  // STATION STATUS
  // =======================================================

  const isStationCompleted =
    stationData?.status ===
    "PASSED";

  // The current Firewall API exposes PDI-3 and PDI-4 as the
  // PDI readiness stations. Do not invent statuses for stations
  // that are not returned by the API.
  const pdiReadiness = useMemo(() => {
    const pdiStations =
      record?.pdi?.stations ||
      {};

    return [
      {
        key: "PDI_STATION_3",
        label: "ST-3",
        status:
          pdiStations?.PDI_STATION_3?.status ||
          "WAITING",
      },
      {
        key: "PDI_STATION_4",
        label: "ST-4",
        status:
          pdiStations?.PDI_STATION_4?.status ||
          "WAITING",
      },
    ];
  }, [record]);

  const pdiReadyForFirewall =
    pdiReadiness.length > 0 &&
    pdiReadiness.every(
      (item) =>
        item.status === "PASSED"
    );

  // =======================================================
  // VALID ROWS
  // =======================================================

  const validRows = useMemo(
    () =>
      rows.filter(
        (row) => {
          if (!row) {
            return false;
          }

          return (
            String(
              row.frame_no ||
                ""
            ).trim() !== "" ||

            String(
              row.defect_observation ||
                ""
            ).trim() !== "" ||

            String(
              row.skip_by_station ||
                ""
            ).trim() !== "" ||

            String(
              row.status_after_rework ||
                ""
            ).trim() !== ""
          );
        }
      ),
    [rows]
  );

  // =======================================================
// SELECT FIREWALL FRAME
// =======================================================

const selectRecord =
  async (item) => {

    const id =
      getRecordId(
        item
      );

    if (!id) {
      setError(
        "This queue item does not contain a valid record ID."
      );

      console.error(
        "INVALID FIREWALL QUEUE ITEM:",
        item
      );

      return;
    }

    const recordId =
      String(id);

    console.log(
      "SELECTED FIREWALL RECORD ID:",
      recordId
    );

    setSelectedRecordId(
      recordId
    );

    setError("");
    setSuccess("");

    // ---------------------------------------------------
    // USE THE QUEUE RECORD DIRECTLY
    // ---------------------------------------------------

    const queueStation =
      item
        ?.firewall
        ?.stations
        ?.[STATION] ||
      null;

    applyRecordData(
      item,
      queueStation
    );

    // ---------------------------------------------------
    // IMPORTANT:
    //
    // Do NOT call the old GET /firewall/{id} here.
    // That endpoint is what was producing the obsolete:
    //
    // "PDI NOK rework must be completed at OP60 before Firewall."
    //
    // ---------------------------------------------------

    setLoadingRecord(
      false
    );
  };
  // =======================================================
  // UPDATE HEADER
  // =======================================================

  const updateHeader = (
    field,
    value
  ) => {
    if (
      isStationCompleted ||
      saving ||
      passing
    ) {
      return;
    }

    setHeader(
      (previous) => ({
        ...previous,
        [field]:
          value,
      })
    );
  };

  // =======================================================
  // UPDATE PERSONNEL
  // =======================================================

  const updatePersonnel = (
    field,
    value
  ) => {
    if (
      isStationCompleted ||
      saving ||
      passing
    ) {
      return;
    }

    setPersonnel(
      (previous) => ({
        ...previous,
        [field]:
          value,
      })
    );
  };

  // =======================================================
  // UPDATE ROW
  // =======================================================

  const updateRow = (
    index,
    field,
    value
  ) => {
    if (
      isStationCompleted ||
      saving ||
      passing
    ) {
      return;
    }

    setRows(
      (previous) =>
        previous.map(
          (
            row,
            rowIndex
          ) =>
            rowIndex ===
            index
              ? {
                  ...row,

                  [field]:
                    value,
                }
              : row
        )
    );
  };

  // =======================================================
  // ADD ROW
  // =======================================================

  const addRow = () => {
    if (
      isStationCompleted ||
      saving ||
      passing
    ) {
      return;
    }

    setRows(
      (previous) => [
        ...previous,

        createEmptyRow(
          previous.length +
            1,

          getFrameNumber(
            record
          )
        ),
      ]
    );
  };

  // =======================================================
  // REMOVE ROW
  // =======================================================

  const removeRow = (
    index
  ) => {
    if (
      isStationCompleted ||
      saving ||
      passing
    ) {
      return;
    }

    setRows(
      (previous) => {
        const updated =
          previous.filter(
            (
              _,
              rowIndex
            ) =>
              rowIndex !==
              index
          );

        return updated.map(
          (
            row,
            rowIndex
          ) => ({
            ...row,

            sno:
              rowIndex + 1,
          })
        );
      }
    );
  };

  // =======================================================
  // SAVE FIREWALL
  // =======================================================

  const saveStation =
    async () => {
      if (
        !selectedRecordId
      ) {
        setError(
          "Select a frame first."
        );

        return;
      }

      if (
        isStationCompleted
      ) {
        setError(
          "This Firewall station is already completed."
        );

        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        const response =
          await axios.put(
            `${API}/firewall/${encodeURIComponent(
              selectedRecordId
            )}/station`,
            {
              header:
                header,

              rows:
                rows,

              signatures:
                personnel,
            },
            {
              headers:
                authHeaders,
            }
          );

        const updatedRecord =
          response
            ?.data
            ?.record;

        if (
          updatedRecord
        ) {
          const updatedStation =
            updatedRecord
              ?.firewall
              ?.stations
              ?.[STATION] ||
            null;

          applyRecordData(
            updatedRecord,
            updatedStation
          );
        }

        setSuccess(
          "Firewall inspection saved successfully."
        );

        await loadQueue();

      } catch (err) {
        console.error(
          "FIREWALL SAVE ERROR:",
          err
        );

        setError(
          getError(
            err,
            "Failed to save Firewall inspection."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  // =======================================================
// PASS FIREWALL
//
// After Firewall PASS:
//
//     FIREWALL
//         ↓
//        DOC
//
// The same physical inspection record is passed forward.
// No new frame is created.
// =======================================================

const passStation =
  async () => {

    if (
      !selectedRecordId
    ) {
      setError(
        "Select a frame first."
      );

      return;
    }

    if (
      isStationCompleted
    ) {
      return;
    }

    if (
      validRows.length ===
      0
    ) {
      setError(
        "Enter at least one Firewall inspection row before completing the station."
      );

      return;
    }

    try {

      setPassing(
        true
      );

      setError("");
      setSuccess("");

      // =================================================
      // PASS FIREWALL
      // =================================================

      const response =
        await axios.post(
          `${API}/firewall/${encodeURIComponent(
            selectedRecordId
          )}/pass`,
          {
            header:
              header,

            rows:
              rows,

            signatures:
              personnel,
          },
          {
            headers:
              authHeaders,
          }
        );

      const data =
        response?.data ||
        {};

      const updatedRecord =
        data?.record ||
        null;

      // =================================================
      // UPDATE LOCAL STATE
      // =================================================

      if (
        updatedRecord
      ) {

        setRecord(
          updatedRecord
        );

        const updatedStation =
          updatedRecord
            ?.firewall
            ?.stations
            ?.[STATION] ||
          null;

        setStationData(
          updatedStation
        );

        setHeader({
          ...createEmptyHeader(),

          ...(updatedStation
            ?.header || {}),
        });

        setRows(
          Array.isArray(
            updatedStation
              ?.rows
          )
            ? updatedStation.rows
            : rows
        );

        setPersonnel({
          ...createEmptyPersonnel(),

          ...(updatedStation
            ?.signatures ||
            {}),
        });

        // =================================================
        // SAVE SAME RECORD FOR DOC
        // =================================================

        const finalRecordId =
          updatedRecord?._id ||
          updatedRecord?.record_id ||
          selectedRecordId;

        const finalFrameNo =
          getFrameNumber(
            updatedRecord
          );

        localStorage.setItem(
          "doc_frame_id",
          String(
            finalRecordId
          )
        );

        localStorage.setItem(
          "doc_frame_no",
          String(
            finalFrameNo
          )
        );

        localStorage.setItem(
          "doc_source_station",
          "FIREWALL"
        );

        localStorage.setItem(
          "doc_record",
          JSON.stringify(
            updatedRecord
          )
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      setSuccess(
        "Firewall completed successfully. Sending frame to DOC..."
      );

      // =================================================
      // REMOVE FROM FIREWALL QUEUE
      // =================================================

      setQueue(
        (previousQueue) =>
          previousQueue.filter(
            (item) =>
              String(
                getRecordId(
                  item
                )
              ) !==
              String(
                selectedRecordId
              )
          )
      );

      // Stay on the Firewall screen after PASS.
      // Keep the selected frame visible as PASSED / VIEW ONLY.
      setLoadingRecord(false);

    } catch (err) {

      console.error(
        "FIREWALL PASS ERROR:",
        err
      );

      setError(
        getError(
          err,
          "Failed to complete Firewall inspection."
        )
      );

    } finally {

      setPassing(
        false
      );
    }
  };
  // =======================================================
  // LOGOUT
  // =======================================================

  const logout = () => {
    [
      "operator_token",
      "operator",
      "operator_info",
      "operator_station",
      "operator_stage",
      "operator_shift",
    ].forEach(
      (key) => {
        localStorage.removeItem(
          key
        );
      }
    );

    navigate(
      "/login"
    );
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div
      className="qid-page qid-firewall"
      style={
        styles.page
      }
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <header
        style={
          styles.header
        }
      >
        <div style={styles.headerIdentity}>
          <div style={styles.headerTitleRow}>
            <div
              style={
                styles.title
              }
            >
              Firewall Inspection
            </div>

            <span style={styles.headerStationBadge}>
              FIREWALL
            </span>
          </div>

          <div
            style={
              styles.subtitle
            }
          >
            Operator:{" "}
            <strong>
              {
                operator?.name ||
                operator?.operator_id ||
                "Operator"
              }
            </strong>

            <span style={styles.headerDivider}>•</span>

            Shift:{" "}
            <strong>
              {
                operator?.shift ||
                operator?.operator_shift ||
                "-"
              }
            </strong>
          </div>
        </div>

        <button
          type="button"
          onClick={
            logout
          }
          style={
            styles.logoutButton
          }
        >
          Logout
        </button>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main
        style={
          styles.main
        }
      >
        {/* =================================================
            ERROR
        ================================================= */}

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
            SUCCESS
        ================================================= */}

        {success && (
          <div
            style={
              styles.success
            }
          >
            {success}
          </div>
        )}

        {/* =================================================
            STATION
        ================================================= */}

        <section
          style={
            styles.stationCard
          }
        >
          <div>
            <div
              style={
                styles.smallLabel
              }
            >
              CURRENT STATION
            </div>

            <div
              style={
                styles.stationName
              }
            >
              FIREWALL INSPECTION
            </div>

            <div style={styles.stationMeta}>
              Final inspection after PDI readiness
            </div>
          </div>

          <div style={styles.stationStatusBlock}>
            <div style={styles.smallLabel}>
              CURRENT STATUS
            </div>

            <div
              style={
                styles.statusBadge(
                  stationData?.status
                )
              }
            >
              {
                stationData?.status ||
                "WAITING"
              }
            </div>
          </div>
        </section>

        <section style={styles.readinessCard}>
          <div style={styles.readinessHeader}>
            <div>
              <div style={styles.overviewEyebrow}>
                PDI READINESS
              </div>
              <h2 style={styles.overviewTitle}>
                {pdiReadyForFirewall
                  ? "Ready for Firewall Inspection"
                  : "PDI readiness in progress"}
              </h2>
            </div>

            <span
              style={styles.readinessBadge(
                pdiReadyForFirewall
              )}
            >
              {pdiReadyForFirewall
                ? "READY"
                : "WAITING"}
            </span>
          </div>

          <div style={styles.readinessList}>
            {pdiReadiness.map(
              (item) => (
                <div
                  key={item.key}
                  style={styles.readinessItem}
                >
                  <span
                    style={styles.readinessIcon(
                      item.status === "PASSED"
                    )}
                  >
                    {item.status === "PASSED"
                      ? "✓"
                      : "•"}
                  </span>

                  <span style={styles.readinessLabel}>
                    {item.label}
                  </span>

                  <span
                    style={styles.readinessStatus(
                      item.status
                    )}
                  >
                    {item.status}
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        {/* =================================================
            GRID
        ================================================= */}

        <div
          style={
            styles.grid
          }
        >
          {/* =================================================
              QUEUE
          ================================================= */}

          <aside
            style={
              styles.queueCard
            }
          >
            <div
              style={
                styles.queueHeader
              }
            >
              <div>
                <h2
                  style={
                    styles.sectionHeading
                  }
                >
                  Firewall Queue
                </h2>

                <div
                  style={
                    styles.queueSubtext
                  }
                >
                  Select a frame to begin or continue inspection
                </div>
              </div>

              <button
                type="button"
                onClick={
                  loadQueue
                }
                disabled={
                  loading
                }
                style={
                  styles.refreshButton
                }
                title="Refresh"
              >
                {loading
                  ? "..."
                  : "↻"}
              </button>
            </div>

            {/* =================================================
                QUEUE
            ================================================= */}

            {loading ? (
              <div
                style={
                  styles.empty
                }
              >
                Loading frames...
              </div>
            ) : queue.length ===
              0 ? (
              <div
                style={
                  styles.empty
                }
              >
                <div
                  style={
                    styles.emptyIcon
                  }
                >
                  🔍
                </div>

                <div
                  style={
                    styles.emptyTitle
                  }
                >
                  No frames are available
                </div>

                <div
                  style={
                    styles.emptyText
                  }
                >
                  No frames are available for Firewall inspection.
                </div>
              </div>
            ) : (
              <div
                style={
                  styles.queueList
                }
              >
                {queue.map(
                  (
                    item,
                    index
                  ) => {
                    const id =
                      String(
                        getRecordId(
                          item
                        ) ||
                          index
                      );

                    const firewallStatus =
                      item
                        ?.firewall
                        ?.stations
                        ?.[STATION]
                        ?.status ||
                      item
                        ?.firewall_status ||
                      "WAITING";

                    const selected =
                      String(
                        selectedRecordId
                      ) === id;

                    return (
                      <button
                        type="button"
                        key={
                          id
                        }
                        onClick={() =>
                          selectRecord(
                            item
                          )
                        }
                        style={
                          styles.queueItem(
                            selected
                          )
                        }
                      >
                        <div
                          style={
                            styles.queueItemTop
                          }
                        >
                          <strong>
                            Frame{" "}
                            {
                              getFrameNumber(
                                item
                              )
                            }
                          </strong>

                          <span
                            style={
                              styles.itemBadge(
                                firewallStatus
                              )
                            }
                          >
                            {
                              firewallStatus
                            }
                          </span>
                        </div>

                        <div
                          style={
                            styles.queueMeta
                          }
                        >
                          PDI ST-3:
                          {" "}
                          <strong>
                            PASSED
                          </strong>
                        </div>

                        <div
                          style={
                            styles.queueMeta
                          }
                        >
                          PDI ST-4:
                          {" "}
                          <strong>
                            PASSED
                          </strong>
                        </div>

                        <div
                          style={
                            styles.queueDate
                          }
                        >
                          Created:
                          {" "}
                          {
                            formatDate(
                              item?.created_at
                            )
                          }
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </aside>

          {/* =================================================
              WORK AREA
          ================================================= */}

          <section>
            {!selectedRecordId ? (
              <div
                style={
                  styles.placeholder
                }
              >
                <div
                  style={
                    styles.placeholderIcon
                  }
                >
                  🔍
                </div>

                <h2
                  style={
                    styles.placeholderTitle
                  }
                >
                  Select a frame
                </h2>

                <p
                  style={
                    styles.placeholderText
                  }
                >
                  Select a frame from
                  the Firewall queue.
                </p>
              </div>
            ) : loadingRecord &&
              !record ? (
              <div
                style={
                  styles.placeholder
                }
              >
                <div
                  style={
                    styles.placeholderIcon
                  }
                >
                  ⏳
                </div>

                <h2
                  style={
                    styles.placeholderTitle
                  }
                >
                  Loading frame...
                </h2>
              </div>
            ) : !record ? (
              <div
                style={
                  styles.placeholder
                }
              >
                <div
                  style={
                    styles.placeholderIcon
                  }
                >
                  ⚠️
                </div>

                <h2
                  style={
                    styles.placeholderTitle
                  }
                >
                  Unable to load this frame
                </h2>

                <p
                  style={
                    styles.placeholderText
                  }
                >
                  Check the error message above.
                </p>
              </div>
            ) : (
              <div
                style={
                  styles.workArea
                }
              >
                {/* =============================================
                    FRAME INFORMATION
                ============================================== */}

                <section
                  style={
                    styles.card
                  }
                >
                  <SectionTitle>
                    Frame Information
                  </SectionTitle>

                  <div
                    style={
                      styles.infoGrid
                    }
                  >
                    <InfoBox
                      label="Frame No."
                      value={
                        getFrameNumber(
                          record
                        )
                      }
                    />

                    <InfoBox
                      label="Firewall Station"
                      value="FIREWALL"
                    />

                    <InfoBox
                      label="Operator"
                      value={
                        operator?.name ||
                        operator?.operator_id ||
                        "-"
                      }
                    />

                    <InfoBox
                      label="Status"
                      value={
                        stationData
                          ?.status ||
                        "WAITING"
                      }
                    />
                  </div>

                  <div
                    style={
                      styles.infoNote
                    }
                  >
                    This frame is available
                    because PDI ST-3 and
                    PDI ST-4 are both
                    completed.
                  </div>
                </section>

                {/* =============================================
                    FIREWALL INSPECTION
                ============================================== */}

                <section
                  style={
                    styles.card
                  }
                >
                  <SectionTitle>
                    Firewall Inspection
                  </SectionTitle>

                  <div
                    style={
                      styles.formGrid
                    }
                  >
                    <Field
                      label="Shift Leader"
                      value={
                        header.shift_leader
                      }
                      onChange={(
                        value
                      ) =>
                        updateHeader(
                          "shift_leader",
                          value
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />

                    <Field
                      label="RED"
                      value={
                        header.red
                      }
                      onChange={(
                        value
                      ) =>
                        updateHeader(
                          "red",
                          value
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />

                    <Field
                      label="Firewall Inspector"
                      value={
                        header.firewall_inspector
                      }
                      onChange={(
                        value
                      ) =>
                        updateHeader(
                          "firewall_inspector",
                          value
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />

                    <Field
                      label="Date"
                      type="date"
                      value={
                        header.date
                      }
                      onChange={(
                        value
                      ) =>
                        updateHeader(
                          "date",
                          value
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />

                    <Field
                      label="Shift"
                      value={
                        header.shift
                      }
                      onChange={(
                        value
                      ) =>
                        updateHeader(
                          "shift",
                          value
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />

                    <Field
                      label="Total Qty of Welding Defects"
                      type="number"
                      min="0"
                      value={
                        header.total_qty_welding_defects
                      }
                      onChange={(
                        value
                      ) =>
                        updateHeader(
                          "total_qty_welding_defects",
                          value === ""
                            ? 0
                            : Number(
                                value
                              )
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />

                    <Field
                      label="Total Spatter Count"
                      type="number"
                      min="0"
                      value={
                        header.total_spatter_count
                      }
                      onChange={(
                        value
                      ) =>
                        updateHeader(
                          "total_spatter_count",
                          value === ""
                            ? 0
                            : Number(
                                value
                              )
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />
                  </div>
                </section>

                {/* =============================================
                    WELDING / SPATTER TABLE
                ============================================== */}

                <section
                  style={
                    styles.card
                  }
                >
                  <div
                    style={
                      styles.sectionRow
                    }
                  >
                    <SectionTitle>
                      Welding /
                      Spatter Inspection
                    </SectionTitle>

                    {!isStationCompleted && (
                      <button
                        type="button"
                        onClick={
                          addRow
                        }
                        disabled={
                          saving ||
                          passing
                        }
                        style={
                          styles.addButton
                        }
                      >
                        + Add Row
                      </button>
                    )}
                  </div>

                  <div
                    style={
                      styles.tableWrap
                    }
                  >
                    <table
                      style={
                        styles.table
                      }
                    >
                      <thead>
                        <tr>
                          <th
                            style={
                              styles.th
                            }
                          >
                            S.No.
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            Frame No.
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            Defect /
                            Observation
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            Skip by
                            Station
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            Status after
                            Rework
                          </th>

                          {!isStationCompleted && (
                            <th
                              style={
                                styles.th
                              }
                            >
                              Action
                            </th>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map(
                          (
                            row,
                            index
                          ) => (
                            <tr
                              key={`${index}-${row.sno}`}
                            >
                              <td
                                style={
                                  styles.td
                                }
                              >
                                {
                                  index +
                                  1
                                }
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <input
                                  type="text"
                                  value={
                                    row.frame_no ||
                                    ""
                                  }
                                  disabled={
                                    isStationCompleted ||
                                    saving ||
                                    passing
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      index,
                                      "frame_no",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  style={
                                    styles.input
                                  }
                                />
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <textarea
                                  value={
                                    row.defect_observation ||
                                    ""
                                  }
                                  disabled={
                                    isStationCompleted ||
                                    saving ||
                                    passing
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      index,
                                      "defect_observation",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  rows={
                                    2
                                  }
                                  style={{
                                    ...styles.input,
                                    resize:
                                      "vertical",
                                  }}
                                />
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <input
                                  type="text"
                                  value={
                                    row.skip_by_station ||
                                    ""
                                  }
                                  disabled={
                                    isStationCompleted ||
                                    saving ||
                                    passing
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      index,
                                      "skip_by_station",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  style={
                                    styles.input
                                  }
                                />
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                <select
                                  value={
                                    row.status_after_rework ||
                                    ""
                                  }
                                  disabled={
                                    isStationCompleted ||
                                    saving ||
                                    passing
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      index,
                                      "status_after_rework",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  style={
                                    styles.input
                                  }
                                >
                                  <option value="">
                                    Select
                                  </option>

                                  <option value="OK">
                                    OK
                                  </option>

                                  <option value="HOLD">
                                    HOLD
                                  </option>

                                  <option value="REJECT">
                                    REJECT
                                  </option>
                                </select>
                              </td>

                              {!isStationCompleted && (
                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  {rows.length >
                                    1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeRow(
                                          index
                                        )
                                      }
                                      disabled={
                                        saving ||
                                        passing
                                      }
                                      style={
                                        styles.deleteButton
                                      }
                                    >
                                      Delete
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* =============================================
                    PERSONNEL
                ============================================== */}

                <section
                  style={
                    styles.card
                  }
                >
                  <SectionTitle>
                    Personnel Names
                  </SectionTitle>

                  <div
                    style={
                      styles.formGrid3
                    }
                  >
                    <Field
                      label="Inspector Name"
                      value={
                        personnel.inspector_name
                      }
                      onChange={(
                        value
                      ) =>
                        updatePersonnel(
                          "inspector_name",
                          value
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />

                    <Field
                      label="Welder Name"
                      value={
                        personnel.welder_name
                      }
                      onChange={(
                        value
                      ) =>
                        updatePersonnel(
                          "welder_name",
                          value
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />

                    <Field
                      label="Quality Inspector Name"
                      value={
                        personnel.quality_inspector_name
                      }
                      onChange={(
                        value
                      ) =>
                        updatePersonnel(
                          "quality_inspector_name",
                          value
                        )
                      }
                      disabled={
                        isStationCompleted
                      }
                    />
                  </div>
                </section>

                {/* =============================================
                    ACTIONS
                ============================================== */}

                <section
                  style={
                    styles.actionCard
                  }
                >
                  {isStationCompleted ? (
                    <div
                      style={
                        styles.completedBox
                      }
                    >
                      ✓ FIREWALL —
                      COMPLETED /
                      VIEW ONLY
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={
                          saveStation
                        }
                        disabled={
                          saving ||
                          passing
                        }
                        style={{
                          ...styles.secondaryButton,

                          opacity:
                            saving ||
                            passing
                              ? 0.6
                              : 1,
                        }}
                      >
                        {saving
                          ? "Saving..."
                          : "Save"}
                      </button>

                      <button
                        type="button"
                        onClick={
                          passStation
                        }
                        disabled={
                          saving ||
                          passing
                        }
                        style={{
                          ...styles.primaryButton,

                          opacity:
                            saving ||
                            passing
                              ? 0.6
                              : 1,
                        }}
                      >
                        {passing
                          ? "Completing..."
                          : "PASS FIREWALL"}
                      </button>
                    </>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// =========================================================
// SMALL COMPONENTS
// =========================================================

function SectionTitle({
  children,
}) {
  return (
    <h2
      style={
        styles.sectionHeading
      }
    >
      {children}
    </h2>
  );
}

function InfoBox({
  label,
  value,
}) {
  return (
    <div>
      <div
        style={
          styles.smallLabel
        }
      >
        {label}
      </div>

      <div
        style={
          styles.infoValue
        }
      >
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  min,
}) {
  return (
    <label
      style={
        styles.fieldLabel
      }
    >
      {label}

      <input
        type={type}
        min={min}
        value={
          value ?? ""
        }
        disabled={
          disabled
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        style={{
          ...styles.input,

          background:
            disabled
              ? "#f3f4f6"
              : "#ffffff",

          cursor:
            disabled
              ? "not-allowed"
              : "text",
        }}
      />
    </label>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#eef2f6",
    fontFamily: "Inter, Arial, sans-serif",
    color: "#172033",
  },

  header: {
    background: "#0f1f3d",
    color: "#ffffff",
    minHeight: "76px",
    padding: "14px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "24px",
    borderBottom: "1px solid #22385f",
    boxShadow: "0 3px 12px rgba(15,31,61,0.18)",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  headerIdentity: {
    minWidth: 0,
  },

  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  title: {
    fontSize: "23px",
    lineHeight: "1.2",
    fontWeight: "800",
    letterSpacing: "-0.2px",
  },

  headerStationBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: "6px",
    background: "#1d4ed8",
    border: "1px solid #3b82f6",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.5px",
  },

  subtitle: {
    marginTop: "7px",
    fontSize: "13px",
    color: "#c9d5e8",
  },

  headerDivider: {
    margin: "0 8px",
    color: "#7186aa",
  },

  logoutButton: {
    background: "#ffffff",
    color: "#172033",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "13px",
    minWidth: "82px",
  },

  main: {
    width: "100%",
    maxWidth: "1540px",
    margin: "0 auto",
    padding: "22px 24px 36px",
    boxSizing: "border-box",
  },

  error: {
    background: "#fff1f2",
    color: "#991b1b",
    border: "1px solid #fecdd3",
    borderLeft: "4px solid #dc2626",
    padding: "12px 15px",
    borderRadius: "8px",
    marginBottom: "14px",
    fontWeight: "700",
    fontSize: "13px",
  },

  success: {
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderLeft: "4px solid #16a34a",
    padding: "12px 15px",
    borderRadius: "8px",
    marginBottom: "14px",
    fontWeight: "700",
    fontSize: "13px",
  },

  stationCard: {
    background: "#ffffff",
    border: "1px solid #d9e1ec",
    borderRadius: "12px",
    padding: "18px 20px",
    marginBottom: "14px",
    boxShadow: "0 2px 7px rgba(15,31,61,0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
  },

  smallLabel: {
    fontSize: "10px",
    color: "#64748b",
    fontWeight: "800",
    letterSpacing: "0.7px",
    marginBottom: "5px",
  },

  stationName: {
    fontSize: "20px",
    lineHeight: "1.2",
    fontWeight: "800",
    color: "#12213c",
  },

  stationMeta: {
    marginTop: "5px",
    color: "#64748b",
    fontSize: "12px",
  },

  stationStatusBlock: {
    minWidth: "130px",
    textAlign: "right",
  },

  statusBadge: (status) => {
    const normalized = String(status || "WAITING").toUpperCase();

    let background = "#f1f5f9";
    let color = "#475569";
    let border = "#cbd5e1";

    if (
      normalized === "PASSED" ||
      normalized === "COMPLETED" ||
      normalized === "OK"
    ) {
      background = "#ecfdf3";
      color = "#166534";
      border = "#bbf7d0";
    } else if (
      normalized === "NOK" ||
      normalized === "ERROR"
    ) {
      background = "#fff1f2";
      color = "#b91c1c";
      border = "#fecdd3";
    } else if (
      normalized === "IN_PROGRESS" ||
      normalized === "IN PROGRESS" ||
      normalized === "PENDING"
    ) {
      background = "#fffbeb";
      color = "#a16207";
      border = "#fde68a";
    }

    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 10px",
      borderRadius: "999px",
      background,
      color,
      border: `1px solid ${border}`,
      fontWeight: "800",
      fontSize: "11px",
      letterSpacing: "0.3px",
      whiteSpace: "nowrap",
    };
  },

  overviewCard: {
    background: "#ffffff",
    border: "1px solid #d9e1ec",
    borderRadius: "12px",
    padding: "18px 20px",
    marginBottom: "14px",
    boxShadow: "0 2px 7px rgba(15,31,61,0.05)",
  },

  overviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "14px",
  },

  overviewEyebrow: {
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "0.8px",
    marginBottom: "4px",
  },

  overviewTitle: {
    margin: 0,
    color: "#172033",
    fontSize: "17px",
    fontWeight: "800",
  },

  overviewHint: {
    color: "#64748b",
    fontSize: "11px",
    textAlign: "right",
    maxWidth: "260px",
  },

  zoneGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
    gap: "10px",
  },

  zoneCard: {
    border: "1px solid #dbe3ee",
    borderRadius: "9px",
    padding: "13px",
    background: "#f8fafc",
    minHeight: "74px",
    boxSizing: "border-box",
  },

  zoneName: {
    color: "#172033",
    fontSize: "14px",
    fontWeight: "800",
    marginBottom: "9px",
  },

  zoneNote: {
    color: "#94a3b8",
    fontSize: "10px",
    marginTop: "7px",
  },

  readinessCard: {
    background: "#ffffff",
    border: "1px solid #d9e1ec",
    borderRadius: "12px",
    padding: "18px 20px",
    marginBottom: "18px",
    boxShadow: "0 2px 7px rgba(15,31,61,0.05)",
  },

  readinessHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "14px",
  },

  readinessBadge: (ready) => ({
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: ready ? "#ecfdf3" : "#fffbeb",
    color: ready ? "#166534" : "#a16207",
    border: `1px solid ${ready ? "#bbf7d0" : "#fde68a"}`,
    fontWeight: "800",
    fontSize: "11px",
  }),

  readinessList: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },

  readinessItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    background: "#f8fafc",
  },

  readinessIcon: (passed) => ({
    width: "22px",
    height: "22px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: passed ? "#dcfce7" : "#e2e8f0",
    color: passed ? "#166534" : "#64748b",
    fontWeight: "900",
    flex: "0 0 auto",
  }),

  readinessLabel: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#334155",
    flex: 1,
  },

  readinessStatus: (status) => ({
    fontSize: "10px",
    fontWeight: "800",
    color:
      status === "PASSED"
        ? "#166534"
        : "#a16207",
  }),

  grid: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: "18px",
    alignItems: "start",
  },

  queueCard: {
    background: "#ffffff",
    border: "1px solid #d9e1ec",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 2px 7px rgba(15,31,61,0.06)",
    position: "sticky",
    top: "94px",
    maxHeight: "calc(100vh - 118px)",
    overflowY: "auto",
  },

  queueHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "14px",
  },

  sectionHeading: {
    margin: "0 0 13px",
    fontSize: "17px",
    fontWeight: "800",
    color: "#172033",
  },

  queueSubtext: {
    fontSize: "11px",
    color: "#64748b",
    lineHeight: "1.4",
  },

  refreshButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#1d4ed8",
    borderRadius: "7px",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "800",
  },

  empty: {
    padding: "26px 10px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  emptyIcon: {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 10px",
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "20px",
  },

  emptyTitle: {
    fontWeight: "800",
    color: "#334155",
    marginBottom: "5px",
  },

  emptyText: {
    fontSize: "12px",
    color: "#64748b",
  },

  queueList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  queueItem: (selected) => ({
    textAlign: "left",
    border: selected
      ? "2px solid #2563eb"
      : "1px solid #dbe3ee",
    background: selected ? "#eff6ff" : "#ffffff",
    borderRadius: "9px",
    padding: "13px",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
    boxShadow: selected
      ? "0 2px 7px rgba(37,99,235,0.10)"
      : "none",
  }),

  queueItemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },

  itemBadge: (status) => {
    const normalized = String(status || "WAITING").toUpperCase();

    return {
      display: "inline-flex",
      padding: "4px 7px",
      borderRadius: "999px",
      background:
        normalized === "PASSED"
          ? "#ecfdf3"
          : normalized === "NOK"
          ? "#fff1f2"
          : normalized === "IN_PROGRESS"
          ? "#fffbeb"
          : "#f1f5f9",
      color:
        normalized === "PASSED"
          ? "#166534"
          : normalized === "NOK"
          ? "#b91c1c"
          : normalized === "IN_PROGRESS"
          ? "#a16207"
          : "#475569",
      border:
        normalized === "PASSED"
          ? "1px solid #bbf7d0"
          : normalized === "NOK"
          ? "1px solid #fecdd3"
          : normalized === "IN_PROGRESS"
          ? "1px solid #fde68a"
          : "1px solid #cbd5e1",
      fontSize: "10px",
      fontWeight: "800",
      whiteSpace: "nowrap",
    };
  },

  queueMeta: {
    marginTop: "8px",
    fontSize: "11px",
    color: "#64748b",
  },

  queueDate: {
    marginTop: "6px",
    fontSize: "10px",
    color: "#94a3b8",
  },

  placeholder: {
    background: "#ffffff",
    border: "1px solid #d9e1ec",
    borderRadius: "12px",
    padding: "52px 24px",
    textAlign: "center",
    boxShadow: "0 2px 7px rgba(15,31,61,0.05)",
    color: "#64748b",
  },

  placeholderIcon: {
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "21px",
  },

  placeholderTitle: {
    margin: "0 0 7px",
    color: "#172033",
    fontSize: "18px",
  },

  placeholderText: {
    margin: 0,
    lineHeight: "1.5",
    fontSize: "13px",
  },

  workArea: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #d9e1ec",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 7px rgba(15,31,61,0.05)",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
    gap: "10px",
  },

  infoValue: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#172033",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "7px",
    padding: "10px 11px",
    minHeight: "18px",
  },

  infoNote: {
    marginTop: "13px",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: "1.5",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
    gap: "13px",
  },

  formGrid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
    gap: "13px",
  },

  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "11px",
    fontWeight: "800",
    color: "#334155",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    padding: "10px 11px",
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    color: "#172033",
    background: "#ffffff",
  },

  sectionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },

  tableWrap: {
    overflowX: "auto",
    border: "1px solid #dbe3ee",
    borderRadius: "8px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
  },

  th: {
    background: "#f1f5f9",
    border: "1px solid #dbe3ee",
    padding: "11px 10px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: "800",
    color: "#334155",
    whiteSpace: "nowrap",
  },

  td: {
    border: "1px solid #e2e8f0",
    padding: "9px",
    verticalAlign: "top",
    background: "#ffffff",
  },

  addButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    padding: "9px 13px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "12px",
  },

  deleteButton: {
    background: "#fff1f2",
    color: "#b91c1c",
    border: "1px solid #fecdd3",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "11px",
  },

  actionCard: {
    background: "#ffffff",
    border: "1px solid #d9e1ec",
    borderRadius: "12px",
    padding: "16px 20px",
    boxShadow: "0 2px 7px rgba(15,31,61,0.05)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  completedBox: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 16px",
    borderRadius: "8px",
    background: "#ecfdf3",
    color: "#166534",
    border: "1px solid #bbf7d0",
    fontWeight: "800",
    textAlign: "center",
  },

  secondaryButton: {
    background: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "11px 20px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "13px",
    minWidth: "100px",
  },

  primaryButton: {
    background: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 22px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "13px",
    minWidth: "150px",
    boxShadow: "0 2px 5px rgba(22,163,74,0.20)",
  },
};


export default FirewallPage;
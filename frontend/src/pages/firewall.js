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

      // =================================================
      // GO TO DOC
      // =================================================

      setTimeout(
        () => {
          window.location.href =
            "/doc";
        },
        400
      );

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
        <div>
          <div
            style={
              styles.title
            }
          >
            Firewall Inspection
          </div>

          <div
            style={
              styles.subtitle
            }
          >
            {
              operator?.name ||
              operator?.operator_id ||
              "Operator"
            }

            {" • "}

            FIREWALL
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
              STATION
            </div>

            <div
              style={
                styles.stationName
              }
            >
              FIREWALL
            </div>
          </div>

          <div
            style={
              styles.statusBadge(
                stationData
                  ?.status
              )
            }
          >
            {
              stationData?.status ||
              "WAITING"
            }
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
                  PDI ST-3 + PDI ST-4
                  completed
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
                  No frames available
                </div>

                <div
                  style={
                    styles.emptyText
                  }
                >
                  Frames appear here after
                  PDI ST-3 and PDI ST-4
                  are both passed.
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
    minHeight:
      "100vh",
    background:
      "#f4f6f8",
    fontFamily:
      "Arial, sans-serif",
    color:
      "#1f2937",
  },

  header: {
    background:
      "#111827",
    color:
      "white",
    padding:
      "18px 28px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "20px",
    position:
      "sticky",
    top:
      0,
    zIndex:
      20,
  },

  title: {
    fontSize:
      "24px",
    fontWeight:
      "700",
  },

  subtitle: {
    marginTop:
      "5px",
    fontSize:
      "13px",
    opacity:
      0.8,
  },

  main: {
    maxWidth:
      "1500px",
    margin:
      "0 auto",
    padding:
      "24px",
  },

  error: {
    background:
      "#fee2e2",
    color:
      "#991b1b",
    border:
      "1px solid #fecaca",
    padding:
      "12px 15px",
    borderRadius:
      "8px",
    marginBottom:
      "16px",
    fontWeight:
      "600",
  },

  success: {
    background:
      "#dcfce7",
    color:
      "#166534",
    border:
      "1px solid #bbf7d0",
    padding:
      "12px 15px",
    borderRadius:
      "8px",
    marginBottom:
      "16px",
    fontWeight:
      "600",
  },

  stationCard: {
    background:
      "white",
    borderRadius:
      "12px",
    padding:
      "18px",
    marginBottom:
      "20px",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.06)",
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  smallLabel: {
    fontSize:
      "12px",
    color:
      "#6b7280",
    fontWeight:
      "600",
    marginBottom:
      "5px",
  },

  stationName: {
    fontSize:
      "20px",
    fontWeight:
      "700",
  },

  statusBadge: (
    status
  ) => ({
    padding:
      "8px 13px",
    borderRadius:
      "999px",

    background:
      status ===
      "PASSED"
        ? "#dcfce7"
        : status ===
          "IN_PROGRESS"
        ? "#fef3c7"
        : "#f3f4f6",

    color:
      status ===
      "PASSED"
        ? "#166534"
        : status ===
          "IN_PROGRESS"
        ? "#92400e"
        : "#374151",

    fontWeight:
      "700",
    fontSize:
      "12px",
  }),

  grid: {
    display:
      "grid",
    gridTemplateColumns:
      "330px minmax(0, 1fr)",
    gap:
      "20px",
    alignItems:
      "start",
  },

  queueCard: {
    background:
      "white",
    borderRadius:
      "12px",
    padding:
      "18px",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.06)",
    position:
      "sticky",
    top:
      "90px",
    maxHeight:
      "calc(100vh - 120px)",
    overflowY:
      "auto",
  },

  queueHeader: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    gap:
      "10px",
    marginBottom:
      "14px",
  },

  sectionHeading: {
    margin:
      "0 0 16px",
    fontSize:
      "18px",
    fontWeight:
      "700",
    color:
      "#111827",
  },

  queueSubtext: {
    fontSize:
      "11px",
    color:
      "#6b7280",
    marginTop:
      "-8px",
  },

  refreshButton: {
    border:
      "1px solid #d1d5db",
    background:
      "white",
    borderRadius:
      "6px",
    padding:
      "6px 9px",
    cursor:
      "pointer",
    fontSize:
      "18px",
  },

  empty: {
    padding:
      "30px 12px",
    textAlign:
      "center",
    color:
      "#6b7280",
    fontSize:
      "14px",
    lineHeight:
      "1.5",
  },

  emptyIcon: {
    fontSize:
      "40px",
    marginBottom:
      "10px",
  },

  emptyTitle: {
    fontWeight:
      "700",
    color:
      "#374151",
    marginBottom:
      "6px",
  },

  emptyText: {
    fontSize:
      "12px",
    color:
      "#6b7280",
  },

  queueList: {
    display:
      "flex",
    flexDirection:
      "column",
    gap:
      "9px",
  },

  queueItem: (
    selected
  ) => ({
    textAlign:
      "left",

    border:
      selected
        ? "2px solid #2563eb"
        : "1px solid #e5e7eb",

    background:
      selected
        ? "#eff6ff"
        : "white",

    borderRadius:
      "9px",

    padding:
      "12px",

    cursor:
      "pointer",

    width:
      "100%",

    boxSizing:
      "border-box",
  }),

  queueItemTop: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "8px",
  },

  itemBadge: (
    status
  ) => ({
    fontSize:
      "11px",
    fontWeight:
      "700",
    padding:
      "4px 7px",
    borderRadius:
      "999px",

    background:
      status ===
      "PASSED"
        ? "#dcfce7"
        : status ===
          "IN_PROGRESS"
        ? "#fef3c7"
        : "#f3f4f6",

    color:
      status ===
      "PASSED"
        ? "#166534"
        : status ===
          "IN_PROGRESS"
        ? "#92400e"
        : "#374151",
  }),

  queueMeta: {
    marginTop:
      "7px",
    fontSize:
      "11px",
    color:
      "#6b7280",
  },

  queueDate: {
    marginTop:
      "5px",
    fontSize:
      "10px",
    color:
      "#9ca3af",
  },

  placeholder: {
    background:
      "white",
    borderRadius:
      "12px",
    padding:
      "70px 30px",
    textAlign:
      "center",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.06)",
    color:
      "#6b7280",
  },

  placeholderIcon: {
    fontSize:
      "42px",
    marginBottom:
      "12px",
  },

  placeholderTitle: {
    margin:
      "0 0 8px",
    color:
      "#1f2937",
  },

  placeholderText: {
    margin:
      0,
    lineHeight:
      "1.5",
  },

  workArea: {
    display:
      "flex",
    flexDirection:
      "column",
    gap:
      "18px",
  },

  card: {
    background:
      "white",
    borderRadius:
      "12px",
    padding:
      "20px",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.06)",
  },

  infoGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(4, minmax(150px, 1fr))",
    gap:
      "14px",
  },

  infoValue: {
    fontSize:
      "14px",
    fontWeight:
      "700",
    background:
      "#f9fafb",
    border:
      "1px solid #e5e7eb",
    borderRadius:
      "7px",
    padding:
      "9px 10px",
    minHeight:
      "18px",
  },

  infoNote: {
    marginTop:
      "14px",
    padding:
      "10px 12px",
    borderRadius:
      "8px",
    background:
      "#eff6ff",
    border:
      "1px solid #bfdbfe",
    color:
      "#1d4ed8",
    fontSize:
      "12px",
    fontWeight:
      "600",
    lineHeight:
      "1.5",
  },

  formGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(4, minmax(180px, 1fr))",
    gap:
      "14px",
  },

  formGrid3: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(3, minmax(180px, 1fr))",
    gap:
      "14px",
  },

  fieldLabel: {
    display:
      "flex",
    flexDirection:
      "column",
    gap:
      "6px",
    fontSize:
      "12px",
    fontWeight:
      "700",
    color:
      "#374151",
  },

  input: {
    width:
      "100%",
    boxSizing:
      "border-box",
    border:
      "1px solid #d1d5db",
    borderRadius:
      "6px",
    padding:
      "9px 10px",
    fontSize:
      "13px",
    outline:
      "none",
    fontFamily:
      "inherit",
  },

  sectionRow: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "12px",
    marginBottom:
      "15px",
  },

  tableWrap: {
    overflowX:
      "auto",
  },

  table: {
    width:
      "100%",
    borderCollapse:
      "collapse",
    minWidth:
      "900px",
  },

  th: {
    background:
      "#f3f4f6",
    border:
      "1px solid #d1d5db",
    padding:
      "10px",
    textAlign:
      "left",
    fontSize:
      "12px",
    fontWeight:
      "700",
    whiteSpace:
      "nowrap",
  },

  td: {
    border:
      "1px solid #e5e7eb",
    padding:
      "8px",
    verticalAlign:
      "top",
  },

  addButton: {
    background:
      "#2563eb",
    color:
      "white",
    border:
      "none",
    borderRadius:
      "7px",
    padding:
      "8px 12px",
    cursor:
      "pointer",
    fontWeight:
      "600",
  },

  deleteButton: {
    background:
      "#fee2e2",
    color:
      "#991b1b",
    border:
      "1px solid #fecaca",
    borderRadius:
      "6px",
    padding:
      "7px 9px",
    cursor:
      "pointer",
    fontWeight:
      "600",
  },

  actionCard: {
    background:
      "white",
    borderRadius:
      "12px",
    padding:
      "20px",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.06)",
    display:
      "flex",
    justifyContent:
      "flex-end",
    gap:
      "12px",
    alignItems:
      "center",
    flexWrap:
      "wrap",
  },

  completedBox: {
    padding:
      "12px 18px",
    borderRadius:
      "8px",
    background:
      "#dcfce7",
    color:
      "#166534",
    fontWeight:
      "700",
  },

  secondaryButton: {
    background:
      "white",
    color:
      "#1f2937",
    border:
      "1px solid #cbd5e1",
    borderRadius:
      "8px",
    padding:
      "11px 18px",
    cursor:
      "pointer",
    fontWeight:
      "700",
  },

  primaryButton: {
    background:
      "#16a34a",
    color:
      "white",
    border:
      "none",
    borderRadius:
      "8px",
    padding:
      "11px 20px",
    cursor:
      "pointer",
    fontWeight:
      "700",
  },

  logoutButton: {
    background:
      "#dc2626",
    color:
      "white",
    border:
      "none",
    borderRadius:
      "7px",
    padding:
      "8px 13px",
    cursor:
      "pointer",
    fontWeight:
      "600",
  },
};

export default FirewallPage;
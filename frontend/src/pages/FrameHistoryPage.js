import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentAdmin,
  getAdminFrameHistory,
} from "../utils/adminApi";


// =========================================================
// HELPERS
// =========================================================

const formatDate = (value) => {

  if (!value) {
    return "-";
  }

  try {

    return new Date(value).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );

  } catch {

    return String(value);
  }
};


const formatValue = (value) => {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  if (
    typeof value === "object"
  ) {
    return JSON.stringify(value);
  }

  return String(value);
};


const statusClass = (status) => {

  const value = String(
    status || ""
  ).toUpperCase();

  if (
    value === "PASSED" ||
    value === "PASS" ||
    value === "COMPLETED" ||
    value === "YES"
  ) {
    return "status-pass";
  }

  if (
    value === "NOK" ||
    value === "FAILED" ||
    value === "NO"
  ) {
    return "status-nok";
  }

  if (
    value === "IN_PROGRESS" ||
    value === "PDI_IN_PROGRESS"
  ) {
    return "status-progress";
  }

  return "status-waiting";
};


// =========================================================
// OP40 SHEET LABELS
// =========================================================

const SHEET_LABELS = {
  sheet1: "LEAKAGE",
  sheet2: "DEFECT",
  sheet3: "SPATTER",
  sheet4: "PDI",
};


// =========================================================
// PDI STATION CONFIG
// =========================================================

const PDI_STATIONS = [
  {
    key: "PDI_STATION_3",
    label: "PDI STATION 3",
  },
  {
    key: "PDI_STATION_4",
    label: "PDI STATION 4",
  },
];


// =========================================================
// FRAME TIMELINE
// =========================================================
//
// Primary source:
//     record.frame_history
//
// Backward compatibility:
//     Existing records may not have frame_history yet.
//     In that case, derive station events from the timestamps
//     already stored in OP40, OP60, PDI, and Firewall.
//
// =========================================================

const getFrameTimeline = (record) => {

  const storedHistory =
    Array.isArray(
      record?.frame_history
    )
      ? record.frame_history
      : [];

  if (
    storedHistory.length > 0
  ) {

    return [...storedHistory]
      .filter(
        (event) =>
          event?.completed_at
      )
      .sort(
        (a, b) =>
          new Date(
            a.completed_at
          ) -
          new Date(
            b.completed_at
          )
      );
  }

  const events = [];

  const stages =
    record?.stages ||
    {};

  [
    "STAGE_1",
    "STAGE_2",
    "STAGE_3",
  ].forEach(
    (stage) => {

      const stageData =
        stages?.[stage];

      if (
        !stageData?.completed_at
      ) {
        return;
      }

      events.push({
        station:
          "OP40",

        stage,

        action:
          "STATION_COMPLETED",

        status:
          stageData.result_status ||
          stageData.status ||
          "COMPLETED",

        operator_id:
          stageData.operator_id,

        operator_name:
          stageData.operator_name,

        shift:
          stageData.shift,

        completed_at:
          stageData.completed_at,
      });
    }
  );


  const op60History =
    Array.isArray(
      record?.op60_rework
    )
      ? record.op60_rework
      : (
          Array.isArray(
            record?.rework_history
          )
            ? record.rework_history
            : []
        );


  op60History.forEach(
    (item) => {

      if (
        !item?.timestamp &&
        !item?.completed_at &&
        !item?.created_at
      ) {
        return;
      }

      events.push({
        station:
          "OP60",

        stage:
          "OP60",

        action:
          "REWORK_ITEM",

        status:
          "OK",

        source:
          item.source,

        operator_id:
          item.operator_id,

        operator_name:
          item.operator_name,

        shift:
          item.shift,

        completed_at:
          item.timestamp ||
          item.completed_at ||
          item.created_at,
      });
    }
  );


  const pdiStations =
    record?.pdi?.stations ||
    {};


  PDI_STATIONS.forEach(
    (station) => {

      const stationData =
        pdiStations?.[
          station.key
        ];

      if (
        !stationData?.completed_at
      ) {
        return;
      }

      events.push({
        station:
          station.key,

        stage:
          "PDI",

        action:
          "STATION_COMPLETED",

        status:
          stationData.result_status ||
          stationData.status ||
          "COMPLETED",

        operator_id:
          stationData.operator_id,

        operator_name:
          stationData.operator_name,

        shift:
          stationData.shift,

        completed_at:
          stationData.completed_at,
      });
    }
  );


  const firewall =
    record?.firewall?.stations?.FIREWALL ||
    {};

  if (
    firewall?.completed_at
  ) {

    events.push({
      station:
        "FIREWALL",

      stage:
        "FIREWALL",

      action:
        "STATION_COMPLETED",

      status:
        firewall.result_status ||
        firewall.status ||
        "COMPLETED",

      operator_id:
        firewall.operator_id,

      operator_name:
        firewall.operator_name,

      shift:
        firewall.shift,

      completed_at:
        firewall.completed_at,
    });
  }


  return events
    .filter(
      (event) =>
        event?.completed_at
    )
    .sort(
      (a, b) =>
        new Date(
          a.completed_at
        ) -
        new Date(
          b.completed_at
        )
    );
};


// =========================================================
// FRAME HISTORY PAGE
// =========================================================

function FrameHistoryPage({
  navigate,
}) {

  const [records, setRecords] =
    useState([]);

  const [selectedRecordId, setSelectedRecordId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [admin, setAdmin] =
    useState(null);


  // =========================================================
  // INITIALIZE FRAME HISTORY
  // =========================================================

  useEffect(() => {

    let cancelled = false;


    const initialize =
      async () => {

        try {

          setLoading(true);
          setError("");


          // ===============================================
          // 1. VERIFY ADMIN
          // ===============================================

          const current =
            await getCurrentAdmin();


          if (cancelled) {
            return;
          }


          setAdmin(
            current
          );


          // ===============================================
          // 2. LOAD HISTORY
          // ===============================================

          const data =
            await getAdminFrameHistory();


          if (cancelled) {
            return;
          }


          console.log(
            "========== FRAME HISTORY =========="
          );

          console.log(
            "Complete API response:",
            data
          );


          if (
            Array.isArray(
              data
            )
          ) {

            setRecords(
              data
            );

          } else {

            setRecords(
              []
            );
          }


        } catch (err) {

          if (cancelled) {
            return;
          }


          console.error(
            "FRAME HISTORY ERROR:",
            err
          );


          console.error(
            "SERVER RESPONSE:",
            err?.response?.data
          );


          setError(
            err?.response?.data?.detail ||
            "Unable to load frame history."
          );


          // Redirect ONLY when authentication
          // is actually invalid.

          if (
            err?.response?.status === 401
          ) {

            navigate(
              "/admin/login"
            );
          }


        } finally {

          if (!cancelled) {

            setLoading(
              false
            );
          }
        }
      };


    initialize();


    return () => {

      cancelled = true;

    };

  }, [navigate]);


  // =======================================================
  // SELECTED FRAME
  // =======================================================

  const selectedRecord =
    useMemo(() => {

      if (!selectedRecordId) {
        return null;
      }

      return records.find(
        (record) =>
          String(
            record._id ||
            record.id
          ) ===
          String(
            selectedRecordId
          )
      );

    }, [
      records,
      selectedRecordId,
    ]);


  // =======================================================
  // AUTO SELECT FIRST FRAME
  // =======================================================

  useEffect(() => {

    if (
      !selectedRecordId &&
      records.length > 0
    ) {

      setSelectedRecordId(
        String(
          records[0]._id ||
          records[0].id
        )
      );
    }

  }, [
    records,
    selectedRecordId,
  ]);


  // =======================================================
  // GET OP40 STAGES
  // =======================================================

  const stages =
    selectedRecord?.stages || {};


  // =======================================================
  // ACTUAL OP40 STAGE
  // =======================================================

  // A frame goes through ONLY ONE of:
  // STAGE_1 OR STAGE_2 OR STAGE_3

  const actualOP40Stage = (() => {

    const stageNames = [
      "STAGE_1",
      "STAGE_2",
      "STAGE_3",
    ];


    // -----------------------------------------------------
    // 1. Prefer the completed stage
    // -----------------------------------------------------

    for (
      const stageName of stageNames
    ) {

      const stageData =
        stages?.[stageName];


      if (
        stageData &&
        stageData.status === "COMPLETED"
      ) {

        return [
          stageName,
          stageData,
        ];
      }
    }


    // -----------------------------------------------------
    // 2. Otherwise show the active stage
    // -----------------------------------------------------

    for (
      const stageName of stageNames
    ) {

      const stageData =
        stages?.[stageName];


      if (
        stageData &&
        (
          stageData.status === "IN_PROGRESS" ||
          stageData.status === "NOK"
        )
      ) {

        return [
          stageName,
          stageData,
        ];
      }
    }


    // -----------------------------------------------------
    // 3. Fallback:
    // if status is missing but the stage contains data,
    // use that stage.
    // -----------------------------------------------------

    for (
      const stageName of stageNames
    ) {

      const stageData =
        stages?.[stageName];


      if (
        stageData &&
        stageData.sheets &&
        Object.keys(
          stageData.sheets
        ).length > 0
      ) {

        const hasData =
          Object.values(
            stageData.sheets
          ).some(
            (sheet) =>
              sheet &&
              sheet.data &&
              Object.keys(
                sheet.data
              ).length > 0
          );


        if (hasData) {

          return [
            stageName,
            stageData,
          ];
        }
      }
    }


    return null;

  })();


  // =======================================================
  // OP40 DATA
  // =======================================================

  const renderOP40Stage = (
    stageName,
    stageData
  ) => {

    if (
      !stageData ||
      typeof stageData !== "object"
    ) {
      return null;
    }


    const sheets =
      stageData.sheets || {};


    return (

      <div
        key={stageName}
        className="stage-card"
      >

        {/* ============================================= */}
        {/* STAGE HEADER */}
        {/* ============================================= */}

        <div className="stage-header">

          <div>

            <h3>
              {stageName.replace(
                "_",
                " "
              )}
            </h3>


            <div className="small-text">

              Operator:{" "}

              {formatValue(
                stageData.operator_name ||
                stageData.operator_id
              )}

            </div>

          </div>


          <span
            className={`status-badge ${
              statusClass(
                stageData.status
              )
            }`}
          >

            {formatValue(
              stageData.status
            )}

          </span>

        </div>


        {/* ============================================= */}
        {/* STAGE INFORMATION */}
        {/* ============================================= */}

        <div className="info-grid">

          <div>

            <span>
              Operator
            </span>

            <strong>
              {formatValue(
                stageData.operator_name ||
                stageData.operator_id
              )}
            </strong>

          </div>


          <div>

            <span>
              Shift
            </span>

            <strong>
              {formatValue(
                stageData.shift
              )}
            </strong>

          </div>


          <div>

            <span>
              Started
            </span>

            <strong>
              {formatDate(
                stageData.started_at
              )}
            </strong>

          </div>


          <div>

            <span>
              Completed
            </span>

            <strong>
              {formatDate(
                stageData.completed_at
              )}
            </strong>

          </div>

        </div>


        {/* ============================================= */}
        {/* SHEETS */}
        {/* ============================================= */}

        <div className="sheets-container">

          {Object.entries(
            sheets
          ).map(
            ([
              sheetKey,
              sheetData,
            ]) => {

              const data =
                sheetData?.data ||
                {};


              return (

                <div
                  key={sheetKey}
                  className="sheet-card"
                >

                  <div className="sheet-title">

                    <strong>
                      {SHEET_LABELS[
                        sheetKey
                      ] ||
                        sheetKey.toUpperCase()}
                    </strong>


                    <span
                      className={`status-badge ${
                        statusClass(
                          sheetData?.status
                        )
                      }`}
                    >

                      {formatValue(
                        sheetData?.status
                      )}

                    </span>

                  </div>


                  {/* --------------------------------- */}
                  {/* SHEET OPERATOR */}
                  {/* --------------------------------- */}

                  <div className="sheet-meta">

                    Operator:

                    {" "}

                    {formatValue(
                      sheetData?.operator_name ||
                      sheetData?.operator_id
                    )}

                  </div>


                  {/* --------------------------------- */}
                  {/* CHECKPOINT DATA */}
                  {/* --------------------------------- */}

                  {Object.keys(
                    data
                  ).length === 0 ? (

                    <div className="empty-data">

                      No checkpoint data recorded.

                    </div>

                  ) : (

                    <div className="checkpoint-table">

                      {Object.entries(
                        data
                      ).map(
                        ([
                          field,
                          value,
                        ]) => (

                          <div
                            key={field}
                            className="checkpoint-row"
                          >

                            <div className="checkpoint-field">

                              {field}

                            </div>


                            <div
                              className={`checkpoint-value ${
                                String(
                                  value
                                ).toUpperCase() ===
                                "YES"
                                  ? "value-yes"
                                  : String(
                                      value
                                    ).toUpperCase() ===
                                    "NO"
                                  ? "value-no"
                                  : ""
                              }`}
                            >

                              {formatValue(
                                value
                              )}

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              );

            }
          )}

        </div>

      </div>

    );
  };


  // =======================================================
  // OP60 REWORK
  // =======================================================

  const renderOP60 =
    () => {

      // Current backend stores every OP60 action in op60_rework.
      // Keep rework_history as a fallback for older records.

      const rework =
        Array.isArray(
          selectedRecord?.op60_rework
        ) &&
        selectedRecord.op60_rework.length > 0

          ? selectedRecord.op60_rework

          : Array.isArray(
              selectedRecord?.rework_history
            )

            ? selectedRecord.rework_history

            : [];


      if (
        !Array.isArray(
          rework
        ) ||
        rework.length === 0
      ) {

        return (

          <div className="empty-section">

            No OP60 rework recorded for this frame.

          </div>

        );
      }


      return (

        <div className="rework-table">

          <div className="rework-header">

            <div>
              Stage
            </div>

            <div>
              Sheet
            </div>

            <div>
              Field
            </div>

            <div>
              Original
            </div>

            <div>
              Corrected
            </div>

            <div>
              Operator
            </div>

            <div>
              Time
            </div>

          </div>


          {rework.map(
            (item, index) => (

              <div
                className="rework-row"
                key={
                  item._id ||
                  item.id ||
                  index
                }
              >

                <div>

                  {formatValue(
                    item.stage
                  )}

                </div>


                <div>

                  {formatValue(
                    item.sheet
                  )}

                </div>


                <div>

                  {formatValue(
                    item.field
                  )}

                </div>


                <div className="value-no">

                  {formatValue(
                    item.original_status
                  )}

                </div>


                <div className="value-yes">

                  {formatValue(
                    item.corrected_status
                  )}

                </div>


                <div>

                  {formatValue(
                    item.operator_name ||
                    item.operator_id
                  )}

                </div>


                <div>

                  {formatDate(
                    item.timestamp ||
                    item.created_at ||
                    item.reworked_at
                  )}

                </div>

              </div>

            )
          )}

        </div>

      );
    };


  // =======================================================
  // PDI STATION
  // =======================================================

  const renderPDIStation = (
    station
  ) => {

    const pdi =
      selectedRecord?.pdi ||
      {};


    const stationData =
      pdi?.stations?.[
        station.key
      ] || {};


    const checkpoints =
      stationData.checkpoints ||
      {};


    const checkpointEntries =
      Object.entries(
        checkpoints
      );


    const answered =
      checkpointEntries.filter(
        ([, checkpoint]) =>
          checkpoint?.value === "YES" ||
          checkpoint?.value === "NO"
      ).length;


    const yesCount =
      checkpointEntries.filter(
        ([, checkpoint]) =>
          checkpoint?.value === "YES"
      ).length;


    const noCount =
      checkpointEntries.filter(
        ([, checkpoint]) =>
          checkpoint?.value === "NO"
      ).length;


    return (

      <div
        key={station.key}
        className="pdi-station-card"
      >

        {/* ============================================= */}
        {/* HEADER */}
        {/* ============================================= */}

        <div className="pdi-station-header">

          <div>

            <h3>
              {station.label}
            </h3>


            <div className="small-text">

              {answered} /{" "}

              {checkpointEntries.length}

              {" "}answered

            </div>

          </div>


          <span
            className={`status-badge ${
              statusClass(
                stationData.status
              )
            }`}
          >

            {formatValue(
              stationData.status ||
              "WAITING"
            )}

          </span>

        </div>


        {/* ============================================= */}
        {/* STATION INFO */}
        {/* ============================================= */}

        <div className="info-grid">

          <div>

            <span>
              Operator
            </span>

            <strong>
              {formatValue(
                stationData.operator_name ||
                stationData.operator_id
              )}
            </strong>

          </div>


          <div>

            <span>
              Shift
            </span>

            <strong>
              {formatValue(
                stationData.shift
              )}
            </strong>

          </div>


          <div>

            <span>
              Started
            </span>

            <strong>
              {formatDate(
                stationData.started_at
              )}
            </strong>

          </div>


          <div>

            <span>
              Completed
            </span>

            <strong>
              {formatDate(
                stationData.completed_at
              )}
            </strong>

          </div>

        </div>


        {/* ============================================= */}
        {/* SUMMARY */}
        {/* ============================================= */}

        <div className="pdi-summary">

          <div>

            <span>
              Total
            </span>

            <strong>
              {checkpointEntries.length}
            </strong>

          </div>


          <div>

            <span>
              Answered
            </span>

            <strong>
              {answered}
            </strong>

          </div>


          <div>

            <span>
              YES
            </span>

            <strong className="value-yes">
              {yesCount}
            </strong>

          </div>


          <div>

            <span>
              NO
            </span>

            <strong className="value-no">
              {noCount}
            </strong>

          </div>

        </div>


        {/* ============================================= */}
        {/* CHECKPOINTS */}
        {/* ============================================= */}

        {checkpointEntries.length === 0 ? (

          <div className="empty-data">

            No checkpoint data recorded.

          </div>

        ) : (

          <div className="pdi-checkpoint-list">

            {checkpointEntries.map(
              ([
                checkpointId,
                checkpoint,
              ]) => (

                <div
                  className="pdi-checkpoint-row"
                  key={checkpointId}
                >

                  <div className="cp-number">

                    {formatValue(
                      checkpoint?.sr_no ||
                      checkpointId
                    )}

                  </div>


                  <div className="cp-main">

                    <strong>

                      {formatValue(
                        checkpoint?.checkpoint
                      )}

                    </strong>


                    <div className="cp-details">

                      <span>

                        Criteria:{" "}

                        {formatValue(
                          checkpoint?.criteria
                        )}

                      </span>


                      <span>

                        Method:{" "}

                        {formatValue(
                          checkpoint?.method
                        )}

                      </span>

                    </div>

                  </div>


                  <div
                    className={`cp-result ${
                      String(
                        checkpoint?.value
                      ).toUpperCase() ===
                      "YES"

                        ? "value-yes"

                        : String(
                            checkpoint?.value
                          ).toUpperCase() ===
                          "NO"

                        ? "value-no"

                        : ""
                    }`}
                  >

                    {formatValue(
                      checkpoint?.value
                    )}

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    );
  };


  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {

    return (

      <div className="page">

        <div className="loading">

          Loading frame history...

        </div>

      </div>

    );
  }


  // =======================================================
  // ERROR
  // =======================================================

  if (error) {

    return (

      <div className="page">

        <div className="error-box">

          {error}

        </div>

      </div>

    );
  }


  // =======================================================
  // MAIN
  // =======================================================

  return (

    <div className="page">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="page-header">

        <div>

          <h1>
            FRAME HISTORY
          </h1>

          <p>
            Complete inspection lifecycle
          </p>

        </div>


        <div className="header-actions">

          <span>

            Admin:{" "}

            {admin?.username || "-"}

          </span>


          <button
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
          >

            Back to Dashboard

          </button>

        </div>

      </header>


      {/* ================================================= */}
      {/* FRAME SELECTOR */}
      {/* ================================================= */}

      <section className="frame-selector">

        <label>
          Select Frame
        </label>


        <select
          value={
            selectedRecordId
          }
          onChange={(event) =>
            setSelectedRecordId(
              event.target.value
            )
          }
        >

          <option value="">
            Select a frame
          </option>


          {records.map(
            (record) => (

              <option
                key={
                  record._id ||
                  record.id
                }
                value={
                  record._id ||
                  record.id
                }
              >

                {record.frame_no ||
                  record.frameNumber ||
                  record.frame ||
                  "Unknown Frame"}

              </option>

            )
          )}

        </select>

      </section>


      {/* ================================================= */}
      {/* EMPTY */}
      {/* ================================================= */}

      {!selectedRecord ? (

        <div className="empty-section">

          No frame selected.

        </div>

      ) : (

        <>

          {/* ================================================= */}
          {/* FRAME INFORMATION */}
          {/* ================================================= */}

          <section className="frame-info-card">

            <div className="frame-info-grid">

              <div>

                <span>
                  Frame Number
                </span>

                <strong>

                  {formatValue(
                    selectedRecord.frame_no ||
                    selectedRecord.frameNumber ||
                    selectedRecord.frame
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Created
                </span>

                <strong>

                  {formatDate(
                    selectedRecord.created_at
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Overall Status
                </span>

                <strong
                  className={`status-badge ${
                    statusClass(
                      selectedRecord.overall_status
                    )
                  }`}
                >

                  {formatValue(
                    selectedRecord.overall_status
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Current Stage
                </span>

                <strong>

                  {formatValue(
                    selectedRecord.current_stage
                  )}

                </strong>

              </div>

            </div>

          </section>


          {/* ================================================= */}
          {/* FRAME TIMELINE */}
          {/* ================================================= */}

          <section className="history-section">

            <div className="section-title">

              <div>

                <h2>
                  Frame Timeline
                </h2>

                <p>
                  Complete station progression
                </p>

              </div>

            </div>


            {getFrameTimeline(
              selectedRecord
            ).length === 0 ? (

              <div className="empty-section">

                No completed station history recorded.

              </div>

            ) : (

              <div className="timeline">

                {getFrameTimeline(
                  selectedRecord
                ).map(
                  (event, index) => (

                    <div
                      className="timeline-item"
                      key={
                        `${event.station}-${event.completed_at}-${index}`
                      }
                    >

                      <div className="timeline-dot" />

                      <div className="timeline-content">

                        <div className="timeline-header">

                          <strong>
                            {formatValue(
                              event.station
                            )}
                          </strong>


                          <span
                            className={`status-badge ${
                              statusClass(
                                event.status
                              )
                            }`}
                          >

                            {formatValue(
                              event.status
                            )}

                          </span>

                        </div>


                        <div className="timeline-details">

                          <div>

                            <span>
                              Stage
                            </span>

                            <strong>
                              {formatValue(
                                event.stage
                              )}
                            </strong>

                          </div>


                          <div>

                            <span>
                              Action
                            </span>

                            <strong>
                              {formatValue(
                                event.action
                              )}
                            </strong>

                          </div>


                          <div>

                            <span>
                              Operator
                            </span>

                            <strong>
                              {formatValue(
                                event.operator_name ||
                                event.operator_id
                              )}
                            </strong>

                          </div>


                          <div>

                            <span>
                              Shift
                            </span>

                            <strong>
                              {formatValue(
                                event.shift
                              )}
                            </strong>

                          </div>


                          <div>

                            <span>
                              Completed
                            </span>

                            <strong>
                              {formatDate(
                                event.completed_at
                              )}
                            </strong>

                          </div>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>


          {/* ================================================= */}
          {/* OP40 */}
          {/* ================================================= */}

          <section className="history-section">

            <div className="section-title">

              <div>

                <h2>
                  OP40 Inspection
                </h2>

                <p>
                  Inspection data from the completed OP40 stage
                </p>

              </div>

            </div>


            {actualOP40Stage ? (

              renderOP40Stage(
                actualOP40Stage[0],
                actualOP40Stage[1]
              )

            ) : (

              <div className="empty-section">

                No OP40 stage data recorded.

              </div>

            )}

          </section>


          {/* ================================================= */}
          {/* OP60 */}
          {/* ================================================= */}

          <section className="history-section">

            <div className="section-title">

              <div>

                <h2>
                  OP60 Rework
                </h2>

                <p>
                  Rework performed on NOK checkpoints
                </p>

              </div>

            </div>


            {renderOP60()}

          </section>


          {/* ================================================= */}
          {/* PDI */}
          {/* ================================================= */}

          <section className="history-section">

            <div className="section-title">

              <div>

                <h2>
                  PDI Inspection
                </h2>

                <p>
                  PDI Station 3 and Station 4
                </p>

              </div>

            </div>


            <div className="pdi-grid">

              {PDI_STATIONS.map(
                (station) =>
                  renderPDIStation(
                    station
                  )
              )}

            </div>

          </section>


          {/* ================================================= */}
          {/* FIREWALL */}
          {/* ================================================= */}

          <section className="history-section">

            <div className="section-title">

              <div>

                <h2>
                  Firewall Inspection
                </h2>

                <p>
                  Final firewall inspection details
                </p>

              </div>

            </div>


            {(() => {

              const firewall =
                selectedRecord?.firewall?.stations?.FIREWALL ||
                {};


              if (
                !firewall ||
                Object.keys(
                  firewall
                ).length === 0
              ) {

                return (

                  <div className="empty-section">

                    No Firewall data recorded.

                  </div>

                );
              }


              return (

                <div className="firewall-card">

                  <div className="stage-header">

                    <div>

                      <h3>
                        FIREWALL
                      </h3>

                      <div className="small-text">

                        Operator:{" "}

                        {formatValue(
                          firewall.operator_name ||
                          firewall.operator_id
                        )}

                      </div>

                    </div>


                    <span
                      className={`status-badge ${
                        statusClass(
                          firewall.status
                        )
                      }`}
                    >

                      {formatValue(
                        firewall.status
                      )}

                    </span>

                  </div>


                  <div className="info-grid">

                    <div>

                      <span>
                        Operator
                      </span>

                      <strong>
                        {formatValue(
                          firewall.operator_name ||
                          firewall.operator_id
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Shift
                      </span>

                      <strong>
                        {formatValue(
                          firewall.shift
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Started
                      </span>

                      <strong>
                        {formatDate(
                          firewall.started_at
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Completed
                      </span>

                      <strong>
                        {formatDate(
                          firewall.completed_at
                        )}
                      </strong>

                    </div>

                  </div>


                  {firewall.header &&
                    Object.keys(
                      firewall.header
                    ).length > 0 && (

                    <div className="firewall-header-data">

                      <h4>
                        Header Information
                      </h4>


                      <div className="info-grid">

                        {Object.entries(
                          firewall.header
                        ).map(
                          ([
                            key,
                            value,
                          ]) => (

                            <div
                              key={key}
                            >

                              <span>
                                {key}
                              </span>

                              <strong>
                                {formatValue(
                                  value
                                )}
                              </strong>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  )}


                  {Array.isArray(
                    firewall.rows
                  ) &&
                    firewall.rows.length > 0 && (

                    <div className="firewall-rows">

                      <h4>
                        Inspection Rows
                      </h4>


                      <div className="table-wrapper">

                        <table>

                          <thead>

                            <tr>

                              {Object.keys(
                                firewall.rows[0] ||
                                {}
                              ).map(
                                (key) => (

                                  <th
                                    key={key}
                                  >

                                    {key}

                                  </th>

                                )
                              )}

                            </tr>

                          </thead>


                          <tbody>

                            {firewall.rows.map(
                              (
                                row,
                                rowIndex
                              ) => (

                                <tr
                                  key={
                                    row._id ||
                                    row.id ||
                                    rowIndex
                                  }
                                >

                                  {Object.keys(
                                    firewall.rows[0] ||
                                    {}
                                  ).map(
                                    (key) => (

                                      <td
                                        key={key}
                                      >

                                        {formatValue(
                                          row?.[key]
                                        )}

                                      </td>

                                    )
                                  )}

                                </tr>

                              )
                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>

                  )}


                  {firewall.signatures &&
                    Object.keys(
                      firewall.signatures
                    ).length > 0 && (

                    <div className="firewall-signatures">

                      <h4>
                        Signatures
                      </h4>


                      <div className="info-grid">

                        {Object.entries(
                          firewall.signatures
                        ).map(
                          ([
                            key,
                            value,
                          ]) => (

                            <div
                              key={key}
                            >

                              <span>
                                {key}
                              </span>

                              <strong>
                                {formatValue(
                                  value
                                )}
                              </strong>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  )}

                </div>

              );

            })()}

          </section>


          {/* ================================================= */}
          {/* FINAL RESULT */}
          {/* ================================================= */}

          <section className="history-section">

            <div className="section-title">

              <div>

                <h2>
                  Overall Result
                </h2>

                <p>
                  Current lifecycle status of this frame
                </p>

              </div>

            </div>


            <div className="final-result-grid">

              <div>

                <span>
                  Frame
                </span>

                <strong>

                  {formatValue(
                    selectedRecord.frame_no ||
                    selectedRecord.frameNumber
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Overall Status
                </span>

                <strong
                  className={`status-badge ${
                    statusClass(
                      selectedRecord.overall_status
                    )
                  }`}
                >

                  {formatValue(
                    selectedRecord.overall_status
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Current Stage
                </span>

                <strong>

                  {formatValue(
                    selectedRecord.current_stage
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Current Station
                </span>

                <strong>

                  {formatValue(
                    selectedRecord.current_station
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Created
                </span>

                <strong>

                  {formatDate(
                    selectedRecord.created_at
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Updated
                </span>

                <strong>

                  {formatDate(
                    selectedRecord.updated_at
                  )}

                </strong>

              </div>

            </div>


            <div className="overall-result">

              <span>
                Frame Status
              </span>


              <strong
                className={`status-badge ${
                  statusClass(
                    selectedRecord.overall_status
                  )
                }`}
              >

                {formatValue(
                  selectedRecord.overall_status ||
                  "WAITING"
                )}

              </strong>

            </div>

          </section>

        </>

      )}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f4f7fb;
          padding: 30px;
          font-family: Arial, sans-serif;
          color: #1f2937;
        }

        .page-header {
          background: white;
          border-radius: 12px;
          padding: 22px 26px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
          border: 1px solid #e3e8ef;
        }

        .page-header h1 {
          margin: 0;
          font-size: 25px;
          font-weight: 700;
          color: #172b4d;
        }

        .page-header p {
          margin: 7px 0 0;
          color: #718096;
          font-size: 13px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 18px;
          font-size: 13px;
          color: #53657d;
        }

        .header-actions button {
          border: none;
          background: #172b4d;
          color: white;
          padding: 10px 16px;
          border-radius: 7px;
          cursor: pointer;
          font-weight: 600;
        }

        .header-actions button:hover {
          opacity: 0.9;
        }

        .frame-selector {
          background: white;
          border: 1px solid #e3e8ef;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 22px;
        }

        .frame-selector label {
          display: block;
          font-size: 13px;
          color: #65758b;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .frame-selector select {
          width: 100%;
          max-width: 500px;
          padding: 11px 13px;
          border: 1px solid #cfd8e3;
          border-radius: 7px;
          background: white;
          font-size: 14px;
          outline: none;
        }

        .frame-selector select:focus {
          border-color: #4776e6;
        }

        .frame-info-card {
          background: white;
          border: 1px solid #e3e8ef;
          border-radius: 12px;
          margin-bottom: 22px;
          overflow: hidden;
        }

        .frame-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }

        .frame-info-grid > div {
          padding: 20px;
          border-right: 1px solid #e8edf3;
        }

        .frame-info-grid > div:last-child {
          border-right: none;
        }

        .frame-info-grid span,
        .info-grid span,
        .final-result-grid span {
          display: block;
          color: #74879d;
          font-size: 11px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .frame-info-grid strong,
        .info-grid strong,
        .final-result-grid strong {
          font-size: 14px;
          color: #26364a;
        }

        .history-section {
          background: white;
          border: 1px solid #e3e8ef;
          border-radius: 12px;
          margin-bottom: 22px;
          overflow: hidden;
        }

        .section-title {
          padding: 20px 24px;
          border-bottom: 1px solid #e7edf3;
          background: #fbfcfe;
        }

        .section-title h2 {
          margin: 0;
          color: #172b4d;
          font-size: 18px;
        }

        .section-title p {
          margin: 5px 0 0;
          color: #78889c;
          font-size: 12px;
        }

        .stage-card {
          margin: 20px 24px;
          border: 1px solid #e1e7ef;
          border-radius: 10px;
          overflow: hidden;
        }

        .stage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e1e7ef;
        }

        .stage-header h3 {
          margin: 0 0 5px;
          font-size: 16px;
          color: #1f3555;
        }

        .small-text {
          font-size: 12px;
          color: #74879d;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-pass {
          background: #dcfce7;
          color: #166534;
        }

        .status-nok {
          background: #fee2e2;
          color: #b91c1c;
        }

        .status-progress {
          background: #fef3c7;
          color: #92400e;
        }

        .status-waiting {
          background: #e5e7eb;
          color: #4b5563;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid #e5eaf0;
        }

        .info-grid > div {
          padding: 16px 18px;
          border-right: 1px solid #e5eaf0;
        }

        .info-grid > div:last-child {
          border-right: none;
        }

        .sheets-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          padding: 20px;
        }

        .sheet-card {
          border: 1px solid #e1e7ef;
          border-radius: 8px;
          overflow: hidden;
        }

        .sheet-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: #f7f9fc;
          border-bottom: 1px solid #e5eaf0;
        }

        .sheet-title strong {
          font-size: 13px;
          color: #26364a;
        }

        .sheet-meta {
          padding: 9px 14px;
          color: #74879d;
          font-size: 11px;
          border-bottom: 1px solid #edf1f5;
        }

        .checkpoint-table {
          width: 100%;
        }

        .checkpoint-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 36px;
          border-bottom: 1px solid #edf1f5;
        }

        .checkpoint-field {
          padding: 9px 12px;
          font-size: 11px;
          color: #53657d;
          background: #fbfcfd;
          border-right: 1px solid #edf1f5;
          word-break: break-word;
        }

        .checkpoint-value {
          padding: 9px 12px;
          font-size: 11px;
          color: #26364a;
          word-break: break-word;
        }

        .value-yes {
          color: #15803d !important;
          font-weight: 700;
        }

        .value-no {
          color: #dc2626 !important;
          font-weight: 700;
        }

        .empty-data {
          padding: 20px;
          text-align: center;
          color: #8796a8;
          font-size: 12px;
        }

        .empty-section {
          padding: 35px 25px;
          text-align: center;
          color: #8190a3;
          font-size: 13px;
        }

        .rework-table {
          margin: 20px 24px;
          border: 1px solid #e1e7ef;
          border-radius: 8px;
          overflow-x: auto;
        }

        .rework-header,
        .rework-row {
          display: grid;
          grid-template-columns:
            1fr
            1fr
            1.5fr
            1fr
            1fr
            1.3fr
            1.5fr;
          min-width: 850px;
        }

        .rework-header {
          background: #f7f9fc;
          font-size: 11px;
          font-weight: 700;
          color: #53657d;
        }

        .rework-header > div,
        .rework-row > div {
          padding: 11px 10px;
          border-right: 1px solid #edf1f5;
          border-bottom: 1px solid #edf1f5;
        }

        .rework-row {
          font-size: 11px;
          color: #394b60;
        }

        .rework-row:last-child > div {
          border-bottom: none;
        }

        .pdi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          padding: 20px 24px;
        }

        .pdi-station-card {
          border: 1px solid #e1e7ef;
          border-radius: 9px;
          overflow: hidden;
        }

        .pdi-station-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e1e7ef;
        }

        .pdi-station-header h3 {
          margin: 0 0 5px;
          font-size: 15px;
          color: #1f3555;
        }

        .pdi-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid #e5eaf0;
        }

        .pdi-summary > div {
          padding: 13px;
          text-align: center;
          border-right: 1px solid #e5eaf0;
        }

        .pdi-summary > div:last-child {
          border-right: none;
        }

        .pdi-summary span {
          display: block;
          font-size: 10px;
          color: #74879d;
          margin-bottom: 4px;
        }

        .pdi-summary strong {
          font-size: 15px;
        }

        .pdi-checkpoint-list {
          width: 100%;
        }

        .pdi-checkpoint-row {
          display: grid;
          grid-template-columns: 55px 1fr 80px;
          min-height: 65px;
          border-bottom: 1px solid #edf1f5;
        }

        .cp-number {
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f7f9fc;
          font-weight: bold;
          font-size: 11px;
          border-right: 1px solid #edf1f5;
        }

        .cp-main {
          padding: 11px 14px;
        }

        .cp-main strong {
          font-size: 12px;
          color: #26364a;
        }

        .cp-details {
          display: flex;
          gap: 15px;
          margin-top: 5px;
          color: #74879d;
          font-family: Arial, sans-serif;
          font-size: 11px;
        }

        .cp-result {
          display: flex;
          justify-content: center;
          align-items: center;
          border-left: 1px solid #edf1f5;
          font-weight: bold;
        }

        .firewall-card {
          margin: 20px 24px;
          border: 1px solid #e1e7ef;
          border-radius: 10px;
          overflow: hidden;
        }

        .firewall-header-data,
        .firewall-rows,
        .firewall-signatures {
          padding: 20px;
          border-top: 1px solid #e5eaf0;
        }

        .firewall-header-data h4,
        .firewall-rows h4,
        .firewall-signatures h4 {
          margin: 0 0 15px;
          font-size: 14px;
          color: #26364a;
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #e1e7ef;
          border-radius: 7px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        th {
          background: #f7f9fc;
          color: #53657d;
          font-size: 11px;
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid #e1e7ef;
        }

        td {
          padding: 10px;
          font-size: 11px;
          color: #394b60;
          border-bottom: 1px solid #edf1f5;
        }

        .timeline {
          padding: 25px;
          position: relative;
        }

        .timeline-item {
          display: flex;
          position: relative;
          padding-bottom: 22px;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-item:not(:last-child)::before {
          content: "";
          position: absolute;
          left: 7px;
          top: 15px;
          bottom: 0;
          width: 2px;
          background: #dce3ec;
        }

        .timeline-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4776e6;
          margin-right: 16px;
          margin-top: 3px;
          flex-shrink: 0;
          z-index: 1;
          border: 3px solid #eaf0ff;
        }

        .timeline-content {
          flex: 1;
          border: 1px solid #e1e7ef;
          border-radius: 8px;
          overflow: hidden;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          background: #f8fafc;
          border-bottom: 1px solid #e5eaf0;
        }

        .timeline-header strong {
          color: #1f3555;
          font-size: 14px;
        }

        .timeline-details {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
        }

        .timeline-details > div {
          padding: 12px;
          border-right: 1px solid #edf1f5;
        }

        .timeline-details > div:last-child {
          border-right: none;
        }

        .timeline-details span {
          display: block;
          color: #74879d;
          font-size: 10px;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .timeline-details strong {
          font-size: 11px;
          color: #394b60;
        }

        .final-result-grid {
          display: grid;
          grid-template-columns:
            repeat(6, 1fr);
        }

        .final-result-grid > div {
          padding: 20px;
          border-right: 1px solid #e1e7ef;
          min-height: 80px;
        }

        .overall-result {
          margin: 20px 24px;
          padding: 20px;
          background: #f6f8fb;
          border-radius: 9px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 17px;
        }

        .loading {
          background: white;
          padding: 60px;
          text-align: center;
          border-radius: 12px;
          font-family: Arial, sans-serif;
        }

        .error-box {
          background: #fde8e8;
          color: #b42318;
          padding: 20px;
          border-radius: 10px;
          font-family: Arial, sans-serif;
        }

        @media (
          max-width: 1000px
        ) {

          .page {
            padding: 20px;
          }

          .frame-info-grid,
          .info-grid,
          .pdi-overview {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .pdi-grid {
            grid-template-columns: 1fr;
          }

          .final-result-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

        }

      `}</style>

    </div>
  );
}


export default FrameHistoryPage;
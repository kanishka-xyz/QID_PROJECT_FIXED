import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getDockQueue,
  getDockFrame,
  startDock,
  saveDockCheckpoint,
  completeDockStation,
} from "../utils/dockApi";


// ============================================================
// STATIONS
// ============================================================

const STATIONS = {

  DOCK_STATION_1: {
    key: "DOCK_STATION_1",
    title: "DOCK STATION 1",
    subtitle: "Top Side Burr Inspection",
  },

  DOCK_STATION_2: {
    key: "DOCK_STATION_2",
    title: "DOCK STATION 2",
    subtitle: "Top Side Leakage Test",
  },

  DOCK_STATION_3: {
    key: "DOCK_STATION_3",
    title: "DOCK STATION 3",
    subtitle: "Top Side Vacuum Cleaning",
  },

  DOCK_STATION_4: {
    key: "DOCK_STATION_4",
    title: "DOCK STATION 4",
    subtitle: "Top Side Borescope Inspection",
  },

  DOCK_STATION_5: {
    key: "DOCK_STATION_5",
    title: "DOCK STATION 5",
    subtitle:
      "Bottom Side Gauge Inspection + Bottom Side Visual Inspection",
  },

};


// ============================================================
// OP40 LEAKAGE FIELDS
// ============================================================

const OP40_LEAKAGE_FIELDS = [

  "top_T1",
  "top_T3_I",
  "top_T1_O",

  "top_T2",
  "top_T2_I",
  "top_T2_O",

  "top_T3",
  "top_T3_I_2",
  "top_T3_O",

  "top_T4",
  "top_T4_I",
  "top_T4_O",

  "bottom_B1",
  "bottom_B2",
  "bottom_B3",
  "bottom_B4",

  "vent_valve_I",

  "fm_cm",
  "rm_cm",

  "leakage_ok",

];


// ============================================================
// LABELS
// ============================================================

const LABELS = {

  top_T1:
    "Top T1",

  top_T3_I:
    "Top T3 I",

  top_T1_O:
    "Top T1 O",

  top_T2:
    "Top T2",

  top_T2_I:
    "Top T2 I",

  top_T2_O:
    "Top T2 O",

  top_T3:
    "Top T3",

  top_T3_I_2:
    "Top T3 I-2",

  top_T3_O:
    "Top T3 O",

  top_T4:
    "Top T4",

  top_T4_I:
    "Top T4 I",

  top_T4_O:
    "Top T4 O",

  bottom_B1:
    "Bottom B1",

  bottom_B2:
    "Bottom B2",

  bottom_B3:
    "Bottom B3",

  bottom_B4:
    "Bottom B4",

  vent_valve_I:
    "Vent Valve I",

  fm_cm:
    "FM-CM",

  rm_cm:
    "RM-CM",

  leakage_ok:
    "Leakage Overall Result",

  CM2:
    "CM2",

  CM3:
    "CM3",

  CM4_FM:
    "CM4 FM",

  CM4_RM:
    "CM4 RM",

  M6_FACE_HOLES:
    "M6 Face Holes",

  M8_FACE_HOLES:
    "M8 Face Holes",

  CHILD_PART:
    "Child Part",

  BOTTOM_VISUAL:
    "Bottom Side Visual Inspection",

  BOTTOM_BURR:
    "Bottom Side Burr Inspection",

  BOTTOM_VACUUM:
    "Bottom Side Vacuum Cleaning",

  BOTTOM_GAUGE:
    "Bottom Side Gauge Inspection",

  BOTTOM_HOLES:
    "Bottom Side Holes Inspection",

  BOTTOM_FRAME:
    "Bottom Side Frame Inspection",

};


// ============================================================
// NORMALIZE STATION
// ============================================================

function normalizeStation(
  value
) {

  if (!value) {
    return "";
  }


  const station =
    String(value)
      .trim()
      .toUpperCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_");


  if (
    Object.prototype.hasOwnProperty.call(
      STATIONS,
      station
    )
  ) {

    return station;

  }

  // DOC is the UI naming used for the same Dock workflow.
  const docMatch =
    station.match(/^DOC(?:_STATION_|_STATION| STATION |-)??([1-5])$/);

  if (docMatch) {
    return `DOCK_STATION_${docMatch[1]}`;
  }

  return "";
}


// ============================================================
// OPERATOR STATION
// ============================================================

function getOperatorStation() {

  const possible = [

    localStorage.getItem(
      "operator_station"
    ),

    localStorage.getItem(
      "station"
    ),

    localStorage.getItem(
      "current_station"
    ),

  ];


  for (
    const value of possible
  ) {

    const station =
      normalizeStation(
        value
      );


    if (station) {

      return station;

    }

  }


  return "";
}


// ============================================================
// GET FRAME RECORD
// ============================================================

function getFrameRecord(
  frame
) {

  return (
    frame?.record ||
    frame?.frame ||
    frame?.inspection ||
    frame ||
    null
  );

}


// ============================================================
// GET STATION DATA
// ============================================================

function getStationData(
  frame,
  station
) {

  return (
    frame?.dock?.stations?.[
      station
    ] ||
    frame?.stations?.[
      station
    ] ||
    null
  );

}


// ============================================================
// FORMAT VALUE
// ============================================================

function formatValue(
  value
) {

  if (
    value === true
  ) {

    return "OK";

  }


  if (
    value === false
  ) {

    return "NOK";

  }


  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "-";

  }


  return String(
    value
  );

}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DockPage({
  navigate,
}) {

  const [
    operatorStation,
    setOperatorStation,
  ] = useState("");


  const [
    queue,
    setQueue,
  ] = useState([]);


  const [
    selectedFrameId,
    setSelectedFrameId,
  ] = useState(null);


  const [
    frame,
    setFrame,
  ] = useState(null);


  const [
    loadingQueue,
    setLoadingQueue,
  ] = useState(true);


  const [
    loadingFrame,
    setLoadingFrame,
  ] = useState(false);


  const [
    actionLoading,
    setActionLoading,
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
    remarks,
    setRemarks,
  ] = useState({});


  // ==========================================================
  // INITIALIZE
  // ==========================================================

  useEffect(() => {

    const station =
      getOperatorStation();


    setOperatorStation(
      station
    );


    loadQueue();

  }, []);


  // ==========================================================
  // LOAD QUEUE
  // ==========================================================

  async function loadQueue() {

    try {

      setLoadingQueue(
        true
      );

      setError("");


      const response =
        await getDockQueue();


      const data =
        response?.data ??
        response ??
        [];


      setQueue(
        Array.isArray(data)
          ? data
          : []
      );

    }
    catch (err) {

      console.error(
        "Dock queue:",
        err
      );


      setError(
        err?.message ||
        "Unable to load Dock queue."
      );

    }
    finally {

      setLoadingQueue(
        false
      );

    }

  }


  // ==========================================================
  // LOAD FRAME
  // ==========================================================

  async function selectFrame(
    recordId
  ) {

    if (!recordId) {
      return;
    }


    try {

      setLoadingFrame(
        true
      );

      setError("");

      setSuccess("");


      const response =
        await getDockFrame(
          recordId
        );


      const data =
        response?.data ??
        response ??
        null;


      setFrame(
        data
      );


      setSelectedFrameId(
        recordId
      );


      // ------------------------------------------------------
      // LOAD EXISTING REMARKS FROM CHECKPOINTS
      // ------------------------------------------------------

      const stationData =
        getStationData(
          data,
          operatorStation
        );


      const loadedRemarks = {};


      const loadedCheckpoints =
        stationData?.checkpoints ||
        {};


      Object.entries(
        loadedCheckpoints
      ).forEach(
        ([
          checkpointId,
          checkpoint,
        ]) => {

          if (
            checkpoint?.remark
          ) {

            loadedRemarks[
              checkpointId
            ] =
              checkpoint.remark;

          }

        }
      );


      setRemarks(
        loadedRemarks
      );

    }
    catch (err) {

      console.error(
        "Dock frame:",
        err
      );


      setError(
        err?.message ||
        "Unable to load frame."
      );

    }
    finally {

      setLoadingFrame(
        false
      );

    }

  }


  // ==========================================================
  // START STATION
  // ==========================================================

  async function handleStart() {

    if (!selectedFrameId) {

      setError(
        "Please select a frame first."
      );

      return;
    }


    try {

      setActionLoading(
        true
      );

      setError("");

      setSuccess("");


      await startDock(
        selectedFrameId
      );


      setSuccess(
        "Dock station started."
      );


      await selectFrame(
        selectedFrameId
      );


      await loadQueue();

    }
    catch (err) {

      console.error(
        "Start Dock:",
        err
      );


      setError(
        err?.message ||
        "Unable to start Dock station."
      );

    }
    finally {

      setActionLoading(
        false
      );

    }

  }


  // ==========================================================
  // SAVE CHECKPOINT
  // ==========================================================

  async function handleCheckpoint(
    checkpointId,
    value
  ) {

    if (!selectedFrameId) {

      setError(
        "Please select a frame first."
      );

      return;
    }


    try {

      setActionLoading(
        true
      );

      setError("");

      setSuccess("");


      await saveDockCheckpoint(
        selectedFrameId,
        checkpointId,
        value,
        remarks[
          checkpointId
        ] || ""
      );


      setSuccess(
        "Checkpoint saved."
      );


      await selectFrame(
        selectedFrameId
      );

    }
    catch (err) {

      console.error(
        "Checkpoint:",
        err
      );


      setError(
        err?.message ||
        "Unable to save checkpoint."
      );

    }
    finally {

      setActionLoading(
        false
      );

    }

  }


  // ==========================================================
  // CHANGE REMARK
  // ==========================================================

  function changeRemark(
    checkpointId,
    value
  ) {

    setRemarks(
      previous => ({

        ...previous,

        [checkpointId]:
          value,

      })
    );

  }


  // ==========================================================
  // FRAME RECORD
  // ==========================================================

  const frameRecord =
    useMemo(
      () => {

        return getFrameRecord(
          frame
        );

      },
      [frame]
    );


  // ==========================================================
  // STATION DATA
  // ==========================================================

  const stationData =
    useMemo(
      () => {

        return getStationData(
          frame,
          operatorStation
        );

      },
      [
        frame,
        operatorStation,
      ]
    );


  // ==========================================================
  // CHECKPOINTS
  // ==========================================================

  const checkpoints =
    stationData?.checkpoints ||
    {};


  const checkpointIds =
    Object.keys(
      checkpoints
    );


  const stationStatus =
    stationData?.status ||
    "WAITING";


  // ==========================================================
  // OP40 LEAKAGE DATA
  // ==========================================================

  const op40Leakage =
    useMemo(
      () => {

        if (!frameRecord) {

          return {};

        }


        const possibleSources = [

          frameRecord?.op40,

          frameRecord?.OP40,

          frameRecord?.leakage_test,

          frameRecord?.stages?.OP40,

          frameRecord,

        ];


        const result = {};


        for (
          const source
          of possibleSources
        ) {

          if (
            !source ||
            typeof source !==
              "object"
          ) {

            continue;

          }


          for (
            const field
            of OP40_LEAKAGE_FIELDS
          ) {

            if (
              result[field] ===
                undefined &&
              Object.prototype.hasOwnProperty.call(
                source,
                field
              )
            ) {

              result[field] =
                source[field];

            }

          }

        }


        return result;

      },
      [frameRecord]
    );


  // ==========================================================
  // COMPLETE
  // ==========================================================

  // ==========================================================
// COMPLETE
// ==========================================================

// ==========================================================
// COMPLETE
// ==========================================================

async function handleComplete() {

  if (!selectedFrameId) {

    setError(
      "Please select a frame first."
    );

    return;
  }


  // ========================================================
  // ONLY RESULT IS COMPULSORY
  //
  // Remark is OPTIONAL.
  // ========================================================

  const missing = [];


  checkpointIds.forEach(
    checkpointId => {

      const checkpoint =
        checkpoints[
          checkpointId
        ];


      const value =
        checkpoint?.value;


      if (
        value !== "OK" &&
        value !== "NOK"
      ) {

        missing.push(
          checkpointId
        );

      }

    }
  );


  // ========================================================
  // STOP IF ANY RESULT IS MISSING
  // ========================================================

  if (
    missing.length > 0
  ) {

    setError(
      `Complete result for every point. Missing: ${missing.join(
        ", "
      )}`
    );

    return;
  }


  // ========================================================
  // SAVE LATEST VALUES + OPTIONAL REMARKS
  //
  // This ensures that if the operator enters a remark
  // after selecting OK/NOK, the remark is still saved.
  //
  // But an empty remark is perfectly valid.
  // ========================================================

  try {

    setActionLoading(
      true
    );

    setError("");

    setSuccess("");


    for (
      const checkpointId
      of checkpointIds
    ) {

      const checkpoint =
        checkpoints[
          checkpointId
        ];


      const value =
        checkpoint?.value;


      const remark =
        String(
          remarks[
            checkpointId
          ] ??
          checkpoint?.remark ??
          ""
        ).trim();


      await saveDockCheckpoint(
        selectedFrameId,
        checkpointId,
        value,
        remark
      );

    }


    // ======================================================
    // COMPLETE STATION
    // ======================================================

    await completeDockStation(
      selectedFrameId
    );


    setSuccess(
      "Dock station completed successfully."
    );


    // ======================================================
    // REFRESH
    // ======================================================

    await selectFrame(
      selectedFrameId
    );


    await loadQueue();

  }
  catch (err) {

    console.error(
      "Complete Dock error:",
      err
    );


    setError(
      err?.message ||
      "Unable to complete Dock station."
    );

  }
  finally {

    setActionLoading(
      false
    );

  }

}

  // ==========================================================
  // SIMPLE STATION
  // ==========================================================

  function renderSimpleStation() {

    if (
      checkpointIds.length === 0
    ) {

      return (
        <div className="empty">
          No checkpoints configured.
        </div>
      );

    }


    return (

      <div className="simple-list">

        {
          checkpointIds.map(
            checkpointId => {

              const checkpoint =
                checkpoints[
                  checkpointId
                ];


              const value =
                checkpoint?.value;


              return (

                <div
                  className="simple-point"
                  key={checkpointId}
                >

                  <h3>
                    {
                      checkpoint?.checkpoint ||
                      LABELS[
                        checkpointId
                      ] ||
                      checkpointId
                    }
                  </h3>


                  {
                    checkpoint?.criteria && (

                      <p className="criteria">
                        {
                          checkpoint.criteria
                        }
                      </p>

                    )
                  }


                  <div className="dock-buttons">

                    <button
                      className={
                        value === "OK"
                          ? "ok active"
                          : "ok"
                      }
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        handleCheckpoint(
                          checkpointId,
                          "OK"
                        )
                      }
                    >
                      OK
                    </button>


                    <button
                      className={
                        value === "NOK"
                          ? "nok active"
                          : "nok"
                      }
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        handleCheckpoint(
                          checkpointId,
                          "NOK"
                        )
                      }
                    >
                      NOK
                    </button>

                  </div>


                  <textarea
                    placeholder="Remark"
                    value={
                      remarks[
                        checkpointId
                      ] ??
                      checkpoint?.remark ??
                      ""
                    }
                    onChange={e =>
                      changeRemark(
                        checkpointId,
                        e.target.value
                      )
                    }
                  />

                </div>

              );

            }
          )
        }

      </div>

    );

  }


  // ==========================================================
  // STATION 2 - OP40 LEAKAGE
  // ==========================================================

  function renderLeakageStation() {

    return (

      <>

        <div className="dock-info">

          <strong>
            Existing OP40 Leakage Test
          </strong>


          <p>
            The values shown below are taken
            from the existing OP40 record for
            this frame. Dock records only the
            Dock confirmation against these
            same leakage point IDs.
          </p>

        </div>


        <div className="table-container">

          <table>

            <thead>

              <tr>

                <th>
                  Leakage Point
                </th>

                <th>
                  OP40 Result
                </th>

                <th>
                  Dock Confirmation
                </th>

                <th>
                  Remark
                </th>

              </tr>

            </thead>


            <tbody>

              {
                OP40_LEAKAGE_FIELDS.map(
                  field => {

                    const checkpoint =
                      checkpoints[
                        field
                      ];


                    const dockValue =
                      checkpoint?.value;


                    const existing =
                      op40Leakage[
                        field
                      ];


                    return (

                      <tr
                        key={field}
                      >

                        <td>
                          {
                            LABELS[
                              field
                            ] ||
                            field
                          }
                        </td>


                        <td>

                          <span
                            className={
                              existing === true ||
                              existing === "OK"
                                ? "result-ok"
                                : existing === false ||
                                  existing === "NOK"
                                  ? "result-nok"
                                  : ""
                            }
                          >
                            {
                              formatValue(
                                existing
                              )
                            }
                          </span>

                        </td>


                        <td>

                          <div className="small-buttons">

                            <button
                              className={
                                dockValue ===
                                "OK"
                                  ? "ok active"
                                  : "ok"
                              }
                              disabled={
                                actionLoading
                              }
                              onClick={() =>
                                handleCheckpoint(
                                  field,
                                  "OK"
                                )
                              }
                            >
                              OK
                            </button>


                            <button
                              className={
                                dockValue ===
                                "NOK"
                                  ? "nok active"
                                  : "nok"
                              }
                              disabled={
                                actionLoading
                              }
                              onClick={() =>
                                handleCheckpoint(
                                  field,
                                  "NOK"
                                )
                              }
                            >
                              NOK
                            </button>

                          </div>

                        </td>


                        <td>

                          <input
                            value={
                              remarks[
                                field
                              ] ??
                              checkpoint?.remark ??
                              ""
                            }
                            placeholder="Remark"
                            onChange={e =>
                              changeRemark(
                                field,
                                e.target.value
                              )
                            }
                          />

                        </td>

                      </tr>

                    );

                  }
                )
              }

            </tbody>

          </table>

        </div>

      </>

    );

  }


  // ==========================================================
  // STATION CONTENT
  // ==========================================================

  function renderStation() {

    if (!operatorStation) {

      return (

        <div className="error-box">
          Operator station not found.
        </div>

      );

    }


    if (
      operatorStation ===
      "DOCK_STATION_2"
    ) {

      return renderLeakageStation();

    }


    return renderSimpleStation();

  }


  // ==========================================================
  // CURRENT STATION
  // ==========================================================

  const currentStation =
    STATIONS[
      operatorStation
    ];


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="dock-page">

      {/* HEADER */}

      <header className="dock-header">

        <div>

          <h1>
            Dock Inspection
          </h1>

          <p>
            {
              currentStation?.subtitle ||
              "Dock Station"
            }
          </p>

        </div>


        <div className="operator-box">

          <span>
            Operator
          </span>


          <strong>
            {
              localStorage.getItem(
                "operator_name"
              ) ||
              "Operator"
            }
          </strong>


          <small>
            {
              operatorStation
            }
          </small>

        </div>

      </header>


      {/* MESSAGES */}

      {
        error && (

          <div className="message error-message">
            {error}
          </div>

        )
      }


      {
        success && (

          <div className="message success-message">
            {success}
          </div>

        )
      }


      {/* MAIN */}

      <div className="dock-layout">


        {/* QUEUE */}

        <aside className="queue">

          <div className="queue-header">

            <h2>
              Frames
            </h2>


            <button
              onClick={
                loadQueue
              }
              disabled={
                loadingQueue
              }
            >
              Refresh
            </button>

          </div>


          {
            loadingQueue ? (

              <div className="empty">
                Loading frames...
              </div>

            ) : queue.length === 0 ? (

              <div className="empty">
                No frames available.
              </div>

            ) : (

              <div className="frame-list">

                {
                  queue.map(
                    item => {

                      const id =
                        item.record_id ||
                        item._id ||
                        item.id;


                      const frameNo =
                        item.frame_no ||
                        item.frameNumber ||
                        item.frame ||
                        "Unknown";


                      return (

                        <button
                          key={
                            String(id)
                          }
                          className={
                            selectedFrameId === id
                              ? "frame selected"
                              : "frame"
                          }
                          onClick={() =>
                            selectFrame(
                              id
                            )
                          }
                        >

                          <strong>
                            {
                              frameNo
                            }
                          </strong>


                          <span>
                            {
                              item.dock_station_status ||
                              item.status ||
                              "WAITING"
                            }
                          </span>

                        </button>

                      );

                    }
                  )
                }

              </div>

            )
          }

        </aside>


        {/* CONTENT */}

        <main className="content">

          {
            !frame ? (

              <div className="placeholder">

                <h2>
                  Select a frame
                </h2>


                <p>
                  Select a frame from the
                  queue to start Dock inspection.
                </p>

              </div>

            ) : (

              <>

                {/* FRAME INFO */}

                <div className="frame-info">

                  <div>

                    <span>
                      Frame No.
                    </span>


                    <strong>
                      {
                        frameRecord?.frame_no ||
                        frameRecord?.frameNumber ||
                        "N/A"
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Station
                    </span>


                    <strong>
                      {
                        currentStation?.title
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Status
                    </span>


                    <strong>
                      {
                        stationStatus
                      }
                    </strong>

                  </div>

                </div>


                {/* CONTROL */}

                <div className="control">

                  <div>

                    <span>
                      Inspection
                    </span>


                    <strong>
                      {
                        currentStation?.subtitle
                      }
                    </strong>

                  </div>


                  <button
                    className="start"
                    disabled={
                      actionLoading ||
                      stationStatus ===
                        "PASSED" ||
                      stationStatus ===
                        "COMPLETED"
                    }
                    onClick={
                      handleStart
                    }
                  >
                    Start Station
                  </button>

                </div>


                {/* CHECKLIST */}

                <section className="card">

                  <div className="card-header">

                    <div>

                      <h2>
                        {
                          currentStation?.title
                        }
                      </h2>


                      <p>
                        {
                          currentStation?.subtitle
                        }
                      </p>

                    </div>


                    <span className="status">
                      {
                        stationStatus
                      }
                    </span>

                  </div>


                  {
                    renderStation()
                  }


                  {/* COMPLETE */}

                  <div className="complete">

                    <button
                      onClick={
                        handleComplete
                      }
                      disabled={
                        actionLoading ||
                        stationStatus ===
                          "PASSED" ||
                        stationStatus ===
                          "COMPLETED"
                      }
                    >

                      {
                        actionLoading
                          ? "Processing..."
                          : "Complete Station"
                      }

                    </button>

                  </div>

                </section>

              </>

            )
          }

        </main>

      </div>


      {/* STYLES */}

      <style>{`

        * {
          box-sizing: border-box;
        }


        .dock-page {
          min-height: 100vh;
          padding: 22px;
          background: #f3f4f6;
          color: #111827;
        }


        .dock-header,
        .queue,
        .frame-info,
        .control,
        .card {
          background: white;
          border-radius: 12px;
        }


        .dock-header {
          padding: 18px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          box-shadow:
            0 2px 8px
            rgba(0, 0, 0, 0.06);
        }


        .dock-header h1 {
          margin: 0;
          font-size: 25px;
        }


        .dock-header p {
          margin: 5px 0 0;
          color: #6b7280;
        }


        .operator-box {
          text-align: right;
        }


        .operator-box span,
        .operator-box small {
          display: block;
          color: #6b7280;
        }


        .operator-box strong {
          display: block;
          margin: 3px 0;
        }


        .message {
          padding: 12px 15px;
          border-radius: 8px;
          margin-bottom: 14px;
        }


        .error-message {
          background: #fee2e2;
          color: #991b1b;
        }


        .success-message {
          background: #dcfce7;
          color: #166534;
        }


        .dock-layout {
          display: grid;
          grid-template-columns: 270px 1fr;
          gap: 15px;
        }


        .queue {
          padding: 15px;
          height: fit-content;
        }


        .queue-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }


        .queue-header h2 {
          margin: 0;
          font-size: 18px;
        }


        .queue-header button {
          border: none;
          background: #e5e7eb;
          padding: 7px 10px;
          border-radius: 6px;
          cursor: pointer;
        }


        .frame-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          max-height: 70vh;
          overflow-y: auto;
        }


        .frame {
          width: 100%;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 8px;
          padding: 11px;
          text-align: left;
          cursor: pointer;
        }


        .frame:hover {
          background: #f3f4f6;
        }


        .frame.selected {
          border: 2px solid #2563eb;
          background: #eff6ff;
        }


        .frame strong {
          display: block;
        }


        .frame span {
          display: block;
          color: #6b7280;
          font-size: 12px;
          margin-top: 4px;
        }


        .frame-info {
          padding: 15px 18px;
          display: flex;
          gap: 40px;
          margin-bottom: 12px;
        }


        .frame-info span,
        .control span {
          display: block;
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 4px;
        }


        .control {
          padding: 15px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }


        .start {
          border: none;
          background: #2563eb;
          color: white;
          padding: 10px 17px;
          border-radius: 7px;
          font-weight: 600;
          cursor: pointer;
        }


        .card {
          padding: 20px;
        }


        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }


        .card-header h2 {
          margin: 0 0 5px;
        }


        .card-header p {
          margin: 0;
          color: #6b7280;
        }


        .status {
          padding: 7px 12px;
          border-radius: 20px;
          background: #f3f4f6;
          font-size: 12px;
          font-weight: 700;
        }


        .simple-list {
          display: grid;
          gap: 14px;
        }


        .simple-point {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 25px;
          text-align: center;
        }


        .simple-point h3 {
          margin: 0 0 6px;
          font-size: 20px;
        }


        .criteria {
          color: #6b7280;
          margin: 0 0 15px;
          font-size: 13px;
        }


        .dock-buttons {
          display: flex;
          justify-content: center;
          gap: 10px;
        }


        .small-buttons {
          display: flex;
          justify-content: center;
          gap: 8px;
        }


        .dock-buttons button,
        .small-buttons button {
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }


        .dock-buttons button {
          padding: 12px 30px;
          min-width: 110px;
        }


        .small-buttons button {
          padding: 7px 12px;
        }


        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }


        .ok.active {
          background: #16a34a;
          border-color: #16a34a;
          color: white;
        }


        .nok.active {
          background: #dc2626;
          border-color: #dc2626;
          color: white;
        }


        .simple-point textarea {
          width: 100%;
          margin-top: 18px;
          min-height: 75px;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          resize: vertical;
        }


        .dock-info {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 13px;
          border-radius: 8px;
          margin-bottom: 15px;
          color: #1e3a8a;
        }


        .dock-info p {
          margin: 5px 0 0;
          font-size: 13px;
        }


        .table-container {
          width: 100%;
          overflow-x: auto;
        }


        table {
          width: 100%;
          border-collapse: collapse;
        }


        th {
          background: #f3f4f6;
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid #d1d5db;
          font-size: 13px;
        }


        td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }


        td input {
          width: 100%;
          padding: 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
        }


        .result-ok {
          color: #15803d;
          font-weight: 700;
        }


        .result-nok {
          color: #b91c1c;
          font-weight: 700;
        }


        .complete {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }


        .complete button {
          border: none;
          background: #111827;
          color: white;
          padding: 11px 20px;
          border-radius: 7px;
          font-weight: 600;
          cursor: pointer;
        }


        .empty,
        .placeholder,
        .error-box {
          padding: 30px;
          text-align: center;
          color: #6b7280;
        }


        .placeholder {
          background: white;
          min-height: 350px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }


        @media(max-width: 850px) {

          .dock-layout {
            grid-template-columns: 1fr;
          }


          .frame-info {
            flex-wrap: wrap;
          }


          .queue {
            order: 2;
          }


          .content {
            order: 1;
          }

        }


        @media(max-width: 600px) {

          .dock-page {
            padding: 10px;
          }


          .dock-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }


          .operator-box {
            text-align: left;
          }


          .control {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }


          .dock-buttons {
            flex-direction: column;
          }


          .dock-buttons button {
            width: 100%;
          }

        }

      `}</style>

    </div>

  );

}
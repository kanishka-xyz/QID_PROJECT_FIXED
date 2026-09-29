import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

/* =========================================================
   SHEET NAMES
   ========================================================= */
const SHEET_NAMES = {
  sheet1: "Leakage",
  sheet2: "Defects",
  sheet3: "Spatter",
  sheet4: "PDI",
};

/* =========================================================
   PDI STATIONS
   ========================================================= */
const PDI_STATIONS = [
  "PDI_STATION_3",
  "PDI_STATION_4",
];

/* =========================================================
   FIELD LABELS
   ========================================================= */
const FIELD_LABELS = {
  top_T1: "Top T1",
  top_T3_I: "Top T3 Inner",
  top_T1_O: "Top T1 Outer",
  top_T2: "Top T2",
  top_T2_I: "Top T2 Inner",
  top_T2_O: "Top T2 Outer",
  top_T3: "Top T3",
  top_T3_I_2: "Top T3 Inner",
  top_T3_O: "Top T3 Outer",
  top_T4: "Top T4",
  top_T4_I: "Top T4 Inner",
  top_T4_O: "Top T4 Outer",
  bottom_B1: "Bottom B1",
  bottom_B2: "Bottom B2",
  bottom_B3: "Bottom B3",
  bottom_B4: "Bottom B4",
  vent_valve_I: "Vent Valve Inner",
  fm_cm: "FM - CM",
  rm_cm: "RM - CM",
  porosity_above_2mm: "Porosity Above 2mm",
  excess_welding_BDU: "Excess Welding BDU",
  welding_lump: "Welding Lump",
  protrusion_inside_cm: "Protrusion Inside CM",
  no_masking_tape: "No Masking Tape",
  excess_welding_top_corner:
    "Excess Welding Top Corner",
  loose_burr_rivet:
    "Loose Burr / Rivet",
  excess_welding_top_surface:
    "Excess Welding Top Surface",
  leak_of_frame:
    "Leak of Frame",
  centre_member_dowel_damage:
    "Centre Member Dowel Damage",
  top_side_corner_unfilled:
    "Top Side Corner Unfilled",
  chips_header_unit:
    "Chips Header Unit",
  spatter_burr_sleeve_cm:
    "Spatter / Burr Sleeve CM",
  cm4_top_m6_thread_damage:
    "CM4 Top M6 Thread Damage",
  dent_top_sleeve:
    "Dent Top Sleeve",
  spatter_present:
    "Spatter Present",
  leakage_remark:
    "Leakage Remark",
  defect_remark:
    "Defect Remark",
  spatter_remark:
    "Spatter Remark",
  pdi_remark:
    "PDI Remark",
};

for (
  let i = 1;
  i <= 19;
  i += 1
) {
  FIELD_LABELS[
    `pdi_cp${i}`
  ] = `PDI Checkpoint ${i}`;
}


/* =========================================================
   AUTH & HELPERS
   ========================================================= */

const getHeaders = () => {
  const headers = {};

  const token =
    localStorage.getItem(
      "operator_token"
    );

  const operatorId =
    localStorage.getItem(
      "operator_id"
    );

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  if (operatorId) {
    headers["X-Operator-ID"] =
      operatorId;
  }

  return headers;
};


const getRecordId = (
  record
) => {
  return (
    record?._id ||
    record?.record_id ||
    record?.id ||
    null
  );
};


const normalize = (
  value
) => {
  return String(
    value ?? ""
  )
    .trim()
    .toUpperCase();
};


/* =========================================================
   CURRENT WORKFLOW STATUS
   ========================================================= */

const getStatus = (
  record
) => {

  const overallStatus =
    normalize(
      record?.overall_status ||
      record?.status ||
      ""
    );

  const currentStation =
    normalize(
      record?.current_station
    );

  const currentStage =
    normalize(
      record?.current_stage
    );

  /*
    IMPORTANT:

    Records shows WHERE THE FRAME IS.

    It does NOT simply show the generic
    overall_status value.

    COMPLETED is reserved for the FINAL
    completion of the entire workflow.
  */


  /* -------------------------------------------------------
     OP60
     ------------------------------------------------------- */

  if (
    currentStation === "OP60" ||
    currentStage === "OP60"
  ) {
    return "OP60 REWORK";
  }


  /* -------------------------------------------------------
     PDI STATION 3
     ------------------------------------------------------- */

  if (
    currentStation ===
    "PDI_STATION_3"
  ) {
    return "PDI STATION 3";
  }


  /* -------------------------------------------------------
     PDI STATION 4
     ------------------------------------------------------- */

  if (
    currentStation ===
    "PDI_STATION_4"
  ) {
    return "PDI STATION 4";
  }


  /* -------------------------------------------------------
     FIREWALL
     ------------------------------------------------------- */

  if (
    currentStation ===
    "FIREWALL"
  ) {
    return "FIREWALL";
  }


  /* -------------------------------------------------------
     DOC
     ------------------------------------------------------- */

  if (
    currentStation ===
    "DOC"
  ) {
    return "DOC";
  }


  /* -------------------------------------------------------
     OP40
     ------------------------------------------------------- */

  if (
    currentStage ===
    "STAGE_1"
  ) {
    return "OP40 - STAGE 1";
  }

  if (
    currentStage ===
    "STAGE_2"
  ) {
    return "OP40 - STAGE 2";
  }

  if (
    currentStage ===
    "STAGE_3"
  ) {
    return "OP40 - STAGE 3";
  }


  /* -------------------------------------------------------
     FALLBACK FOR OLD RECORDS
     ------------------------------------------------------- */

  const stages =
    record?.stages || {};

  const op40Completed = [
    "STAGE_1",
    "STAGE_2",
    "STAGE_3",
  ].some(
    (
      stage
    ) =>
      normalize(
        stages?.[
          stage
        ]?.status
      ) ===
      "COMPLETED"
  );


  const pdiStations =
    record?.pdi?.stations ||
    {};

  const st3 =
    normalize(
      pdiStations
        ?.PDI_STATION_3
        ?.status
    );

  const st4 =
    normalize(
      pdiStations
        ?.PDI_STATION_4
        ?.status
    );


  if (
    record?.pdi
  ) {

    if (
      st3 !==
      "PASSED"
    ) {
      return "PDI STATION 3";
    }


    if (
      st4 !==
      "PASSED"
    ) {
      return "PDI STATION 4";
    }


    const firewallStatus =
      normalize(
        record
          ?.firewall
          ?.stations
          ?.FIREWALL
          ?.status
      );


    if (
      firewallStatus !==
      "PASSED"
    ) {
      return "FIREWALL";
    }


    /*
      Do not infer COMPLETED merely because
      old overall_status says COMPLETED.

      Only explicitly finalized records
      should show COMPLETED.
    */

    if (
      currentStation ===
        "COMPLETED" &&
      overallStatus ===
        "COMPLETED"
    ) {
      return "COMPLETED";
    }
  }


  /*
    OP40 completed but PDI has not started.
    The real next location is PDI STATION 3.
  */

  if (
    op40Completed
  ) {
    return "PDI STATION 3";
  }


  return (
    overallStatus ||
    "IN PROGRESS"
  );
};


/* =========================================================
   SAFE ERROR
   ========================================================= */

const safeDetail = (
  detail
) => {

  if (!detail) {
    return "";
  }

  if (
    typeof detail ===
    "string"
  ) {
    return detail;
  }

  if (
    Array.isArray(detail)
  ) {
    return detail
      .map(
        (
          item
        ) =>
          item?.msg ||
          item?.message ||
          String(item)
      )
      .join(
        ", "
      );
  }

  if (
    typeof detail ===
    "object"
  ) {
    return (
      detail?.message ||
      detail?.msg ||
      JSON.stringify(
        detail
      )
    );
  }

  return String(
    detail
  );
};


/* =========================================================
   PDI REWORKED KEYS
   ========================================================= */

const getPdiReworkedKeys = (
  record
) => {

  const keys =
    new Set();

  const collections = [
    Array.isArray(
      record
        ?.pdi_reworked_items
    )
      ? record.pdi_reworked_items
      : [],

    Array.isArray(
      record
        ?.pdi_rework_history
    )
      ? record.pdi_rework_history
      : [],
  ];


  collections.forEach(
    (
      collection
    ) => {

      collection.forEach(
        (
          item
        ) => {

          if (!item) {
            return;
          }

          const station =
            String(
              item
                ?.station ||
              item
                ?.stage ||
              ""
            )
              .trim()
              .toUpperCase();

          const checkpointId =
            String(
              item
                ?.checkpoint_id ||
              item
                ?.field ||
              ""
            ).trim();


          if (
            PDI_STATIONS.includes(
              station
            ) &&
            checkpointId
          ) {

            keys.add(
              `${station}.${checkpointId}`
            );
          }
        }
      );
    }
  );

  return keys;
};


/* =========================================================
   PDI NOK ITEMS
   ========================================================= */

const getPdiNokItems = (
  record
) => {

  const result =
    [];

  const seen =
    new Set();

  const reworkedKeys =
    getPdiReworkedKeys(
      record
    );

  const stations =
    record?.pdi
      ?.stations ||
    {};


  PDI_STATIONS.forEach(
    (
      station
    ) => {

      const stationData =
        stations
          ?.[station] ||
        {};

      const checkpoints =
        stationData
          ?.checkpoints ||
        {};


      Object.entries(
        checkpoints
      ).forEach(
        (
          [
            checkpointId,
            checkpoint,
          ]
        ) => {

          if (!checkpoint) {
            return;
          }

          const value =
            normalize(
              checkpoint
                ?.value
            );

          if (
            value !==
            "NO"
          ) {
            return;
          }

          const id =
            String(
              checkpointId
            ).trim();

          const key =
            `${station}.${id}`;


          if (
            reworkedKeys.has(
              key
            ) ||
            seen.has(
              key
            )
          ) {
            return;
          }


          seen.add(
            key
          );


          result.push(
            {
              source:
                "PDI",

              station,

              checkpoint_id:
                id,

              checkpoint:
                checkpoint
                  ?.checkpoint ||
                checkpoint
                  ?.name ||
                id,

              criteria:
                checkpoint
                  ?.criteria ||
                "",

              method:
                checkpoint
                  ?.method ||
                "",

              original_status:
                "NO",

              status:
                "NOK",
            }
          );
        }
      );
    }
  );


  /*
    Also inspect stored PDI NOK items.
  */

  const storedPdiItems =
    Array.isArray(
      record
        ?.pdi_nok_items
    )
      ? record.pdi_nok_items
      : [];


  storedPdiItems.forEach(
    (
      item
    ) => {

      if (!item) {
        return;
      }

      const station =
        String(
          item
            ?.station ||
          item
            ?.stage ||
          ""
        )
          .trim()
          .toUpperCase();

      const checkpointId =
        String(
          item
            ?.checkpoint_id ||
          item
            ?.field ||
          ""
        ).trim();


      if (
        !PDI_STATIONS.includes(
          station
        ) ||
        !checkpointId
      ) {
        return;
      }


      const key =
        `${station}.${checkpointId}`;


      if (
        reworkedKeys.has(
          key
        ) ||
        seen.has(
          key
        )
      ) {
        return;
      }


      seen.add(
        key
      );


      result.push(
        {
          source:
            "PDI",

          station,

          checkpoint_id:
            checkpointId,

          checkpoint:
            item
              ?.checkpoint ||
            checkpointId,

          criteria:
            item
              ?.criteria ||
            "",

          method:
            item
              ?.method ||
            "",

          original_status:
            "NO",

          status:
            "NOK",
        }
      );
    }
  );


  return result;
};


/* =========================================================
   OP40 NOK ITEMS
   ========================================================= */

const getOp40NokItems = (
  record
) => {

  const result =
    [];

  const stages =
    record
      ?.stages ||
    {};

  const reworkedKeys =
    new Set();

  const reworkedItems =
    Array.isArray(
      record
        ?.reworked_items
    )
      ? record.reworked_items
      : [];


  reworkedItems.forEach(
    (
      item
    ) => {

      const stage =
        normalize(
          item?.stage
        );

      const field =
        String(
          item?.field ||
          ""
        ).trim();


      if (
        stage &&
        field
      ) {

        reworkedKeys.add(
          `${stage}.${field}`
        );
      }
    }
  );


  Object.entries(
    stages
  ).forEach(
    (
      [
        stageName,
        stageObj,
      ]
    ) => {

      if (
        normalize(
          stageName
        ) ===
        "OP60"
      ) {
        return;
      }


      const sheets =
        stageObj
          ?.sheets ||
        {};


      Object.entries(
        sheets
      ).forEach(
        (
          [
            sheetName,
            sheetObj,
          ]
        ) => {

          const data =
            sheetObj
              ?.data ||
            {};


          Object.entries(
            data
          ).forEach(
            (
              [
                field,
                value,
              ]
            ) => {

              if (
                normalize(
                  value
                ) !==
                "NO"
              ) {
                return;
              }


              const normalizedSheet =
                String(
                  sheetName
                )
                  .trim()
                  .toLowerCase();

              const normalizedField =
                String(
                  field
                ).trim();


              const exactKey =
                `${normalize(
                  stageName
                )}.${normalizedSheet}.${normalizedField}`;


              const alreadyReworked =
                Array.from(
                  reworkedKeys
                ).some(
                  (
                    key
                  ) =>
                    key ===
                      exactKey ||
                    key.endsWith(
                      `.${normalizedSheet}.${normalizedField}`
                    )
                );


              if (
                alreadyReworked
              ) {
                return;
              }


              result.push(
                {
                  source:
                    "OP40",

                  stage:
                    stageName,

                  sheet:
                    sheetName,

                  field:

                    field,

                  value:
                    "NO",

                  original_status:
                    "NO",
                }
              );
            }
          );
        }
      );
    }
  );


  return result;
};


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function Records({
  navigate,
}) {

  const [
    records,
    setRecords,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    activeTab,
    setActiveTab,
  ] =
    useState("OP40");

  const [
    details,
    setDetails,
  ] =
    useState(null);

  const [
    detailsLoading,
    setDetailsLoading,
  ] =
    useState(false);

  const [
    expandedId,
    setExpandedId,
  ] =
    useState(null);


  const [
    filters,
    setFilters,
  ] =
    useState(
      {
        search:
          "",

        date:
          "",

        shift:
          "",

        status:
          "",
      }
    );


  const operatorName =
    localStorage.getItem(
      "operator_name"
    ) ||
    localStorage.getItem(
      "operator_id"
    ) ||
    "Operator";


  /* =======================================================
     LOAD RECORDS
     ======================================================= */

  const loadRecords =
    async () => {

      try {

        setLoading(
          true
        );

        setError(
          ""
        );


        const response =
          await axios.get(
            `${API}/inspections?_=${Date.now()}`,
            {
              headers: {
                ...getHeaders(),

                "Cache-Control":
                  "no-cache",

                Pragma:
                  "no-cache",
              },
            }
          );


        let data =
          response.data;


        if (
          !Array.isArray(
            data
          )
        ) {

          data =
            Array.isArray(
              data
                ?.records
            )
              ? data.records
              : [];
        }


        setRecords(
          data
        );

      } catch (
        err
      ) {

        console.error(
          "Records error:",
          err
        );


        setError(
          safeDetail(
            err
              ?.response
              ?.data
              ?.detail
          ) ||
          "Unable to load inspection records."
        );

      } finally {

        setLoading(
          false
        );
      }
    };


  useEffect(
    () => {
      loadRecords();
    },
    []
  );


  /* =======================================================
     FILTERED RECORDS
     ======================================================= */

  const filteredRecords =
    useMemo(
      () => {

        let result =
          [
            ...records
          ];


        const search =
          filters
            .search
            .trim()
            .toLowerCase();


        if (search) {

          result =
            result.filter(
              (
                record
              ) =>
                String(
                  record
                    ?.frame_no ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    search
                  )
            );
        }


        if (
          filters.date
        ) {

          result =
            result.filter(
              (
                record
              ) => {

                const date =
                  String(
                    record
                      ?.date ||
                    ""
                  ).slice(
                    0,
                    10
                  );


                return (
                  date ===
                  filters.date
                );
              }
            );
        }


        if (
          filters.shift
        ) {

          result =
            result.filter(
              (
                record
              ) =>
                normalize(
                  record
                    ?.shift
                ) ===
                normalize(
                  filters
                    .shift
                )
            );
        }


        if (
          filters.status
        ) {

          result =
            result.filter(
              (
                record
              ) =>
                getStatus(
                  record
                ) ===
                normalize(
                  filters
                    .status
                )
            );
        }


        return result;
      },
      [
        records,
        filters,
      ]
    );


  /* =======================================================
     PDI FRAMES
     ======================================================= */

  const pdiFrames =
    useMemo(
      () => {

        return filteredRecords
          .filter(
            (
              record
            ) => {

              const currentStation =
                normalize(
                  record
                    ?.current_station
                );

              const currentStage =
                normalize(
                  record
                    ?.current_stage
                );

              const overallStatus =
                normalize(
                  record
                    ?.overall_status
                );


              const hasPdiData =
                Boolean(
                  record?.pdi
                );


              const isAtPdiStation =
                PDI_STATIONS.includes(
                  currentStation
                );


              const isPdiPending =
                [
                  "PDI_PENDING",
                  "PDI_IN_PROGRESS",
                ].includes(
                  overallStatus
                );


              const isPdiStage =
                PDI_STATIONS.includes(
                  currentStage
                );


              const hasPendingPdi =
                getPdiNokItems(
                  record
                ).length >
                0;


              const hasPdiRework =
                (
                  Array.isArray(
                    record
                      ?.pdi_reworked_items
                  ) &&
                  record
                    .pdi_reworked_items
                    .length >
                    0
                ) ||
                (
                  Array.isArray(
                    record
                      ?.pdi_rework_history
                  ) &&
                  record
                    .pdi_rework_history
                    .length >
                    0
                );


              return (
                hasPdiData ||
                isAtPdiStation ||
                isPdiPending ||
                isPdiStage ||
                hasPendingPdi ||
                hasPdiRework
              );
            }
          );
      },
      [
        filteredRecords,
      ]
    );


  /* =======================================================
     VIEW DETAILS
     ======================================================= */

  const viewDetails =
    async (
      record
    ) => {

      const id =
        getRecordId(
          record
        );


      if (!id) {

        setError(
          "Inspection record ID is missing."
        );

        return;
      }


      if (
        expandedId ===
        String(id)
      ) {

        setExpandedId(
          null
        );

        setDetails(
          null
        );

        return;
      }


      try {

        setDetailsLoading(
          true
        );

        setError(
          ""
        );


        const response =
          await axios.get(
            `${API}/inspection/${id}?_=${Date.now()}`,
            {
              headers:
                getHeaders(),
            }
          );


        setDetails(
          response.data
        );

        setExpandedId(
          String(id)
        );

      } catch (
        err
      ) {

        console.error(
          "Details error:",
          err
        );


        setError(
          safeDetail(
            err
              ?.response
              ?.data
              ?.detail
          ) ||
          "Unable to load inspection details."
        );

      } finally {

        setDetailsLoading(
          false
        );
      }
    };


  /* =======================================================
     CONTINUE OP40 REWORK
     ======================================================= */

  const continueOp40 =
    (
      record
    ) => {

      const id =
        getRecordId(
          record
        );


      if (!id) {

        setError(
          "Inspection record ID is missing."
        );

        return;
      }


      localStorage.setItem(
        "op60_frame_id",
        String(
          id
        )
      );


      localStorage.setItem(
        "op60_frame_no",
        String(
          record
            ?.frame_no ||
          ""
        )
      );


      localStorage.setItem(
        "op60_rework_source",
        "OP40"
      );


      navigate(
        "/op60"
      );
    };


  /* =======================================================
     CONTINUE PDI REWORK
     ======================================================= */

  const continuePdi =
    (
      record
    ) => {

      const id =
        getRecordId(
          record
        );


      if (!id) {

        setError(
          "Inspection record ID is missing."
        );

        return;
      }


      localStorage.setItem(
        "op60_frame_id",
        String(
          id
        )
      );


      localStorage.setItem(
        "op60_frame_no",
        String(
          record
            ?.frame_no ||
          ""
        )
      );


      localStorage.setItem(
        "op60_rework_source",
        "PDI"
      );


      navigate(
        "/op60"
      );
    };


  /* =======================================================
     LOGOUT
     ======================================================= */

  const logout =
    () => {

      [
        "operator_token",
        "operator_id",
        "operator_name",
        "operator_station",
        "operator_stage",
        "operator_shift",
        "op60_frame_id",
        "op60_frame_no",
        "op60_rework_source",
      ].forEach(
        (
          key
        ) =>
          localStorage.removeItem(
            key
          )
      );


      navigate(
        "/login"
      );
    };


  /* =======================================================
     PDI DETAILS
     ======================================================= */

  const renderPdiDetails =
    (
      record
    ) => {

      const pending =
        getPdiNokItems(
          record
        );

      const reworkedKeys =
        getPdiReworkedKeys(
          record
        );


      return (

        <div
          style={
            styles.pdiDetails
          }
        >

          <div
            style={
              styles.pdiDetailsHeader
            }
          >

            <div>

              <h3
                style={
                  styles.detailsTitle
                }
              >
                PDI DETAILS
              </h3>


              <div
                style={
                  styles.detailsMeta
                }
              >
                Frame:
                {" "}
                <strong>
                  {
                    record
                      ?.frame_no ||
                    "-"
                  }
                </strong>
              </div>

            </div>


            <div
              style={
                pending.length > 0
                  ? styles.pendingBadge
                  : styles.completedBadge
              }
            >
              {
                pending.length
              }
              {" "}
              PENDING
            </div>

          </div>


          {
            pending.length === 0
              ? (

                <div
                  style={
                    styles.noPending
                  }
                >
                  ✓ No pending PDI NOK checkpoints.
                </div>

              )
              : (

                <div>

                  {
                    pending.map(
                      (
                        item
                      ) => (

                        <div
                          key={
                            `${item.station}-${item.checkpoint_id}`
                          }
                          style={
                            styles.pdiDetailRow
                          }
                        >

                          <div
                            style={
                              styles.pdiDetailMain
                            }
                          >

                            <strong>
                              {
                                item.station
                              }
                              {" • "}
                              {
                                item.checkpoint
                              }
                            </strong>


                            {
                              item.criteria &&
                              (
                                <span>
                                  Criteria:
                                  {" "}
                                  {
                                    item.criteria
                                  }
                                </span>
                              )
                            }


                            {
                              item.method &&
                              (
                                <span>
                                  Method:
                                  {" "}
                                  {
                                    item.method
                                  }
                                </span>
                              )
                            }

                          </div>


                          <span
                            style={
                              styles.nokText
                            }
                          >
                            NO
                          </span>

                        </div>
                      )
                    )
                  }

                </div>
              )
          }


          {
            reworkedKeys.size >
              0 &&
            (

              <div
                style={
                  styles.reworkedSummary
                }
              >

                {
                  reworkedKeys.size
                }
                {" "}
                PDI checkpoint
                {
                  reworkedKeys.size === 1
                    ? ""
                    : "s"
                }
                {" "}
                already corrected by OP60.

              </div>
            )
          }

        </div>
      );
    };


  /* =======================================================
     OP40 DETAILS
     ======================================================= */

  const renderOp40Details =
    (
      record
    ) => {

      const stages =
        record
          ?.stages ||
        {};


      return (

        <div
          style={
            styles.detailsPanel
          }
        >

          <div
            style={
              styles.detailsTop
            }
          >

            <div>

              <h3
                style={
                  styles.detailsTitle
                }
              >
                INSPECTION DETAILS
              </h3>


              <div
                style={
                  styles.detailsMeta
                }
              >

                Frame:
                {" "}
                <strong>
                  {
                    record
                      ?.frame_no ||
                    "-"
                  }
                </strong>

                {" | "}

                Date:
                {" "}
                {
                  record
                    ?.date ||
                  "-"
                }

                {" | "}

                Shift:
                {" "}
                {
                  record
                    ?.shift ||
                  "-"
                }

              </div>

            </div>


            <span
              style={
                styles.statusBadge(
                  getStatus(
                    record
                  )
                )
              }
            >
              {
                getStatus(
                  record
                )
              }
            </span>

          </div>


          {
            Object.entries(
              stages
            ).map(
              (
                [
                  stageName,
                  stageObj,
                ]
              ) => (

                <div
                  key={
                    stageName
                  }
                  style={
                    styles.stageBlock
                  }
                >

                  <h4
                    style={
                      styles.stageHeader
                    }
                  >
                    {
                      stageName
                    }
                  </h4>


                  {
                    Object.entries(
                      stageObj
                        ?.sheets ||
                      {}
                    ).map(
                      (
                        [
                          sheetKey,
                          sheetObj,
                        ]
                      ) => (

                        <div
                          key={
                            sheetKey
                          }
                          style={
                            styles.sheetBlock
                          }
                        >

                          <strong>
                            {
                              SHEET_NAMES[
                                sheetKey
                              ] ||
                              sheetKey
                            }
                            :
                          </strong>


                          <div
                            style={
                              styles.grid
                            }
                          >

                            {
                              Object.entries(
                                sheetObj
                                  ?.data ||
                                {}
                              ).map(
                                (
                                  [
                                    field,
                                    val,
                                  ]
                                ) => (

                                  <div
                                    key={
                                      field
                                    }
                                    style={
                                      styles.gridItem
                                    }
                                  >

                                    <span>
                                      {
                                        FIELD_LABELS[
                                          field
                                        ] ||
                                        field
                                      }
                                      :
                                    </span>


                                    <span
                                      style={{
                                        fontWeight:
                                          "bold",

                                        color:
                                          val ===
                                          "NO"
                                            ? "#d9534f"
                                            : "#5cb85c",
                                      }}
                                    >
                                      {
                                        String(
                                          val
                                        )
                                      }
                                    </span>

                                  </div>
                                )
                              )
                            }

                          </div>

                        </div>
                      )
                    )
                  }

                </div>
              )
            )
          }

        </div>
      );
    };


  /* =======================================================
     ACTIVE LIST
     ======================================================= */

  const activeRecordsList =
    activeTab ===
    "OP40"
      ? filteredRecords
      : pdiFrames;


  return (

    <div
      style={
        styles.container
      }
    >

      <header
        style={
          styles.header
        }
      >

        <h2>
          Inspection Records
        </h2>


        <div>

          <span
            style={{
              marginRight:
                "15px",
            }}
          >
            Operator:
            {" "}
            {
              operatorName
            }
          </span>


          <button
            onClick={
              logout
            }
            style={
              styles.btnDanger
            }
          >
            Logout
          </button>

        </div>

      </header>


      {
        error &&
        (
          <div
            style={
              styles.errorBox
            }
          >
            {
              error
            }
          </div>
        )
      }


      {/* ===================================================
          FILTER BAR
      =================================================== */}

      <div
        style={
          styles.filterBar
        }
      >

        <input
          type="text"
          placeholder="Search Frame No..."
          value={
            filters.search
          }
          onChange={
            (
              e
            ) =>
              setFilters(
                {
                  ...filters,
                  search:
                    e.target.value,
                }
              )
          }
          style={
            styles.input
          }
        />


        <input
          type="date"
          value={
            filters.date
          }
          onChange={
            (
              e
            ) =>
              setFilters(
                {
                  ...filters,
                  date:
                    e.target.value,
                }
              )
          }
          style={
            styles.input
          }
        />


        <select
          value={
            filters.shift
          }
          onChange={
            (
              e
            ) =>
              setFilters(
                {
                  ...filters,
                  shift:
                    e.target.value,
                }
              )
          }
          style={
            styles.input
          }
        >

          <option value="">
            All Shifts
          </option>

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


        <select
          value={
            filters.status
          }
          onChange={
            (
              e
            ) =>
              setFilters(
                {
                  ...filters,
                  status:
                    e.target.value,
                }
              )
          }
          style={
            styles.input
          }
        >

          <option value="">
            All Statuses
          </option>

          <option value="OP40 - STAGE 1">
            OP40 - STAGE 1
          </option>

          <option value="OP40 - STAGE 2">
            OP40 - STAGE 2
          </option>

          <option value="OP40 - STAGE 3">
            OP40 - STAGE 3
          </option>

          <option value="OP60 REWORK">
            OP60 REWORK
          </option>

          <option value="PDI STATION 3">
            PDI STATION 3
          </option>

          <option value="PDI STATION 4">
            PDI STATION 4
          </option>

          <option value="FIREWALL">
            FIREWALL
          </option>

          <option value="DOC">
            DOC
          </option>

          <option value="COMPLETED">
            COMPLETED
          </option>

        </select>

      </div>


      {/* ===================================================
          TABS
      =================================================== */}

      <div
        style={
          styles.tabContainer
        }
      >

        <button
          style={
            activeTab === "OP40"
              ? styles.activeTab
              : styles.tab
          }
          onClick={() =>
            setActiveTab(
              "OP40"
            )
          }
        >
          OP40 Inspections
          {" "}
          (
          {
            filteredRecords.length
          }
          )
        </button>


        <button
          style={
            activeTab === "PDI"
              ? styles.activeTab
              : styles.tab
          }
          onClick={() =>
            setActiveTab(
              "PDI"
            )
          }
        >
          PDI Frames
          {" "}
          (
          {
            pdiFrames.length
          }
          )
        </button>

      </div>


      {/* ===================================================
          TABLE
      =================================================== */}

      {
        loading
          ? (

            <div>
              Loading records...
            </div>

          )
          : (

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
                    Frame No
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Date
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
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {
                  activeRecordsList.length ===
                  0

                    ? (

                      <tr>

                        <td
                          colSpan="5"
                          style={{
                            textAlign:
                              "center",

                            padding:
                              "20px",
                          }}
                        >
                          No inspection records found.
                        </td>

                      </tr>

                    )
                    : (

                      activeRecordsList.map(
                        (
                          record
                        ) => {

                          const id =
                            getRecordId(
                              record
                            );

                          const isExpanded =
                            expandedId ===
                            String(
                              id
                            );

                          const op40Noks =
                            getOp40NokItems(
                              record
                            );

                          const pdiNoks =
                            getPdiNokItems(
                              record
                            );


                          return (

                            <React.Fragment
                              key={
                                id ||
                                record.frame_no
                              }
                            >

                              <tr>

                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  {
                                    record
                                      ?.frame_no ||
                                    "-"
                                  }
                                </td>


                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  {
                                    record
                                      ?.date ||
                                    "-"
                                  }
                                </td>


                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  {
                                    record
                                      ?.shift ||
                                    "-"
                                  }
                                </td>


                                <td
                                  style={
                                    styles.td
                                  }
                                >

                                  <span
                                    style={
                                      styles.statusBadge(
                                        getStatus(
                                          record
                                        )
                                      )
                                    }
                                  >
                                    {
                                      getStatus(
                                        record
                                      )
                                    }
                                  </span>

                                </td>


                                <td
                                  style={
                                    styles.td
                                  }
                                >

                                  <button
                                    onClick={() =>
                                      viewDetails(
                                        record
                                      )
                                    }
                                    style={
                                      styles.btnSecondary
                                    }
                                  >
                                    {
                                      isExpanded
                                        ? "Hide"
                                        : "View"
                                    }
                                    {" "}
                                    Details
                                  </button>


                                  {
                                    activeTab ===
                                      "OP40" &&
                                    op40Noks.length >
                                      0 &&
                                    (
                                      <button
                                        onClick={() =>
                                          continueOp40(
                                            record
                                          )
                                        }
                                        style={
                                          styles.btnPrimary
                                        }
                                      >
                                        Rework OP40
                                        {" "}
                                        (
                                        {
                                          op40Noks.length
                                        }
                                        )
                                      </button>
                                    )
                                  }


                                  {
                                    activeTab ===
                                      "PDI" &&
                                    pdiNoks.length >
                                      0 &&
                                    (
                                      <button
                                        onClick={() =>
                                          continuePdi(
                                            record
                                          )
                                        }
                                        style={
                                          styles.btnWarning
                                        }
                                      >
                                        Rework PDI
                                        {" "}
                                        (
                                        {
                                          pdiNoks.length
                                        }
                                        )
                                      </button>
                                    )
                                  }

                                </td>

                              </tr>


                              {
                                isExpanded &&
                                (

                                  <tr>

                                    <td
                                      colSpan="5"
                                      style={{
                                        padding:
                                          "0",
                                      }}
                                    >

                                      {
                                        detailsLoading
                                          ? (
                                            <div
                                              style={{
                                                padding:
                                                  "15px",
                                              }}
                                            >
                                              Loading details...
                                            </div>
                                          )
                                          : activeTab ===
                                            "OP40"
                                            ? (
                                              renderOp40Details(
                                                details ||
                                                record
                                              )
                                            )
                                            : (
                                              renderPdiDetails(
                                                details ||
                                                record
                                              )
                                            )
                                      }

                                    </td>

                                  </tr>
                                )
                              }

                            </React.Fragment>
                          );
                        }
                      )
                    )
                }

              </tbody>

            </table>
          )
      }

    </div>
  );
}


/* =========================================================
   INLINE STYLES
   ========================================================= */

const styles = {

  container: {
    padding:
      "20px",

    fontFamily:
      "sans-serif",
  },


  header: {
    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    marginBottom:
      "20px",
  },


  filterBar: {
    display:
      "flex",

    gap:
      "10px",

    marginBottom:
      "20px",

    flexWrap:
      "wrap",
  },


  input: {
    padding:
      "8px",

    borderRadius:
      "4px",

    border:
      "1px solid #ccc",
  },


  tabContainer: {
    display:
      "flex",

    gap:
      "10px",

    marginBottom:
      "15px",
  },


  tab: {
    padding:
      "10px 20px",

    border:
      "none",

    background:
      "#e0e0e0",

    cursor:
      "pointer",

    borderRadius:
      "4px",
  },


  activeTab: {
    padding:
      "10px 20px",

    border:
      "none",

    background:
      "#007bff",

    color:
      "#fff",

    cursor:
      "pointer",

    borderRadius:
      "4px",
  },


  table: {
    width:
      "100%",

    borderCollapse:
      "collapse",

    textAlign:
      "left",
  },


  th: {
    padding:
      "12px",

    background:
      "#f4f4f4",

    borderBottom:
      "2px solid #ddd",
  },


  td: {
    padding:
      "12px",

    borderBottom:
      "1px solid #ddd",
  },


  btnPrimary: {
    background:
      "#007bff",

    color:
      "#fff",

    border:
      "none",

    padding:
      "6px 12px",

    borderRadius:
      "4px",

    cursor:
      "pointer",

    marginLeft:
      "5px",
  },


  btnWarning: {
    background:
      "#ffc107",

    color:
      "#000",

    border:
      "none",

    padding:
      "6px 12px",

    borderRadius:
      "4px",

    cursor:
      "pointer",

    marginLeft:
      "5px",
  },


  btnSecondary: {
    background:
      "#6c757d",

    color:
      "#fff",

    border:
      "none",

    padding:
      "6px 12px",

    borderRadius:
      "4px",

    cursor:
      "pointer",
  },


  btnDanger: {
    background:
      "#dc3545",

    color:
      "#fff",

    border:
      "none",

    padding:
      "6px 12px",

    borderRadius:
      "4px",

    cursor:
      "pointer",
  },


  errorBox: {
    padding:
      "10px",

    background:
      "#f8d7da",

    color:
      "#721c24",

    marginBottom:
      "15px",

    borderRadius:
      "4px",
  },


  pdiDetails: {
    padding:
      "15px",

    background:
      "#f9f9f9",

    border:
      "1px solid #eee",
  },


  pdiDetailsHeader: {
    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    marginBottom:
      "10px",
  },


  detailsTitle: {
    margin:
      "0 0 5px 0",
  },


  detailsMeta: {
    color:
      "#666",

    fontSize:
      "0.9em",
  },


  pendingBadge: {
    background:
      "#d9534f",

    color:
      "#fff",

    padding:
      "4px 8px",

    borderRadius:
      "4px",

    fontWeight:
      "bold",
  },


  completedBadge: {
    background:
      "#5cb85c",

    color:
      "#fff",

    padding:
      "4px 8px",

    borderRadius:
      "4px",

    fontWeight:
      "bold",
  },


  pdiDetailRow: {
    display:
      "flex",

    justifyContent:
      "space-between",

    padding:
      "8px 0",

    borderBottom:
      "1px solid #eee",
  },


  pdiDetailMain: {
    display:
      "flex",

    flexDirection:
      "column",
  },


  nokText: {
    color:
      "#d9534f",

    fontWeight:
      "bold",
  },


  noPending: {
    color:
      "#5cb85c",

    fontWeight:
      "bold",

    padding:
      "10px 0",
  },


  reworkedSummary: {
    marginTop:
      "10px",

    fontSize:
      "0.85em",

    color:
      "#666",
  },


  detailsPanel: {
    padding:
      "15px",

    background:
      "#f8f9fa",

    border:
      "1px solid #ddd",
  },


  detailsTop: {
    display:
      "flex",

    justifyContent:
      "space-between",

    marginBottom:
      "15px",
  },


  stageBlock: {
    marginBottom:
      "15px",
  },


  stageHeader: {
    margin:
      "0 0 10px 0",

    borderBottom:
      "1px solid #ccc",

    paddingBottom:
      "5px",
  },


  sheetBlock: {
    marginLeft:
      "10px",

    marginBottom:
      "10px",
  },


  grid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fill, minmax(200px, 1fr))",

    gap:
      "10px",

    marginTop:
      "5px",
  },


  gridItem: {
    display:
      "flex",

    justifyContent:
      "space-between",

    background:
      "#fff",

    padding:
      "6px",

    border:
      "1px solid #eee",

    borderRadius:
      "3px",
  },


  statusBadge: (
    status
  ) => {

    const value =
      normalize(
        status
      );


    let backgroundColor =
      "#fff3cd";

    let color =
      "#856404";


    if (
      value ===
      "COMPLETED"
    ) {

      backgroundColor =
        "#d4edda";

      color =
        "#155724";

    } else if (
      value ===
      "OP60 REWORK"
    ) {

      backgroundColor =
        "#ffe5cc";

      color =
        "#9a3412";

    } else if (
      value ===
      "FIREWALL"
    ) {

      backgroundColor =
        "#e0e7ff";

      color =
        "#3730a3";

    } else if (
      value ===
      "DOC"
    ) {

      backgroundColor =
        "#ede9fe";

      color =
        "#6d28d9";

    } else if (
      value.startsWith(
        "PDI STATION"
      )
    ) {

      backgroundColor =
        "#dcfce7";

      color =
        "#166534";

    } else if (
      value.startsWith(
        "OP40 -"
      )
    ) {

      backgroundColor =
        "#dbeafe";

      color =
        "#1d4ed8";

    } else if (
      value ===
      "NOK"
    ) {

      backgroundColor =
        "#f8d7da";

      color =
        "#721c24";
    }


    return {

      padding:
        "4px 8px",

      borderRadius:
        "4px",

      fontWeight:
        "bold",

      fontSize:
        "0.85em",

      backgroundColor,

      color,
    };
  },
};
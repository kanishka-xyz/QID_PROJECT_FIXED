import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";


/* =========================================================
   API
   ========================================================= */

const API =
  "http://localhost:8000";


/* =========================================================
   OP40 SHEETS
   ========================================================= */

const SHEET_NAMES = {
  sheet1: "Leakage",
  sheet2: "Defects",
  sheet3: "Spatter",
  sheet4: "PDI",
};


/* =========================================================
   BACKEND SHEET NAMES
   ========================================================= */

const BACKEND_SHEET_NAMES = {
  sheet1: "sheet1",
  sheet2: "sheet2",
  sheet3: "sheet3",
  sheet4: "sheet4",
};


/* =========================================================
   PDI STATIONS
   ========================================================= */

const PDI_REWORK_STATIONS = [
  "PDI_STATION_3",
  "PDI_STATION_4",
];


/* =========================================================
   FIELD LABELS
   ========================================================= */

const FIELD_LABELS = {

  top_T1:
    "Top T1",

  top_T3_I:
    "Top T3 Inner",

  top_T1_O:
    "Top T1 Outer",

  top_T2:
    "Top T2",

  top_T2_I:
    "Top T2 Inner",

  top_T2_O:
    "Top T2 Outer",

  top_T3:
    "Top T3",

  top_T3_I_2:
    "Top T3 Inner",

  top_T3_O:
    "Top T3 Outer",

  top_T4:
    "Top T4",

  top_T4_I:
    "Top T4 Inner",

  top_T4_O:
    "Top T4 Outer",

  bottom_B1:
    "Bottom B1",

  bottom_B2:
    "Bottom B2",

  bottom_B3:
    "Bottom B3",

  bottom_B4:
    "Bottom B4",

  vent_valve_I:
    "Vent Valve Inner",

  fm_cm:
    "FM - CM",

  rm_cm:
    "RM - CM",

  porosity_above_2mm:
    "Porosity Above 2mm",

  excess_welding_BDU:
    "Excess Welding BDU",

  welding_lump:
    "Welding Lump",

  protrusion_inside_cm:
    "Protrusion Inside CM",

  no_masking_tape:
    "No Masking Tape",

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
  ] =
    `PDI Checkpoint ${i}`;
}


/* =========================================================
   AUTH HEADERS
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

    headers[
      "X-Operator-ID"
    ] =
      operatorId;
  }

  return headers;
};


/* =========================================================
   RECORD ID
   ========================================================= */

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


/* =========================================================
   NORMALIZE VALUE
   ========================================================= */

const normalizeValue = (
  value
) => {

  return String(
    value ?? ""
  )
    .trim()
    .toUpperCase();
};


/* =========================================================
   IS NOK
   ========================================================= */

const isNok = (
  value
) => {

  return (
    normalizeValue(value) ===
    "NO"
  );
};


/* =========================================================
   NORMALIZE SHEET
   ========================================================= */

const normalizeSheetName = (
  sheet
) => {

  const value =
    String(
      sheet || ""
    )
      .trim()
      .toLowerCase();

  const mapping = {

    sheet1:
      "sheet1",

    leakage:
      "sheet1",

    sheet2:
      "sheet2",

    defect:
      "sheet2",

    defects:
      "sheet2",

    sheet3:
      "sheet3",

    spatter:
      "sheet3",

    sheet4:
      "sheet4",

    pdi:
      "sheet4",
  };

  return (
    mapping[value] ||
    value
  );
};


/* =========================================================
   FIELD LABEL
   ========================================================= */

const getFieldLabel = (
  field
) => {

  const clean =
    String(
      field || ""
    )
      .split(".")
      .pop();

  return (
    FIELD_LABELS[field] ||
    FIELD_LABELS[clean] ||
    clean ||
    "Field"
  );
};


/* =========================================================
   NORMALIZE PDI ITEM
   =========================================================
   
   Backend may return:

   {
      station: "PDI_STATION_3",
      checkpoint_id: "CP_2",
      checkpoint: "...",
      criteria: "...",
      method: "...",
      original_status: "NO"
   }

   or slightly different fields.

   We normalize them here so the frontend always
   works with the same structure.
   ========================================================= */

const normalizePdiItem = (
  item
) => {

  if (!item) {
    return null;
  }

  const station =
    String(
      item.station ||
      item.stage ||
      ""
    )
      .trim()
      .toUpperCase();

  const checkpointId =
    String(
      item.checkpoint_id ||
      item.field ||
      ""
    ).trim();

  if (
    !PDI_REWORK_STATIONS.includes(
      station
    ) ||
    !checkpointId
  ) {

    return null;
  }

  return {

    source:
      "PDI",

    station,

    stage:
      station,

    checkpoint_id:
      checkpointId,

    field:
      checkpointId,

    sr_no:
      item.sr_no ??
      null,

    checkpoint:
      item.checkpoint ||
      item.name ||
      checkpointId,

    criteria:
      item.criteria ||
      "",

    method:
      item.method ||
      "",

    original_status:
      "NO",

    status:
      "NOK",
  };
};


/* =========================================================
   NORMALIZE PDI ARRAY
   ========================================================= */

const normalizePdiItems = (
  items
) => {

  if (
    !Array.isArray(
      items
    )
  ) {

    return [];
  }

  const result = [];

  const seen =
    new Set();

  items.forEach(
    (item) => {

      const normalized =
        normalizePdiItem(
          item
        );

      if (!normalized) {
        return;
      }

      const key =
        `${normalized.station}.${normalized.checkpoint_id}`;

      if (
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
        normalized
      );
    }
  );

  return result;
};


/* =========================================================
   GET PDI ITEMS FROM RECORD
   =========================================================
   
   This is ONLY the fallback used when the backend frame
   endpoint does not provide pdi_nok_items.

   The preferred source is:
   
      response.data.pdi_nok_items
   ========================================================= */

const getPdiPendingFromRecord = (
  record
) => {

  const result = [];

  const stations =
    record?.pdi?.stations ||
    {};

  PDI_REWORK_STATIONS.forEach(
    (
      station
    ) => {

      const checkpoints =
        stations?.[
          station
        ]?.checkpoints ||
        {};

      Object.entries(
        checkpoints
      ).forEach(
        ([
          checkpointId,
          checkpoint,
        ]) => {

          if (
            normalizeValue(
              checkpoint?.value
            ) !==
            "NO"
          ) {

            return;
          }

          result.push({

            source:
              "PDI",

            station,

            stage:
              station,

            checkpoint_id:
              String(
                checkpointId
              ),

            field:
              String(
                checkpointId
              ),

            sr_no:
              checkpoint?.sr_no,

            checkpoint:
              checkpoint?.checkpoint ||
              checkpoint?.name ||
              String(
                checkpointId
              ),

            criteria:
              checkpoint?.criteria ||
              "",

            method:
              checkpoint?.method ||
              "",

            original_status:
              "NO",

            status:
              "NOK",
          });
        }
      );
    }
  );

  return normalizePdiItems(
    result
  );
};


/* =========================================================
   GET OP40 REWORKED KEYS
   ========================================================= */

const getOp40ReworkedKeys = (
  record
) => {

  const keys =
    new Set();

  const collections = [

    Array.isArray(
      record?.reworked_items
    )
      ? record.reworked_items
      : [],

    Array.isArray(
      record?.rework_history
    )
      ? record.rework_history
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

          const stage =
            String(
              item?.stage ||
              ""
            )
              .trim()
              .toUpperCase();

          const rawField =
            String(
              item?.field ||
              ""
            ).trim();

          if (
            !stage ||
            !rawField
          ) {

            return;
          }

          const parts =
            rawField
              .split(".")
              .filter(
                Boolean
              );

          if (
            parts.length >= 2
          ) {

            const sheet =
              normalizeSheetName(
                parts[0]
              );

            const field =
              parts
                .slice(1)
                .join(".");

            keys.add(
              `${stage}.${sheet}.${field}`
            );

          } else {

            keys.add(
              `${stage}.${rawField}`
            );
          }
        }
      );
    }
  );

  return keys;
};


/* =========================================================
   OP40 FIELD REWORKED
   ========================================================= */

const isFieldReworked = (
  record,
  stage,
  sheet,
  field
) => {

  const keys =
    getOp40ReworkedKeys(
      record
    );

  const normalizedStage =
    String(
      stage || ""
    )
      .trim()
      .toUpperCase();

  const normalizedSheet =
    normalizeSheetName(
      sheet
    );

  const normalizedField =
    String(
      field || ""
    ).trim();

  const key =
    `${normalizedStage}.${normalizedSheet}.${normalizedField}`;

  return keys.has(
    key
  );
};


/* =========================================================
   COMPONENT
   ========================================================= */

function OP60Page({
  navigate,
}) {

  /* =======================================================
     RECORD
     ======================================================= */

  const [
    record,
    setRecord,
  ] = useState(
    null
  );


  /* =======================================================
     LOADING
     ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  /* =======================================================
     SAVING
     ======================================================= */

  const [
    working,
    setWorking,
  ] = useState(
    false
  );


  /* =======================================================
     ERROR
     ======================================================= */

  const [
    error,
    setError,
  ] = useState(
    ""
  );


  /* =======================================================
     SUCCESS
     ======================================================= */

  const [
    message,
    setMessage,
  ] = useState(
    ""
  );


  /* =======================================================
     SELECTED ITEM
     ======================================================= */

  const [
    selectedItem,
    setSelectedItem,
  ] = useState(
    null
  );


  /* =======================================================
     RESULT AFTER REWORK
     ======================================================= */

  const [
    selectedValue,
    setSelectedValue,
  ] = useState(
    "NO"
  );


  /* =======================================================
     REMARK
     ======================================================= */

  const [
    note,
    setNote,
  ] = useState(
    ""
  );


  /* =======================================================
     PDI PENDING ITEMS

     IMPORTANT:

     This is now a SEPARATE STATE.

     We don't continuously derive the PDI list
     from the old record.

     Backend tells us exactly what remains.
     ======================================================= */

  const [
    pdiPendingItems,
    setPdiPendingItems,
  ] = useState(
    []
  );


  /* =======================================================
     FRAME ID
     ======================================================= */

  const frameId =
    localStorage.getItem(
      "op60_frame_id"
    ) ||
    "";

  const operatorInfo = useMemo(() => {
  try {
    return JSON.parse(
      localStorage.getItem(
        "operator_info"
      ) || "{}"
    );
  } catch {
    return {};
  }
}, []);

const operatorStation =
  operatorInfo?.station ||
  localStorage.getItem(
    "operator_station"
  ) ||
  "";

const stationKey = String(
  operatorStation || ""
)
  .trim()
  .toUpperCase();

  /* =======================================================
     REWORK SOURCE
     ======================================================= */

  const reworkSource =
    String(
      localStorage.getItem(
        "op60_rework_source"
      ) ||
      "OP40"
    )
      .trim()
      .toUpperCase();


  const isPdiRework =
    reworkSource ===
    "PDI";


  /* =======================================================
     LOAD FRAME
     ======================================================= */

  const loadFrame =
    async () => {

      if (!frameId) {

        setError(
          "No frame selected. Please open a frame from Records."
        );

        setLoading(
          false
        );

        return;
      }


      try {

        setLoading(
          true
        );

        setError(
          ""
        );

        setMessage(
          ""
        );


        /*
          IMPORTANT:

          Always call the OP60 frame endpoint first.

          This endpoint returns:

            pdi_nok_items
            nok_items
            record

          Therefore OP60 is not trying to guess
          the PDI queue from the original record.
        */

        const response =
          await axios.get(

            `${API}/op60/frame/${frameId}?_=${Date.now()}`,

            {
              headers: {

                ...getHeaders(),

                "Cache-Control":
                  "no-cache",

                Pragma:
                  "no-cache",

                "X-Requested-Time":
                  String(
                    Date.now()
                  ),
              },
            }
          );


        console.log(
          "================================================"
        );

        console.log(
          "OP60 FRAME RESPONSE"
        );

        console.log(
          response.data
        );

        console.log(
          "================================================"
        );


        /* =================================================
           UPDATED RECORD
           ================================================= */

        const backendRecord =
          response.data?.record ||
          response.data;

        setRecord(
          backendRecord
        );


        /* =================================================
           PDI LIST FROM BACKEND
           ================================================= */

        /*
          THIS IS NOW THE PRIMARY SOURCE.

          Do NOT derive the PDI list from record when
          the backend already supplied pdi_nok_items.
        */

        const backendPdiItems =
          normalizePdiItems(

            response.data?.pdi_nok_items

          );


        if (
          Array.isArray(
            response.data?.pdi_nok_items
          )
        ) {

          console.log(
            "PDI NOK ITEMS FROM BACKEND:",
            backendPdiItems
          );

          setPdiPendingItems(
            backendPdiItems
          );

        } else {

          /*
            Fallback only for older backend responses.
          */

          const fallback =
            getPdiPendingFromRecord(
              backendRecord
            );

          console.log(
            "PDI NOK ITEMS FALLBACK:",
            fallback
          );

          setPdiPendingItems(
            fallback
          );
        }

      } catch (
        err
      ) {

        console.error(
          "OP60 LOAD ERROR:",
          err
        );


        /*
          Generic inspection endpoint is only used
          as a compatibility fallback.
        */

        try {

          const fallback =
            await axios.get(

              `${API}/inspection/${frameId}?_=${Date.now()}`,

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


          const fallbackRecord =
            fallback.data;

          setRecord(
            fallbackRecord
          );


          /*
            Even the fallback record is converted
            into the exact PDI pending structure.
          */

          setPdiPendingItems(
            getPdiPendingFromRecord(
              fallbackRecord
            )
          );


        } catch (
          fallbackError
        ) {

          console.error(
            "OP60 FALLBACK ERROR:",
            fallbackError
          );


          setError(

            fallbackError
              ?.response
              ?.data
              ?.detail ||

            err
              ?.response
              ?.data
              ?.detail ||

            "Unable to load frame details."
          );
        }

      } finally {

        setLoading(
          false
        );
      }
    };


  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(
    () => {

      loadFrame();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );
  
  /* =======================================================
     OP40 PENDING ITEMS
     ======================================================= */

  const op40PendingItems =
    useMemo(
      () => {

        const result =
          [];


        const stages =
          record?.stages ||
          {};


        Object.entries(
          stages
        ).forEach(
          ([
            stageName,
            stageObj,
          ]) => {

            if (
              String(
                stageName
              )
                .trim()
                .toUpperCase()
                ===
              "OP60"
            ) {

              return;
            }


            const sheets =
              stageObj?.sheets ||
              {};


            Object.entries(
              sheets
            ).forEach(
              ([
                sheetName,
                sheetObj,
              ]) => {

                const data =
                  sheetObj?.data ||
                  {};


                Object.entries(
                  data
                ).forEach(
                  ([
                    field,
                    value,
                  ]) => {

                    if (
                      !isNok(
                        value
                      )
                    ) {

                      return;
                    }


                    if (
                      isFieldReworked(
                        record,
                        stageName,
                        sheetName,
                        field
                      )
                    ) {

                      return;
                    }


                    result.push({

                      source:
                        "OP40",

                      stage:
                        stageName,

                      sheet:
                        sheetName,

                      field,

                      value:
                        "NO",

                      original_status:
                        "NO",
                    });
                  }
                );
              }
            );
          }
        );


        return result;

      },
      [
        record
      ]
    );


  /* =======================================================
     CURRENT PENDING COUNT
     ======================================================= */

  const pendingNokCount =
    isPdiRework
      ? pdiPendingItems.length
      : op40PendingItems.length;


  /* =======================================================
     START PDI EDIT
     ======================================================= */

  const startPdiEdit =
    (
      item
    ) => {

      if (!item) {
        return;
      }


      const station =
        String(
          item.station ||
          ""
        )
          .trim()
          .toUpperCase();


      const checkpointId =
        String(
          item.checkpoint_id ||
          item.field ||
          ""
        ).trim();


      if (
        !PDI_REWORK_STATIONS.includes(
          station
        )
      ) {

        setError(
          "Invalid PDI station."
        );

        return;
      }


      if (!checkpointId) {

        setError(
          "PDI checkpoint ID is missing."
        );

        return;
      }


      const alreadySelected =
        selectedItem?.type ===
          "PDI" &&
        selectedItem?.station ===
          station &&
        selectedItem?.checkpoint_id ===
          checkpointId;


      if (
        alreadySelected
      ) {

        setSelectedItem(
          null
        );

        setSelectedValue(
          "NO"
        );

        setNote(
          ""
        );

        return;
      }


      setSelectedItem({

        type:
          "PDI",

        source:
          "PDI",

        station,

        stage:
          station,

        checkpoint_id:
          checkpointId,

        field:
          checkpointId,

        checkpoint:
          item.checkpoint ||
          checkpointId,

        criteria:
          item.criteria ||
          "",

        method:
          item.method ||
          "",
      });


      setSelectedValue(
        "NO"
      );

      setNote(
        ""
      );

      setError(
        ""
      );

      setMessage(
        ""
      );
    };


  /* =======================================================
     START OP40 EDIT
     ======================================================= */

  const startOp40Edit =
    (
      item
    ) => {

      if (!item) {
        return;
      }


      if (
        !isNok(
          item.value
        )
      ) {

        return;
      }


      if (
        isFieldReworked(
          record,
          item.stage,
          item.sheet,
          item.field
        )
      ) {

        return;
      }


      const same =
        selectedItem?.type ===
          "OP40" &&
        selectedItem?.stage ===
          item.stage &&
        selectedItem?.sheet ===
          item.sheet &&
        selectedItem?.field ===
          item.field;


      if (
        same
      ) {

        setSelectedItem(
          null
        );

        setSelectedValue(
          "NO"
        );

        setNote(
          ""
        );

        return;
      }


      const backendSheet =
        BACKEND_SHEET_NAMES[
          item.sheet
        ] ||
        item.sheet;


      setSelectedItem({

        type:
          "OP40",

        source:
          "OP40",

        stage:
          item.stage,

        sheet:
          item.sheet,

        field:
          item.field,

        apiField:
          `${backendSheet}.${item.field}`,
      });


      setSelectedValue(
        "NO"
      );

      setNote(
        ""
      );

      setError(
        ""
      );

      setMessage(
        ""
      );
    };


  /* =======================================================
     SAVE REWORK
     ======================================================= */

  const saveRework =
    async () => {

      console.log(
        "================================================"
      );

      console.log(
        "OP60 SAVE"
      );

      console.log(
        "Selected item:",
        selectedItem
      );

      console.log(
        "Selected value:",
        selectedValue
      );

      console.log(
        "================================================"
      );


      /* =================================================
         BASIC VALIDATION
         ================================================= */

      if (!record) {

        setError(
          "Inspection record is not loaded."
        );

        return;
      }


      if (!selectedItem) {

        setError(
          "No checkpoint selected."
        );

        return;
      }


      if (
        selectedValue !==
        "YES"
      ) {

        setError(
          "Please select YES after completing the rework."
        );

        return;
      }


      const id =
        getRecordId(
          record
        ) ||
        frameId;


      if (!id) {

        setError(
          "Frame ID is missing."
        );

        return;
      }


      /* =================================================
         PDI REWORK
         ================================================= */

      if (
        selectedItem.type ===
          "PDI" ||
        isPdiRework
      ) {

        const station =
          String(
            selectedItem.station ||
            ""
          )
            .trim()
            .toUpperCase();


        const checkpointId =
          String(
            selectedItem.checkpoint_id ||
            selectedItem.field ||
            ""
          ).trim();


        if (
          !PDI_REWORK_STATIONS.includes(
            station
          )
        ) {

          setError(
            "Invalid PDI station."
          );

          return;
        }


        if (!checkpointId) {

          setError(
            "PDI checkpoint ID is missing."
          );

          return;
        }


        /* =================================================
           EXACT PAYLOAD
           ================================================= */

        const payload = {

          record_id:
            String(
              id
            ),

          stage:
            station,

          field:
            checkpointId,

          corrected_status:
            "YES",

          remarks:
            note.trim() ||
            null,
        };


        console.log(
          "PDI REWORK PAYLOAD:",
          payload
        );


        try {

          setWorking(
            true
          );

          setError(
            ""
          );

          setMessage(
            ""
          );


          /* ===============================================
             POST
             =============================================== */

          const response =
            await axios.post(

              `${API}/op60/rework`,

              payload,

              {
                headers: {

                  ...getHeaders(),

                  "Content-Type":
                    "application/json",

                  "Cache-Control":
                    "no-cache",

                  Pragma:
                    "no-cache",
                },
              }
            );


          console.log(
            "================================================"
          );

          console.log(
            "PDI REWORK SUCCESS"
          );

          console.log(
            response.data
          );

          console.log(
            "================================================"
          );


          /* ===============================================
             THIS IS THE MAIN FIX

             Backend sends:

                remaining_pdi_nok

             Use that exact array.

             DO NOT calculate it again from
             record.pdi.stations.
             =============================================== */

          if (
            Array.isArray(
              response.data?.remaining_pdi_nok
            )
          ) {

            const updatedPdiList =
              normalizePdiItems(
                response.data
                  .remaining_pdi_nok
              );


            console.log(
              "UPDATED PDI LIST FROM BACKEND:",
              updatedPdiList
            );


            setPdiPendingItems(
              updatedPdiList
            );


          } else {

            /*
              If backend returns only count,
              remove the exact checkpoint locally.
            */

            setPdiPendingItems(
              (
                previous
              ) =>
                previous.filter(
                  (
                    item
                  ) =>
                    !(
                      String(
                        item.station
                      )
                        .trim()
                        .toUpperCase() ===
                      station &&

                      String(
                        item.checkpoint_id
                      ).trim() ===
                      checkpointId
                    )
                )
            );
          }


          /* ===============================================
             UPDATED RECORD FROM BACKEND
             =============================================== */

          if (
            response.data?.record
          ) {

            console.log(
              "UPDATING REACT RECORD FROM BACKEND"
            );


            setRecord(
              response.data.record
            );
          }


          /* ===============================================
             CLOSE EDITOR
             =============================================== */

          setSelectedItem(
            null
          );

          setSelectedValue(
            "NO"
          );

          setNote(
            ""
          );


          /* ===============================================
             SUCCESS MESSAGE
             =============================================== */

          setMessage(
            response.data?.message ||
              "PDI rework recorded successfully."
          );


        } catch (
          err
        ) {

          console.error(
            "================================================"
          );

          console.error(
            "PDI REWORK FAILED"
          );

          console.error(
            err
          );

          console.error(
            err.response
          );

          console.error(
            err.response?.data
          );

          console.error(
            "================================================"
          );


          setError(

            err.response
              ?.data
              ?.detail ||

            err.response
              ?.data
              ?.message ||

            err.message ||

            "Unable to record PDI rework."
          );

        } finally {

          setWorking(
            false
          );
        }


        return;
      }


      /* =================================================
         OP40 REWORK
         ================================================= */

      const payload = {

        record_id:
          String(
            id
          ),

        stage:
          String(
            selectedItem.stage
          ),

        field:
          String(
            selectedItem.apiField
          ),

        corrected_status:
          "YES",

        remarks:
          note.trim() ||
          null,
      };


      console.log(
        "OP40 REWORK PAYLOAD:",
        payload
      );


      try {

        setWorking(
          true
        );

        setError(
          ""
        );

        setMessage(
          ""
        );


        const response =
          await axios.post(

            `${API}/op60/rework`,

            payload,

            {
              headers: {

                ...getHeaders(),

                "Content-Type":
                  "application/json",

                "Cache-Control":
                  "no-cache",

                Pragma:
                  "no-cache",
              },
            }
          );


        console.log(
          "OP40 REWORK RESPONSE:",
          response.data
        );


        if (
          response.data?.record
        ) {

          setRecord(
            response.data.record
          );

        } else {

          await loadFrame();
        }


        setSelectedItem(
          null
        );

        setSelectedValue(
          "NO"
        );

        setNote(
          ""
        );


        setMessage(
          response.data?.message ||
            "Rework recorded successfully."
        );


      } catch (
        err
      ) {

        console.error(
          "OP40 REWORK ERROR:",
          err
        );


        setError(

          err.response
            ?.data
            ?.detail ||

          err.response
            ?.data
            ?.message ||

          err.message ||

          "Unable to record rework."
        );

      } finally {

        setWorking(
          false
        );
      }
    };


  /* =======================================================
     LOGOUT
     ======================================================= */

  const logout =
    () => {

      localStorage.removeItem(
        "operator_token"
      );

      localStorage.removeItem(
        "operator_id"
      );

      localStorage.removeItem(
        "operator_name"
      );

      localStorage.removeItem(
        "operator_station"
      );

      localStorage.removeItem(
        "operator_stage"
      );

      localStorage.removeItem(
        "operator_shift"
      );

      localStorage.removeItem(
        "op60_frame_id"
      );

      localStorage.removeItem(
        "op60_frame_no"
      );

      localStorage.removeItem(
        "op60_rework_source"
      );

      navigate(
        "/login"
      );
    };


  /* =======================================================
     LOADING SCREEN
     ======================================================= */

  if (
    loading
  ) {

    return (

      <div
        style={
          styles.page
        }
      >

        <div
          style={
            styles.loading
          }
        >
          Loading frame...
        </div>

      </div>
    );
  }


  /* =======================================================
     UI
     ======================================================= */

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

          <h1
            style={
              styles.headerTitle
            }
          >
            OP60 REWORK
          </h1>


          <p
            style={
              styles.headerSubtitle
            }
          >
            {
              localStorage.getItem(
                "operator_name"
              ) ||
              localStorage.getItem(
                "operator_id"
              ) ||
              "Operator"
            }
          </p>

        </div>


        <div
          style={
            styles.headerButtons
          }
        >

          <button
            type="button"
            style={
              styles.refreshButton
            }
            onClick={
              loadFrame
            }
            disabled={
              working
            }
          >
            ↻ REFRESH
          </button>


          <button
            type="button"
            style={
              styles.logoutButton
            }
            onClick={
              logout
            }
          >
            LOGOUT
          </button>

        </div>

      </header>


      <main
        style={
          styles.container
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
            ❌ {String(error)}
          </div>
        )}


        {/* =================================================
            SUCCESS
            ================================================= */}

        {message && (

          <div
            style={
              styles.success
            }
          >
            ✓ {String(message)}
          </div>
        )}


        {/* =================================================
            NO RECORD
            ================================================= */}

        {!record ? (

          <div
            style={
              styles.card
            }
          >

            <h2>
              No frame selected
            </h2>


            <button
              type="button"
              style={
                styles.primaryButton
              }
              onClick={() =>
                navigate(
                  "/records"
                )
              }
            >
              GO TO RECORDS
            </button>

          </div>

        ) : (

          <>

            {/* =============================================
                FRAME INFORMATION
                ============================================= */}

            <div
              style={
                styles.card
              }
            >

              <div
                style={
                  styles.frameHeader
                }
              >

                <div>

                  <h2
                    style={
                      styles.frameTitle
                    }
                  >
                    Frame No:{" "}
                    {
                      record.frame_no ||
                      "-"
                    }
                  </h2>


                  <p
                    style={
                      styles.meta
                    }
                  >
                    Date:{" "}
                    {
                      record.date ||
                      "-"
                    }

                    {"  |  "}

                    Shift:{" "}
                    {
                      record.shift ||
                      "-"
                    }
                  </p>

                </div>


                <div
                  style={{
                    ...styles.status,

                    ...(pendingNokCount >
                    0
                      ? styles.statusRed
                      : styles.statusGreen),
                  }}
                >

                  {
                    pendingNokCount >
                    0

                      ? `${pendingNokCount} ${
                          isPdiRework
                            ? "PDI NOK PENDING"
                            : "NOK PENDING"
                        }`

                      : isPdiRework
                      ? "PDI REWORK COMPLETED"
                      : "REWORK COMPLETED"
                  }

                </div>

              </div>


              <div
                style={
                  styles.infoBar
                }
              >

                {
                  pendingNokCount >
                  0

                    ? (

                      <>
                        <strong>
                          {
                            pendingNokCount
                          }
                        </strong>

                        {" "}
                        pending NOK
                        checkpoint
                        {
                          pendingNokCount ===
                          1
                            ? ""
                            : "s"
                        }

                        <span
                          style={
                            styles.infoText
                          }
                        >
                          {" "}
                          Click a red NO
                          to correct it.
                        </span>
                      </>

                    )

                    : (

                      <strong>
                        ✓{" "}
                        {
                          isPdiRework
                            ? "All PDI rework items have been completed."
                            : "All rework items have been completed."
                        }
                      </strong>
                    )
                }

              </div>

            </div>


            {/* =============================================
                PDI REWORK
                ============================================= */}

            {
              isPdiRework
                ? (

                  pdiPendingItems.length ===
                  0

                    ? (

                      <div
                        style={
                          styles.completedCard
                        }
                      >

                        <div
                          style={
                            styles.completedIcon
                          }
                        >
                          ✓
                        </div>


                        <h2
                          style={
                            styles.completedTitle
                          }
                        >
                          PDI Rework Completed
                        </h2>


                        <p
                          style={
                            styles.completedText
                          }
                        >
                          There are no pending PDI
                          NOK checkpoints for this
                          frame.
                        </p>

                      </div>

                    )

                    : (

                      <section
                        style={
                          styles.stageCard
                        }
                      >

                        <div
                          style={
                            styles.stageHeader
                          }
                        >

                          <div>

                            <div
                              style={
                                styles.stageLabel
                              }
                            >
                              PDI REWORK
                            </div>


                            <h2
                              style={
                                styles.stageTitle
                              }
                            >
                              PDI ST-3 / ST-4
                            </h2>

                          </div>


                          <span
                            style={
                              styles.stageStatus
                            }
                          >
                            {
                              pdiPendingItems.length
                            } NOK
                          </span>

                        </div>


                        <div
                          style={
                            styles.fieldList
                          }
                        >

                          {
                            pdiPendingItems.map(
                              (
                                item
                              ) => {

                                const selected =
                                  selectedItem?.type ===
                                    "PDI" &&
                                  selectedItem?.station ===
                                    item.station &&
                                  selectedItem?.checkpoint_id ===
                                    item.checkpoint_id;


                                return (

                                  <div
                                    key={
                                      `${item.station}-${item.checkpoint_id}`
                                    }
                                    style={{
                                      ...styles.nokWrapper,

                                      ...(selected
                                        ? styles.selectedWrapper
                                        : {}),
                                    }}
                                  >

                                    {/* =================================
                                        PDI NOK ROW
                                        ================================= */}

                                    <button
                                      type="button"
                                      disabled={
                                        working
                                      }
                                      onClick={() =>
                                        startPdiEdit(
                                          item
                                        )
                                      }
                                      style={{
                                        ...styles.nokRow,

                                        ...(selected
                                          ? styles.selectedNokRow
                                          : {}),
                                      }}
                                    >

                                      <div
                                        style={
                                          styles.nokFieldNameArea
                                        }
                                      >

                                        <span
                                          style={
                                            styles.fieldName
                                          }
                                        >

                                          {
                                            item.station ===
                                            "PDI_STATION_3"
                                              ? "PDI ST-3"
                                              : "PDI ST-4"
                                          }

                                          {" • "}

                                          {
                                            item.checkpoint ||
                                            item.checkpoint_id
                                          }

                                        </span>


                                        {
                                          item.criteria && (

                                            <span
                                              style={
                                                styles.criteria
                                              }
                                            >
                                              {
                                                item.criteria
                                              }
                                            </span>
                                          )
                                        }


                                        {
                                          item.method && (

                                            <span
                                              style={
                                                styles.method
                                              }
                                            >
                                              Method:{" "}
                                              {
                                                item.method
                                              }
                                            </span>
                                          )
                                        }

                                      </div>


                                      <div
                                        style={
                                          styles.nokRight
                                        }
                                      >

                                        <span
                                          style={
                                            styles.noBadge
                                          }
                                        >
                                          NO
                                        </span>


                                        <span
                                          style={
                                            styles.correctHint
                                          }
                                        >
                                          {
                                            selected
                                              ? "▲ CLOSE"
                                              : "CORRECT →"
                                          }
                                        </span>

                                      </div>

                                    </button>


                                    {/* =================================
                                        PDI REWORK CONTROLS
                                        ================================= */}

                                    {
                                      selected && (

                                        <div
                                          style={
                                            styles.expandedRework
                                          }
                                        >

                                          <div
                                            style={
                                              styles.reworkHeader
                                            }
                                          >

                                            <div>

                                              <div
                                                style={
                                                  styles.reworkTitle
                                                }
                                              >
                                                Correct PDI
                                                Checkpoint
                                              </div>


                                              <div
                                                style={
                                                  styles.reworkCheckpoint
                                                }
                                              >
                                                {
                                                  item.checkpoint ||
                                                  item.checkpoint_id
                                                }
                                              </div>


                                              <div
                                                style={
                                                  styles.reworkSubTitle
                                                }
                                              >
                                                {
                                                  item.station
                                                }
                                              </div>

                                            </div>


                                            <span
                                              style={
                                                styles.originalBadge
                                              }
                                            >
                                              ORIGINAL: NO
                                            </span>

                                          </div>


                                          <div
                                            style={
                                              styles.reworkControls
                                            }
                                          >

                                            <div
                                              style={
                                                styles.controlGroup
                                              }
                                            >

                                              <label
                                                style={
                                                  styles.controlLabel
                                                }
                                              >
                                                After Rework
                                              </label>


                                              <div
                                                style={
                                                  styles.resultButtons
                                                }
                                              >

                                                <button
                                                  type="button"
                                                  disabled={
                                                    working
                                                  }
                                                  onClick={() =>
                                                    setSelectedValue(
                                                      "YES"
                                                    )
                                                  }
                                                  style={{
                                                    ...styles.resultButton,

                                                    ...(selectedValue ===
                                                    "YES"
                                                      ? styles.yesSelected
                                                      : {}),
                                                  }}
                                                >
                                                  ✓ YES
                                                </button>


                                                <button
                                                  type="button"
                                                  disabled={
                                                    working
                                                  }
                                                  onClick={() =>
                                                    setSelectedValue(
                                                      "NO"
                                                    )
                                                  }
                                                  style={{
                                                    ...styles.resultButton,

                                                    ...(selectedValue ===
                                                    "NO"
                                                      ? styles.noSelected
                                                      : {}),
                                                  }}
                                                >
                                                  NO
                                                </button>

                                              </div>

                                            </div>


                                            {
                                              selectedValue ===
                                              "YES" && (

                                                <div
                                                  style={
                                                    styles.remarkGroup
                                                  }
                                                >

                                                  <label
                                                    style={
                                                      styles.controlLabel
                                                    }
                                                  >
                                                    Rework Remark
                                                  </label>


                                                  <textarea
                                                    value={
                                                      note
                                                    }
                                                    onChange={(
                                                      e
                                                    ) =>
                                                      setNote(
                                                        e.target.value
                                                      )
                                                    }
                                                    rows={
                                                      3
                                                    }
                                                    disabled={
                                                      working
                                                    }
                                                    placeholder="Enter reason / action taken..."
                                                    style={
                                                      styles.remarkInput
                                                    }
                                                  />

                                                </div>
                                              )
                                            }

                                          </div>


                                          <div
                                            style={
                                              styles.reworkFooter
                                            }
                                          >

                                            <button
                                              type="button"
                                              disabled={
                                                working
                                              }
                                              onClick={() => {

                                                setSelectedItem(
                                                  null
                                                );

                                                setSelectedValue(
                                                  "NO"
                                                );

                                                setNote(
                                                  ""
                                                );

                                              }}
                                              style={
                                                styles.cancelButton
                                              }
                                            >
                                              CANCEL
                                            </button>


                                            <button
                                              type="button"
                                              disabled={
                                                working ||
                                                selectedValue !==
                                                  "YES"
                                              }
                                              onClick={
                                                saveRework
                                              }
                                              style={{
                                                ...styles.saveButton,

                                                ...(working ||
                                                selectedValue !==
                                                  "YES"
                                                  ? styles.disabledButton
                                                  : {}),
                                              }}
                                            >
                                              {
                                                working
                                                  ? "SAVING..."
                                                  : "✓ SAVE REWORK"
                                              }
                                            </button>

                                          </div>

                                        </div>
                                      )
                                    }

                                  </div>
                                );
                              }
                            )
                          }

                        </div>

                      </section>
                    )

                )
                : (

                  /* =============================================
                     OP40 REWORK
                     ============================================= */

                  op40PendingItems.length ===
                  0

                    ? (

                      <div
                        style={
                          styles.completedCard
                        }
                      >

                        <div
                          style={
                            styles.completedIcon
                          }
                        >
                          ✓
                        </div>


                        <h2
                          style={
                            styles.completedTitle
                          }
                        >
                          Rework Completed
                        </h2>


                        <p
                          style={
                            styles.completedText
                          }
                        >
                          There are no pending NOK
                          checkpoints for this frame.
                        </p>

                      </div>

                    )

                    : (

                      <section
                        style={
                          styles.stageCard
                        }
                      >

                        <div
                          style={
                            styles.stageHeader
                          }
                        >

                          <div>

                            <div
                              style={
                                styles.stageLabel
                              }
                            >
                              OP40 REWORK
                            </div>


                            <h2
                              style={
                                styles.stageTitle
                              }
                            >
                              Pending NOK
                            </h2>

                          </div>


                          <span
                            style={
                              styles.stageStatus
                            }
                          >
                            {
                              op40PendingItems.length
                            } NOK
                          </span>

                        </div>


                        <div
                          style={
                            styles.fieldList
                          }
                        >

                          {
                            op40PendingItems.map(
                              (
                                item
                              ) => {

                                const selected =
                                  selectedItem?.type ===
                                    "OP40" &&
                                  selectedItem?.stage ===
                                    item.stage &&
                                  selectedItem?.sheet ===
                                    item.sheet &&
                                  selectedItem?.field ===
                                    item.field;


                                return (

                                  <div
                                    key={
                                      `${item.stage}-${item.sheet}-${item.field}`
                                    }
                                    style={{
                                      ...styles.nokWrapper,

                                      ...(selected
                                        ? styles.selectedWrapper
                                        : {}),
                                    }}
                                  >

                                    <button
                                      type="button"
                                      disabled={
                                        working
                                      }
                                      onClick={() =>
                                        startOp40Edit(
                                          item
                                        )
                                      }
                                      style={{
                                        ...styles.nokRow,

                                        ...(selected
                                          ? styles.selectedNokRow
                                          : {}),
                                      }}
                                    >

                                      <div
                                        style={
                                          styles.nokFieldNameArea
                                        }
                                      >

                                        <span
                                          style={
                                            styles.fieldName
                                          }
                                        >

                                          {
                                            item.stage
                                          }

                                          {" • "}

                                          {
                                            SHEET_NAMES[
                                              item.sheet
                                            ] ||
                                            item.sheet
                                          }

                                          {" • "}

                                          {
                                            getFieldLabel(
                                              item.field
                                            )
                                          }

                                        </span>

                                      </div>


                                      <div
                                        style={
                                          styles.nokRight
                                        }
                                      >

                                        <span
                                          style={
                                            styles.noBadge
                                          }
                                        >
                                          NO
                                        </span>


                                        <span
                                          style={
                                            styles.correctHint
                                          }
                                        >
                                          {
                                            selected
                                              ? "▲ CLOSE"
                                              : "CORRECT →"
                                          }
                                        </span>

                                      </div>

                                    </button>


                                    {
                                      selected && (

                                        <div
                                          style={
                                            styles.expandedRework
                                          }
                                        >

                                          <div
                                            style={
                                              styles.reworkHeader
                                            }
                                          >

                                            <div>

                                              <div
                                                style={
                                                  styles.reworkTitle
                                                }
                                              >
                                                Correct
                                                Checkpoint
                                              </div>


                                              <div
                                                style={
                                                  styles.reworkCheckpoint
                                                }
                                              >
                                                {
                                                  getFieldLabel(
                                                    item.field
                                                  )
                                                }
                                              </div>


                                              <div
                                                style={
                                                  styles.reworkSubTitle
                                                }
                                              >
                                                {
                                                  SHEET_NAMES[
                                                    item.sheet
                                                  ] ||
                                                  item.sheet
                                                }

                                                {" • "}

                                                {
                                                  item.stage
                                                }
                                              </div>

                                            </div>


                                            <span
                                              style={
                                                styles.originalBadge
                                              }
                                            >
                                              ORIGINAL: NO
                                            </span>

                                          </div>


                                          <div
                                            style={
                                              styles.reworkControls
                                            }
                                          >

                                            <div
                                              style={
                                                styles.controlGroup
                                              }
                                            >

                                              <label
                                                style={
                                                  styles.controlLabel
                                                }
                                              >
                                                After Rework
                                              </label>


                                              <div
                                                style={
                                                  styles.resultButtons
                                                }
                                              >

                                                <button
                                                  type="button"
                                                  disabled={
                                                    working
                                                  }
                                                  onClick={() =>
                                                    setSelectedValue(
                                                      "YES"
                                                    )
                                                  }
                                                  style={{
                                                    ...styles.resultButton,

                                                    ...(selectedValue ===
                                                    "YES"
                                                      ? styles.yesSelected
                                                      : {}),
                                                  }}
                                                >
                                                  ✓ YES
                                                </button>


                                                <button
                                                  type="button"
                                                  disabled={
                                                    working
                                                  }
                                                  onClick={() =>
                                                    setSelectedValue(
                                                      "NO"
                                                    )
                                                  }
                                                  style={{
                                                    ...styles.resultButton,

                                                    ...(selectedValue ===
                                                    "NO"
                                                      ? styles.noSelected
                                                      : {}),
                                                  }}
                                                >
                                                  NO
                                                </button>

                                              </div>

                                            </div>


                                            {
                                              selectedValue ===
                                              "YES" && (

                                                <div
                                                  style={
                                                    styles.remarkGroup
                                                  }
                                                >

                                                  <label
                                                    style={
                                                      styles.controlLabel
                                                    }
                                                  >
                                                    Rework Remark
                                                  </label>


                                                  <textarea
                                                    value={
                                                      note
                                                    }
                                                    onChange={(
                                                      e
                                                    ) =>
                                                      setNote(
                                                        e.target.value
                                                      )
                                                    }
                                                    rows={
                                                      3
                                                    }
                                                    disabled={
                                                      working
                                                    }
                                                    placeholder="Enter reason / action taken..."
                                                    style={
                                                      styles.remarkInput
                                                    }
                                                  />

                                                </div>
                                              )
                                            }

                                          </div>


                                          <div
                                            style={
                                              styles.reworkFooter
                                            }
                                          >

                                            <button
                                              type="button"
                                              disabled={
                                                working
                                              }
                                              onClick={() => {

                                                setSelectedItem(
                                                  null
                                                );

                                                setSelectedValue(
                                                  "NO"
                                                );

                                                setNote(
                                                  ""
                                                );

                                              }}
                                              style={
                                                styles.cancelButton
                                              }
                                            >
                                              CANCEL
                                            </button>


                                            <button
                                              type="button"
                                              disabled={
                                                working ||
                                                selectedValue !==
                                                  "YES"
                                              }
                                              onClick={
                                                saveRework
                                              }
                                              style={{
                                                ...styles.saveButton,

                                                ...(working ||
                                                selectedValue !==
                                                  "YES"
                                                  ? styles.disabledButton
                                                  : {}),
                                              }}
                                            >
                                              {
                                                working
                                                  ? "SAVING..."
                                                  : "✓ SAVE REWORK"
                                              }
                                            </button>

                                          </div>

                                        </div>
                                      )
                                    }

                                  </div>
                                );
                              }
                            )
                          }

                        </div>

                      </section>
                    )
                )
            }

          </>
        )}

      </main>

    </div>
  );
}


/* =========================================================
   STYLES
   ========================================================= */

const styles = {

  page: {
    minHeight:
      "100vh",
    background:
      "#eef3f8",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color:
      "#0f172a",
  },

  loading: {
    minHeight:
      "100vh",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    fontSize:
      "20px",
    fontWeight:
      "700",
  },

  header: {
    background:
      "#172963",
    color:
      "#ffffff",
    padding:
      "20px 38px",
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "20px",
  },

  headerTitle: {
    margin:
      0,
    fontSize:
      "27px",
    fontWeight:
      "800",
    letterSpacing:
      "0.7px",
  },

  headerSubtitle: {
    margin:
      "7px 0 0",
    color:
      "#dbeafe",
    fontSize:
      "14px",
  },

  headerButtons: {
    display:
      "flex",
    gap:
      "10px",
  },

  refreshButton: {
    border:
      "1px solid rgba(255,255,255,0.3)",
    background:
      "rgba(255,255,255,0.08)",
    color:
      "#ffffff",
    padding:
      "11px 17px",
    borderRadius:
      "8px",
    fontWeight:
      "800",
    cursor:
      "pointer",
  },

  logoutButton: {
    border:
      "none",
    background:
      "#ef4444",
    color:
      "#ffffff",
    padding:
      "11px 17px",
    borderRadius:
      "8px",
    fontWeight:
      "800",
    cursor:
      "pointer",
  },

  container: {
    maxWidth:
      "1180px",
    margin:
      "0 auto",
    padding:
      "30px 22px 55px",
  },

  card: {
    background:
      "#ffffff",
    borderRadius:
      "15px",
    padding:
      "25px",
    marginBottom:
      "20px",
    boxShadow:
      "0 4px 18px rgba(15,23,42,0.08)",
  },

  frameHeader: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "20px",
    flexWrap:
      "wrap",
  },

  frameTitle: {
    margin:
      0,
    fontSize:
      "26px",
    fontWeight:
      "800",
  },

  meta: {
    margin:
      "8px 0 0",
    color:
      "#64748b",
    fontSize:
      "16px",
  },

  status: {
    padding:
      "11px 17px",
    borderRadius:
      "25px",
    fontSize:
      "13px",
    fontWeight:
      "800",
    whiteSpace:
      "nowrap",
  },

  statusRed: {
    background:
      "#fee2e2",
    color:
      "#b91c1c",
  },

  statusGreen: {
    background:
      "#dcfce7",
    color:
      "#166534",
  },

  infoBar: {
    marginTop:
      "18px",
    padding:
      "14px 16px",
    border:
      "1px solid #e2e8f0",
    background:
      "#f8fafc",
    borderRadius:
      "10px",
    fontSize:
      "15px",
  },

  infoText: {
    color:
      "#64748b",
  },

  error: {
    background:
      "#fee2e2",
    color:
      "#991b1b",
    border:
      "1px solid #fecaca",
    padding:
      "14px 16px",
    borderRadius:
      "10px",
    marginBottom:
      "15px",
    fontWeight:
      "700",
  },

  success: {
    background:
      "#dcfce7",
    color:
      "#166534",
    border:
      "1px solid #bbf7d0",
    padding:
      "14px 16px",
    borderRadius:
      "10px",
    marginBottom:
      "15px",
    fontWeight:
      "700",
  },

  completedCard: {
    background:
      "#ffffff",
    borderRadius:
      "15px",
    padding:
      "60px 30px",
    textAlign:
      "center",
    boxShadow:
      "0 4px 18px rgba(15,23,42,0.08)",
  },

  completedIcon: {
    width:
      "62px",
    height:
      "62px",
    borderRadius:
      "50%",
    background:
      "#dcfce7",
    color:
      "#15803d",
    margin:
      "0 auto 18px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    fontSize:
      "32px",
    fontWeight:
      "900",
  },

  completedTitle: {
    margin:
      "0 0 9px",
    fontSize:
      "27px",
    color:
      "#166534",
  },

  completedText: {
    margin:
      0,
    color:
      "#64748b",
    fontSize:
      "16px",
  },

  stageCard: {
    background:
      "#ffffff",
    borderRadius:
      "15px",
    overflow:
      "hidden",
    boxShadow:
      "0 4px 18px rgba(15,23,42,0.08)",
  },

  stageHeader: {
    background:
      "#172963",
    color:
      "#ffffff",
    padding:
      "22px 27px",
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "20px",
  },

  stageLabel: {
    fontSize:
      "12px",
    fontWeight:
      "800",
    letterSpacing:
      "1.4px",
    color:
      "#bfdbfe",
  },

  stageTitle: {
    margin:
      "5px 0 0",
    fontSize:
      "28px",
  },

  stageStatus: {
    background:
      "#fee2e2",
    color:
      "#991b1b",
    padding:
      "10px 15px",
    borderRadius:
      "25px",
    fontWeight:
      "900",
    whiteSpace:
      "nowrap",
  },

  fieldList: {
    padding:
      "15px",
  },

  nokWrapper: {
    marginBottom:
      "10px",
    border:
      "1px solid #fecaca",
    borderRadius:
      "11px",
    overflow:
      "hidden",
    background:
      "#fff8f8",
  },

  selectedWrapper: {
    border:
      "1px solid #2563eb",
    boxShadow:
      "0 0 0 2px rgba(37,99,235,0.1)",
  },

  nokRow: {
    width:
      "100%",
    border:
      "none",
    background:
      "transparent",
    minHeight:
      "70px",
    padding:
      "16px 18px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "20px",
    cursor:
      "pointer",
    textAlign:
      "left",
  },

  selectedNokRow: {
    background:
      "#eff6ff",
  },

  nokFieldNameArea: {
    flex:
      1,
    minWidth:
      0,
  },

  fieldName: {
    display:
      "block",
    color:
      "#172554",
    fontSize:
      "17px",
    fontWeight:
      "800",
    lineHeight:
      "1.4",
  },

  criteria: {
    display:
      "block",
    marginTop:
      "5px",
    color:
      "#64748b",
    fontSize:
      "14px",
    lineHeight:
      "1.45",
  },

  method: {
    display:
      "block",
    marginTop:
      "5px",
    color:
      "#94a3b8",
    fontSize:
      "13px",
  },

  nokRight: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "13px",
    flexShrink:
      0,
  },

  noBadge: {
    background:
      "#dc2626",
    color:
      "#ffffff",
    padding:
      "7px 11px",
    borderRadius:
      "7px",
    fontSize:
      "13px",
    fontWeight:
      "900",
  },

  correctHint: {
    color:
      "#2563eb",
    fontSize:
      "13px",
    fontWeight:
      "800",
  },

  expandedRework: {
    background:
      "#ffffff",
    borderTop:
      "1px solid #bfdbfe",
    padding:
      "20px",
  },

  reworkHeader: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    gap:
      "20px",
    flexWrap:
      "wrap",
    marginBottom:
      "20px",
  },

  reworkTitle: {
    color:
      "#64748b",
    fontSize:
      "12px",
    fontWeight:
      "800",
    letterSpacing:
      "0.6px",
    textTransform:
      "uppercase",
  },

  reworkCheckpoint: {
    marginTop:
      "5px",
    color:
      "#0f172a",
    fontSize:
      "20px",
    fontWeight:
      "800",
  },

  reworkSubTitle: {
    marginTop:
      "5px",
    color:
      "#64748b",
    fontSize:
      "13px",
  },

  originalBadge: {
    background:
      "#fee2e2",
    color:
      "#991b1b",
    border:
      "1px solid #fecaca",
    padding:
      "8px 12px",
    borderRadius:
      "8px",
    fontSize:
      "12px",
    fontWeight:
      "800",
    whiteSpace:
      "nowrap",
  },

  reworkControls: {
    display:
      "flex",
    gap:
      "24px",
    alignItems:
      "flex-start",
    flexWrap:
      "wrap",
  },

  controlGroup: {
    minWidth:
      "220px",
  },

  controlLabel: {
    display:
      "block",
    marginBottom:
      "9px",
    color:
      "#334155",
    fontSize:
      "13px",
    fontWeight:
      "800",
  },

  resultButtons: {
    display:
      "flex",
    gap:
      "9px",
  },

  resultButton: {
    minWidth:
      "85px",
    padding:
      "10px 17px",
    border:
      "1px solid #cbd5e1",
    borderRadius:
      "8px",
    background:
      "#ffffff",
    color:
      "#334155",
    fontWeight:
      "800",
    cursor:
      "pointer",
  },

  yesSelected: {
    background:
      "#16a34a",
    border:
      "1px solid #16a34a",
    color:
      "#ffffff",
  },

  noSelected: {
    background:
      "#fee2e2",
    border:
      "1px solid #dc2626",
    color:
      "#991b1b",
  },

  remarkGroup: {
    flex:
      "1 1 380px",
    minWidth:
      "300px",
  },

  remarkInput: {
    width:
      "100%",
    boxSizing:
      "border-box",
    padding:
      "11px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius:
      "8px",
    resize:
      "vertical",
    fontFamily:
      "Arial, sans-serif",
    fontSize:
      "14px",
    outline:
      "none",
  },

  reworkFooter: {
    display:
      "flex",
    justifyContent:
      "flex-end",
    gap:
      "10px",
    marginTop:
      "20px",
    paddingTop:
      "16px",
    borderTop:
      "1px solid #e2e8f0",
  },

  cancelButton: {
    border:
      "none",
    background:
      "#64748b",
    color:
      "#ffffff",
    padding:
      "11px 18px",
    borderRadius:
      "8px",
    fontWeight:
      "800",
    cursor:
      "pointer",
  },

  saveButton: {
    border:
      "none",
    background:
      "#2563eb",
    color:
      "#ffffff",
    padding:
      "11px 19px",
    borderRadius:
      "8px",
    fontWeight:
      "800",
    cursor:
      "pointer",
  },

  disabledButton: {
    opacity:
      0.5,
    cursor:
      "not-allowed",
  },

  primaryButton: {
    border:
      "none",
    background:
      "#2563eb",
    color:
      "#ffffff",
    padding:
      "11px 18px",
    borderRadius:
      "8px",
    fontWeight:
      "800",
    cursor:
      "pointer",
  },
};


export default OP60Page;
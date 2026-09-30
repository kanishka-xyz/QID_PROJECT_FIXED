import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

const API = "http://localhost:8000";
const GAUGE_DEFINITIONS = [
  {
    sr_no: 1,
    checkpoint:
      "Check CM2 & CM3 mounting hole threading",
    position:
      "RM side(bottom)/ TOP",
    station: "PDI",
    frequency: 1,
    criteria:
      "M6 x 1.0 - 6H",
    specification:
      "M6 x 1.0 - 6H",
    no_of_holes:
      "CM2-4H, CM3-6H",
    method: "TPG",
    confirmation_marking:
      ". (RM side)",
  },

  {
    sr_no: 2,
    checkpoint:
      "Check LH/RH/Front/Rear member mounting hole diameter (Each members corners 1-1 hole)",
    position: "Top",
    station: "PDI",
    frequency: 1,
    criteria:
      "22.0 +0.2 mm",
    specification:
      "22.0 +0.2 mm",
    no_of_holes:
      "LH-02, RH-02, FM-02, RM-02",
    method: "PPG",
    confirmation_marking:
      ".",
  },

  {
    sr_no: 3,
    checkpoint:
      "Check LH/RH/Front/Rear member mounting hole diameter (Each members corners 1-1 hole)",
    position: "Top",
    station: "PDI",
    frequency: 1,
    criteria:
      "18.0 +0.2 mm",
    specification:
      "18.0 +0.2 mm",
    no_of_holes:
      "LH-02, RH-02, FM-02, RM-02",
    method: "PPG",
    confirmation_marking:
      ".",
  },

  {
    sr_no: 4,
    checkpoint:
      "Check BDU boss hole threading (Both side checking)",
    position: "Top",
    station: "PDI",
    frequency: 1,
    criteria:
      "M6 x 1.0 - 6H",
    specification:
      "M6 x 1.0 - 6H",
    no_of_holes:
      "3H",
    method: "TPG",
    confirmation_marking:
      ".",
  },

  {
    sr_no: 5,
    checkpoint:
      "Check front member hole threading",
    position: "Top",
    station: "PDI",
    frequency: 1,
    criteria:
      "M5 x 0.8 - 6H",
    specification:
      "M5 x 0.8 - 6H",
    no_of_holes:
      "5H",
    method: "TPG",
    confirmation_marking:
      "",
  },

  {
    sr_no: 6,
    checkpoint:
      "Check front member hole threading (Check weld side hole)",
    position: "Top",
    station: "PDI",
    frequency: 1,
    criteria:
      "M6 x 1.0 - 6H",
    specification:
      "M6 x 1.0 - 6H",
    no_of_holes:
      "16H",
    method: "TPG",
    confirmation_marking:
      "No marking",
  },

  {
    sr_no: 7,
    checkpoint:
      "CM3 & CM4 hole threading (Module plate fitment hole)",
    position: "Top",
    station: "PDI",
    frequency: 1,
    criteria:
      "M6 x 1.0 - 6H",
    specification:
      "M6 x 1.0 - 6H",
    no_of_holes:
      "CM2-8H, CM3-, CM4",
    method: "TPG",
    confirmation_marking:
      ". (side)",
  },

  {
    sr_no: 8,
    checkpoint:
      "Centre member BDU Bracket fitment Centre member to rear member",
    position: "Top",
    station: "PDI",
    frequency: 1,
    criteria:
      "As per SOP",
    specification:
      "As per SOP",
    no_of_holes:
      "",
    method:
      "BDU bracket",
    confirmation_marking:
      "✔",
  },

  {
    sr_no: 9,
    checkpoint:
      "Check Center member sleeve thread from Top side",
    position: "Top",
    station: "PDI",
    frequency: 1,
    criteria:
      "M22.0 x 2.0 - 6H",
    specification:
      "M22.0 x 2.0 - 6H",
    no_of_holes:
      "4H",
    method:
      "Sleeve matting bolt",
    confirmation_marking:
      ". 4 sleeve",
  },
];

function PDIPage({ navigate, station }) {
  const [queue, setQueue] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [record, setRecord] = useState(null);

  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passing, setPassing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [inspectionTab, setInspectionTab] = useState("PDI");
  const [gaugeDefinitions, setGaugeDefinitions] = useState([]);

  // =====================================================
  // AUTH
  // =====================================================

  const token = localStorage.getItem("operator_token");

  const operatorInfo = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("operator_info") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  const operatorName =
    localStorage.getItem("operator_name") ||
    operatorInfo?.name ||
    "";

  const operatorStation =
    operatorInfo?.station ||
    localStorage.getItem("operator_station") ||
    station ||
    "";

  const stationKey = String(
    operatorStation || station || ""
  )
    .trim()
    .toUpperCase();

  const currentStation =
    stationKey === "PDI_STATION_4"
      ? {
          number: "4",
          title: "PDI STATION 4",
          subtitle: "Final Inspection Station 4",
        }
      : {
          number: "3",
          title: "PDI STATION 3",
          subtitle: "Final Inspection Station 3",
        };

  const isStation3 =
    stationKey === "PDI_STATION_3";

  const stationMismatch =
    operatorStation &&
    String(operatorStation)
      .trim()
      .toUpperCase() !== stationKey;

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
  });

  // =====================================================
  // HELPERS
  // =====================================================

  const getErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map(
          (item) =>
            item?.msg || "Validation error"
        )
        .join(", ");
    }

    if (
      detail &&
      typeof detail === "object"
    ) {
      return (
        detail?.message ||
        detail?.msg ||
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

  const getQueueRecordId = (item) =>
    String(
      item?.record_id ||
        item?._id ||
        item?.id ||
        item?.inspection_id ||
        ""
    );

  const getQueueFrameNumber = (item) =>
    item?.frame_no ||
    item?.frame_number ||
    item?.frame ||
    "-";

  const getQueueStatus = (item) =>
    item?.pdi?.stations?.[stationKey]?.status ||
    item?.status ||
    item?.overall_status ||
    "WAITING";

  const getUrlRecordId = () => {
    try {
      const params =
        new URLSearchParams(
          window.location.search
        );

      return (
        params.get("record_id") ||
        params.get("frame") ||
        params.get("id") ||
        ""
      );
    } catch {
      return "";
    }
  };

  const setUrlRecordId = (recordId) => {
    try {
      const url = new URL(
        window.location.href
      );

      if (recordId) {
        url.searchParams.set(
          "record_id",
          String(recordId)
        );
      } else {
        url.searchParams.delete(
          "record_id"
        );
        url.searchParams.delete(
          "frame"
        );
        url.searchParams.delete(
          "id"
        );
      }

      window.history.replaceState(
        {},
        "",
        url.toString()
      );
    } catch {
      // Ignore URL errors.
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    [
      "operator_token",
      "operator_id",
      "operator_name",
      "operator_station",
      "operator_stage",
      "operator_shift",
      "operator_info",
      "op40_operator",
      "op60_operator",
    ].forEach((key) =>
      localStorage.removeItem(key)
    );

    navigate("/login");
  };

  // =====================================================
  // LOAD QUEUE
  // =====================================================

  const loadQueue = async () => {
    try {
      setLoadingQueue(true);
      setError("");

      const response = await axios.get(
        `${API}/pdi/queue`,
        {
          headers: getHeaders(),
          params: {
            station: stationKey,
          },
        }
      );

      const data = response.data;

      let items = [];

      if (Array.isArray(data)) {
        items = data;
      } else if (
        Array.isArray(data?.queue)
      ) {
        items = data.queue;
      } else if (
        Array.isArray(data?.records)
      ) {
        items = data.records;
      } else if (
        Array.isArray(data?.items)
      ) {
        items = data.items;
      }

      setQueue(items);

      const requestedId =
        getUrlRecordId();

      const requestedItem = requestedId
        ? items.find(
            (item) =>
              String(
                getQueueRecordId(item)
              ) === String(requestedId)
          )
        : null;

      if (requestedItem) {
        const id =
          getQueueRecordId(
            requestedItem
          );

        setSelectedRecordId(id);
        setUrlRecordId(id);
      } else if (
        !requestedId &&
        !selectedRecordId
      ) {
        setRecord(null);
      }
    } catch (err) {
      console.error(
        "PDI queue error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load PDI queue."
        )
      );
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadQueue();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationKey, token]);

  // =====================================================
  // START PDI
  // =====================================================

  const startPDI = async (recordId) => {
    try {
      setLoadingRecord(true);
      setError("");
      setSuccess("");

      const response =
        await axios.post(
          `${API}/pdi/start`,
          {
            record_id: recordId,
          },
          {
            headers: getHeaders(),
          }
        );

      setRecord(
        response.data
      );

      return response.data;
    } catch (err) {
      console.error(
        "PDI start error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to start PDI for this frame."
        )
      );

      return null;
    } finally {
      setLoadingRecord(false);
    }
  };

  // =====================================================
  // LOAD FRAME
  // =====================================================

  const loadFrame = async (recordId) => {
    try {
      setLoadingRecord(true);
      setError("");

      const response =
        await axios.get(
          `${API}/pdi/frame/${encodeURIComponent(
            recordId
          )}`,
          {
            headers: getHeaders(),
          }
        );

      setRecord(
        response.data
      );
    } catch (err) {
      console.error(
        "PDI frame error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load this frame."
        )
      );
    } finally {
      setLoadingRecord(false);
    }
  };

  useEffect(() => {
    if (!selectedRecordId) {
      setRecord(null);
      return;
    }

    setInspectionTab("PDI");

    const initializeFrame =
      async () => {
        await startPDI(
          selectedRecordId
        );

        await loadFrame(
          selectedRecordId
        );
      };

    initializeFrame();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecordId]);

  // =====================================================
  // LOAD GAUGE DEFINITIONS
  // =====================================================
  // =====================================================
// GAUGE CHECKLIST
// =====================================================

useEffect(() => {
  if (!isStation3) {
    setGaugeDefinitions([]);
    return;
  }

  // Use the actual 9 Gauge checkpoints.
  // API is optional; frontend definitions are the fallback.
  setGaugeDefinitions(
    GAUGE_DEFINITIONS
  );

  const loadGaugeDefinitions =
    async () => {
      try {
        const response =
          await axios.get(
            `${API}/pdi/gauge-checklists`,
            {
              headers:
                getHeaders(),
            }
          );

        const apiDefinitions =
          Array.isArray(
            response?.data
              ?.checkpoints
          )
            ? response.data
                .checkpoints
            : [];

        // Only replace the fallback
        // when backend actually returns
        // valid Gauge definitions.
        if (
          apiDefinitions.length > 0
        ) {
          setGaugeDefinitions(
            apiDefinitions
          );
        }
      } catch (err) {
        console.warn(
          "Gauge API unavailable. Using frontend Gauge definitions.",
          err
        );

        // Keep GAUGE_DEFINITIONS
        // as fallback.
        setGaugeDefinitions(
          GAUGE_DEFINITIONS
        );
      }
    };

  loadGaugeDefinitions();

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  stationKey,
  isStation3,
]);

  // =====================================================
  // PDI DATA
  // =====================================================

  const pdi =
    record?.pdi || {};

  const stationData =
    pdi?.stations?.[
      stationKey
    ] ||
    pdi?.[stationKey] ||
    {};

  // =====================================================
  // NORMAL PDI CHECKPOINTS
  // =====================================================

  const checkpoints =
    useMemo(() => {
      const raw =
        stationData?.checkpoints;

      if (Array.isArray(raw)) {
        return raw;
      }

      if (
        raw &&
        typeof raw === "object"
      ) {
        return Object.entries(
          raw
        ).map(
          ([key, value]) => ({
            ...(value || {}),
            checkpoint_id:
              value?.checkpoint_id ||
              value?.id ||
              key,
          })
        );
      }

      return [];
    }, [stationData]);

  const getCheckpointValue = (
    checkpoint
  ) => {
    if (
      checkpoint?.value === "YES" ||
      checkpoint?.value === "NO"
    ) {
      return checkpoint.value;
    }

    if (
      checkpoint?.status === "YES" ||
      checkpoint?.status === "NO"
    ) {
      return checkpoint.status;
    }

    return "";
  };

  // =====================================================
  // GAUGE CHECKPOINTS
  // =====================================================

  const gaugeCheckpoints =
    useMemo(() => {
      if (!isStation3) {
        return [];
      }

      const raw =
        stationData
          ?.gauge_checkpoints;

      const saved = [];

      if (Array.isArray(raw)) {
        raw.forEach(
          (item, index) => {
            if (!item) {
              return;
            }

            saved.push({
              ...item,
              checkpoint_id:
                item?.checkpoint_id ||
                item?.id ||
                `GAUGE_CP_${
                  item?.sr_no ||
                  index + 1
                }`,
            });
          }
        );
      } else if (
        raw &&
        typeof raw === "object"
      ) {
        Object.entries(
          raw
        ).forEach(
          ([key, value]) => {
            saved.push({
              ...(value || {}),
              checkpoint_id:
                value
                  ?.checkpoint_id ||
                value?.id ||
                key,
            });
          }
        );
      }

      const savedMap =
        new Map(
          saved.map(
            (item) => [
              String(
                item.checkpoint_id
              ),
              item,
            ]
          )
        );

      return gaugeDefinitions
        .map(
          (definition) => {
            const checkpointId =
              `GAUGE_CP_${definition?.sr_no}`;

            return {
              ...definition,
              ...(savedMap.get(
                checkpointId
              ) || {}),
              checkpoint_id:
                checkpointId,
            };
          }
        )
        .sort(
          (a, b) =>
            Number(
              a?.sr_no || 0
            ) -
            Number(
              b?.sr_no || 0
            )
        );
    }, [
      stationData,
      gaugeDefinitions,
      isStation3,
    ]);

  const getGaugeCheckpointValue =
    (checkpoint) => {
      if (
        checkpoint?.value ===
          "YES" ||
        checkpoint?.value ===
          "NO"
      ) {
        return checkpoint.value;
      }

      if (
        checkpoint?.status ===
          "YES" ||
        checkpoint?.status ===
          "NO"
      ) {
        return checkpoint.status;
      }

      return "";
    };

  // =====================================================
  // STATUS
  // =====================================================

  const stationStatus =
    stationData?.status ||
    "WAITING";

  const isStationCompleted =
    stationStatus ===
    "PASSED";

  // =====================================================
  // NORMAL PDI COUNTS
  // =====================================================

  const totalCheckpoints =
    checkpoints.length;

  const answeredCheckpoints =
    checkpoints.filter(
      (cp) => {
        const value =
          getCheckpointValue(cp);

        return (
          value === "YES" ||
          value === "NO"
        );
      }
    ).length;

  const yesCount =
    checkpoints.filter(
      (cp) =>
        getCheckpointValue(
          cp
        ) === "YES"
    ).length;

  const nokCount =
    checkpoints.filter(
      (cp) =>
        getCheckpointValue(
          cp
        ) === "NO"
    ).length;

  const pendingCount =
    totalCheckpoints -
    answeredCheckpoints;

  const progress =
    totalCheckpoints > 0
      ? Math.round(
          (answeredCheckpoints /
            totalCheckpoints) *
            100
        )
      : 0;

  // =====================================================
  // GAUGE COUNTS
  // =====================================================

  const gaugeTotal =
    gaugeCheckpoints.length;

  const gaugeAnswered =
    gaugeCheckpoints.filter(
      (cp) => {
        const value =
          getGaugeCheckpointValue(
            cp
          );

        return (
          value === "YES" ||
          value === "NO"
        );
      }
    ).length;

  const gaugeYesCount =
    gaugeCheckpoints.filter(
      (cp) =>
        getGaugeCheckpointValue(
          cp
        ) === "YES"
    ).length;

  const gaugeNokCount =
    gaugeCheckpoints.filter(
      (cp) =>
        getGaugeCheckpointValue(
          cp
        ) === "NO"
    ).length;

  const gaugePendingCount =
    gaugeTotal -
    gaugeAnswered;

  // =====================================================
  // GAUGE REQUIRED
  // =====================================================

  const gaugeReadyForPass =
    !isStation3 ||
    (
      gaugeTotal > 0 &&
      gaugeAnswered ===
        gaugeTotal
    );

  // =====================================================
  // CAN PASS
  // =====================================================

  const canPass =
    totalCheckpoints > 0 &&
    answeredCheckpoints ===
      totalCheckpoints &&
    gaugeReadyForPass &&
    !isStationCompleted &&
    !stationMismatch &&
    !saving &&
    !passing;

  // =====================================================
  // SAVE NORMAL PDI CHECKPOINT
  // =====================================================

  const saveCheckpoint =
    async (
      checkpointId,
      value
    ) => {
      if (!selectedRecordId) {
        setError(
          "Please select a frame first."
        );
        return;
      }

      if (stationMismatch) {
        setError(
          "You can edit only your assigned PDI station."
        );
        return;
      }

      if (isStationCompleted) {
        setError(
          "This PDI station has already been completed."
        );
        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        await axios.put(
          `${API}/pdi/frame/${encodeURIComponent(
            selectedRecordId
          )}/checkpoint/${encodeURIComponent(
            checkpointId
          )}`,
          {
            value,
          },
          {
            headers:
              getHeaders(),
          }
        );

        // Update only the clicked checkpoint locally. This avoids
        // replacing the whole frame response and keeps the checklist
        // visually stable while the operator moves between points.
        setRecord((previous) => {
          if (!previous) return previous;

          const previousPdi = previous.pdi || {};
          const previousStations = previousPdi.stations || {};
          const previousStation = previousStations[stationKey] || {};
          const previousCheckpoints =
            previousStation.checkpoints;

          let updatedCheckpoints;

          if (Array.isArray(previousCheckpoints)) {
            updatedCheckpoints =
              previousCheckpoints.map((checkpoint) =>
                String(
                  checkpoint?.checkpoint_id ||
                    checkpoint?.id
                ) === String(checkpointId)
                  ? {
                      ...checkpoint,
                      value,
                    }
                  : checkpoint
              );
          } else if (
            previousCheckpoints &&
            typeof previousCheckpoints === "object"
          ) {
            updatedCheckpoints = {
              ...previousCheckpoints,
            };

            const existing =
              updatedCheckpoints[checkpointId] ||
              {};

            updatedCheckpoints[checkpointId] = {
              ...existing,
              checkpoint_id:
                existing?.checkpoint_id ||
                existing?.id ||
                checkpointId,
              value,
            };
          } else {
            updatedCheckpoints = previousCheckpoints;
          }

          return {
            ...previous,
            pdi: {
              ...previousPdi,
              stations: {
                ...previousStations,
                [stationKey]: {
                  ...previousStation,
                  checkpoints:
                    updatedCheckpoints,
                },
              },
            },
          };
        });

        setSuccess(
          `${checkpointId} marked ${value}.`
        );
      } catch (err) {
        console.error(
          "Save PDI checkpoint error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to save checkpoint."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  // =====================================================
  // SAVE GAUGE CHECKPOINT
  // =====================================================

  const saveGaugeCheckpoint =
    async (
      checkpointId,
      value
    ) => {
      if (!selectedRecordId) {
        setError(
          "Please select a frame first."
        );
        return;
      }

      if (!isStation3) {
        setError(
          "Gauge inspection is available only at PDI Station 3."
        );
        return;
      }

      if (stationMismatch) {
        setError(
          "You can edit only your assigned PDI station."
        );
        return;
      }

      if (isStationCompleted) {
        setError(
          "This PDI station has already been completed."
        );
        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        await axios.put(
          `${API}/pdi/frame/${encodeURIComponent(
            selectedRecordId
          )}/gauge/${encodeURIComponent(
            checkpointId
          )}`,
          {
            value,
          },
          {
            headers:
              getHeaders(),
          }
        );

        // Update only the clicked Gauge checkpoint locally.
        setRecord((previous) => {
          if (!previous) return previous;

          const previousPdi = previous.pdi || {};
          const previousStations = previousPdi.stations || {};
          const previousStation = previousStations[stationKey] || {};
          const previousGauge =
            previousStation.gauge_checkpoints;

          let updatedGauge;

          if (Array.isArray(previousGauge)) {
            updatedGauge =
              previousGauge.map((checkpoint) =>
                String(
                  checkpoint?.checkpoint_id ||
                    checkpoint?.id
                ) === String(checkpointId)
                  ? {
                      ...checkpoint,
                      value,
                    }
                  : checkpoint
              );
          } else if (
            previousGauge &&
            typeof previousGauge === "object"
          ) {
            updatedGauge = {
              ...previousGauge,
            };

            const existing =
              updatedGauge[checkpointId] ||
              {};

            updatedGauge[checkpointId] = {
              ...existing,
              checkpoint_id:
                existing?.checkpoint_id ||
                existing?.id ||
                checkpointId,
              value,
            };
          } else {
            updatedGauge = previousGauge;
          }

          return {
            ...previous,
            pdi: {
              ...previousPdi,
              stations: {
                ...previousStations,
                [stationKey]: {
                  ...previousStation,
                  gauge_checkpoints:
                    updatedGauge,
                },
              },
            },
          };
        });

        setSuccess(
          `${checkpointId} marked ${value}.`
        );
      } catch (err) {
        console.error(
          "Save Gauge checkpoint error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to save gauge checkpoint."
          )
        );
      } finally {
        setSaving(false);
      }
    };

  // =====================================================
  // PASS STATION
  // =====================================================

  const handlePassStation =
    async () => {
      if (!selectedRecordId) {
        setError(
          "Please select a frame."
        );
        return;
      }

      if (stationMismatch) {
        setError(
          "You can complete only your assigned PDI station."
        );
        return;
      }

      if (isStationCompleted) {
        setError(
          "This PDI station is already completed."
        );
        return;
      }

      if (
        answeredCheckpoints !==
        totalCheckpoints
      ) {
        setError(
          "Please answer all normal PDI checkpoints before passing this station."
        );
        setInspectionTab("PDI");
        return;
      }

      if (
        isStation3 &&
        (
          gaugeTotal === 0 ||
          gaugeAnswered !==
            gaugeTotal
        )
      ) {
        setError(
          `Please answer all Gauge inspection checkpoints before completing PDI Station 3. ${gaugePendingCount} remaining.`
        );

        setInspectionTab(
          "GAUGE"
        );

        return;
      }

      try {
        setPassing(true);
        setError("");
        setSuccess("");

        const response =
          await axios.post(
            `${API}/pdi/frame/${encodeURIComponent(
              selectedRecordId
            )}/pass`,
            {},
            {
              headers:
                getHeaders(),
            }
          );

        const updatedRecord =
          response.data;

        setRecord(
          updatedRecord
        );

        setSuccess(
          `${currentStation.title} completed successfully.`
        );

        // Remove passed/NOK station from queue.
        setQueue(
          (previousQueue) => {
            const stationResult =
              String(
                updatedRecord
                  ?.pdi
                  ?.stations?.[
                    stationKey
                  ]?.status || ""
              )
                .trim()
                .toUpperCase();

            if (
              stationResult ===
                "NOK" ||
              stationResult ===
                "PASSED"
            ) {
              return previousQueue.filter(
                (item) =>
                  String(
                    getQueueRecordId(
                      item
                    )
                  ) !==
                  String(
                    selectedRecordId
                  )
              );
            }

            return previousQueue.map(
              (item) =>
                String(
                  getQueueRecordId(
                    item
                  )
                ) ===
                String(
                  selectedRecordId
                )
                  ? {
                      ...item,
                      ...updatedRecord,
                      record_id:
                        String(
                          selectedRecordId
                        ),
                    }
                  : item
            );
          }
        );
      } catch (err) {
        console.error(
          "Pass PDI station error:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to complete station."
          )
        );
      } finally {
        setPassing(false);
      }
    };

  // =====================================================
  // SELECT FRAME
  // =====================================================

  const handleSelectFrame =
    (item) => {
      const recordId =
        getQueueRecordId(
          item
        );

      if (!recordId) {
        setError(
          "Unable to identify this frame."
        );
        return;
      }

      setError("");
      setSuccess("");
      setInspectionTab("PDI");

      setSelectedRecordId(
        recordId
      );

      setUrlRecordId(
        recordId
      );
    };

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh =
    async () => {
      await loadQueue();

      if (selectedRecordId) {
        await loadFrame(
          selectedRecordId
        );
      }
    };

  // =====================================================
  // DISPLAY DATA
  // =====================================================

  const frameNumber =
    record?.frame_no ||
    record?.frame_number ||
    record?.frame ||
    "-";

  const inspectionDate =
    record?.date ||
    record?.inspection_date ||
    "-";

  const shift =
    record?.shift ||
    "-";

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="qid-page qid-pdi" style={styles.page}>
      {/* ================================================= */}
      {/* TOP BAR */}
      {/* ================================================= */}

      <header
        style={styles.topBar}
      >
        <div>
          <div
            style={
              styles.brand
            }
          >
            QID INSPECTION SYSTEM
          </div>

          <div
            style={
              styles.pageSubtitle
            }
          >
            Product Delivery Inspection
          </div>
        </div>

        <div
          style={
            styles.topRight
          }
        >
          <div
            style={
              styles.operatorBlock
            }
          >
            <div
              style={
                styles.operatorName
              }
            >
              {operatorName ||
                "PDI Operator"}
            </div>

            <div
              style={
                styles.operatorMeta
              }
            >
              {
                currentStation.title
              }
            </div>
          </div>

          <button
            type="button"
            style={
              styles.logoutButton
            }
            onClick={
              handleLogout
            }
          >
            Logout
          </button>
        </div>
      </header>

      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <div
        style={
          styles.mainLayout
        }
      >
        {/* ================================================= */}
        {/* QUEUE */}
        {/* ================================================= */}

        <aside
          style={
            styles.sidebar
          }
        >
          <div
            style={
              styles.cardHeader
            }
          >
            <div>
              <h3
                style={
                  styles.cardTitle
                }
              >
                PDI Queue
              </h3>

              <p
                style={
                  styles.cardSubtitle
                }
              >
                Frames available for{" "}
                {
                  currentStation.title
                }
              </p>
            </div>

            <div
              style={
                styles.queueCount
              }
            >
              {
                queue.length
              }
            </div>
          </div>

          <div
            style={
              styles.queueActions
            }
          >
            <button
              type="button"
              style={
                styles.refreshButton
              }
              onClick={
                handleRefresh
              }
              disabled={
                loadingQueue
              }
            >
              {loadingQueue
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          <div
            style={
              styles.queueList
            }
          >
            {loadingQueue ? (
              <div
                style={
                  styles.loadingBox
                }
              >
                Loading PDI queue...
              </div>
            ) : queue.length ===
              0 ? (
              <div
                style={
                  styles.emptyBox
                }
              >
                <div
                  style={
                    styles.emptyIcon
                  }
                >
                  ✓
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
                  There are currently
                  no frames waiting for
                  this PDI station.
                </div>
              </div>
            ) : (
              queue.map(
                (
                  item,
                  index
                ) => {
                  const recordId =
                    getQueueRecordId(
                      item
                    );

                  const frame =
                    getQueueFrameNumber(
                      item
                    );

                  const itemStatus =
                    getQueueStatus(
                      item
                    );

                  const isSelected =
                    String(
                      selectedRecordId
                    ) ===
                    String(
                      recordId
                    );

                  const isPassed =
                    String(
                      itemStatus
                    )
                      .toUpperCase() ===
                    "PASSED";

                  return (
                    <button
                      key={
                        recordId ||
                        index
                      }
                      type="button"
                      onClick={() =>
                        handleSelectFrame(
                          item
                        )
                      }
                      style={{
                        ...styles.queueItem,
                        ...(isSelected
                          ? styles.queueItemSelected
                          : {}),
                        ...(isPassed
                          ? styles.queueItemPassed
                          : {}),
                      }}
                    >
                      <div
                        style={
                          styles.queueItemLeft
                        }
                      >
                        <div
                          style={
                            styles.queueFrame
                          }
                        >
                          Frame {frame}
                        </div>

                        <div
                          style={
                            styles.queueMeta
                          }
                        >
                          PDI{" "}
                          {
                            currentStation.number
                          }{" "}
                          •{" "}
                          {
                            itemStatus
                          }

                          {isPassed
                            ? " • VIEW ONLY"
                            : ""}
                        </div>
                      </div>
                    </button>
                  );
                }
              )
            )}
          </div>
        </aside>

        {/* ================================================= */}
        {/* MAIN CONTENT */}
        {/* ================================================= */}

        <main
          style={
            styles.mainContent
          }
        >
          {error && (
            <div
              style={
                styles.errorBanner
              }
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={
                styles.successBanner
              }
            >
              {success}
            </div>
          )}

          {!selectedRecordId ? (
            <div
              style={
                styles.placeholderCard
              }
            >
              <h3>
                Select a Frame from Queue
              </h3>

              <p>
                Choose an item from the
                sidebar to start executing
                PDI inspection checkpoints.
              </p>
            </div>
          ) : loadingRecord ? (
            <div
              style={
                styles.placeholderCard
              }
            >
              <h3>
                Loading Inspection Data...
              </h3>
            </div>
          ) : (
            <div
              style={
                styles.contentContainer
              }
            >
              {/* ========================================= */}
              {/* FRAME HEADER */}
              {/* ========================================= */}

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
                      Frame:{" "}
                      {
                        frameNumber
                      }
                    </h2>

                    <div
                      style={
                        styles.metaRow
                      }
                    >
                      <span>
                        Date:{" "}
                        {
                          inspectionDate
                        }
                      </span>

                      {" | "}

                      <span>
                        Shift:{" "}
                        {shift}
                      </span>

                      {" | "}

                      <span>
                        Station:{" "}
                        {
                          currentStation.title
                        }
                      </span>
                    </div>
                  </div>

                  <div
                    style={
                      styles.statusBadge(
                        isStationCompleted
                      )
                    }
                  >
                    {isStationCompleted
                      ? "PASSED"
                      : stationStatus}
                  </div>
                </div>

                {/* ======================================= */}
                {/* PROGRESS */}
                {/* ======================================= */}

                <div
                  style={
                    styles.progressSection
                  }
                >
                  <div
                    style={
                      styles.progressBarBg
                    }
                  >
                    <div
                      style={{
                        ...styles.progressBarFill,
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <div
                    style={
                      styles.metricRow
                    }
                  >
                    <span>
                      Progress:{" "}
                      {
                        progress
                      }%
                    </span>

                    <span>
                      Answered:{" "}
                      {
                        answeredCheckpoints
                      }{" "}
                      /{" "}
                      {
                        totalCheckpoints
                      }
                    </span>

                    <span
                      style={{
                        color:
                          "#16a34a",
                      }}
                    >
                      OK:{" "}
                      {yesCount}
                    </span>

                    <span
                      style={{
                        color:
                          "#dc2626",
                      }}
                    >
                      NOK:{" "}
                      {
                        nokCount
                      }
                    </span>

                    <span>
                      Pending:{" "}
                      {
                        pendingCount
                      }
                    </span>
                  </div>

                  {isStation3 && (
                    <div
                      style={{
                        marginTop:
                          "10px",
                        display:
                          "flex",
                        gap:
                          "16px",
                        fontSize:
                          "12px",
                        fontWeight:
                          "600",
                      }}
                    >
                      <span>
                        Gauge Answered:{" "}
                        {
                          gaugeAnswered
                        }{" "}
                        /{" "}
                        {
                          gaugeTotal
                        }
                      </span>

                      <span
                        style={{
                          color:
                            "#16a34a",
                        }}
                      >
                        Gauge OK:{" "}
                        {
                          gaugeYesCount
                        }
                      </span>

                      <span
                        style={{
                          color:
                            "#dc2626",
                        }}
                      >
                        Gauge NOK:{" "}
                        {
                          gaugeNokCount
                        }
                      </span>

                      <span
                        style={{
                          color:
                            "#b45309",
                        }}
                      >
                        Gauge Pending:{" "}
                        {
                          gaugePendingCount
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================= */}
              {/* STATION WARNING */}
              {/* ========================================= */}

              {stationMismatch && (
                <div
                  style={{
                    background:
                      "#fff7ed",
                    border:
                      "1px solid #fed7aa",
                    color:
                      "#9a3412",
                    borderRadius:
                      "8px",
                    padding:
                      "10px 12px",
                    fontSize:
                      "12px",
                  }}
                >
                  You are logged in to{" "}
                  <strong>
                    {
                      operatorStation
                    }
                  </strong>
                  . You can edit only
                  your assigned PDI station.
                </div>
              )}

              {/* ========================================= */}
              {/* GAUGE PENDING WARNING */}
              {/* ========================================= */}

              {isStation3 &&
                gaugePendingCount >
                  0 && (
                  <div
                    style={{
                      background:
                        "#fff7ed",
                      border:
                        "1px solid #fed7aa",
                      color:
                        "#9a3412",
                      borderRadius:
                        "8px",
                      padding:
                        "10px 12px",
                      fontSize:
                        "12px",
                      lineHeight:
                        "1.5",
                    }}
                  >
                    Please complete all{" "}
                    <strong>
                      {
                        gaugePendingCount
                      }
                    </strong>{" "}
                    remaining Gauge
                    inspection{" "}
                    {
                      gaugePendingCount ===
                      1
                        ? "checkpoint"
                        : "checkpoints"
                    }{" "}
                    before completing
                    PDI Station 3.
                  </div>
                )}

              {/* ========================================= */}
              {/* TABS */}
              {/* ========================================= */}

              {isStation3 && (
                <div
                  style={{
                    display:
                      "flex",
                    gap: "8px",
                    borderBottom:
                      "1px solid #e2e8f0",
                    background:
                      "#ffffff",
                    padding:
                      "8px 8px 0",
                    borderRadius:
                      "8px 8px 0 0",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setInspectionTab(
                        "PDI"
                      );
                      setError("");
                    }}
                    style={{
                      padding:
                        "12px 20px",
                      border:
                        "none",
                      borderBottom:
                        inspectionTab ===
                        "PDI"
                          ? "3px solid #2563eb"
                          : "3px solid transparent",
                      background:
                        inspectionTab ===
                        "PDI"
                          ? "#eff6ff"
                          : "transparent",
                      color:
                        inspectionTab ===
                        "PDI"
                          ? "#1d4ed8"
                          : "#64748b",
                      fontSize:
                        "13px",
                      fontWeight:
                        "800",
                      cursor:
                        "pointer",
                      borderRadius:
                        "6px 6px 0 0",
                    }}
                  >
                    PDI CHECKLIST
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInspectionTab(
                        "GAUGE"
                      );
                      setError("");
                    }}
                    style={{
                      padding:
                        "12px 20px",
                      border:
                        "none",
                      borderBottom:
                        inspectionTab ===
                        "GAUGE"
                          ? "3px solid #2563eb"
                          : "3px solid transparent",
                      background:
                        inspectionTab ===
                        "GAUGE"
                          ? "#eff6ff"
                          : "transparent",
                      color:
                        inspectionTab ===
                        "GAUGE"
                          ? "#1d4ed8"
                          : "#64748b",
                      fontSize:
                        "13px",
                      fontWeight:
                        "800",
                      cursor:
                        "pointer",
                      borderRadius:
                        "6px 6px 0 0",
                    }}
                  >
                    GAUGE INSPECTION

                    {gaugePendingCount >
                      0 && (
                      <span
                        style={{
                          marginLeft:
                            "8px",
                          padding:
                            "2px 7px",
                          borderRadius:
                            "999px",
                          background:
                            "#fef2f2",
                          color:
                            "#dc2626",
                          fontSize:
                            "10px",
                          fontWeight:
                            "800",
                        }}
                      >
                        {
                          gaugePendingCount
                        }
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* ========================================= */}
              {/* CHECKLIST CARD */}
              {/* ========================================= */}

              <div
                style={
                  styles.card
                }
              >
                {/* ======================================= */}
                {/* NORMAL PDI TAB */}
                {/* ======================================= */}

                {inspectionTab ===
                "PDI" ? (
                  <div>
                    <h3
                      style={
                        styles.sectionTitle
                      }
                    >
                      PDI Checkpoints
                    </h3>

                    {checkpoints.length ===
                    0 ? (
                      <div
                        style={
                          styles.emptyChecklist
                        }
                      >
                        No checkpoints
                        configured for
                        this station.
                      </div>
                    ) : (
                      <div
                        style={
                          styles.checklistGrid
                        }
                      >
                        {checkpoints.map(
                          (cp, index) => {
                            const val =
                              getCheckpointValue(
                                cp
                              );

                            const checkpointId =
                              cp?.checkpoint_id ||
                              cp?.id ||
                              `CP_${
                                index +
                                1
                              }`;

                            const description =
                              cp?.description ||
                              cp?.checkpoint ||
                              cp?.name ||
                              cp?.title ||
                              "-";

                            return (
                              <div
                                key={
                                  checkpointId
                                }
                                style={{
                                  ...styles.checkItem,
                                  ...(val ===
                                  "YES"
                                    ? styles.checkItemYes
                                    : {}),
                                  ...(val ===
                                  "NO"
                                    ? styles.checkItemNo
                                    : {}),
                                }}
                              >
                                <div
                                  style={
                                    styles.checkItemLabel
                                  }
                                >
                                  <strong>
                                    {
                                      checkpointId
                                    }
                                  </strong>

                                  <div
                                    style={{
                                      marginTop:
                                        "4px",
                                      fontWeight:
                                        "600",
                                    }}
                                  >
                                    {
                                      description
                                    }
                                  </div>

                                  {cp?.method && (
                                    <div
                                      style={
                                        styles.detailText
                                      }
                                    >
                                      Method:{" "}
                                      {
                                        cp.method
                                      }
                                    </div>
                                  )}

                                  {cp?.criteria && (
                                    <div
                                      style={
                                        styles.detailText
                                      }
                                    >
                                      Criteria:{" "}
                                      {
                                        cp.criteria
                                      }
                                    </div>
                                  )}
                                </div>

                                <div
                                  style={
                                    styles.checkItemActions
                                  }
                                >
                                  <button
                                    type="button"
                                    disabled={
                                      isStationCompleted ||
                                      saving ||
                                      stationMismatch ||
                                      passing
                                    }
                                    onClick={() =>
                                      saveCheckpoint(
                                        checkpointId,
                                        "YES"
                                      )
                                    }
                                    style={styles.actionBtn(
                                      val ===
                                        "YES",
                                      "YES"
                                    )}
                                  >
                                    OK
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      isStationCompleted ||
                                      saving ||
                                      stationMismatch
                                    }
                                    onClick={() =>
                                      saveCheckpoint(
                                        checkpointId,
                                        "NO"
                                      )
                                    }
                                    style={styles.actionBtn(
                                      val ===
                                        "NO",
                                      "NO"
                                    )}
                                  >
                                    NOK
                                  </button>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ======================================= */
                  /* GAUGE TAB */
                  /* ======================================= */

                  <div>
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        marginBottom:
                          "16px",
                      }}
                    >
                      <div>
                        <h3
                          style={
                            styles.sectionTitle
                          }
                        >
                          Gauge Inspection
                        </h3>

                        <p
                          style={{
                            margin:
                              "-8px 0 0",
                            fontSize:
                              "12px",
                            color:
                              "#64748b",
                          }}
                        >
                          Mandatory for PDI
                          Station 3.
                          Answer every
                          Gauge checkpoint
                          with OK or NOK.
                        </p>
                      </div>

                      <div
                        style={{
                          padding:
                            "7px 12px",
                          borderRadius:
                            "999px",
                          background:
                            gaugePendingCount >
                            0
                              ? "#fff7ed"
                              : "#f0fdf4",
                          color:
                            gaugePendingCount >
                            0
                              ? "#b45309"
                              : "#15803d",
                          fontSize:
                            "11px",
                          fontWeight:
                            "800",
                        }}
                      >
                        {
                          gaugeAnswered
                        }{" "}
                        /{" "}
                        {
                          gaugeTotal
                        }{" "}
                        ANSWERED
                      </div>
                    </div>

                    {gaugeCheckpoints.length ===
                    0 ? (
                      <div
                        style={
                          styles.emptyChecklist
                        }
                      >
                        No Gauge checkpoints
                        available.
                      </div>
                    ) : (
                      <div
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          gap:
                            "14px",
                        }}
                      >
                        {gaugeCheckpoints.map(
                          (cp) => {
                            const val =
                              getGaugeCheckpointValue(
                                cp
                              );

                            return (
                              <div
                                key={
                                  cp.checkpoint_id
                                }
                                style={{
                                  ...styles.gaugeItem,
                                  ...(val ===
                                  "YES"
                                    ? styles.checkItemYes
                                    : {}),
                                  ...(val ===
                                  "NO"
                                    ? styles.checkItemNo
                                    : {}),
                                }}
                              >
                                <div
                                  style={
                                    styles.gaugeContent
                                  }
                                >
                                  <div
                                    style={
                                      styles.gaugeNumber
                                    }
                                  >
                                    #
                                    {
                                      cp.sr_no
                                    }
                                  </div>

                                  <div
                                    style={{
                                      flex:
                                        "1",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize:
                                          "13px",
                                        fontWeight:
                                          "800",
                                        color:
                                          "#0f172a",
                                        marginBottom:
                                          "6px",
                                      }}
                                    >
                                      {
                                        cp.checkpoint
                                      }
                                    </div>

                                    <div
                                      style={
                                        styles.gaugeDetails
                                      }
                                    >
                                      {cp.position && (
                                        <span>
                                          <strong>
                                            Position:
                                          </strong>{" "}
                                          {
                                            cp.position
                                          }
                                        </span>
                                      )}

                                      {cp.frequency !==
                                        undefined && (
                                        <span>
                                          <strong>
                                            Frequency:
                                          </strong>{" "}
                                          {
                                            cp.frequency
                                          }
                                        </span>
                                      )}

                                      {cp.specification && (
                                        <span>
                                          <strong>
                                            Specification:
                                          </strong>{" "}
                                          {
                                            cp.specification
                                          }
                                        </span>
                                      )}

                                      {cp.no_of_holes && (
                                        <span>
                                          <strong>
                                            No. of Holes:
                                          </strong>{" "}
                                          {
                                            cp.no_of_holes
                                          }
                                        </span>
                                      )}

                                      {cp.method && (
                                        <span>
                                          <strong>
                                            Method:
                                          </strong>{" "}
                                          {
                                            cp.method
                                          }
                                        </span>
                                      )}

                                      {cp.confirmation_marking && (
                                        <span>
                                          <strong>
                                            Confirmation:
                                          </strong>{" "}
                                          {
                                            cp.confirmation_marking
                                          }
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  style={
                                    styles.checkItemActions
                                  }
                                >
                                  <button
                                    type="button"
                                    disabled={
                                      isStationCompleted ||
                                      saving ||
                                      stationMismatch
                                    }
                                    onClick={() =>
                                      saveGaugeCheckpoint(
                                        cp.checkpoint_id,
                                        "YES"
                                      )
                                    }
                                    style={styles.actionBtn(
                                      val ===
                                        "YES",
                                      "YES"
                                    )}
                                  >
                                    OK
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      isStationCompleted ||
                                      saving ||
                                      stationMismatch
                                    }
                                    onClick={() =>
                                      saveGaugeCheckpoint(
                                        cp.checkpoint_id,
                                        "NO"
                                      )
                                    }
                                    style={styles.actionBtn(
                                      val ===
                                        "NO",
                                      "NO"
                                    )}
                                  >
                                    NOK
                                  </button>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ======================================= */}
                {/* FOOTER */}
                {/* ======================================= */}

                <div
                  style={
                    styles.footerActions
                  }
                >
                  <button
                    type="button"
                    disabled={
                      !canPass
                    }
                    onClick={
                      handlePassStation
                    }
                    style={
                      styles.passButton(
                        canPass
                      )
                    }
                  >
                    {passing
                      ? "Completing Station..."
                      : isStationCompleted
                      ? "Station Passed"
                      : `Pass & Complete ${currentStation.title}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily:
      "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    color: "#0f172a",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "#1e293b",
    color: "#ffffff",
  },

  brand: {
    fontSize: "18px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
  },

  pageSubtitle: {
    fontSize: "12px",
    color: "#94a3b8",
  },

  topRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  operatorBlock: {
    textAlign: "right",
  },

  operatorName: {
    fontSize: "14px",
    fontWeight: "600",
  },

  operatorMeta: {
    fontSize: "12px",
    color: "#94a3b8",
  },

  logoutButton: {
    padding: "8px 14px",
    fontSize: "12px",
    color: "#ffffff",
    backgroundColor: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  mainLayout: {
    display: "flex",
    flex: 1,
    minHeight: 0,
  },

  sidebar: {
    width: "320px",
    borderRight:
      "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    minHeight: "calc(100vh - 74px)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
  },

  cardSubtitle: {
    margin: "4px 0 0 0",
    fontSize: "12px",
    color: "#64748b",
  },

  queueCount: {
    backgroundColor: "#e2e8f0",
    borderRadius: "12px",
    padding: "2px 8px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  queueActions: {
    marginBottom: "12px",
  },

  refreshButton: {
    width: "100%",
    padding: "8px",
    backgroundColor: "#f1f5f9",
    border:
      "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },

  queueList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  loadingBox: {
    padding: "16px",
    textAlign: "center",
    color: "#64748b",
  },

  emptyBox: {
    padding: "24px 16px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "24px",
    color: "#16a34a",
    marginBottom: "8px",
  },

  emptyTitle: {
    fontWeight: "bold",
    fontSize: "14px",
  },

  emptyText: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "4px",
  },

  queueItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    border:
      "1px solid #e2e8f0",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    textAlign: "left",
  },

  queueItemSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },

  queueItemPassed: {
    opacity: 0.7,
    backgroundColor: "#f8fafc",
  },

  queueItemLeft: {
    display: "flex",
    flexDirection: "column",
  },

  queueFrame: {
    fontSize: "14px",
    fontWeight: "600",
  },

  queueMeta: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },

  mainContent: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    minWidth: 0,
  },

  errorBanner: {
    padding: "12px 16px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border:
      "1px solid #fecaca",
    borderRadius: "6px",
    marginBottom: "16px",
  },

  successBanner: {
    padding: "12px 16px",
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    border:
      "1px solid #bbf7d0",
    borderRadius: "6px",
    marginBottom: "16px",
  },

  placeholderCard: {
    padding: "48px",
    textAlign: "center",
    backgroundColor: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "8px",
    color: "#64748b",
  },

  contentContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  card: {
    backgroundColor: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "20px",
  },

  frameHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },

  frameTitle: {
    margin: 0,
    fontSize: "20px",
  },

  metaRow: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
  },

  statusBadge: (isPassed) => ({
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor:
      isPassed
        ? "#dcfce7"
        : "#fef3c7",
    color:
      isPassed
        ? "#15803d"
        : "#b45309",
  }),

  progressSection: {
    marginTop: "12px",
  },

  progressBarBg: {
    height: "8px",
    backgroundColor: "#e2e8f0",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "8px",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    transition:
      "width 0.3s ease",
  },

  metricRow: {
    display: "flex",
    gap: "16px",
    fontSize: "12px",
    fontWeight: "500",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: "0 0 16px 0",
    fontSize: "16px",
  },

  checklistGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  checkItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "14px",
    border:
      "1px solid #f1f5f9",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
  },

  checkItemYes: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },

  checkItemNo: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },

  checkItemLabel: {
    flex: 1,
    fontSize: "13px",
  },

  checkItemActions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },

  detailText: {
    marginTop: "4px",
    fontSize: "11px",
    color: "#64748b",
  },

  gaugeItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    border:
      "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
  },

  gaugeContent: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    flex: 1,
    minWidth: 0,
  },

  gaugeNumber: {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "800",
  },

  gaugeDetails: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "5px 18px",
    fontSize: "11px",
    color: "#64748b",
    lineHeight: "1.5",
  },

  emptyChecklist: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    border:
      "1px dashed #cbd5e1",
    borderRadius: "8px",
  },

  actionBtn: (
    isSelected,
    type
  ) => ({
    minWidth: "70px",
    padding:
      "8px 16px",
    fontSize: "12px",
    fontWeight: "bold",
    borderRadius: "5px",
    border: "1px solid",
    cursor: "pointer",

    borderColor:
      type === "YES"
        ? "#16a34a"
        : "#dc2626",

    backgroundColor:
      isSelected
        ? type === "YES"
          ? "#16a34a"
          : "#dc2626"
        : "#ffffff",

    color:
      isSelected
        ? "#ffffff"
        : type === "YES"
        ? "#16a34a"
        : "#dc2626",
  }),

  footerActions: {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
  },

  passButton: (enabled) => ({
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#ffffff",
    backgroundColor:
      enabled
        ? "#16a34a"
        : "#94a3b8",
    border: "none",
    borderRadius: "6px",
    cursor: enabled
      ? "pointer"
      : "not-allowed",
  }),
};

export default PDIPage;
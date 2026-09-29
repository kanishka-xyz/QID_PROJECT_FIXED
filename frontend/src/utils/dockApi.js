import axios from "axios";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

// ============================================================
// AUTH HEADERS
// ============================================================

function getHeaders() {
  const token =
    localStorage.getItem("operator_token");

  const operatorId =
    localStorage.getItem("operator_id");

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  if (operatorId) {
    headers["X-Operator-ID"] =
      operatorId;
  }

  console.log("DOCK AUTH:", {
    hasToken: !!token,
    operatorId,
    station:
      localStorage.getItem(
        "operator_station"
      ),
  });

  return headers;
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function getErrorMessage(
  error,
  fallback
) {
  const detail =
    error?.response?.data?.detail;

  if (
    typeof detail ===
    "string"
  ) {
    return detail;
  }

  if (
    detail &&
    typeof detail ===
    "object"
  ) {
    return (
      detail.message ||
      detail.msg ||
      JSON.stringify(detail)
    );
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}


// ============================================================
// GET DOCK QUEUE
// ============================================================

export async function getDockQueue() {
  try {
    const response =
      await axios.get(
        `${API}/dock/queue`,
        {
          headers:
            getHeaders(),
        }
      );

    return response.data;

  } catch (error) {
    console.error(
      "Dock queue error:",
      error?.response?.data ||
        error
    );

    throw new Error(
      getErrorMessage(
        error,
        "Unable to load Dock queue."
      )
    );
  }
}


// ============================================================
// GET DOCK FRAME
// ============================================================

export async function getDockFrame(
  recordId
) {
  try {
    const response =
      await axios.get(
        `${API}/dock/frame/${encodeURIComponent(
          recordId
        )}`,
        {
          headers:
            getHeaders(),
        }
      );

    return response.data;

  } catch (error) {
    console.error(
      "Dock frame error:",
      error?.response?.data ||
        error
    );

    throw new Error(
      getErrorMessage(
        error,
        "Unable to load Dock frame."
      )
    );
  }
}


// ============================================================
// START DOCK STATION
// ============================================================

export async function startDock(
  recordId
) {
  try {
    const response =
      await axios.post(
        `${API}/dock/start`,
        {
          record_id:
            recordId,
        },
        {
          headers:
            getHeaders(),
        }
      );

    return response.data;

  } catch (error) {
    console.error(
      "Start Dock error:",
      error?.response?.data ||
        error
    );

    throw new Error(
      getErrorMessage(
        error,
        "Unable to start Dock station."
      )
    );
  }
}


// ============================================================
// SAVE DOCK CHECKPOINT
// ============================================================

export async function saveDockCheckpoint(
  recordId,
  checkpointId,
  value,
  remark = ""
) {
  try {
    const response =
      await axios.put(
        `${API}/dock/frame/${encodeURIComponent(
          recordId
        )}/checkpoint/${encodeURIComponent(
          checkpointId
        )}`,
        {
          value,
          remark,
        },
        {
          headers:
            getHeaders(),
        }
      );

    return response.data;

  } catch (error) {
    console.error(
      "Save Dock checkpoint error:",
      error?.response?.data ||
        error
    );

    throw new Error(
      getErrorMessage(
        error,
        "Unable to save Dock checkpoint."
      )
    );
  }
}


// ============================================================
// COMPLETE DOCK STATION
// ============================================================

export async function completeDockStation(
  recordId
) {
  try {
    const response =
      await axios.post(
        `${API}/dock/frame/${encodeURIComponent(
          recordId
        )}/complete`,
        {},
        {
          headers:
            getHeaders(),
        }
      );

    return response.data;

  } catch (error) {
    console.error(
      "Complete Dock error:",
      error?.response?.data ||
        error
    );

    const detail =
      error?.response?.data?.detail;

    const message =
      typeof detail === "object"
        ? (
            detail?.message ||
            "Unable to complete Dock station."
          )
        : (
            detail ||
            "Unable to complete Dock station."
          );

    const missing =
      typeof detail === "object"
        ? detail?.missing_checkpoints
        : null;

    let finalMessage =
      message;

    if (
      Array.isArray(missing) &&
      missing.length > 0
    ) {
      finalMessage +=
        ` Missing points: ${missing.join(
          ", "
        )}`;
    }

    throw new Error(
      finalMessage
    );
  }
}
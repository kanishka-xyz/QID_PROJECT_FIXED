import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// AUTH
// ============================================================

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("operator_token");

  if (token) {
    config.headers.Authorization =
      `Bearer ${token}`;
  }

  return config;
});

// ============================================================
// ERROR
// ============================================================

function normalizeError(error) {
  const detail =
    error?.response?.data?.detail;

  if (typeof detail === "string") {
    error.message = detail;
  }

  if (
    detail &&
    typeof detail === "object"
  ) {
    error.message =
      detail.message ||
      detail.msg ||
      error.message;
  }

  return error;
}

// ============================================================
// CREATE INSPECTION / FRAME
// ============================================================

export async function createInspection(payload) {
  try {
    const response = await api.post(
      "/inspection",
      payload
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

// ============================================================
// GET INSPECTION
// ============================================================

export async function getInspection(recordId) {
  try {
    const response = await api.get(
      `/inspection/${recordId}`
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

// ============================================================
// SAVE SHEET
// ============================================================
//
// IMPORTANT:
// Backend route must accept:
//
// PUT /inspection/{record_id}/sheet/{sheet_name}
//
// Example:
//
// PUT /inspection/123/sheet/sheet1
//
// ============================================================

export async function saveInspectionSheet(
  recordId,
  sheetName,
  data
) {
  try {
    const response = await api.put(
      `/inspection/${recordId}/sheet/${sheetName}`,
      {
        data,
      }
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

// ============================================================
// PASS SHEET
// ============================================================

export async function passInspectionSheet(
  recordId,
  sheetName
) {
  try {
    const response = await api.post(
      `/inspection/${recordId}/sheet/${sheetName}/pass`
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default api;
import axios from "axios";

const API =
  "http://localhost:8000";


const api = axios.create({

  baseURL: API,

  withCredentials: true,

});


// =====================================================
// ADMIN LOGIN
// =====================================================

export const adminLogin = async (
  username_or_email,
  password
) => {

  const response = await api.post(
    "/admin/auth/login",
    {
      username_or_email,
      password,
    }
  );

  return response.data;
};


// =====================================================
// CURRENT ADMIN
// =====================================================

export const getCurrentAdmin = async () => {

  const response = await api.get(
    "/admin/auth/me"
  );

  return response.data;
};


// =====================================================
// ADMIN LOGOUT
// =====================================================

export const adminLogout = async () => {

  const response = await api.post(
    "/admin/auth/logout"
  );

  return response.data;
};


// =====================================================
// ADMIN — GET ALL INSPECTION RECORDS
// =====================================================

export const getAdminRecords = async () => {

  const response = await api.get(
    "/admin/records"
  );

  return response.data;
};


// =====================================================
// GET ALL OPERATORS
// =====================================================

export const getAdminOperators = async () => {

  const response = await api.get(
    "/admin/operators"
  );

  return response.data;
};


// =====================================================
// CREATE OPERATOR
// =====================================================

export const createOperator = async (
  operator
) => {

  const response = await api.post(
    "/admin/operators",
    operator
  );

  return response.data;
};


// =====================================================
// UPDATE OPERATOR
// =====================================================

export const updateOperator = async (
  operatorId,
  operator
) => {

  const response = await api.put(
    `/admin/operators/${encodeURIComponent(
      operatorId
    )}`,
    operator
  );

  return response.data;
};


// =====================================================
// DEACTIVATE OPERATOR
// =====================================================

export const deactivateOperator = async (
  operatorId
) => {

  const response = await api.delete(
    `/admin/operators/${encodeURIComponent(
      operatorId
    )}`
  );

  return response.data;
};


// =====================================================
// ACTIVATE OPERATOR
// =====================================================

export const activateOperator = async (
  operatorId
) => {

  const response = await api.patch(
    `/admin/operators/${encodeURIComponent(
      operatorId
    )}/activate`
  );

  return response.data;
};


// =====================================================
// USER SIDE
// ACTIVE OPERATORS ONLY
// =====================================================

export const getActiveOperators = async () => {

  const response = await api.get(
    "/admin/public/operators"
  );

  return response.data;
};

// =====================================================
// ADMIN — GET COMPLETE FRAME HISTORY
// INCLUDING OP40 + OP60 + PDI DATA
// =====================================================

export const getAdminFrameHistory = async () => {

  const response = await api.get(
    "/admin/frame-history"
  );

  return response.data;
};
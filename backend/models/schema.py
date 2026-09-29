from typing import Any, Optional

from pydantic import BaseModel, Field


# ============================================================
# ADMIN
# ============================================================

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ============================================================
# OPERATOR
# ============================================================

class LoginRequest(BaseModel):
    operator_id: str
    pin: str
    station: str


class OperatorCreate(BaseModel):
    operator_id: str
    name: str
    pin: str
    station: str
    stage: str
    shift: str
    active: bool = True


class OperatorUpdate(BaseModel):
    name: Optional[str] = None
    pin: Optional[str] = None
    station: Optional[str] = None
    stage: Optional[str] = None
    shift: Optional[str] = None
    active: Optional[bool] = None


# ============================================================
# INSPECTION CREATION
# ============================================================

class InspectionCreateRequest(BaseModel):
    frame_no: str
    date: str
    shift: Optional[str] = None


# ============================================================
# SHEET SAVE
# ============================================================

class SheetSaveRequest(BaseModel):
    data: dict[str, Any] = Field(
        default_factory=dict
    )


# ============================================================
# REWORK
# ============================================================

class ReworkRequest(BaseModel):
    record_id: str
    stage: str
    field: str

    # Result after OP60 rework
    # Normally this should be YES
    corrected_status: str = "YES"

    # Rework remarks
    remarks: Optional[str] = None


# ============================================================
# OPTIONAL GENERIC RESPONSE MODELS
# ============================================================

class MessageResponse(BaseModel):
    success: bool
    message: str
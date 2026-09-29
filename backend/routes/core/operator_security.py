import os
import time
import hmac
import hashlib
import base64
import json

import bcrypt
from fastapi import Header, HTTPException, Depends

from database.mongodb import db


# ============================================================
# DATABASE
# ============================================================

operator_collection = db["operators"]


# ============================================================
# CONFIG
# ============================================================

OPERATOR_AUTH_SECRET = os.getenv("OPERATOR_AUTH_SECRET")

TOKEN_EXPIRY_HOURS = int(
    os.getenv("OPERATOR_TOKEN_EXPIRY_HOURS", "12")
)


# ============================================================
# PIN FUNCTIONS
# ============================================================

def verify_operator_pin(pin: str, pin_hash: str) -> bool:
    """
    Verify an operator PIN against the bcrypt hash
    stored in MongoDB.
    """

    if not pin or not pin_hash:
        return False

    try:
        return bcrypt.checkpw(
            pin.encode("utf-8"),
            pin_hash.encode("utf-8")
        )
    except Exception:
        return False


def hash_operator_pin(pin: str) -> str:
    """
    Create a bcrypt hash for an operator PIN.
    """

    if not pin:
        raise ValueError("PIN cannot be empty")

    hashed = bcrypt.hashpw(
        pin.encode("utf-8"),
        bcrypt.gensalt()
    )

    return hashed.decode("utf-8")


# ============================================================
# TOKEN CREATION
# ============================================================

def create_operator_token(operator_id: str) -> str:
    """
    Create a signed operator authentication token.

    Token format:

        base64(payload).signature

    The operator ID is stored in the signed payload.
    Station/stage are always read from MongoDB later.
    """

    if not OPERATOR_AUTH_SECRET:
        raise RuntimeError(
            "OPERATOR_AUTH_SECRET is not configured"
        )

    now = int(time.time())

    payload = {
        "operator_id": operator_id,
        "iat": now,
        "exp": now + (TOKEN_EXPIRY_HOURS * 60 * 60),
    }

    payload_json = json.dumps(
        payload,
        separators=(",", ":")
    ).encode("utf-8")

    encoded_payload = base64.urlsafe_b64encode(
        payload_json
    ).decode("utf-8")

    signature = hmac.new(
        OPERATOR_AUTH_SECRET.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return f"{encoded_payload}.{signature}"


# ============================================================
# TOKEN VERIFICATION
# ============================================================

def get_operator_from_token(token: str) -> str:
    """
    Verify token signature and expiry.

    Returns:
        operator_id
    """

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Operator authentication required"
        )

    if not OPERATOR_AUTH_SECRET:
        raise HTTPException(
            status_code=500,
            detail="OPERATOR_AUTH_SECRET is not configured"
        )

    try:
        encoded_payload, signature = token.split(".", 1)

        expected_signature = hmac.new(
            OPERATOR_AUTH_SECRET.encode("utf-8"),
            encoded_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(
            signature,
            expected_signature
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid operator token"
            )

        payload_bytes = base64.urlsafe_b64decode(
            encoded_payload.encode("utf-8")
        )

        payload = json.loads(
            payload_bytes.decode("utf-8")
        )

        expiry = int(payload.get("exp", 0))

        if expiry < int(time.time()):
            raise HTTPException(
                status_code=401,
                detail="Operator token expired"
            )

        operator_id = payload.get("operator_id")

        if not operator_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid operator token"
            )

        return operator_id

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid operator token"
        )


# ============================================================
# GET CURRENT OPERATOR
# ============================================================

def get_operator(
    authorization: str | None = Header(default=None),
    x_operator_id: str | None = Header(default=None),
):
    """
    FastAPI dependency.

    Reads:

        Authorization: Bearer <token>

    and optionally validates:

        X-Operator-ID: <operator_id>

    MongoDB is the source of truth for:

        - name
        - station
        - stage
        - shift
        - active status
    """

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Operator authentication required"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header"
        )

    token = authorization[
        len("Bearer "):
    ].strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid operator token"
        )

    token_operator_id = get_operator_from_token(token)

    # Prevent frontend from impersonating another operator
    if (
        x_operator_id
        and x_operator_id != token_operator_id
    ):
        raise HTTPException(
            status_code=401,
            detail="Operator identity mismatch"
        )

    operator = operator_collection.find_one(
        {
            "operator_id": token_operator_id,
            "active": True,
        }
    )

    if not operator:
        raise HTTPException(
            status_code=401,
            detail="Operator not found or inactive"
        )

    # Backward compatibility for old OP40 operators
    if "station" not in operator:
        operator["station"] = "OP40"

    return operator


# ============================================================
# STATION ACCESS
# ============================================================

def require_op40(
    operator: dict = Depends(get_operator)
):
    """
    Allow only OP40 operators.
    """

    station = str(
        operator.get("station", "OP40")
    ).strip().upper()

    if station != "OP40":
        raise HTTPException(
            status_code=403,
            detail="OP40 operator access required"
        )

    return operator


def require_op60(
    operator: dict = Depends(get_operator)
):
    """
    Allow only OP60 operators.
    """

    station = str(
        operator.get("station", "")
    ).strip().upper()

    if station != "OP60":
        raise HTTPException(
            status_code=403,
            detail="OP60 operator access required"
        )

    return operator


# ============================================================
# OP40 STAGE ACCESS
# ============================================================

def ensure_stage_access(
    operator: dict,
    stage: str
):
    """
    Make sure the logged-in OP40 operator is allowed
    to work on the requested stage.

    Example:

        STAGE_1 operator -> STAGE_1 only
        STAGE_2 operator -> STAGE_2 only
        STAGE_3 operator -> STAGE_3 only

    OP60 cannot access OP40 stages.
    """

    station = str(
        operator.get("station", "OP40")
    ).strip().upper()

    operator_stage = str(
        operator.get("stage", "")
    ).strip().upper()

    requested_stage = str(
        stage
    ).strip().upper()

    if station != "OP40":
        raise HTTPException(
            status_code=403,
            detail="OP40 access required"
        )

    if operator_stage != requested_stage:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Operator is assigned to "
                f"{operator_stage}, not {requested_stage}"
            )
        )
    return True

# ============================================================
# FIREWALL ACCESS
# ============================================================

FIREWALL_STATIONS = [
    "FIREWALL"
]


def require_firewall(
    operator: dict = Depends(get_operator)
):
    """
    Allow only Firewall operators.

    Valid Firewall stations:

        FIREWALL
    """

    station = str(
        operator.get("station", "")
    ).strip().upper()

    if station not in FIREWALL_STATIONS:
        raise HTTPException(
            status_code=403,
            detail="Firewall operator access required"
        )

    return operator

 
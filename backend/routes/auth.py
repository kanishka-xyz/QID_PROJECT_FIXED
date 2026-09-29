# =========================================================
# routes/auth.py
# OPERATOR AUTHENTICATION
# =========================================================

from fastapi import (
    APIRouter,
    HTTPException,
)

from models.schema import LoginRequest

from routes.core.operator_security import (
    operator_collection,
    verify_operator_pin,
    create_operator_token,
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/auth",
    tags=["Operator Authentication"],
)


# =========================================================
# VALID STATIONS
# =========================================================

VALID_STATIONS = [

    # -----------------------------------------------------
    # OP40
    # -----------------------------------------------------

    "OP40",

    # -----------------------------------------------------
    # OP60
    # -----------------------------------------------------

    "OP60",

    # -----------------------------------------------------
    # PDI
    # -----------------------------------------------------

    "PDI_STATION_3",
    "PDI_STATION_4",

    # -----------------------------------------------------
    # FIREWALL
    # -----------------------------------------------------

    "FIREWALL",

    # -----------------------------------------------------
    # DOCK
    # -----------------------------------------------------

    "DOCK_STATION_1",
    "DOCK_STATION_2",
    "DOCK_STATION_3",
    "DOCK_STATION_4",
    "DOCK_STATION_5",
]


# =========================================================
# VALID STAGES
# =========================================================

VALID_STAGES = [

    # OP40
    "STAGE_1",
    "STAGE_2",
    "STAGE_3",

    # OP60
    "OP60",

    # PDI
    "PDI_STATION_3",
    "PDI_STATION_4",

    # FIREWALL
    "FIREWALL",

    # DOCK
    "DOCK_STATION_1",
    "DOCK_STATION_2",
    "DOCK_STATION_3",
    "DOCK_STATION_4",
    "DOCK_STATION_5",
]


# =========================================================
# VALID SHIFTS
# =========================================================

VALID_SHIFTS = [
    "A",
    "B",
    "C",
]


# =========================================================
# VALIDATE STATION + STAGE
# =========================================================

def validate_operator_station_stage(
    station: str,
    stage: str,
):

    station = str(
        station
    ).strip().upper()

    stage = str(
        stage
    ).strip().upper()

    # -----------------------------------------------------
    # STATION MUST EXIST
    # -----------------------------------------------------

    if station not in VALID_STATIONS:

        raise HTTPException(
            status_code=400,
            detail=f"Invalid station: {station}",
        )

    # -----------------------------------------------------
    # OP40
    # -----------------------------------------------------

    if station == "OP40":

        if stage not in {
            "STAGE_1",
            "STAGE_2",
            "STAGE_3",
        }:

            raise HTTPException(
                status_code=400,
                detail=(
                    "OP40 must use STAGE_1, "
                    "STAGE_2 or STAGE_3."
                ),
            )

        return True

    # -----------------------------------------------------
    # OP60
    # -----------------------------------------------------

    if station == "OP60":

        if stage != "OP60":

            raise HTTPException(
                status_code=400,
                detail=(
                    "OP60 operator must use "
                    "OP60 stage."
                ),
            )

        return True

    # -----------------------------------------------------
    # PDI STATION 3
    # -----------------------------------------------------

    if station == "PDI_STATION_3":

        if stage != "PDI_STATION_3":

            raise HTTPException(
                status_code=400,
                detail=(
                    "PDI_STATION_3 operator must use "
                    "PDI_STATION_3 stage."
                ),
            )

        return True

    # -----------------------------------------------------
    # PDI STATION 4
    # -----------------------------------------------------

    if station == "PDI_STATION_4":

        if stage != "PDI_STATION_4":
            raise HTTPException(
                status_code=400,
                detail=(
                    "PDI_STATION_4 operator must use "
                    "PDI_STATION_4 stage."
                ),
            )

        return True

    # -----------------------------------------------------
    # FIREWALL
    # -----------------------------------------------------

    if station == "FIREWALL":

        if stage != "FIREWALL":

            raise HTTPException(
                status_code=400,
                detail=(
                    "FIREWALL operator must use "
                    "FIREWALL stage."
                ),
            )

        return True

    # -----------------------------------------------------
    # DOCK
    #
    # Each Dock station has its own operator.
    #
    # DOCK_STATION_1 -> DOCK_STATION_1
    # DOCK_STATION_2 -> DOCK_STATION_2
    # DOCK_STATION_3 -> DOCK_STATION_3
    # DOCK_STATION_4 -> DOCK_STATION_4
    # DOCK_STATION_5 -> DOCK_STATION_5
    # -----------------------------------------------------

    if station in {
        "DOCK_STATION_1",
        "DOCK_STATION_2",
        "DOCK_STATION_3",
        "DOCK_STATION_4",
        "DOCK_STATION_5",
    }:

        if stage != station:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"{station} operator must use "
                    f"{station} stage."
                ),
            )

        return True

    return True


# =========================================================
# OPERATOR LOGIN
# =========================================================

@router.post("/login")
def operator_login(
    request: LoginRequest,
):

    print(
        "🔥 AUTH LOGIN ROUTE HIT:",
        {
            "operator_id":
                request.operator_id,

            "station":
                request.station,

            "stage":
                getattr(
                    request,
                    "stage",
                    None
                ),
        }
    )

    # -----------------------------------------------------
    # CLEAN INPUT
    # -----------------------------------------------------

    operator_id = (
        request.operator_id
        .strip()
    )

    station = (
        request.station
        .strip()
        .upper()
    )

    # -----------------------------------------------------
    # VALIDATE STATION
    # -----------------------------------------------------

    if station not in VALID_STATIONS:

        raise HTTPException(
            status_code=400,
            detail="Invalid station",
        )

    # -----------------------------------------------------
    # FIND ACTIVE OPERATOR
    # -----------------------------------------------------

    operator = operator_collection.find_one({

        "operator_id":
            operator_id,

        "active":
            True,

    })

    if not operator:

        raise HTTPException(
            status_code=401,
            detail="Invalid operator ID or PIN",
        )

    # -----------------------------------------------------
    # VERIFY PIN
    # -----------------------------------------------------

    stored_hash = operator.get(
        "pin_hash",
        ""
    )

    if not verify_operator_pin(
        request.pin,
        stored_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid operator ID or PIN",
        )

    # -----------------------------------------------------
    # GET ACTUAL STATION
    #
    # MongoDB is authoritative.
    # -----------------------------------------------------

    actual_station = str(
        operator.get(
            "station",
            "OP40"
        )
    ).strip().upper()

    # -----------------------------------------------------
    # STATION CHECK
    # -----------------------------------------------------

    if actual_station != station:

        raise HTTPException(
            status_code=403,
            detail=(
                f"Operator is assigned to "
                f"{actual_station}, "
                f"not {station}"
            ),
        )

    # -----------------------------------------------------
    # ACTUAL STAGE
    # -----------------------------------------------------

    actual_stage = str(
        operator.get(
            "stage",
            ""
        )
    ).strip().upper()

    # -----------------------------------------------------
    # VALIDATE STATION + STAGE
    # -----------------------------------------------------

    validate_operator_station_stage(
        actual_station,
        actual_stage,
    )

    # -----------------------------------------------------
    # OPERATOR SHIFT
    # -----------------------------------------------------

    actual_shift = str(
        operator.get(
            "shift",
            ""
        )
    ).strip().upper()

    if actual_shift not in VALID_SHIFTS:

        raise HTTPException(
            status_code=403,
            detail="Invalid operator shift configuration",
        )

    # -----------------------------------------------------
    # CREATE TOKEN
    # -----------------------------------------------------

    token = create_operator_token(
        operator[
            "operator_id"
        ]
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {

        "token":
            token,

        "operator": {

            "operator_id":
                operator[
                    "operator_id"
                ],

            "name":
                operator[
                    "name"
                ],

            "station":
                actual_station,

            "stage":
                actual_stage,

            "shift":
                actual_shift,

        },

    }
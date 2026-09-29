from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
)

from pydantic import (
    BaseModel,
    Field,
)

from database.mongodb import db

from auth.security import (
    admin_collection,
    get_current_admin,
    hash_password,
    verify_password,
    create_admin_session,
    set_admin_cookie,
    clear_admin_cookie,
    delete_current_admin_session,
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


# =========================================================
# COLLECTIONS
# =========================================================

operator_collection = db["operators"]

inspection_collection = db["inspections"]


# =========================================================
# CONSTANTS
# =========================================================

VALID_STATIONS = [
    "OP40",
    "OP60",
    "PDI_STATION_3",
    "PDI_STATION_4",
    "FIREWALL",
     "DOCK_STATION_1",
    "DOCK_STATION_2",
    "DOCK_STATION_3",
    "DOCK_STATION_4",
    "DOCK_STATION_5",
]


VALID_STAGES = [
    "STAGE_1",
    "STAGE_2",
    "STAGE_3",
    "OP60",
    "PDI_STATION_3",
    "PDI_STATION_4",
    "FIREWALL",
      # DOCK
    "DOCK_STATION_1",
    "DOCK_STATION_2",
    "DOCK_STATION_3",
    "DOCK_STATION_4",
    "DOCK_STATION_5",
]


VALID_SHIFTS = [
    "A",
    "B",
    "C",
]


# =========================================================
# STATION / STAGE VALIDATION
# =========================================================

def validate_operator_station_stage(
    station: str,
    stage: str,
):
    station = str(station).strip().upper()
    stage = str(stage).strip().upper()

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
# REQUEST MODELS
# =========================================================

class AdminLoginRequest(
    BaseModel
):

    username_or_email: str

    password: str


class OperatorCreate(
    BaseModel
):

    operator_id: str = Field(
        min_length=1,
        max_length=100,
    )

    name: str = Field(
        min_length=1,
        max_length=150,
    )

    pin: str = Field(
        min_length=4,
        max_length=20,
    )

    station: str

    stage: str

    shift: str

    active: bool = True


class OperatorUpdate(
    BaseModel
):

    name: str | None = None

    pin: str | None = None

    station: str | None = None

    stage: str | None = None

    shift: str | None = None

    active: bool | None = None


# =========================================================
# ADMIN LOGIN
# =========================================================

@router.post(
    "/auth/login"
)
def admin_login(
    request: AdminLoginRequest,
    response: Response,
):

    username_or_email = (
        request.username_or_email
        .strip()
        .lower()
    )

    # -----------------------------------------------------
    # FIND ACTIVE ADMIN
    # -----------------------------------------------------

    admin = admin_collection.find_one(
        {
            "$or": [
                {
                    "username":
                        username_or_email,
                },
                {
                    "email":
                        username_or_email,
                },
            ],
            "active": True,
        }
    )

    if not admin:

        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid username/email "
                "or password"
            ),
        )

    # -----------------------------------------------------
    # VERIFY PASSWORD
    # -----------------------------------------------------

    password_valid = verify_password(
        request.password,
        admin.get(
            "password_hash",
            "",
        ),
    )

    if not password_valid:

        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid username/email "
                "or password"
            ),
        )

    # -----------------------------------------------------
    # VERIFY ROLE
    # -----------------------------------------------------

    role = str(
        admin.get(
            "role",
            "",
        )
    ).strip().upper()

    if role != "ADMIN":

        raise HTTPException(
            status_code=403,
            detail=(
                "Admin authorization required"
            ),
        )

    # -----------------------------------------------------
    # CREATE SESSION
    # -----------------------------------------------------

    token = create_admin_session(
        admin["_id"]
    )

    # -----------------------------------------------------
    # COOKIE
    # -----------------------------------------------------

    set_admin_cookie(
        response,
        token,
    )

    return {
        "message":
            "Login successful",

        "admin": {
            "username":
                admin["username"],

            "email":
                admin.get(
                    "email"
                ),

            "role":
                "ADMIN",
        },
    }


# =========================================================
# CURRENT ADMIN
# =========================================================

@router.get(
    "/auth/me"
)
def admin_me(
    admin=Depends(
        get_current_admin
    ),
):

    return {
        "username":
            admin["username"],

        "email":
            admin.get(
                "email"
            ),

        "role":
            "ADMIN",
    }


# =========================================================
# LOGOUT
# =========================================================

@router.post(
    "/auth/logout"
)
def admin_logout(
    request: Request,
    response: Response,
):

    delete_current_admin_session(
        request
    )

    clear_admin_cookie(
        response
    )

    return {
        "message":
            "Logged out successfully",
    }


# =========================================================
# ADMIN RECORDS DASHBOARD
# =========================================================

@router.get(
    "/records"
)
def get_admin_records(
    admin=Depends(
        get_current_admin
    ),
):

    records = list(
        inspection_collection.find({})
        .sort(
            "updated_at",
            -1,
        )
    )

    result = []

    for record in records:

        record_id = str(
            record.get(
                "_id"
            )
        )

        # -------------------------------------------------
        # STATUS
        # -------------------------------------------------

        status = (
            record.get(
                "overall_status"
            )
            or record.get(
                "status"
            )
            or "IN_PROGRESS"
        )

        # -------------------------------------------------
        # CURRENT STAGE
        # -------------------------------------------------

        current_stage = (
            record.get(
                "current_stage"
            )
            or record.get(
                "stage"
            )
            or ""
        )

        # -------------------------------------------------
        # STAGES
        # -------------------------------------------------

        stages = record.get(
            "stages",
            {},
        )

        if not isinstance(
            stages,
            dict,
        ):

            stages = {}

        # -------------------------------------------------
        # COUNT ORIGINAL NOK
        # -------------------------------------------------

        original_nok_count = 0

        for (
            stage_name,
            stage_data
        ) in stages.items():

            if not isinstance(
                stage_data,
                dict,
            ):
                continue

            for (
                sheet_name,
                sheet_data
            ) in stage_data.items():

                if not isinstance(
                    sheet_data,
                    dict,
                ):
                    continue

                data = sheet_data.get(
                    "data",
                    sheet_data,
                )

                if not isinstance(
                    data,
                    dict,
                ):
                    continue

                for (
                    field,
                    value
                ) in data.items():

                    if (
                        isinstance(
                            value,
                            str,
                        )
                        and
                        value.strip().upper()
                        == "NO"
                    ):
                        original_nok_count += 1

                    elif value is False:

                        original_nok_count += 1

        # -------------------------------------------------
        # REWORKED ITEMS
        # -------------------------------------------------

        reworked_items = record.get(
            "reworked_items",
            [],
        )

        if not isinstance(
            reworked_items,
            list,
        ):
            reworked_items = []

        # -------------------------------------------------
        # PENDING NOK
        # -------------------------------------------------

        pending_nok_count = max(
            original_nok_count
            -
            len(
                reworked_items
            ),
            0,
        )

        # -------------------------------------------------
        # REWORK STATUS
        # -------------------------------------------------

        if status == "COMPLETED":

            rework_status = (
                "COMPLETED"
            )

        elif status == "OP60_REWORK":

            rework_status = (
                "PENDING REWORK"
            )

        elif pending_nok_count > 0:

            rework_status = (
                "NOK FOUND"
            )

        else:

            rework_status = "NONE"

        # -------------------------------------------------
        # REWORK HISTORY
        # -------------------------------------------------

        rework_history = record.get(
            "rework_history",
            [],
        )

        if not isinstance(
            rework_history,
            list,
        ):

            rework_history = []

        # -------------------------------------------------
        # DATETIME
        # -------------------------------------------------

        created_at = record.get(
            "created_at"
        )

        updated_at = record.get(
            "updated_at"
        )

        if created_at is not None:

            created_at = str(
                created_at
            )

        if updated_at is not None:

            updated_at = str(
                updated_at
            )

        # -------------------------------------------------
        # APPEND
        # -------------------------------------------------

        result.append(
            {

                "id":
                    record_id,

                "_id":
                    record_id,

                "frame_no":
                    record.get(
                        "frame_no",
                        "",
                    ),

                "date":
                    record.get(
                        "date",
                        "",
                    ),

                "shift":
                    record.get(
                        "shift",
                        "",
                    ),

                "status":
                    status,

                "overall_status":
                    status,

                "current_stage":
                    current_stage,

                "stage":
                    current_stage,

                "operator_id":
                    record.get(
                        "operator_id"
                    ),

                "operator_name":
                    record.get(
                        "operator_name"
                    ),

                "original_nok_count":
                    original_nok_count,

                "pending_nok_count":
                    pending_nok_count,

                "reworked_count":
                    len(
                        reworked_items
                    ),

                "rework_status":
                    rework_status,

                "rework_history":
                    rework_history,

                "created_at":
                    created_at,

                "updated_at":
                    updated_at,
            }
        )

    return result


# =========================================================
# GET ALL OPERATORS
# =========================================================

@router.get(
    "/operators"
)
def list_operators(
    admin=Depends(
        get_current_admin
    ),
):

    operators = list(
        operator_collection.find(
            {},
            {
                "_id": 0,

                "operator_id": 1,

                "name": 1,

                "station": 1,

                "stage": 1,

                "shift": 1,

                "active": 1,

                "created_at": 1,

                "updated_at": 1,
            },
        ).sort(
            "created_at",
            -1,
        )
    )

    # -----------------------------------------------------
    # BACKWARD COMPATIBILITY
    # -----------------------------------------------------

    for operator in operators:

        if (
            "station"
            not in operator
        ):

            operator[
                "station"
            ] = "OP40"

    return operators


# =========================================================
# CREATE OPERATOR
# =========================================================

@router.post(
    "/operators"
)
def create_operator(
    request: OperatorCreate,
    admin=Depends(
        get_current_admin
    ),
):

    # -----------------------------------------------------
    # CLEAN INPUT
    # -----------------------------------------------------

    operator_id = (
        request.operator_id
        .strip()
    )

    name = (
        request.name
        .strip()
    )

    station = (
        request.station
        .strip()
        .upper()
    )

    stage = (
        request.stage
        .strip()
        .upper()
    )

    shift = (
        request.shift
        .strip()
        .upper()
    )

    # -----------------------------------------------------
    # REQUIRED
    # -----------------------------------------------------

    if not operator_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Operator ID is required"
            ),
        )

    if not name:

        raise HTTPException(
            status_code=400,
            detail=(
                "Operator name is required"
            ),
        )

    # -----------------------------------------------------
    # STATION
    # -----------------------------------------------------

    if station not in VALID_STATIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid station: {station}"
            ),
        )

    # -----------------------------------------------------
    # STAGE
    # -----------------------------------------------------

    if stage not in VALID_STAGES:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid stage: {stage}"
            ),
        )

    # -----------------------------------------------------
    # SHIFT
    # -----------------------------------------------------

    if shift not in VALID_SHIFTS:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid shift: {shift}"
            ),
        )

    # -----------------------------------------------------
    # STATION / STAGE
    # -----------------------------------------------------

    validate_operator_station_stage(
        station,
        stage,
    )

    # -----------------------------------------------------
    # DUPLICATE
    # -----------------------------------------------------

    existing = operator_collection.find_one(
        {
            "operator_id":
                operator_id,
        }
    )

    if existing:

        raise HTTPException(
            status_code=409,
            detail=(
                "Operator ID already exists"
            ),
        )

    # -----------------------------------------------------
    # TIME
    # -----------------------------------------------------

    from datetime import (
        datetime,
        timezone,
    )

    now = datetime.now(
        timezone.utc
    )

    # -----------------------------------------------------
    # OPERATOR
    # -----------------------------------------------------

    operator = {

        "operator_id":
            operator_id,

        "name":
            name,

        "pin_hash":
            hash_password(
                request.pin
            ),

        "station":
            station,

        "stage":
            stage,

        "shift":
            shift,

        "active":
            request.active,

        "created_at":
            now,

        "updated_at":
            now,
    }

    operator_collection.insert_one(
        operator
    )

    return {

        "message":
            "Operator created",

        "operator": {

            "operator_id":
                operator_id,

            "name":
                name,

            "station":
                station,

            "stage":
                stage,

            "shift":
                shift,

            "active":
                request.active,
        },
    }


# =========================================================
# UPDATE OPERATOR
# =========================================================

@router.put(
    "/operators/{operator_id}"
)
def update_operator(
    operator_id: str,
    request: OperatorUpdate,
    admin=Depends(
        get_current_admin
    ),
):

    existing = operator_collection.find_one(
        {
            "operator_id":
                operator_id,
        }
    )

    if not existing:

        raise HTTPException(
            status_code=404,
            detail=(
                "Operator not found"
            ),
        )

    update = {}

    # -----------------------------------------------------
    # NAME
    # -----------------------------------------------------

    if (
        request.name
        is not None
    ):

        name = request.name.strip()

        if not name:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Name cannot be empty"
                ),
            )

        update[
            "name"
        ] = name

    # -----------------------------------------------------
    # PIN
    # -----------------------------------------------------

    if (
        request.pin
        is not None
    ):

        if len(
            request.pin
        ) < 4:

            raise HTTPException(
                status_code=400,
                detail=(
                    "PIN must contain "
                    "at least 4 characters"
                ),
            )

        update[
            "pin_hash"
        ] = hash_password(
            request.pin
        )

    # -----------------------------------------------------
    # STATION
    # -----------------------------------------------------

    if (
        request.station
        is not None
    ):

        station = (
            request.station
            .strip()
            .upper()
        )

        if station not in VALID_STATIONS:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid station: {station}"
                ),
            )

        update[
            "station"
        ] = station

    # -----------------------------------------------------
    # STAGE
    # -----------------------------------------------------

    if (
        request.stage
        is not None
    ):

        stage = (
            request.stage
            .strip()
            .upper()
        )

        if stage not in VALID_STAGES:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid stage: {stage}"
                ),
            )

        update[
            "stage"
        ] = stage

    # -----------------------------------------------------
    # SHIFT
    # -----------------------------------------------------

    if (
        request.shift
        is not None
    ):

        shift = (
            request.shift
            .strip()
            .upper()
        )

        if shift not in VALID_SHIFTS:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid shift: {shift}"
                ),
            )

        update[
            "shift"
        ] = shift

    # -----------------------------------------------------
    # ACTIVE
    # -----------------------------------------------------

    if (
        request.active
        is not None
    ):

        update[
            "active"
        ] = request.active

    # -----------------------------------------------------
    # FINAL STATION / STAGE
    # -----------------------------------------------------

    current_station = existing.get(
        "station",
        "OP40",
    )

    current_stage = existing.get(
        "stage",
        "STAGE_1",
    )

    final_station = update.get(
        "station",
        current_station,
    )

    final_stage = update.get(
        "stage",
        current_stage,
    )

    final_station = str(
        final_station
    ).strip().upper()

    final_stage = str(
        final_stage
    ).strip().upper()

    validate_operator_station_stage(
        final_station,
        final_stage,
    )

    # -----------------------------------------------------
    # NOTHING
    # -----------------------------------------------------

    if not update:

        return {
            "message":
                "Nothing to update",
        }

    # -----------------------------------------------------
    # UPDATED TIME
    # -----------------------------------------------------

    from datetime import (
        datetime,
        timezone,
    )

    update[
        "updated_at"
    ] = datetime.now(
        timezone.utc
    )

    # -----------------------------------------------------
    # UPDATE
    # -----------------------------------------------------

    operator_collection.update_one(
        {
            "operator_id":
                operator_id,
        },
        {
            "$set":
                update,
        },
    )

    return {
        "message":
            "Operator updated",
    }


# =========================================================
# DEACTIVATE OPERATOR
# =========================================================

@router.delete(
    "/operators/{operator_id}"
)
def deactivate_operator(
    operator_id: str,
    admin=Depends(
        get_current_admin
    ),
):

    result = operator_collection.update_one(
        {
            "operator_id":
                operator_id,
        },
        {
            "$set": {
                "active":
                    False,
            },
        },
    )

    if (
        result.matched_count
        == 0
    ):

        raise HTTPException(
            status_code=404,
            detail=(
                "Operator not found"
            ),
        )

    return {
        "message":
            "Operator deactivated",
    }


# =========================================================
# ACTIVATE OPERATOR
# =========================================================

@router.patch(
    "/operators/{operator_id}/activate"
)
def activate_operator(
    operator_id: str,
    admin=Depends(
        get_current_admin
    ),
):

    result = operator_collection.update_one(
        {
            "operator_id":
                operator_id,
        },
        {
            "$set": {
                "active":
                    True,
            },
        },
    )

    if (
        result.matched_count
        == 0
    ):

        raise HTTPException(
            status_code=404,
            detail=(
                "Operator not found"
            ),
        )

    return {
        "message":
            "Operator activated",
    }


# =========================================================
# USER SIDE
# ACTIVE OPERATORS ONLY
# =========================================================

@router.get(
    "/public/operators"
)
def active_operators():

    operators = list(
        operator_collection.find(
            {
                "active":
                    True,
            },
            {
                "_id": 0,

                "operator_id": 1,

                "name": 1,

                "station": 1,

                "stage": 1,

                "shift": 1,
            },
        ).sort(
            "name",
            1,
        )
    )

    # -----------------------------------------------------
    # BACKWARD COMPATIBILITY
    # -----------------------------------------------------

    for operator in operators:

        if (
            "station"
            not in operator
        ):

            operator[
                "station"
            ] = "OP40"

    return operators


# =========================================================
# ADMIN FRAME HISTORY
# =========================================================

@router.get(
    "/frame-history"
)
def get_admin_frame_history(
    admin=Depends(
        get_current_admin
    ),
):

    records = list(
        inspection_collection.find({})
        .sort(
            "updated_at",
            -1,
        )
    )

    result = []

    for record in records:

        record["_id"] = str(
            record["_id"]
        )

        for key in [
            "created_at",
            "updated_at",
        ]:

            if record.get(
                key
            ):

                record[
                    key
                ] = str(
                    record[key]
                )

        result.append(
            record
        )

    return result
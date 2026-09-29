# =========================================================
# routes/firewall.py
# FIREWALL INSPECTION
# SINGLE FIREWALL STATION
# =========================================================

from datetime import datetime, timezone

from bson import ObjectId

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from database.mongodb import inspection_collection

from routes.core.operator_security import require_firewall


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/firewall",
    tags=["Firewall"],
)


# =========================================================
# CONSTANTS
# =========================================================

# IMPORTANT:
# There is ONLY ONE Firewall station.
FIREWALL_STATIONS = [
    "FIREWALL",
]

FIREWALL_STATION = "FIREWALL"


# =========================================================
# HELPERS
# =========================================================

def utc_now():
    return datetime.now(
        timezone.utc
    )


def serialize_value(value):

    if isinstance(
        value,
        ObjectId,
    ):
        return str(
            value
        )

    if isinstance(
        value,
        datetime,
    ):
        return value.isoformat()

    if isinstance(
        value,
        dict,
    ):
        return {
            key: serialize_value(
                val
            )
            for key, val in value.items()
        }

    if isinstance(
        value,
        list,
    ):
        return [
            serialize_value(
                item
            )
            for item in value
        ]

    return value


def serialize_record(
    record
):
    return serialize_value(
        record
    )


# =========================================================
# FRAME HISTORY HELPER
# =========================================================
#
# This is the common frame-level audit trail.
#
# Example:
#
#   OP40
#      ->
#   OP60
#      ->
#   PDI_STATION_3
#      ->
#   FIREWALL
#      ->
#   DOC
#
# Only stations that actually COMPLETE are added as
# STATION_COMPLETED events.
#
# =========================================================

def build_frame_history_entry(
    station,
    stage,
    action,
    status,
    operator,
    started_at=None,
    completed_at=None,
):
    return {
        "station":
            station,

        "stage":
            stage,

        "action":
            action,

        "status":
            status,

        "operator_id":
            operator.get(
                "operator_id"
            ),

        "operator_name":
            operator.get(
                "name"
            ),

        "shift":
            operator.get(
                "shift"
            ),

        "started_at":
            started_at,

        "completed_at":
            completed_at,
    }


# =========================================================
# GET FIREWALL STATION
# =========================================================

def get_station_from_operator(
    operator
):
    """
    Firewall has ONE station only:

        FIREWALL

    No TOP/BOTTOM or numbered Firewall stations exist.
    """

    station = str(
        operator.get(
            "station",
            "",
        )
    ).strip().upper()

    if station != FIREWALL_STATION:

        raise HTTPException(
            status_code=403,
            detail=(
                "Firewall operator access required"
            ),
        )

    return FIREWALL_STATION


# =========================================================
# GET RECORD
# =========================================================

def get_record(
    record_id
):

    try:

        object_id = ObjectId(
            str(record_id)
        )

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Invalid record ID",
        )

    record = (
        inspection_collection.find_one(
            {
                "_id":
                    object_id
            }
        )
    )

    if not record:

        raise HTTPException(
            status_code=404,
            detail=(
                "Inspection record not found"
            ),
        )

    return record


# =========================================================
# PDI COMPLETION CHECK
# =========================================================

def all_pdi_stations_completed(record):
    """Firewall is available only after BOTH PDI stations pass."""

    pdi = record.get("pdi", {}) or {}
    stations = pdi.get("stations", {}) or {}

    station_3 = stations.get(
        "PDI_STATION_3",
        {}
    ) or {}

    station_4 = stations.get(
        "PDI_STATION_4",
        {}
    ) or {}

    return (
        station_3.get("status") == "PASSED"
        and
        station_4.get("status") == "PASSED"
    )


# =========================================================
# FIREWALL STRUCTURE
# =========================================================

def create_empty_firewall_station():

    return {
        "status":
            "WAITING",

        "operator_id":
            None,

        "operator_name":
            None,

        "shift":
            None,

        "started_at":
            None,

        "completed_at":
            None,

        "header": {

            "shift_leader":
                "",

            "red":
                "",

            "firewall_inspector":
                "",

            "total_qty_welding_defects":
                0,

            "total_spatter_count":
                0,

            "date":
                "",

            "shift":
                "",
        },

        "rows":
            [],

        "signatures": {

            "inspector":
                "",

            "welder_sign":
                "",

            "quality_inspector_sign":
                "",
        },
    }


def build_empty_firewall():

    return {

        "status":
            "IN_PROGRESS",

        "started_at":
            None,

        "completed_at":
            None,

        "stations": {

            FIREWALL_STATION:
                create_empty_firewall_station(),

        },
    }


def ensure_firewall_structure(
    record
):

    firewall = record.get(
        "firewall"
    )

    # =====================================================
    # CREATE NEW FIREWALL
    # =====================================================

    if not isinstance(
        firewall,
        dict,
    ):

        firewall = (
            build_empty_firewall()
        )

        inspection_collection.update_one(
            {
                "_id":
                    record["_id"]
            },
            {
                "$set": {
                    "firewall":
                        firewall
                }
            }
        )

        return firewall

    changed = False

    # =====================================================
    # STATIONS OBJECT
    # =====================================================

    if not isinstance(
        firewall.get(
            "stations"
        ),
        dict,
    ):

        firewall[
            "stations"
        ] = {}

        changed = True

    stations = firewall[
        "stations"
    ]

    # =====================================================
    # ENSURE SINGLE FIREWALL STATION
    # =====================================================

    if (
        FIREWALL_STATION
        not in stations
    ):

        stations[
            FIREWALL_STATION
        ] = (
            create_empty_firewall_station()
        )

        changed = True

    # =====================================================
    # GLOBAL STATUS
    # =====================================================

    if (
        "status"
        not in firewall
    ):

        firewall[
            "status"
        ] = "IN_PROGRESS"

        changed = True

    if changed:

        inspection_collection.update_one(
            {
                "_id":
                    record["_id"]
            },
            {
                "$set": {
                    "firewall":
                        firewall
                }
            }
        )

    return firewall


# =========================================================
# FIREWALL COMPLETION
# =========================================================

def all_firewall_stations_completed(
    record
):
    """
    There is only ONE Firewall station.

    Therefore Firewall is complete when:

        firewall.stations.FIREWALL.status == PASSED
    """

    firewall = (
        record.get(
            "firewall",
            {},
        )
        or {}
    )

    stations = (
        firewall.get(
            "stations",
            {},
        )
        or {}
    )

    station_data = (
        stations.get(
            FIREWALL_STATION,
            {},
        )
        or {}
    )

    return (
        station_data.get(
            "status"
        )
        == "PASSED"
    )


# =========================================================
# UPDATE GLOBAL FIREWALL STATUS
# =========================================================

def update_global_firewall_status(
    record
):

    if all_firewall_stations_completed(
        record
    ):

        completed_at = utc_now()

        inspection_collection.update_one(
            {
                "_id":
                    record["_id"]
            },
            {
                "$set": {

                    "firewall.status":
                        "COMPLETED",

                    "firewall.completed_at":
                        completed_at,

                    # IMPORTANT:
                    # Firewall is NOT the final workflow.
                    #
                    # The same record goes to DOC.
                    "overall_status":
                        "DOCK_PENDING",

                    "current_stage":
                        "DOCK_STATION_1",

                    "current_station":
                        "DOCK_STATION_1",
                }
            }
        )

        return "COMPLETED"


    inspection_collection.update_one(
        {
            "_id":
                record["_id"]
        },
        {
            "$set": {

                "firewall.status":
                    "IN_PROGRESS",

                "overall_status":
                    "FIREWALL_IN_PROGRESS",

                "current_stage":
                    "FIREWALL",

                "current_station":
                    "FIREWALL",
            }
        }
    )

    return "IN_PROGRESS"


# =========================================================
# FIREWALL QUEUE
# SINGLE STATION
# =========================================================

@router.get(
    "/queue"
)
def get_firewall_queue(
    operator=Depends(
        require_firewall
    ),
):

    station = get_station_from_operator(
        operator
    )

    # =====================================================
    # PDI STATION 3 MUST BE PASSED
    # =====================================================

    # A frame is eligible for Firewall in either of these cases:
    # 1. It has already been moved to FIREWALL by the PDI workflow.
    # 2. BOTH PDI-3 and PDI-4 are PASSED. This covers both normal
    #    PDI-OK frames and PDI-3 NOK frames that went through OP60
    #    rework and then completed PDI-4.
    #
    # Do NOT use PDI-3 alone as eligibility: a PDI-3-passed frame must
    # still complete PDI-4 before entering Firewall.
    records = list(
        inspection_collection.find(
            {
                "$or": [
                    {
                        "current_station":
                            "FIREWALL",
                    },
                    {
                        "pdi.stations.PDI_STATION_3.status":
                            "PASSED",
                        "pdi.stations.PDI_STATION_4.status":
                            "PASSED",
                    },
                ]
            }
        ).sort(
            "created_at",
            -1,
        )
    )

    result = []

    # =====================================================
    # PROCESS ELIGIBLE FRAMES
    # =====================================================

    for record in records:

        firewall = ensure_firewall_structure(
            record
        )

        stations = (
            firewall.get(
                "stations",
                {},
            )
            or {}
        )

        station_data = (
            stations.get(
                FIREWALL_STATION,
                {},
            )
            or {}
        )

        # Already completed Firewall.
        if (
            station_data.get(
                "status"
            )
            == "PASSED"
        ):
            continue

        # Normalize fully completed PDI records into the Firewall stage.
        # This also repairs older records whose PDI stations are both
        # passed but whose top-level current_station was not updated.
        pdi_stations = (
            record.get("pdi", {})
            .get("stations", {})
            or {}
        )

        if (
            pdi_stations.get("PDI_STATION_3", {}).get("status")
            == "PASSED"
            and
            pdi_stations.get("PDI_STATION_4", {}).get("status")
            == "PASSED"
            and
            record.get("current_station") != "FIREWALL"
        ):
            inspection_collection.update_one(
                {"_id": record["_id"]},
                {"$set": {
                    "pdi.status": "COMPLETED",
                    "pdi.current_station": "COMPLETED",
                    "overall_status": "FIREWALL_PENDING",
                    "current_stage": "FIREWALL",
                    "current_station": "FIREWALL",
                    "pdi_nok_items": [],
                    "updated_at": utc_now(),
                }}
            )

            record = inspection_collection.find_one(
                {"_id": record["_id"]}
            )
            firewall = ensure_firewall_structure(record)
            station_data = (
                firewall.get("stations", {})
                .get(FIREWALL_STATION, {})
                or {}
            )

        record[
            "firewall"
        ] = firewall

        item = serialize_record(
            record
        )

        item[
            "record_id"
        ] = str(
            record["_id"]
        )

        item[
            "frame_no"
        ] = record.get(
            "frame_no",
            "",
        )

        item[
            "firewall_station"
        ] = FIREWALL_STATION

        item[
            "firewall_status"
        ] = station_data.get(
            "status",
            "WAITING",
        )

        # =================================================
        # PDI STATUS FOR FRONTEND
        # =================================================

        item[
            "pdi_station_3_status"
        ] = (
            record
            .get(
                "pdi",
                {},
            )
            .get(
                "stations",
                {},
            )
            .get(
                "PDI_STATION_3",
                {},
            )
            .get(
                "status"
            )
        )

        result.append(
            item
        )

    print(
        "FIREWALL QUEUE COUNT:",
        len(result),
    )

    print(
        "FIREWALL QUEUE FRAMES:",
        [
            item.get(
                "frame_no"
            )
            for item in result
        ],
    )

    return result


# =========================================================
# GET FIREWALL RECORD
# =========================================================

@router.get(
    "/{record_id}"
)
def get_firewall_record(
    record_id: str,
    operator=Depends(
        require_firewall
    ),
):

    station = get_station_from_operator(
        operator
    )

    record = get_record(
        record_id
    )

    # =====================================================
    # PDI COMPLETION
    # =====================================================

    if not all_pdi_stations_completed(
        record
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "PDI STATION 3 and PDI STATION 4 must "
                "be passed before Firewall."
            ),
        )

    # =====================================================
    # FIREWALL STRUCTURE
    # =====================================================

    firewall = ensure_firewall_structure(
        record
    )

    station_data = (
        firewall[
            "stations"
        ].get(
            station,
            {},
        )
    )

    return {

        "record":
            serialize_record(
                record
            ),

        "station":
            station,

        "station_data":
            serialize_value(
                station_data
            ),

        "frame_history":
            serialize_value(
                record.get(
                    "frame_history",
                    [],
                )
            ),
    }


# =========================================================
# START / RESUME FIREWALL
# =========================================================

@router.post(
    "/{record_id}/start"
)
def start_firewall_station(
    record_id: str,
    operator=Depends(
        require_firewall
    ),
):

    station = get_station_from_operator(
        operator
    )

    record = get_record(
        record_id
    )

    # =====================================================
    # PDI COMPLETION
    # =====================================================

    if not all_pdi_stations_completed(
        record
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "PDI STATION 3 and PDI STATION 4 must "
                "be passed before Firewall."
            ),
        )

    # =====================================================
    # FIREWALL STRUCTURE
    # =====================================================

    firewall = ensure_firewall_structure(
        record
    )

    station_data = (
        firewall[
            "stations"
        ][
            station
        ]
    )

    # =====================================================
    # ALREADY PASSED
    # =====================================================

    if (
        station_data.get(
            "status"
        )
        == "PASSED"
    ):

        return {

            "message":
                "Firewall inspection already completed",

            "station":
                station,

            "status":
                "PASSED",

            "read_only":
                True,

            "record":
                serialize_record(
                    record
                ),
        }

    # =====================================================
    # START FIREWALL
    # =====================================================

    now = utc_now()

    update_data = {

        f"firewall.stations.{station}.status":
            "IN_PROGRESS",

        f"firewall.stations.{station}.operator_id":
            operator.get(
                "operator_id"
            ),

        f"firewall.stations.{station}.operator_name":
            operator.get(
                "name"
            ),

        f"firewall.stations.{station}.shift":
            operator.get(
                "shift"
            ),

        f"firewall.stations.{station}.started_at":
            now,

        "firewall.status":
            "IN_PROGRESS",

        "overall_status":
            "FIREWALL_IN_PROGRESS",

        "current_stage":
            "FIREWALL",

        "current_station":
            "FIREWALL",
    }

    inspection_collection.update_one(
        {
            "_id":
                record["_id"]
        },
        {
            "$set":
                update_data
        }
    )

    updated_record = get_record(
        record_id
    )

    return {

        "message":
            "Firewall inspection started",

        "station":
            station,

        "status":
            "IN_PROGRESS",

        "read_only":
            False,

        "record":
            serialize_record(
                updated_record
            ),
    }


# =========================================================
# SAVE FIREWALL
# =========================================================

@router.put(
    "/{record_id}/station"
)
def save_firewall_station(
    record_id: str,
    payload: dict,
    operator=Depends(
        require_firewall
    ),
):

    station = get_station_from_operator(
        operator
    )

    record = get_record(
        record_id
    )

    # =====================================================
    # PDI COMPLETION
    # =====================================================

    if not all_pdi_stations_completed(
        record
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "PDI STATION 3 and PDI STATION 4 must "
                "be passed before Firewall."
            ),
        )

    # =====================================================
    # FIREWALL STRUCTURE
    # =====================================================

    firewall = ensure_firewall_structure(
        record
    )

    station_data = (
        firewall[
            "stations"
        ][
            station
        ]
    )

    # =====================================================
    # ALREADY PASSED
    # =====================================================

    if (
        station_data.get(
            "status"
        )
        == "PASSED"
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "This Firewall inspection is "
                "already completed and is read-only."
            ),
        )

    # =====================================================
    # GET PAYLOAD
    # =====================================================

    header = payload.get(
        "header",
        {}
    )

    rows = payload.get(
        "rows",
        []
    )

    signatures = payload.get(
        "signatures",
        {}
    )

    # =====================================================
    # VALIDATE
    # =====================================================

    if not isinstance(
        header,
        dict,
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid header data",
        )

    if not isinstance(
        rows,
        list,
    ):

        raise HTTPException(
            status_code=400,
            detail="Rows must be a list",
        )

    if not isinstance(
        signatures,
        dict,
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid signature data",
        )

    # =====================================================
    # SAVE
    # =====================================================

    now = utc_now()
    # =====================================================
# FRAME HISTORY ENTRY
# =====================================================

    frame_history_entry = {
        "station": "FIREWALL",
        "stage": "FIREWALL",
        "action": "STATION_COMPLETED",
        "status": "PASSED",
        "operator_id": operator.get("operator_id"),
        "operator_name": operator.get("name"),
        "shift": operator.get("shift"),
        "completed_at": now,
    }

    inspection_collection.update_one(
    {
        "_id":
            record["_id"]
    },
    {
        "$set": {

            f"firewall.stations.{station}.header":
                header,

            f"firewall.stations.{station}.rows":
                rows,

            f"firewall.stations.{station}.signatures":
                signatures,

            f"firewall.stations.{station}.status":
                "PASSED",

            f"firewall.stations.{station}.operator_id":
                operator.get("operator_id"),

            f"firewall.stations.{station}.operator_name":
                operator.get("name"),

            f"firewall.stations.{station}.shift":
                operator.get("shift"),

            f"firewall.stations.{station}.completed_at":
                now,

            f"firewall.stations.{station}.updated_at":
                now,

            "firewall.status":
                "IN_PROGRESS",

            "overall_status":
                "FIREWALL_IN_PROGRESS",

            "current_stage":
                "FIREWALL",

            "current_station":
                "FIREWALL",
        },

        "$push": {
            "frame_history":
                frame_history_entry,
        },
    }
)

    updated_record = get_record(
        record_id
    )

    return {

        "message":
            "Firewall inspection saved",

        "station":
            station,

        "status":
            "IN_PROGRESS",

        "record":
            serialize_record(
                updated_record
            ),
    }


# =========================================================
# PASS FIREWALL
# =========================================================

@router.post(
    "/{record_id}/pass"
)
def pass_firewall_station(
    record_id: str,
    payload: dict,
    operator=Depends(
        require_firewall
    ),
):

    station = get_station_from_operator(
        operator
    )

    record = get_record(
        record_id
    )

    # =====================================================
    # PDI COMPLETION
    # =====================================================

    if not all_pdi_stations_completed(
        record
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "PDI STATION 3 and PDI STATION 4 must "
                "be passed before Firewall."
            ),
        )

    # =====================================================
    # FIREWALL STRUCTURE
    # =====================================================

    firewall = ensure_firewall_structure(
        record
    )

    station_data = (
        firewall[
            "stations"
        ][
            station
        ]
    )

    # =====================================================
    # ALREADY PASSED
    # =====================================================

    if (
        station_data.get(
            "status"
        )
        == "PASSED"
    ):

        return {

            "message":
                "Firewall inspection already completed",

            "station":
                station,

            "status":
                "PASSED",

            "read_only":
                True,

            "all_stations_completed":
                True,

            "record":
                serialize_record(
                    record
                ),
        }

    # =====================================================
    # GET DATA
    # =====================================================

    header = payload.get(
        "header",
        station_data.get(
            "header",
            {},
        )
    )

    rows = payload.get(
        "rows",
        station_data.get(
            "rows",
            [],
        )
    )

    signatures = payload.get(
        "signatures",
        station_data.get(
            "signatures",
            {},
        )
    )

    # =====================================================
    # VALIDATE
    # =====================================================

    if not isinstance(
        header,
        dict,
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid header data",
        )

    if not isinstance(
        rows,
        list,
    ):

        raise HTTPException(
            status_code=400,
            detail="Rows must be a list",
        )

    if not isinstance(
        signatures,
        dict,
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid signature data",
        )

    # =====================================================
    # REQUIRE DATA
    # =====================================================

    if len(rows) == 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Enter at least one Firewall "
                "inspection row before completing."
            ),
        )

    # =====================================================
    # PASS FIREWALL
    # =====================================================

    now = utc_now()

    # =====================================================
    # FRAME HISTORY ENTRY
    # =====================================================
    #
    # IMPORTANT:
    #
    # This is the ONLY place where a Firewall completion
    # event is added to frame_history.
    #
    # The variable is created locally inside this function
    # and therefore cannot be undefined because of another
    # endpoint's scope.
    #
    # =====================================================

    frame_history_entry = build_frame_history_entry(
        station="FIREWALL",
        stage="FIREWALL",
        action="STATION_COMPLETED",
        status="OK",
        operator=operator,
        started_at=station_data.get(
            "started_at"
        ),
        completed_at=now,
    )

    inspection_collection.update_one(
        {
            "_id":
                record["_id"]
        },
        {
            "$set": {

                f"firewall.stations.{station}.header":
                    header,

                f"firewall.stations.{station}.rows":
                    rows,

                f"firewall.stations.{station}.signatures":
                    signatures,

                f"firewall.stations.{station}.status":
                    "PASSED",

                f"firewall.stations.{station}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"firewall.stations.{station}.operator_name":
                    operator.get(
                        "name"
                    ),

                f"firewall.stations.{station}.shift":
                    operator.get(
                        "shift"
                    ),

                f"firewall.stations.{station}.completed_at":
                    now,

                f"firewall.stations.{station}.updated_at":
                    now,

                "firewall.status":
                    "IN_PROGRESS",

                "overall_status":
                    "FIREWALL_IN_PROGRESS",

                "current_stage":
                    "FIREWALL",

                "current_station":
                    "FIREWALL",
            },

            "$push": {
                "frame_history":
                    frame_history_entry,
            },
        }
    )

    # =====================================================
    # GET UPDATED RECORD
    # =====================================================

    updated_record = get_record(
        record_id
    )

    # =====================================================
    # FIREWALL COMPLETED
    # =====================================================

    final_status = (
        update_global_firewall_status(
            updated_record
        )
    )

    # =====================================================
    # FINAL RECORD
    # =====================================================

    final_record = get_record(
        record_id
    )

    return {

        "message":
            "Firewall inspection completed",

        "station":
            station,

        "status":
            "PASSED",

        "firewall_status":
            final_status,

        "read_only":
            True,

        "all_stations_completed":
            final_status == "COMPLETED",

        "record":
            serialize_record(
                final_record
            ),
    }


# =========================================================
# VIEW FIREWALL RECORD / HISTORY
# =========================================================

@router.get(
    "/{record_id}/history"
)
def get_firewall_history(
    record_id: str,
    operator=Depends(
        require_firewall
    ),
):

    station = get_station_from_operator(
        operator
    )

    record = get_record(
        record_id
    )

    firewall = (
        record.get(
            "firewall",
            {},
        )
        or {}
    )

    station_data = (
        firewall
        .get(
            "stations",
            {},
        )
        .get(
            station,
            {},
        )
    )

    return {

        "record_id":
            str(
                record["_id"]
            ),

        "frame_no":
            record.get(
                "frame_no"
            ),

        "overall_status":
            record.get(
                "overall_status"
            ),

        "station":
            station,

        "firewall":
            serialize_value(
                firewall
            ),

        "station_data":
            serialize_value(
                station_data
            ),

        # IMPORTANT:
        # Return the frame-level history too.
        "frame_history":
            serialize_value(
                record.get(
                    "frame_history",
                    [],
                )
            ),
    }

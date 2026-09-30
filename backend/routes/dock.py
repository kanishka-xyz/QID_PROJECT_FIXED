from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database.mongodb import inspection_collection
from routes.core.operator_security import get_operator


router = APIRouter(
    prefix="/dock",
    tags=["Dock"],
)


# ============================================================
# DOCK STATIONS
# ============================================================

DOCK_STATIONS = [
    "DOCK_STATION_1",
    "DOCK_STATION_2",
    "DOCK_STATION_3",
    "DOCK_STATION_4",
    "DOCK_STATION_5",
]


DOCK_STATION_LABELS = {
    "DOCK_STATION_1": "Top Side Burr Inspection",
    "DOCK_STATION_2": "Top Side Leakage Test",
    "DOCK_STATION_3": "Top Side Vacuum Cleaning",
    "DOCK_STATION_4": "Top Side Borescope Inspection",
    "DOCK_STATION_5": "Bottom Side Gauge + Visual Inspection",
}


# ============================================================
# EXISTING OP40 LEAKAGE POINTS
# ============================================================
#
# IMPORTANT:
# These are the EXISTING OP40 fields.
# Dock Station 2 uses these same point IDs.
# We do NOT create a new leakage checklist.
#
# ============================================================

OP40_LEAKAGE_FIELDS = [
    "top_T1",
    "top_T3_I",
    "top_T1_O",

    "top_T2",
    "top_T2_I",
    "top_T2_O",

    "top_T3",
    "top_T3_I_2",
    "top_T3_O",

    "top_T4",
    "top_T4_I",
    "top_T4_O",

    "bottom_B1",
    "bottom_B2",
    "bottom_B3",
    "bottom_B4",

    "vent_valve_I",

    "fm_cm",
    "rm_cm",

    "leakage_ok",
]


OP40_LABELS = {
    "top_T1": "Top T1",
    "top_T3_I": "Top T3 I",
    "top_T1_O": "Top T1 O",

    "top_T2": "Top T2",
    "top_T2_I": "Top T2 I",
    "top_T2_O": "Top T2 O",

    "top_T3": "Top T3",
    "top_T3_I_2": "Top T3 I-2",
    "top_T3_O": "Top T3 O",

    "top_T4": "Top T4",
    "top_T4_I": "Top T4 I",
    "top_T4_O": "Top T4 O",

    "bottom_B1": "Bottom B1",
    "bottom_B2": "Bottom B2",
    "bottom_B3": "Bottom B3",
    "bottom_B4": "Bottom B4",

    "vent_valve_I": "Vent Valve I",

    "fm_cm": "FM-CM",
    "rm_cm": "RM-CM",

    "leakage_ok": "Leakage Overall Result",
}


# ============================================================
# STATION 4 POINTS
# ============================================================
#
# These IDs match the current Dock frontend.
#
# ============================================================

ST4_POINTS = [
    # Source: Dock Boroscopic Checksheet new.xlsx -> M6 & M8 sheet.
    # Each boroscope inspection location is a separate mandatory point.
    ("CM2_TOP", "CM-2 Burrs - Top"),
    ("CM2_BOTTOM", "CM-2 Burrs - Bottom"),
    ("CM2_M6_FACE_HOLE", "CM-2 Burrs - M6 Face Hole"),
    ("CM2_M8_FACE_HOLE", "CM-2 Burrs - M8 Face Hole"),

    ("CM3_TOP", "CM-3 Burrs - Top"),
    ("CM3_BOTTOM", "CM-3 Burrs - Bottom"),
    ("CM3_M6_FACE_HOLE", "CM-3 Burrs - M6 Face Hole"),
    ("CM3_M8_FACE_HOLE", "CM-3 Burrs - M8 Face Hole"),

    ("CM4_FM_RH_TOP", "CM-4 Burrs FM RH - Top"),
    ("CM4_FM_RH_BOTTOM", "CM-4 Burrs FM RH - Bottom"),
    ("CM4_FM_RH_M6_FACE_HOLE", "CM-4 Burrs FM RH - M6 Face Hole"),
    ("CM4_FM_RH_M8_FACE_HOLE", "CM-4 Burrs FM RH - M8 Face Hole"),

    ("CM4_FM_LH_TOP", "CM-4 Burrs FM LH - Top"),
    ("CM4_FM_LH_BOTTOM", "CM-4 Burrs FM LH - Bottom"),
    ("CM4_FM_LH_M6_FACE_HOLE", "CM-4 Burrs FM LH - M6 Face Hole"),
    ("CM4_FM_LH_M8_FACE_HOLE", "CM-4 Burrs FM LH - M8 Face Hole"),

    ("CM4_RM_RH_TOP", "CM-4 Burrs RM RH - Top"),
    ("CM4_RM_RH_BOTTOM", "CM-4 Burrs RM RH - Bottom"),
    ("CM4_RM_RH_M6_FACE_HOLE", "CM-4 Burrs RM RH - M6 Face Hole"),
    ("CM4_RM_RH_M8_FACE_HOLE", "CM-4 Burrs RM RH - M8 Face Hole"),

    ("CM4_RM_LH_TOP", "CM-4 Burrs RM LH - Top"),
    ("CM4_RM_LH_BOTTOM", "CM-4 Burrs RM LH - Bottom"),
    ("CM4_RM_LH_M6_FACE_HOLE", "CM-4 Burrs RM LH - M6 Face Hole"),
    ("CM4_RM_LH_M8_FACE_HOLE", "CM-4 Burrs RM LH - M8 Face Hole"),
]


# ============================================================
# STATION 5 POINTS
# ============================================================
#
# These IDs match the current Dock frontend.
#
# ============================================================

ST5_POINTS = [
    (
        "BOTTOM_VISUAL",
        "Bottom Side Visual Inspection",
    ),
    (
        "BOTTOM_BURR",
        "Bottom Side Burr Inspection",
    ),
    (
        "BOTTOM_VACUUM",
        "Bottom Side Vacuum Cleaning",
    ),
    (
        "BOTTOM_GAUGE",
        "Bottom Side Gauge Inspection",
    ),
    (
        "BOTTOM_HOLES",
        "Bottom Side Holes Inspection",
    ),
    (
        "BOTTOM_FRAME",
        "Bottom Side Frame Inspection",
    ),
]


# ============================================================
# CHECKPOINT HELPER
# ============================================================

def make_checkpoint(
    checkpoint_id,
    sr_no,
    checkpoint,
    criteria="",
):
    return {
        "checkpoint_id": checkpoint_id,
        "sr_no": sr_no,
        "checkpoint": checkpoint,
        "criteria": criteria,
    }


# ============================================================
# CHECKPOINT DEFINITIONS
# ============================================================

def checkpoint_definitions(station):

    # --------------------------------------------------------
    # STATION 1
    # --------------------------------------------------------

    if station == "DOCK_STATION_1":

        return [
            make_checkpoint(
                "TOP_BURR_01",
                1,
                "Top Side Burr Inspection",
                "No burr",
            ),
        ]


    # --------------------------------------------------------
    # STATION 2
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # Uses the SAME OP40 leakage point IDs.
    #
    # --------------------------------------------------------

    if station == "DOCK_STATION_2":

        return [
            make_checkpoint(
                field,
                index,
                OP40_LABELS.get(
                    field,
                    field,
                ),
                "Existing OP40 leakage point",
            )
            for index, field in enumerate(
                OP40_LEAKAGE_FIELDS,
                start=1,
            )
        ]


    # --------------------------------------------------------
    # STATION 3
    # --------------------------------------------------------

    if station == "DOCK_STATION_3":

        return [
            make_checkpoint(
                "TOP_VACUUM_01",
                1,
                "Top Side Vacuum Cleaning",
                "Cleaning completed",
            ),
        ]


    # --------------------------------------------------------
    # STATION 4
    # --------------------------------------------------------

    if station == "DOCK_STATION_4":

        return [
            make_checkpoint(
                checkpoint_id,
                index,
                label,
                "No chips & Burs Allowed",
            )
            for index, (
                checkpoint_id,
                label,
            ) in enumerate(
                ST4_POINTS,
                start=1,
            )
        ]


    # --------------------------------------------------------
    # STATION 5
    # --------------------------------------------------------

    if station == "DOCK_STATION_5":

        return [
            make_checkpoint(
                checkpoint_id,
                index,
                label,
                "Inspection completed",
            )
            for index, (
                checkpoint_id,
                label,
            ) in enumerate(
                ST5_POINTS,
                start=1,
            )
        ]


    return []


# ============================================================
# REQUEST MODELS
# ============================================================

class DockStartRequest(BaseModel):

    record_id: str


class DockCheckpointRequest(BaseModel):

    value: str

    remark: str = ""


# ============================================================
# TIME
# ============================================================

def utc_now():

    return datetime.now(
        timezone.utc
    )


# ============================================================
# OBJECT ID
# ============================================================

def check_id(record_id):

    if not ObjectId.is_valid(
        record_id
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid record id",
        )

    return ObjectId(
        record_id
    )


# ============================================================
# SERIALIZE
# ============================================================

def serialize(value):

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
        list,
    ):

        return [
            serialize(item)
            for item in value
        ]


    if isinstance(
        value,
        dict,
    ):

        return {
            key: serialize(item)
            for key, item in value.items()
        }


    return value


# ============================================================
# GET DOCK STATION FROM OPERATOR
# ============================================================

def get_dock_station(operator):

    station = str(
        operator.get(
            "station",
            "",
        )
    ).strip().upper()


    aliases = {}


    for number in range(
        1,
        6,
    ):

        canonical = (
            f"DOCK_STATION_{number}"
        )

        aliases[
            canonical
        ] = canonical

        aliases[
            f"DOCK STATION {number}"
        ] = canonical

        aliases[
            f"DOCK-{number}"
        ] = canonical

        # Accept DOC naming as an alias for the Dock workflow.
        aliases[
            f"DOC_STATION_{number}"
        ] = canonical

        aliases[
            f"DOC STATION {number}"
        ] = canonical

        aliases[
            f"DOC-{number}"
        ] = canonical


    dock_station = aliases.get(
        station
    )


    if not dock_station:

        raise HTTPException(
            status_code=403,
            detail=(
                "Operator is not assigned "
                "to a Dock station."
            ),
        )


    return dock_station


# ============================================================
# BUILD CHECKPOINTS
# ============================================================

def build_checkpoints(
    station,
    old=None,
):

    old = old or {}

    result = {}


    # --------------------------------------------------------
    # Legacy IDs
    # --------------------------------------------------------
    #
    # This fixes existing MongoDB records created by the
    # previous frontend.
    #
    # --------------------------------------------------------

    legacy_ids = {

        "TOP_BURR_01": [
            "DOCK1_TOP_BURR",
        ],

        "TOP_VACUUM_01": [
            "DOCK3_VACUUM",
        ],

    }


    definitions = checkpoint_definitions(
        station
    )


    for item in definitions:

        checkpoint_id = (
            item["checkpoint_id"]
        )


        previous = old.get(
            checkpoint_id
        )


        # ----------------------------------------------------
        # Migrate old checkpoint IDs
        # ----------------------------------------------------

        if previous is None:

            for old_id in legacy_ids.get(
                checkpoint_id,
                [],
            ):

                if old_id in old:

                    previous = old[
                        old_id
                    ]

                    break


        previous = previous or {}


        result[
            checkpoint_id
        ] = {

            "checkpoint_id":
                checkpoint_id,

            "sr_no":
                item.get(
                    "sr_no"
                ),

            "checkpoint":
                item.get(
                    "checkpoint"
                ),

            "criteria":
                item.get(
                    "criteria",
                    "",
                ),

            "value":
                previous.get(
                    "value"
                ),

            "remark":
                previous.get(
                    "remark",
                    "",
                ),

            "operator_id":
                previous.get(
                    "operator_id"
                ),

            "operator_name":
                previous.get(
                    "operator_name"
                ),

            "updated_at":
                previous.get(
                    "updated_at"
                ),

            "history":
                previous.get(
                    "history",
                    [],
                ),

        }


    return result


# ============================================================
# BUILD STATION
# ============================================================

def build_station(
    station,
    old=None,
):

    old = old or {}


    return {

        "station":
            station,

        "station_label":
            DOCK_STATION_LABELS[
                station
            ],

        "status":
            old.get(
                "status",
                "WAITING",
            ),

        "result_status":
            old.get(
                "result_status"
            ),

        "operator_id":
            old.get(
                "operator_id"
            ),

        "operator_name":
            old.get(
                "operator_name"
            ),

        "shift":
            old.get(
                "shift"
            ),

        "started_at":
            old.get(
                "started_at"
            ),

        "completed_at":
            old.get(
                "completed_at"
            ),

        "nok_points":
            old.get(
                "nok_points",
                [],
            ),

        "checkpoints":
            build_checkpoints(
                station,
                old.get(
                    "checkpoints",
                    {},
                ),
            ),

    }


# ============================================================
# NORMALIZE DOCK
# ============================================================

def normalize_dock(record):

    old_dock = (
        record.get(
            "dock"
        )
        or {}
    )


    old_stations = (
        old_dock.get(
            "stations"
        )
        or {}
    )


    stations = {}


    for station in DOCK_STATIONS:

        stations[
            station
        ] = build_station(
            station,
            old_stations.get(
                station
            ),
        )


    return {

        "status":
            old_dock.get(
                "status",
                "IN_PROGRESS",
            ),

        "started_at":
            old_dock.get(
                "started_at"
            )
            or utc_now(),

        "completed_at":
            old_dock.get(
                "completed_at"
            ),

        "stations":
            stations,

    }


# ============================================================
# ENSURE DOCK STRUCTURE EXISTS
# ============================================================

def ensure_dock_exists(record):

    normalized = normalize_dock(
        record
    )


    inspection_collection.update_one(
        {
            "_id":
                record["_id"],
        },
        {
            "$set": {
                "dock":
                    normalized,

                "updated_at":
                    utc_now(),
            }
        },
    )


# ============================================================
# GET STATION DATA
# ============================================================

def get_station_data(
    record,
    station,
):

    dock = (
        record.get(
            "dock"
        )
        or {}
    )


    stations = (
        dock.get(
            "stations"
        )
        or {}
    )


    return stations.get(
        station
    )


# ============================================================
# DOCK SUMMARY
# ============================================================

def dock_summary(record):

    dock = (
        record.get(
            "dock"
        )
        or {}
    )


    stations = (
        dock.get(
            "stations"
        )
        or {}
    )


    result = []


    for station in DOCK_STATIONS:

        station_data = (
            stations.get(
                station
            )
            or {}
        )


        checkpoints = (
            station_data.get(
                "checkpoints"
            )
            or {}
        )


        answered = sum(
            1
            for checkpoint
            in checkpoints.values()
            if checkpoint.get(
                "value"
            ) in (
                "OK",
                "NOK",
            )
        )


        result.append({

            "station":
                station,

            "station_label":
                DOCK_STATION_LABELS[
                    station
                ],

            "status":
                station_data.get(
                    "status",
                    "WAITING",
                ),

            "result_status":
                station_data.get(
                    "result_status"
                ),

            "answered":
                answered,

            "total":
                len(
                    checkpoints
                ),

        })


    return result


# ============================================================
# ALL DOCK STATIONS PASSED
# ============================================================

def all_dock_stations_passed(
    record
):

    dock = (
        record.get(
            "dock"
        )
        or {}
    )


    stations = (
        dock.get(
            "stations"
        )
        or {}
    )


    for station in DOCK_STATIONS:

        station_data = (
            stations.get(
                station
            )
            or {}
        )


        if station_data.get(
            "status"
        ) != "PASSED":

            return False


    return True


# ============================================================
# DOCK SEQUENCE
# ============================================================

def ensure_dock_sequence(record, station):
    """
    Dock is strictly sequential:
        Firewall -> Dock 1 -> Dock 2 -> Dock 3 -> Dock 4 -> Dock 5
    """

    current = str(
        record.get("current_station", "")
    ).strip().upper()

    # Legacy/first entry: only Dock 1 can initialize from Firewall.
    if station == "DOCK_STATION_1":
        if current not in {"DOCK_STATION_1", "DOCK_PENDING"}:
            if record.get("firewall", {}).get("status") != "COMPLETED":
                raise HTTPException(
                    status_code=403,
                    detail="Firewall must be completed before Dock Station 1."
                )
        return

    station_number = int(station.rsplit("_", 1)[1])
    previous = f"DOCK_STATION_{station_number - 1}"

    previous_status = (
        (record.get("dock", {}).get("stations", {}).get(previous, {}) or {})
        .get("status")
    )

    if previous_status != "PASSED" or current != station:
        raise HTTPException(
            status_code=403,
            detail=f"{previous} must be passed before {station}."
        )


# ============================================================
# QUEUE
# ============================================================

@router.get(
    "/queue"
)
def get_dock_queue(
    operator=Depends(
        get_operator
    ),
):

    station = get_dock_station(
        operator
    )


    # ========================================================
    # NORMALIZE THE NEXT DOCK STATION
    #
    # The completion endpoint normally advances current_station.
    # This fallback also repairs older/stale records where the
    # previous Dock station is already PASSED but current_station
    # was not advanced.
    # ========================================================

    if station == "DOCK_STATION_1":

        inspection_collection.update_many(
            {
                "firewall.stations.FIREWALL.status": "PASSED",
                "dock.stations.DOCK_STATION_1.status": {
                    "$ne": "PASSED"
                },
                "current_station": {
                    "$in": [
                        "DOCK_STATION_1",
                        "DOCK_PENDING",
                        "FIREWALL",
                    ]
                },
            },
            {
                "$set": {
                    "overall_status": "DOCK_PENDING",
                    "current_stage": "DOCK_STATION_1",
                    "current_station": "DOCK_STATION_1",
                    "updated_at": utc_now(),
                }
            },
        )

    else:

        station_number = int(
            station.rsplit("_", 1)[1]
        )

        previous_station = (
            f"DOCK_STATION_{station_number - 1}"
        )

        inspection_collection.update_many(
            {
                "firewall.stations.FIREWALL.status": "PASSED",
                f"dock.stations.{previous_station}.status": "PASSED",
                f"dock.stations.{station}.status": {
                    "$ne": "PASSED"
                },
                "current_station": {
                    "$in": [
                        previous_station,
                        station,
                    ]
                },
            },
            {
                "$set": {
                    "overall_status": "DOCK_IN_PROGRESS",
                    "current_stage": station,
                    "current_station": station,
                    "updated_at": utc_now(),
                }
            },
        )

    records = list(
        inspection_collection.find(
            {
                "firewall.stations.FIREWALL.status": "PASSED",
                "current_station": station,
                "overall_status": {
                    "$in": [
                        "DOCK_PENDING",
                        "DOCK_IN_PROGRESS",
                    ]
                },
            }
        )
        .sort("_id", -1)
        .limit(100)
    )


    result = []


    for record in records:

        dock = (
            record.get(
                "dock"
            )
            or {}
        )


        station_data = (
            dock.get(
                "stations"
            )
            or {}
        ).get(
            station
        ) or {}


        # Already passed by this station
        if station_data.get(
            "status"
        ) == "PASSED":

            continue


        item = serialize(
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
            "firewall_status"
        ] = (
            record
            .get(
                "firewall",
                {}
            )
            .get(
                "stations",
                {}
            )
            .get(
                "FIREWALL",
                {}
            )
            .get(
                "status"
            )
        )


        item[
            "dock_station"
        ] = station


        item[
            "dock_station_label"
        ] = DOCK_STATION_LABELS[
            station
        ]


        item[
            "dock_station_status"
        ] = station_data.get(
            "status",
            "WAITING",
        )


        result.append(
            item
        )


    return result


# ============================================================
# GET FRAME
# ============================================================

@router.get(
    "/frame/{record_id}"
)
def get_dock_frame(
    record_id: str,
    operator=Depends(
        get_operator
    ),
):

    object_id = check_id(
        record_id
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
            detail="Inspection not found",
        )


    station = get_dock_station(
        operator
    )


    # --------------------------------------------------------
    # IMPORTANT:
    # This also migrates old IDs such as
    # DOCK1_TOP_BURR -> TOP_BURR_01
    # --------------------------------------------------------

    ensure_dock_exists(
        record
    )


    record = (
        inspection_collection.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    result = serialize(
        record
    )


    result[
        "operator_dock_station"
    ] = station


    result[
        "dock_summary"
    ] = dock_summary(
        record
    )


    return result


# ============================================================
# START DOCK STATION
# ============================================================

@router.post(
    "/start"
)
def start_dock(
    request: DockStartRequest,
    operator=Depends(
        get_operator
    ),
):

    object_id = check_id(
        request.record_id
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
            detail="Inspection not found",
        )


    station = get_dock_station(
        operator
    )

    ensure_dock_sequence(
        record,
        station,
    )

    ensure_dock_exists(
        record
    )


    record = (
        inspection_collection.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    station_data = get_station_data(
        record,
        station,
    )


    if not station_data:

        raise HTTPException(
            status_code=404,
            detail=(
                "Dock station data not found."
            ),
        )


    if station_data.get(
        "status"
    ) == "PASSED":

        result = serialize(
            record
        )

        result[
            "dock_summary"
        ] = dock_summary(
            record
        )

        return result


    now = utc_now()


    inspection_collection.update_one(
        {
            "_id":
                object_id
        },
        {
            "$set": {

                f"dock.stations.{station}.status":
                    "IN_PROGRESS",

                f"dock.stations.{station}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"dock.stations.{station}.operator_name":
                    operator.get(
                        "name"
                    ),

                f"dock.stations.{station}.shift":
                    operator.get(
                        "shift"
                    ),

                f"dock.stations.{station}.started_at":
                    station_data.get(
                        "started_at"
                    )
                    or now,

                "dock.status":
                    "IN_PROGRESS",

                "updated_at":
                    now,

            }
        },
    )


    updated = (
        inspection_collection.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    result = serialize(
        updated
    )


    result[
        "dock_summary"
    ] = dock_summary(
        updated
    )


    return result


# ============================================================
# SAVE CHECKPOINT
# ============================================================

@router.put(
    "/frame/{record_id}/checkpoint/{checkpoint_id}"
)
def save_dock_checkpoint(
    record_id: str,
    checkpoint_id: str,
    request: DockCheckpointRequest,
    operator=Depends(
        get_operator
    ),
):

    value = str(
        request.value
    ).strip().upper()


    if value not in (
        "OK",
        "NOK",
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Checkpoint value must be OK or NOK."
            ),
        )


    # --------------------------------------------------------
    # REMARK IS NOT REQUIRED WHEN CLICKING OK/NOK.
    #
    # It is required when completing the station.
    # --------------------------------------------------------

    remark = str(
        request.remark
        or ""
    ).strip()


    object_id = check_id(
        record_id
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
            detail="Inspection not found",
        )


    station = get_dock_station(
        operator
    )

    ensure_dock_sequence(
        record,
        station,
    )

    ensure_dock_exists(
        record
    )


    record = (
        inspection_collection.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    station_data = get_station_data(
        record,
        station,
    )


    if not station_data:

        raise HTTPException(
            status_code=404,
            detail=(
                "Dock station not found."
            ),
        )


    if station_data.get(
        "status"
    ) == "PASSED":

        raise HTTPException(
            status_code=403,
            detail=(
                "This Dock station is already completed."
            ),
        )


    checkpoints = (
        station_data.get(
            "checkpoints"
        )
        or {}
    )


    if checkpoint_id not in checkpoints:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Checkpoint '{checkpoint_id}' "
                "not found for this Dock station."
            ),
        )


    now = utc_now()


    history_entry = {

        "value":
            value,

        "remark":
            remark,

        "operator_id":
            operator.get(
                "operator_id"
            ),

        "operator_name":
            operator.get(
                "name"
            ),

        "timestamp":
            now,

    }


    base = (
        f"dock.stations."
        f"{station}."
        f"checkpoints."
        f"{checkpoint_id}"
    )


    inspection_collection.update_one(
        {
            "_id":
                object_id
        },
        {

            "$set": {

                f"{base}.value":
                    value,

                f"{base}.remark":
                    remark,

                f"{base}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"{base}.operator_name":
                    operator.get(
                        "name"
                    ),

                f"{base}.updated_at":
                    now,

                f"dock.stations.{station}.status":
                    "IN_PROGRESS",

                f"dock.stations.{station}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"dock.stations.{station}.operator_name":
                    operator.get(
                        "name"
                    ),

                "dock.status":
                    "IN_PROGRESS",

                "updated_at":
                    now,

            },

            "$push": {

                f"{base}.history":
                    history_entry

            },

        },
    )


    updated = (
        inspection_collection.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    result = serialize(
        updated
    )


    result[
        "dock_summary"
    ] = dock_summary(
        updated
    )


    return result


# ============================================================
# COMPLETE DOCK STATION
# ============================================================

# ============================================================
# COMPLETE DOCK STATION
# ============================================================

@router.post(
    "/frame/{record_id}/complete"
)
def complete_dock_station(
    record_id: str,
    operator=Depends(
        get_operator
    ),
):

    object_id = check_id(
        record_id
    )

    record = (
        inspection_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found",
        )

    station = get_dock_station(
        operator
    )

    # Make sure current Dock structure exists
    ensure_dock_exists(
        record
    )

    record = (
        inspection_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    station_data = get_station_data(
        record,
        station,
    )

    if not station_data:
        raise HTTPException(
            status_code=404,
            detail="Dock station not started.",
        )

    checkpoints = (
        station_data.get(
            "checkpoints"
        )
        or {}
    )

    if not checkpoints:
        raise HTTPException(
            status_code=400,
            detail=(
                "No checkpoints configured "
                "for this Dock station."
            ),
        )

    # ========================================================
    # ONLY RESULT IS COMPULSORY
    #
    # Remark is OPTIONAL.
    #
    # Every checkpoint must have:
    #     OK
    # OR
    #     NOK
    # ========================================================

    missing = []

    for checkpoint_id, checkpoint in checkpoints.items():

        value = checkpoint.get(
            "value"
        )

        if value not in (
            "OK",
            "NOK",
        ):
            missing.append(
                checkpoint_id
            )

    if missing:

        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "Complete result for every "
                    "inspection point."
                ),
                "missing_checkpoints": missing,
            },
        )

    # ========================================================
    # FIND NOK POINTS
    # ========================================================

    nok_points = []

    for checkpoint_id, checkpoint in checkpoints.items():

        if checkpoint.get(
            "value"
        ) == "NOK":

            nok_points.append(
                {
                    "checkpoint_id":
                        checkpoint_id,

                    "checkpoint":
                        checkpoint.get(
                            "checkpoint"
                        ),

                    "remark":
                        checkpoint.get(
                            "remark",
                            "",
                        ),
                }
            )

    now = utc_now()

    # ========================================================
    # STATION RESULT
    # ========================================================

    if nok_points:

        station_status = "NOK"
        result_status = "NOK"

    else:

        station_status = "PASSED"
        result_status = "OK"

    inspection_collection.update_one(
        {
            "_id": object_id
        },
        {
            "$set": {

                f"dock.stations.{station}.status":
                    station_status,

                f"dock.stations.{station}.result_status":
                    result_status,

                f"dock.stations.{station}.completed_at":
                    now,

                f"dock.stations.{station}.nok_points":
                    nok_points,

                "updated_at":
                    now,
            }
        },
    )

    updated = (
        inspection_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    # ========================================================
    # MOVE STRICTLY TO THE NEXT DOCK STATION
    # ========================================================

    history_entry = {
        "station": station,
        "stage": station,
        "action": "STATION_COMPLETED",
        "status": result_status,
        "operator_id": operator.get("operator_id"),
        "operator_name": operator.get("name"),
        "shift": operator.get("shift"),
        "completed_at": now,
    }

    if station_status == "PASSED":
        station_number = int(station.rsplit("_", 1)[1])

        if station_number < 5:
            next_station = f"DOCK_STATION_{station_number + 1}"

            inspection_collection.update_one(
                {"_id": object_id},
                {
                    "$set": {
                        "dock.status": "IN_PROGRESS",
                        "overall_status": "DOCK_IN_PROGRESS",
                        "current_stage": next_station,
                        "current_station": next_station,
                        "updated_at": now,
                    },
                    "$push": {
                        "frame_history": history_entry,
                    },
                },
            )
        else:
            inspection_collection.update_one(
                {"_id": object_id},
                {
                    "$set": {
                        "dock.status": "COMPLETED",
                        "dock.completed_at": now,
                        "overall_status": "COMPLETED",
                        "current_stage": "COMPLETED",
                        "current_station": "COMPLETED",
                        "completed_at": now,
                        "updated_at": now,
                    },
                    "$push": {
                        "frame_history": history_entry,
                    },
                },
            )
    else:
        # A Dock NOK remains at the same station until corrected.
        inspection_collection.update_one(
            {"_id": object_id},
            {
                "$set": {
                    "dock.status": "IN_PROGRESS",
                    "overall_status": "DOCK_IN_PROGRESS",
                    "current_stage": station,
                    "current_station": station,
                    "updated_at": now,
                },
                "$push": {
                    "frame_history": history_entry,
                },
            },
        )

    updated = (
        inspection_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    result = serialize(
        updated
    )

    result[
        "dock_summary"
    ] = dock_summary(
        updated
    )

    return result
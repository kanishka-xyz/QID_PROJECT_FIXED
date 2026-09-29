# ============================================================
# routes/op60.py
# OP60 REWORK
# ============================================================

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from database.mongodb import inspection_collection
from models.schema import ReworkRequest
from routes.core.operator_security import get_operator, require_op60


router = APIRouter(
    prefix="/op60",
    tags=["OP60 Rework"],
)


STAGES = [
    "STAGE_1",
    "STAGE_2",
    "STAGE_3",
]


# ============================================================
# SEPARATE PDI REWORK STATIONS
# ============================================================
#
# IMPORTANT:
#
# These are NOT OP40 sheet4 / OP40 PDI.
#
# PDI is handled by:
#
#     PDI_STATION_3
#     PDI_STATION_4
#
# ============================================================

PDI_REWORK_STATIONS = [
    "PDI_STATION_3",
]


# ============================================================
# SHEET ALIASES
# ============================================================

SHEET_ALIASES = {
    "sheet1": "sheet1",
    "sheet2": "sheet2",
    "sheet3": "sheet3",
    "sheet4": "sheet4",

    "leakage": "sheet1",

    "defect": "sheet2",
    "defects": "sheet2",

    "spatter": "sheet3",

}


# ============================================================
# NORMALIZE SHEET NAME
# ============================================================

def normalize_sheet_name(sheet_name):

    if not sheet_name:
        return sheet_name

    value = str(
        sheet_name
    ).strip().lower()

    return SHEET_ALIASES.get(
        value,
        value,
    )


# ============================================================
# NORMALIZE OP40 FIELD
# ============================================================

def normalize_field(field):

    if not field:
        return ""

    field = str(
        field
    ).strip()

    parts = field.split(
        ".",
        1,
    )

    if len(parts) != 2:
        return field

    return (
        f"{normalize_sheet_name(parts[0])}."
        f"{parts[1].strip()}"
    )


# ============================================================
# NORMALIZE STATUS
# ============================================================

def normalize_status(value):

    return str(
        value or ""
    ).strip().upper()


# ============================================================
# COLLECT OP40 NOK ITEMS
# ============================================================

def collect_nok_items(
    data,
    prefix="",
):

    result = []

    if isinstance(
        data,
        dict,
    ):

        for key, value in data.items():

            current_path = (
                f"{prefix}.{key}"
                if prefix
                else str(key)
            )

            if isinstance(
                value,
                str,
            ):

                if normalize_status(value) in {
                    "NO",
                    "NOK",
                }:

                    result.append(
                        current_path
                    )

            elif isinstance(
                value,
                (dict, list),
            ):

                result.extend(
                    collect_nok_items(
                        value,
                        current_path,
                    )
                )

    elif isinstance(
        data,
        list,
    ):

        for index, value in enumerate(
            data
        ):

            current_path = (
                f"{prefix}.{index}"
                if prefix
                else str(index)
            )

            if isinstance(
                value,
                (dict, list),
            ):

                result.extend(
                    collect_nok_items(
                        value,
                        current_path,
                    )
                )

            elif isinstance(
                value,
                str,
            ):

                if normalize_status(value) in {
                    "NO",
                    "NOK",
                }:

                    result.append(
                        current_path
                    )

    return result


# ============================================================
# GET NESTED VALUE
# ============================================================

def get_nested_value(
    data,
    path,
):

    if not path:
        return None

    current = data

    for part in str(
        path
    ).split("."):

        if isinstance(
            current,
            list,
        ):

            try:

                current = current[
                    int(part)
                ]

            except (
                ValueError,
                IndexError,
                TypeError,
            ):

                return None

        elif isinstance(
            current,
            dict,
        ):

            if part not in current:
                return None

            current = current[
                part
            ]

        else:

            return None

    return current


# ============================================================
# GET OP40 STAGE DATA
# ============================================================

def get_stage_data(
    record,
    stage,
):

    stage = str(
        stage
    ).strip().upper()

    stages = record.get(
        "stages",
        {},
    )

    if not isinstance(
        stages,
        dict,
    ):

        return {}

    stage_obj = stages.get(
        stage
    )

    if not isinstance(
        stage_obj,
        dict,
    ):

        return {}

    sheets = stage_obj.get(
        "sheets",
        {},
    )

    if not isinstance(
        sheets,
        dict,
    ):

        return {}

    result = {}

    for sheet_name, sheet_obj in sheets.items():

        if not isinstance(
            sheet_obj,
            dict,
        ):

            continue

        data = sheet_obj.get(
            "data",
            {},
        )

        if not isinstance(
            data,
            dict,
        ):

            continue

        result[
            normalize_sheet_name(
                sheet_name
            )
        ] = data

    return result


# ============================================================
# BUILD ORIGINAL OP40 NOK
# ============================================================

def build_nok_items(
    record,
):

    result = []

    for stage in STAGES:

        stage_data = get_stage_data(
            record,
            stage,
        )

        if not stage_data:
            continue

        for sheet_name, sheet_data in stage_data.items():

            fields = collect_nok_items(
                sheet_data
            )

            for field in fields:

                result.append(
                    {
                        "source":
                            "OP40",

                        "stage":
                            stage,

                        "sheet":
                            sheet_name,

                        "field":
                            field,

                        "original_status":
                            "NO",
                    }
                )

    return result


# ============================================================
# OP40 REWORKED KEYS
# ============================================================

def get_reworked_keys(
    record,
):

    result = set()

    # --------------------------------------------------------
    # REWORKED ITEMS
    # --------------------------------------------------------

    reworked_items = record.get(
        "reworked_items",
        [],
    )

    if isinstance(
        reworked_items,
        list,
    ):

        for item in reworked_items:

            if not isinstance(
                item,
                dict,
            ):

                continue

            stage = str(
                item.get(
                    "stage",
                    "",
                )
            ).strip().upper()

            field = normalize_field(
                item.get(
                    "field",
                    "",
                )
            )

            if stage and field:

                result.add(
                    f"{stage}.{field}"
                )

    # --------------------------------------------------------
    # HISTORY
    # --------------------------------------------------------

    history = record.get(
        "rework_history",
        [],
    )

    if isinstance(
        history,
        list,
    ):

        for item in history:

            if not isinstance(
                item,
                dict,
            ):

                continue

            action = item.get(
                "action"
            )

            if action not in {
                "REWORK_COMPLETED",
                "OP40_REWORK_COMPLETED",
                None,
            }:

                continue

            stage = str(
                item.get(
                    "stage",
                    "",
                )
            ).strip().upper()

            field = normalize_field(
                item.get(
                    "field",
                    "",
                )
            )

            if stage and field:

                result.add(
                    f"{stage}.{field}"
                )

    return result


# ============================================================
# PENDING OP40 NOK
# ============================================================

def get_pending_nok_items(
    record,
):

    original_items = build_nok_items(
        record
    )

    reworked_keys = get_reworked_keys(
        record
    )

    pending = []

    for item in original_items:

        stage = item.get(
            "stage"
        )

        sheet = normalize_sheet_name(
            item.get(
                "sheet"
            )
        )

        field = item.get(
            "field"
        )

        full_field = (
            f"{sheet}.{field}"
        )

        key = (
            f"{stage}.{full_field}"
        )

        if key in reworked_keys:
            continue

        pending.append(
            {
                "source":
                    "OP40",

                "stage":
                    stage,

                "sheet":
                    sheet,

                "field":
                    field,

                "original_status":
                    "NO",
            }
        )

    return pending


# ============================================================
# PDI REWORKED KEYS
# ============================================================

def get_pdi_reworked_keys(
    record,
):

    result = set()

    collections = [
        record.get(
            "pdi_reworked_items",
            [],
        ),

        record.get(
            "pdi_rework_history",
            [],
        ),
    ]

    for collection in collections:

        if not isinstance(
            collection,
            list,
        ):

            continue

        for item in collection:

            if not isinstance(
                item,
                dict,
            ):

                continue

            station = str(
                item.get(
                    "station"
                )
                or item.get(
                    "stage"
                )
                or ""
            ).strip().upper()

            checkpoint_id = str(
                item.get(
                    "checkpoint_id"
                )
                or item.get(
                    "field"
                )
                or ""
            ).strip()

            if (
                station in PDI_REWORK_STATIONS
                and checkpoint_id
            ):

                result.add(
                    f"{station}.{checkpoint_id}"
                )

    return result


# ============================================================
# PENDING PDI NOK
# ============================================================

def get_pending_pdi_nok_items(
    record,
):

    result = []

    pdi = record.get(
        "pdi",
        {},
    ) or {}

    if not isinstance(
        pdi,
        dict,
    ):

        return result

    stations = pdi.get(
        "stations",
        {},
    ) or {}

    if not isinstance(
        stations,
        dict,
    ):

        return result

    reworked_keys = get_pdi_reworked_keys(
        record
    )

    for station in PDI_REWORK_STATIONS:

        station_data = (
            stations.get(
                station,
                {},
            ) or {}
        )

        if not isinstance(
            station_data,
            dict,
        ):

            continue

        checkpoints = (
            station_data.get(
                "checkpoints",
                {},
            ) or {}
        )

        if not isinstance(
            checkpoints,
            dict,
        ):

            continue

        for checkpoint_id, checkpoint in checkpoints.items():

            if not isinstance(
                checkpoint,
                dict,
            ):

                continue

            value = normalize_status(
                checkpoint.get(
                    "value"
                )
            )

            if value not in {
                "NO",
                "NOK",
            }:

                continue

            checkpoint_id = str(
                checkpoint_id
            )

            key = (
                f"{station}.{checkpoint_id}"
            )

            # Already corrected by OP60.
            if key in reworked_keys:
                continue

            result.append(
                {
                    "source":
                        "PDI",

                    "station":
                        station,

                    "stage":
                        station,

                    "checkpoint_id":
                        checkpoint_id,

                    "field":
                        checkpoint_id,

                    "sr_no":
                        checkpoint.get(
                            "sr_no"
                        ),

                    "checkpoint":
                        (
                            checkpoint.get(
                                "checkpoint"
                            )
                            or
                            checkpoint.get(
                                "name"
                            )
                            or
                            checkpoint_id
                        ),

                    "criteria":
                        checkpoint.get(
                            "criteria",
                            "",
                        ),

                    "method":
                        checkpoint.get(
                            "method",
                            "",
                        ),

                    "original_status":
                        "NO",

                    "status":
                        "NOK",
                }
            )

        gauge_checkpoints = (
            station_data.get(
                "gauge_checkpoints",
                {},
            ) or {}
        )

        if isinstance(gauge_checkpoints, dict):
            for checkpoint_id, checkpoint in gauge_checkpoints.items():
                if not isinstance(checkpoint, dict):
                    continue

                value = normalize_status(checkpoint.get("value"))
                if value not in {"NO", "NOK"}:
                    continue

                checkpoint_id = str(checkpoint_id)
                key = f"{station}.{checkpoint_id}"

                if key in reworked_keys:
                    continue

                result.append({
                    "source": "PDI",
                    "station": station,
                    "stage": station,
                    "checkpoint_id": checkpoint_id,
                    "field": checkpoint_id,
                    "sr_no": checkpoint.get("sr_no"),
                    "checkpoint": (
                        checkpoint.get("checkpoint")
                        or checkpoint_id
                    ),
                    "criteria": checkpoint.get("criteria", ""),
                    "method": checkpoint.get("method", ""),
                    "original_status": "NO",
                    "status": "NOK",
                    "type": "GAUGE",
                })

    return result


# ============================================================
# ALL PENDING OP60 WORK
# ============================================================

def get_all_pending_items(
    record,
):

    result = []

    result.extend(
        get_pending_nok_items(
            record
        )
    )

    result.extend(
        get_pending_pdi_nok_items(
            record
        )
    )

    return result


# ============================================================
# FIND RECORD
# ============================================================

def find_record(
    record_id,
):

    from bson import ObjectId

    try:

        object_id = ObjectId(
            str(record_id)
        )

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Invalid record ID",
        )

    record = inspection_collection.find_one(
        {
            "_id":
                object_id
        }
    )

    if not record:

        raise HTTPException(
            status_code=404,
            detail="Inspection record not found",
        )

    return (
        object_id,
        record,
    )


# ============================================================
# SERIALIZE RECORD
# ============================================================

def serialize_record(
    record,
):

    result = dict(
        record
    )

    if "_id" in result:

        result["_id"] = str(
            result["_id"]
        )

    return result


# ============================================================
# OP60 QUEUE
# ============================================================

@router.get(
    "/queue"
)
def get_op60_queue(
    operator=Depends(
        get_operator
    ),
):

    require_op60(
        operator
    )

    cursor = inspection_collection.find(
        {}
    ).sort(
        "updated_at",
        1,
    )

    records = []

    for record in cursor:

        pending_items = get_all_pending_items(
            record
        )

        if not pending_items:
            continue

        now = datetime.now(
            timezone.utc
        )

        # Repair old/stale status when the record
        # still has actual OP60 work pending.
        if (
            record.get(
                "overall_status"
            )
            !=
            "OP60_REWORK"
        ):

            inspection_collection.update_one(
                {
                    "_id":
                        record["_id"]
                },
                {
                    "$set":
                        {
                            "overall_status":
                                "OP60_REWORK",

                            "current_stage":
                                "OP60",

                            "current_station":
                                "OP60",

                            "nok_items":
                                pending_items,

                            "updated_at":
                                now,
                        }
                },
            )

        records.append(
            {
                "id":
                    str(
                        record["_id"]
                    ),

                "record_id":
                    str(
                        record["_id"]
                    ),

                "frame_no":
                    record.get(
                        "frame_no"
                    ),

                "date":
                    record.get(
                        "date"
                    ),

                "shift":
                    record.get(
                        "shift"
                    ),

                "overall_status":
                    "OP60_REWORK",

                "nok_items":
                    pending_items,

                "rework_history":
                    record.get(
                        "rework_history",
                        [],
                    ),

                "pdi_rework_history":
                    record.get(
                        "pdi_rework_history",
                        [],
                    ),
            }
        )

    return {

        "operator":
            {
                "operator_id":
                    operator.get(
                        "operator_id"
                    ),

                "name":
                    operator.get(
                        "name"
                    ),

                "station":
                    operator.get(
                        "station"
                    ),

                "stage":
                    operator.get(
                        "stage"
                    ),
            },

        "records":
            records,

        "queue":
            records,

        "count":
            len(
                records
            ),
    }


# ============================================================
# GET ONE OP60 FRAME
# ============================================================

@router.get(
    "/frame/{record_id}"
)
def get_rework_frame(
    record_id: str,
    operator=Depends(
        get_operator
    ),
):

    require_op60(
        operator
    )

    object_id, record = find_record(
        record_id
    )

    pending_items = get_all_pending_items(
        record
    )

    if not pending_items:

        raise HTTPException(
            status_code=400,
            detail=(
                "This frame has no pending "
                "OP60 rework checkpoints"
            ),
        )

    now = datetime.now(
        timezone.utc
    )

    # Repair old/stale OP60 status if actual
    # rework checkpoints still exist.
    if (
        record.get(
            "overall_status"
        )
        !=
        "OP60_REWORK"
    ):

        inspection_collection.update_one(
            {
                "_id":
                    object_id
            },
            {
                "$set":
                    {
                        "overall_status":
                            "OP60_REWORK",

                        "current_stage":
                            "OP60",

                        "current_station":
                            "OP60",

                        "nok_items":
                            pending_items,

                        "updated_at":
                            now,
                    }
            },
        )

        record = (
            inspection_collection.find_one(
                {
                    "_id":
                        object_id
                }
            )
            or
            record
        )

    serialized = serialize_record(
        record
    )

    return {

        "success":
            True,

        "id":
            str(
                object_id
            ),

        "record_id":
            str(
                object_id
            ),

        "frame_no":
            record.get(
                "frame_no"
            ),

        "date":
            record.get(
                "date"
            ),

        "shift":
            record.get(
                "shift"
            ),

        "overall_status":
            "OP60_REWORK",

        "nok_items":
            get_all_pending_items(
                record
            ),

        "op40_nok_items":
            get_pending_nok_items(
                record
            ),

        "pdi_nok_items":
            get_pending_pdi_nok_items(
                record
            ),

        "rework_history":
            record.get(
                "rework_history",
                [],
            ),

        "pdi_rework_history":
            record.get(
                "pdi_rework_history",
                [],
            ),

        "record":
            serialized,
    }


# ============================================================
# SAVE REWORK
# ============================================================

@router.post(
    "/rework"
)
def save_rework(
    request: ReworkRequest,
    operator=Depends(
        get_operator
    ),
):

    require_op60(
        operator
    )

    object_id, record = find_record(
        request.record_id
    )

    stage = str(
        request.stage or ""
    ).strip().upper()

    field = str(
        request.field or ""
    ).strip()

    corrected_status = str(
        request.corrected_status
        or "YES"
    ).strip().upper()

    remarks = (
        request.remarks.strip()
        if request.remarks
        else None
    )


    # ========================================================
    # PDI REWORK
    # ========================================================

    if stage in PDI_REWORK_STATIONS:

        station = stage

        checkpoint_id = field

        if not checkpoint_id:

            raise HTTPException(
                status_code=400,
                detail=(
                    "PDI checkpoint ID is required"
                ),
            )

        if corrected_status not in {
            "YES",
            "OK",
        }:

            raise HTTPException(
                status_code=400,
                detail=(
                    "After PDI rework, the "
                    "checkpoint must be marked "
                    "YES / OK"
                ),
            )


        # ====================================================
        # GET PDI DATA
        # ====================================================

        pdi = (
            record.get(
                "pdi",
                {},
            )
            or {}
        )

        if not isinstance(
            pdi,
            dict,
        ):

            raise HTTPException(
                status_code=400,
                detail="PDI data not found",
            )


        stations = (
            pdi.get(
                "stations",
                {},
            )
            or {}
        )

        if not isinstance(
            stations,
            dict,
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "PDI stations not found"
                ),
            )


        station_data = stations.get(
            station
        )

        if not isinstance(
            station_data,
            dict,
        ):

            raise HTTPException(
                status_code=404,
                detail=(
                    f"PDI station data "
                    f"not found: {station}"
                ),
            )


        checkpoints = (
            station_data.get(
                "checkpoints",
                {},
            )
            or {}
        )

        gauge_checkpoints = (
            station_data.get(
                "gauge_checkpoints",
                {},
            )
            or {}
        )

        if not isinstance(checkpoints, dict):
            checkpoints = {}

        if not isinstance(gauge_checkpoints, dict):
            gauge_checkpoints = {}

        # PDI3 has both normal and mandatory Gauge checkpoints.
        # Look in the normal collection first, then Gauge.
        checkpoint = checkpoints.get(checkpoint_id)
        checkpoint_type = "PDI"

        if checkpoint is None:
            checkpoint = gauge_checkpoints.get(checkpoint_id)
            if checkpoint is not None:
                checkpoint_type = "GAUGE"

        if checkpoint is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"PDI checkpoint "
                    f"{checkpoint_id} "
                    "not found"
                ),
            )


        if not isinstance(
            checkpoint,
            dict,
        ):

            raise HTTPException(
                status_code=404,
                detail=(
                    f"PDI checkpoint "
                    f"{checkpoint_id} "
                    f"not found"
                ),
            )


        # ====================================================
        # ORIGINAL PDI VALUE
        # ====================================================
        #
        # IMPORTANT:
        #
        # NEVER change:
        #
        # pdi.stations.<station>.checkpoints.<id>.value
        #
        # The original PDI NO remains NO.
        #
        # OP60 keeps the correction separately in:
        #
        # pdi_reworked_items
        # pdi_rework_history
        #
        # ====================================================

        original_status = normalize_status(
            checkpoint.get(
                "value"
            )
        )

        if original_status not in {
            "NO",
            "NOK",
        }:

            raise HTTPException(
                status_code=400,
                detail=(
                    "This PDI checkpoint "
                    "is not an original NOK"
                ),
            )


        # ====================================================
        # DUPLICATE CHECK
        # ====================================================

        reworked_keys = get_pdi_reworked_keys(
            record
        )

        current_key = (
            f"{station}."
            f"{checkpoint_id}"
        )

        if current_key in reworked_keys:

            raise HTTPException(
                status_code=400,
                detail=(
                    "This PDI NOK checkpoint "
                    "has already been corrected"
                ),
            )


        # ====================================================
        # TIME
        # ====================================================

        now = datetime.now(
            timezone.utc
        )


        # ====================================================
        # CHECKPOINT LABEL
        # ====================================================

        checkpoint_label = (
            checkpoint.get(
                "checkpoint"
            )
            or
            checkpoint.get(
                "name"
            )
            or
            checkpoint_id
        )


        # ====================================================
        # PDI HISTORY
        # ====================================================

        history_entry = {

            "source":
                "PDI",

            "station":
                station,

            "stage":
                station,

            "checkpoint_id":
                checkpoint_id,

            "field":
                checkpoint_id,

            "checkpoint":
                checkpoint_label,

            "criteria":
                checkpoint.get(
                    "criteria"
                ),

            "method":
                checkpoint.get(
                    "method"
                ),

            "original_status":
                "NO",

            "corrected_status":
                "YES",

            "action":
                "PDI_REWORK_COMPLETED",

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

        if remarks:

            history_entry[
                "remarks"
            ] = remarks


        # ====================================================
        # PDI REWORKED ITEM
        # ====================================================

        reworked_item = dict(
            history_entry
        )

        reworked_item[
            "rework_status"
        ] = "CORRECTED"


        # ====================================================
        # EXISTING PDI ITEMS
        # ====================================================

        existing_pdi_items = (
            record.get(
                "pdi_reworked_items",
                [],
            )
        )

        if not isinstance(
            existing_pdi_items,
            list,
        ):

            existing_pdi_items = []


        updated_pdi_items = list(
            existing_pdi_items
        )

        updated_pdi_items.append(
            reworked_item
        )


        # ====================================================
        # EXISTING PDI HISTORY
        # ====================================================

        existing_pdi_history = (
            record.get(
                "pdi_rework_history",
                [],
            )
        )

        if not isinstance(
            existing_pdi_history,
            list,
        ):

            existing_pdi_history = []


        updated_pdi_history = list(
            existing_pdi_history
        )

        updated_pdi_history.append(
            history_entry
        )


        # ====================================================
        # COMMON HISTORY
        # ====================================================

        existing_common_history = (
            record.get(
                "rework_history",
                [],
            )
        )

        if not isinstance(
            existing_common_history,
            list,
        ):

            existing_common_history = []


        updated_common_history = list(
            existing_common_history
        )

        updated_common_history.append(
            history_entry
        )


        # ====================================================
        # OP60 REWORK LIST
        # ====================================================
        # Keep the OP60 actions in the dedicated field used
        # by the Frame History page.

        existing_op60_rework = (
            record.get(
                "op60_rework",
                [],
            )
        )

        if not isinstance(
            existing_op60_rework,
            list,
        ):
            existing_op60_rework = []

        updated_op60_rework = list(
            existing_op60_rework
        )

        updated_op60_rework.append(
            reworked_item
        )


        # ====================================================
        # TEMP RECORD
        # ====================================================
        #
        # DO NOT modify the original PDI checkpoint.
        #
        # ====================================================

        temp_record = dict(
            record
        )

        temp_record[
            "pdi_reworked_items"
        ] = updated_pdi_items

        temp_record[
            "pdi_rework_history"
        ] = updated_pdi_history

        temp_record[
            "rework_history"
        ] = updated_common_history


        # ====================================================
        # REMAINING PDI WORK
        # ====================================================

        remaining_pdi_items = (
            get_pending_pdi_nok_items(
                temp_record
            )
        )


        # ====================================================
        # REMAINING ALL OP60 WORK
        # ====================================================

        remaining_items = (
            get_all_pending_items(
                temp_record
            )
        )


        # ====================================================
        # UPDATE FIELDS
        # ====================================================

        update_fields = {

            "pdi_reworked_items":
                updated_pdi_items,

            "pdi_rework_history":
                updated_pdi_history,

            "rework_history":
                updated_common_history,

            "op60_rework":
                updated_op60_rework,

            "pdi_nok_items":
                remaining_pdi_items,

            "nok_items":
                remaining_items,

            "pdi_rework_status":
                (
                    "IN_PROGRESS"
                    if remaining_pdi_items
                    else "COMPLETED"
                ),

            "updated_at":
                now,
        }


        # ====================================================
        # STILL HAS OP60 WORK
        # ====================================================

        if remaining_items:

            update_fields[
                "overall_status"
            ] = "OP60_REWORK"

            update_fields[
                "current_stage"
            ] = "OP60"

            update_fields[
                "current_station"
            ] = "OP60"


        # ====================================================
        # ALL OP60 WORK COMPLETE
        # ====================================================
        #
        # IMPORTANT:
        #
        # OP60 IS NOT THE END.
        #
        # Do NOT set:
        #
        #     overall_status = COMPLETED
        #
        # Instead send the SAME record to PDI STATION 3.
        #
        # ====================================================

        else:

            update_fields[
                "overall_status"
            ] = "PDI_PENDING"

            update_fields[
                "current_stage"
            ] = "PDI_STATION_3"

            update_fields[
                "current_station"
            ] = "PDI_STATION_3"

            update_fields[
                "completed_at"
            ] = None


        # ====================================================
        # PDI REWORK COMPLETE
        # -> RETURN TO PDI / FIREWALL
        # ====================================================

        if not remaining_items:

            pdi_obj = (
                temp_record.get(
                    "pdi",
                    {}
                )
                or {}
            )

            pdi_stations = (
                pdi_obj.get(
                    "stations",
                    {}
                )
                or {}
            )


            # ------------------------------------------------
            # PDI STATION 3 NOK -> OP60 REWORK -> PDI STATION 4
            # ------------------------------------------------
            # All outstanding PDI-3 NOK items have been corrected at
            # OP60. The original PDI/Gauge values remain unchanged for
            # audit; the correction is recorded in the rework history.
            # Workflow-wise PDI-3 is now cleared and the same frame moves
            # directly to PDI STATION 4. It must NOT return to PDI-3.

            update_fields[
                "pdi.status"
            ] = "IN_PROGRESS"

            update_fields[
                "pdi.current_station"
            ] = "PDI_STATION_4"

            update_fields[
                "pdi.stations.PDI_STATION_3.status"
            ] = "PASSED"

            update_fields[
                "pdi.stations.PDI_STATION_3.result_status"
            ] = "OK"

            update_fields[
                "pdi.stations.PDI_STATION_3.completed_at"
            ] = now

            update_fields[
                "pdi.stations.PDI_STATION_3.nok_items"
            ] = []

            update_fields[
                "overall_status"
            ] = "PDI_IN_PROGRESS"

            update_fields[
                "current_stage"
            ] = "PDI_STATION_4"

            update_fields[
                "current_station"
            ] = "PDI_STATION_4"

            update_fields[
                "op60_return_station"
            ] = None

            update_fields[
                "completed_at"
            ] = None


        # ====================================================
        # FRAME HISTORY
        # ====================================================

        push_fields = {}

        if not remaining_items:

            push_fields[
                "frame_history"
            ] = {
                "station":
                    "OP60",

                "stage":
                    "OP60",

                "action":
                    "STATION_COMPLETED",

                "status":
                    "OK",

                "source":
                    "PDI_REWORK",

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

                "completed_at":
                    now,
            }


        # ====================================================
        # SAVE
        # ====================================================

        update_operation = {
            "$set":
                update_fields
        }

        if push_fields:

            update_operation[
                "$push"
            ] = push_fields

        update_result = (
            inspection_collection.update_one(
                {
                    "_id":
                        object_id
                },
                update_operation,
            )
        )


        if update_result.matched_count == 0:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Unable to update "
                    "inspection record"
                ),
            )


        # ====================================================
        # GET UPDATED RECORD
        # ====================================================

        updated_record = (
            inspection_collection.find_one(
                {
                    "_id":
                        object_id
                }
            )
        )


        if not updated_record:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Rework was saved but "
                    "updated record could not "
                    "be loaded"
                ),
            )


        return {

            "success":
                True,

            "message":
                "PDI rework recorded successfully",

            "record_id":
                str(
                    object_id
                ),

            "frame_no":
                updated_record.get(
                    "frame_no"
                ),

            "source":
                "PDI",

            "station":
                station,

            "checkpoint_id":
                checkpoint_id,

            "original_status":
                "NO",

            "corrected_status":
                "YES",

            "reworked_item":
                reworked_item,

            "remaining_pdi_nok":
                remaining_pdi_items,

            "remaining_pdi_nok_count":
                len(
                    remaining_pdi_items
                ),

            "remaining_nok":
                remaining_items,

            "remaining_nok_count":
                len(
                    remaining_items
                ),

            "overall_status":
                update_fields[
                    "overall_status"
                ],

            "record":
                serialize_record(
                    updated_record
                ),
        }


    # ========================================================
    # OP40 REWORK
    # ========================================================

    if stage not in STAGES:

        raise HTTPException(
            status_code=400,
            detail="Invalid stage",
        )


    if not field:

        raise HTTPException(
            status_code=400,
            detail="Rework field is required",
        )


    field = normalize_field(
        field
    )


    if corrected_status not in {
        "YES",
        "OK",
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "After rework, the "
                "checkpoint must be marked "
                "YES / OK"
            ),
        )


    stage_data = get_stage_data(
        record,
        stage,
    )

    if not stage_data:

        raise HTTPException(
            status_code=400,
            detail=(
                f"No inspection data "
                f"found for {stage}"
            ),
        )


    current_value = get_nested_value(
        stage_data,
        field,
    )

    if current_value is None:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Field not found: "
                f"{stage}.{field}"
            ),
        )


    original_status = normalize_status(
        current_value
    )

    if original_status not in {
        "NO",
        "NOK",
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Field {stage}.{field} "
                "is not currently NOK"
            ),
        )


    reworked_keys = get_reworked_keys(
        record
    )

    current_key = (
        f"{stage}.{field}"
    )

    if current_key in reworked_keys:

        raise HTTPException(
            status_code=400,
            detail=(
                "This NOK checkpoint "
                "has already been corrected"
            ),
        )


    now = datetime.now(
        timezone.utc
    )


    # ========================================================
    # OP40 HISTORY
    # ========================================================

    history_entry = {

        "source":
            "OP40",

        "stage":
            stage,

        "field":
            field,

        "original_status":
            "NO",

        "corrected_status":
            "YES",

        "action":
            "REWORK_COMPLETED",

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


    if remarks:

        history_entry[
            "remarks"
        ] = remarks


    # ========================================================
    # OP40 REWORKED ITEM
    # ========================================================

    reworked_item = {

        "source":
            "OP40",

        "stage":
            stage,

        "field":
            field,

        "original_status":
            "NO",

        "corrected_status":
            "YES",

        "rework_status":
            "CORRECTED",

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


    if remarks:

        reworked_item[
            "remarks"
        ] = remarks


    # ========================================================
    # EXISTING REWORK ITEMS
    # ========================================================

    existing_rework = (
        record.get(
            "reworked_items",
            [],
        )
    )

    if not isinstance(
        existing_rework,
        list,
    ):

        existing_rework = []


    updated_rework = list(
        existing_rework
    )

    updated_rework.append(
        reworked_item
    )


    # ========================================================
    # EXISTING HISTORY
    # ========================================================

    existing_history = (
        record.get(
            "rework_history",
            [],
        )
    )

    if not isinstance(
        existing_history,
        list,
    ):

        existing_history = []


    updated_history = list(
        existing_history
    )

    updated_history.append(
        history_entry
    )


    # ========================================================
    # OP60 REWORK LIST
    # ========================================================

    existing_op60_rework = (
        record.get(
            "op60_rework",
            [],
        )
    )

    if not isinstance(
        existing_op60_rework,
        list,
    ):
        existing_op60_rework = []

    updated_op60_rework = list(
        existing_op60_rework
    )

    updated_op60_rework.append(
        reworked_item
    )


    # ========================================================
    # TEMP RECORD
    # ========================================================
    #
    # Original OP40 inspection values are NEVER overwritten.
    #
    # We only add rework history.
    #
    # ========================================================

    temp_record = dict(
        record
    )

    temp_record[
        "reworked_items"
    ] = updated_rework

    temp_record[
        "rework_history"
    ] = updated_history


    # ========================================================
    # REMAINING WORK
    # ========================================================

    remaining_items = (
        get_all_pending_items(
            temp_record
        )
    )


    # ========================================================
    # UPDATE FIELDS
    # ========================================================

    update_fields = {

        "reworked_items":
            updated_rework,

        "rework_history":
            updated_history,

        "op60_rework":
            updated_op60_rework,

        "nok_items":
            remaining_items,

        "updated_at":
            now,
    }


    # ========================================================
    # STILL HAS OP60 WORK
    # ========================================================

    if remaining_items:

        update_fields[
            "overall_status"
        ] = "OP60_REWORK"

        update_fields[
            "current_stage"
        ] = "OP60"

        update_fields[
            "current_station"
        ] = "OP60"


    # ========================================================
    # ALL OP60 WORK COMPLETE
    # ========================================================
    #
    # OP60 is NOT the final station.
    #
    # Send the SAME inspection record to:
    #
    #     PDI_STATION_3
    #
    # ========================================================

    else:

        return_station = str(
            record.get(
                "op60_return_station",
                "PDI_STATION_3",
            )
            or "PDI_STATION_3"
        ).strip().upper()

        # OP60 rework is followed by PDI STATION 3.
        # Do not return an OP40 frame to STAGE_1/STAGE_2/STAGE_3.
        # PDI STATION 3 is the next station after OP60 rework.
        update_fields["overall_status"] = "PDI_PENDING"
        update_fields["current_stage"] = "PDI_STATION_3"
        update_fields["current_station"] = "PDI_STATION_3"

        update_fields["op60_return_station"] = None
        update_fields["completed_at"] = None


    # ========================================================
    # FRAME HISTORY
    # ========================================================

    push_fields = {}

    if not remaining_items:

        push_fields[
            "frame_history"
        ] = {
            "station":
                "OP60",

            "stage":
                "OP60",

            "action":
                "STATION_COMPLETED",

            "status":
                "OK",

            "source":
                "OP40_REWORK",

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

            "completed_at":
                now,
        }


    # ========================================================
    # SAVE
    # ========================================================

    update_operation = {
        "$set":
            update_fields
    }

    if push_fields:

        update_operation[
            "$push"
        ] = push_fields

    update_result = (
        inspection_collection.update_one(
            {
                "_id":
                    object_id
            },
            update_operation,
        )
    )


    if update_result.matched_count == 0:

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to update "
                "inspection record"
            ),
        )


    # ========================================================
    # GET UPDATED RECORD
    # ========================================================

    updated_record = (
        inspection_collection.find_one(
            {
                "_id":
                    object_id
            }
        )
    )


    if not updated_record:

        raise HTTPException(
            status_code=500,
            detail=(
                "Rework was saved but "
                "updated record could not "
                "be loaded"
            ),
        )


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "success":
            True,

        "message":
            "Rework recorded successfully",

        "record_id":
            str(
                object_id
            ),

        "frame_no":
            updated_record.get(
                "frame_no"
            ),

        "source":
            "OP40",

        "stage":
            stage,

        "field":
            field,

        "original_status":
            "NO",

        "corrected_status":
            "YES",

        "remaining_nok":
            remaining_items,

        "remaining_nok_count":
            len(
                remaining_items
            ),

        "overall_status":
            update_fields[
                "overall_status"
            ],

        "record":
            serialize_record(
                updated_record
            ),
    }


# ============================================================
# FRONTEND-COMPATIBLE ALIAS
# ============================================================

@router.post(
    "/complete-item"
)
def complete_rework_item(
    request: ReworkRequest,
    operator=Depends(
        get_operator
    ),
):

    return save_rework(
        request=request,
        operator=operator,
    )
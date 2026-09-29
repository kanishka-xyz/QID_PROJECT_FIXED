from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone

from database.mongodb import inspection_collection

from models.schema import (
    InspectionCreateRequest,
    SheetSaveRequest,
)

from routes.core.config import (
    STAGES,
    SHEETS,
    REQUIRED_FIELDS,
)

from routes.core.operator_security import (
    get_operator,
    require_op40,
)


router = APIRouter(
    tags=["Inspection"]
)


# =========================================================
# HELPERS
# =========================================================

def utc_now():
    return datetime.now(timezone.utc)


def check_id(record_id):
    if not ObjectId.is_valid(record_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid record ID"
        )

    return ObjectId(record_id)


def validate_sheet(sheet_name):
    if sheet_name not in SHEETS:
        raise HTTPException(
            status_code=400,
            detail="Invalid sheet"
        )


def validate_yes_no(sheet_name, data):
    """
    Every required inspection field must explicitly
    contain YES or NO before a sheet can be passed.
    """

    required = REQUIRED_FIELDS.get(
        sheet_name,
        []
    )

    missing = []
    invalid = []

    for field in required:

        value = data.get(field)

        if value is None or value == "":
            missing.append(field)

        elif value not in ["YES", "NO"]:
            invalid.append(field)

    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "All inspection boxes must be YES or NO"
                ),
                "missing": missing,
            }
        )

    if invalid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "Inspection values must be YES or NO"
                ),
                "invalid": invalid,
            }
        )


def collect_nok(value, path=""):
    """
    Recursively find every NO value.

    Returns paths such as:

        top_T1
        welding_lump
        spatter_present

    or nested paths if required.
    """

    result = []

    if isinstance(value, dict):

        for key, child in value.items():

            current_path = (
                f"{path}.{key}"
                if path
                else key
            )

            if child == "NO":

                result.append(
                    current_path
                )

            else:

                result.extend(
                    collect_nok(
                        child,
                        current_path
                    )
                )

    elif isinstance(value, list):

        for index, child in enumerate(value):

            current_path = (
                f"{path}[{index}]"
            )

            result.extend(
                collect_nok(
                    child,
                    current_path
                )
            )

    return result


def serialize(value):

    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            key: serialize(val)
            for key, val in value.items()
        }

    if isinstance(value, list):
        return [
            serialize(item)
            for item in value
        ]

    return value


def serialize_record(record):

    result = serialize(record)

    if result and "_id" in record:
        result["_id"] = str(
            record["_id"]
        )

    return result


def get_stage(record, stage):

    return (
        record
        .get("stages", {})
        .get(stage, {})
    )


def get_sheet(
    record,
    stage,
    sheet_name
):

    return (
        record
        .get("stages", {})
        .get(stage, {})
        .get("sheets", {})
        .get(sheet_name)
    )


def all_sheets_passed(
    record,
    stage
):

    stage_data = get_stage(
        record,
        stage
    )

    sheets = stage_data.get(
        "sheets",
        {}
    )

    for sheet_name in SHEETS:

        sheet = sheets.get(
            sheet_name,
            {}
        )

        if sheet.get("status") not in [
            "PASS",
            "PASSED",
        ]:
            return False

    return True


def stage_has_nok(
    record,
    stage
):

    stage_data = get_stage(
        record,
        stage
    )

    sheets = stage_data.get(
        "sheets",
        {}
    )

    for sheet_name in SHEETS:

        sheet = sheets.get(
            sheet_name,
            {}
        )

        data = sheet.get(
            "data",
            {}
        )

        if collect_nok(data):
            return True

    return False


def get_stage_nok_items(
    record,
    stage
):

    result = []

    stage_data = get_stage(
        record,
        stage
    )

    sheets = stage_data.get(
        "sheets",
        {}
    )

    for sheet_name in SHEETS:

        sheet = sheets.get(
            sheet_name,
            {}
        )

        data = sheet.get(
            "data",
            {}
        )

        nok_fields = collect_nok(
            data
        )

        for field in nok_fields:

            result.append({
                "stage": stage,
                "sheet": sheet_name,
                "field": field,
                "status": "NOK",
            })

    return result


def get_all_nok_items(record):

    result = []

    for stage in STAGES:

        result.extend(
            get_stage_nok_items(
                record,
                stage
            )
        )

    return result


def all_stages_completed(record):

    stages = record.get(
        "stages",
        {}
    )

    for stage in STAGES:

        stage_data = stages.get(
            stage,
            {}
        )

        if stage_data.get("status") != "COMPLETED":
            return False

    return True


def ensure_operator_can_work_stage(
    record,
    operator
):
    """
    OP40 stages are INDEPENDENT.

    STAGE_1, STAGE_2 and STAGE_3 do NOT wait for one another.
    An operator may work only on their own assigned stage.

    The only OP40-level restrictions here are:
        1. Valid OP40 stage
        2. Matching frame/operator shift
        3. Frame is currently available at OP40
        4. The operator's own stage is not already completed

    OP60 is a rework station and is handled by routes/op60.py.
    """

    operator_stage = str(
        operator.get("stage", "")
    ).strip().upper()

    if operator_stage not in STAGES:
        raise HTTPException(
            status_code=403,
            detail="Invalid OP40 stage"
        )

    record_shift = str(
        record.get("shift", "")
    ).strip().upper()

    operator_shift = str(
        operator.get("shift", "")
    ).strip().upper()

    if (
        record_shift
        and operator_shift
        and record_shift != operator_shift
    ):
        raise HTTPException(
            status_code=403,
            detail="Operator shift does not match frame shift"
        )

    current_station = str(
        record.get("current_station", "")
    ).strip().upper()

    if current_station != "OP40":
        raise HTTPException(
            status_code=403,
            detail=(
                f"Frame is currently at "
                f"{current_station or 'UNKNOWN'}, not OP40."
            )
        )

    stage_data = get_stage(
        record,
        operator_stage
    )

    # -----------------------------------------------------
    # BACKWARD COMPATIBILITY
    # -----------------------------------------------------
    # Older records may not contain one of the OP40 stages.
    # Create that stage lazily without imposing sequencing.
    # -----------------------------------------------------

    if not stage_data:
        stage_data = {
            "operator_id": None,
            "operator_name": None,
            "shift": None,
            "status": "WAITING",
            "result_status": None,
            "completed_at": None,
            "sheets": {},
        }

        for sheet_name in SHEETS:
            stage_data["sheets"][sheet_name] = {
                "status": "WAITING",
                "result_status": None,
                "data": {},
                "operator_id": None,
                "operator_name": None,
                "passed_by": None,
                "passed_at": None,
            }

        inspection_collection.update_one(
            {"_id": record["_id"]},
            {
                "$set": {
                    f"stages.{operator_stage}": stage_data,
                    "updated_at": utc_now(),
                }
            }
        )

        record["stages"] = record.get(
            "stages",
            {}
        )

        record["stages"][operator_stage] = (
            stage_data
        )

    if stage_data.get("status") == "COMPLETED":
        raise HTTPException(
            status_code=403,
            detail="This stage is already completed and locked"
        )

    # IMPORTANT:
    # There is intentionally NO previous-stage check here.
    return operator_stage


# =========================================================
# CREATE INSPECTION
#
# ONLY STAGE 1 CAN CREATE A BRAND NEW FRAME
#
# IMPORTANT:
# The request body is ONLY:
#
# {
#     "frame_no": "...",
#     "date": "...",
#     "shift": "..."
# }
#
# The operator comes from authentication.
# =========================================================

@router.post("/inspection")
def create_inspection(
    request: InspectionCreateRequest,
    operator=Depends(require_op40),
):

    # -----------------------------------------------------
    # INDEPENDENT OP40 STAGES
    # -----------------------------------------------------
    # STAGE_1, STAGE_2 and STAGE_3 may all create a new
    # frame independently. There is no previous-stage gate.

    stage = str(
        operator.get("stage", "")
    ).strip().upper()

    if stage not in STAGES:
        raise HTTPException(
            status_code=403,
            detail="Invalid OP40 stage"
        )

    # -----------------------------------------------------
    # FRAME NUMBER
    # -----------------------------------------------------

    frame_no = (
        request.frame_no.strip()
    )

    if not frame_no:

        raise HTTPException(
            status_code=400,
            detail="Frame number is required"
        )

    # -----------------------------------------------------
    # SHIFT
    #
    # Operator's shift is authoritative.
    # -----------------------------------------------------

    operator_shift = operator.get(
        "shift"
    )

    request_shift = request.shift

    shift = (
        operator_shift
        or request_shift
    )

    if not shift:

        raise HTTPException(
            status_code=400,
            detail="Shift is required"
        )

    # -----------------------------------------------------
    # CHECK FOR EXISTING ACTIVE FRAME
    # -----------------------------------------------------

    existing = inspection_collection.find_one(
        {
            "frame_no": frame_no,
            "overall_status": {
                "$ne": "COMPLETED"
            }
        }
    )

    if existing:

        # Do not create another record.
        # Return the existing active frame.
        return serialize_record(
            existing
        )

    # -----------------------------------------------------
    # INITIAL STAGE STRUCTURE
    # -----------------------------------------------------

    stages = {}

    for stage_name in STAGES:

        stages[stage_name] = {
            "operator_id": None,
            "operator_name": None,
            "shift": None,

            "status": "WAITING",

            "result_status": None,

            "completed_at": None,

            "sheets": {}
        }

        for sheet_name in SHEETS:

            stages[
                stage_name
            ]["sheets"][
                sheet_name
            ] = {

                "status": "WAITING",

                "result_status": None,

                "data": {},

                "operator_id": None,

                "operator_name": None,

                "passed_by": None,

                "passed_at": None,
            }

    # -----------------------------------------------------
    # START THE LOGGED-IN OPERATOR'S STAGE
    # -----------------------------------------------------

    stages[stage]["status"] = (
        "IN_PROGRESS"
    )

    stages[stage]["operator_id"] = (
        operator.get("operator_id")
    )

    stages[stage]["operator_name"] = (
        operator.get("name")
    )

    stages[stage]["shift"] = (
        shift
    )

    # -----------------------------------------------------
    # CREATE DOCUMENT
    # -----------------------------------------------------

    now = utc_now()

    document = {

        "frame_no":
            frame_no,

        "date":
            request.date,

        "shift":
            shift,

        "created_by":
            operator.get(
                "operator_id"
            ),

        "created_by_name":
            operator.get(
                "name"
            ),

        "created_at":
            now,

        # Informational only.
        # It does NOT impose OP40 stage sequencing.
        "current_stage":
            stage,

        "current_station":
            "OP40",

        "overall_status":
            "IN_PROGRESS",

        "stages":
            stages,

        # Chronological station-level audit trail.
        "frame_history":
            [],

        "op60_rework":
            [],

        "op60_return_station":
            None,

        "nok_items":
            [],

        "updated_at":
            now,
    }

    result = (
        inspection_collection.insert_one(
            document
        )
    )

    document["_id"] = (
        result.inserted_id
    )

    return serialize_record(
        document
    )


# =========================================================
# GET ALL INSPECTIONS
#
# OP40 + OP60 CAN READ
# =========================================================

@router.get("/inspections")
def get_inspections(
    operator=Depends(get_operator),
):

    records = list(
        inspection_collection.find(
            {}
        ).sort(
            "created_at",
            -1
        )
    )

    return [
        serialize_record(record)
        for record in records
    ]


# =========================================================
# GET ONE INSPECTION
#
# OP40 + OP60 CAN READ
# =========================================================

@router.get(
    "/inspection/{record_id}"
)
def get_inspection(
    record_id: str,
    operator=Depends(get_operator),
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
            detail="Inspection not found"
        )

    return serialize_record(
        record
    )


# =========================================================
# SAVE SHEET
#
# OP40 ONLY
#
# INDEPENDENT STAGES:
# Operator can save ONLY their own stage.
#
# STAGE 2 does NOT depend on STAGE 1.
# STAGE 3 does NOT depend on STAGE 2.
# =========================================================

@router.put(
    "/inspection/{record_id}/sheet/{sheet_name}"
)
def save_sheet(
    record_id: str,
    sheet_name: str,
    request: SheetSaveRequest,
    operator=Depends(require_op40),
):

    # -----------------------------------------------------
    # VALIDATE SHEET
    # -----------------------------------------------------

    validate_sheet(
        sheet_name
    )

    # -----------------------------------------------------
    # RECORD
    # -----------------------------------------------------

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
            detail="Inspection not found"
        )

    # -----------------------------------------------------
    # OPERATOR STAGE
    # -----------------------------------------------------

    stage = (
        ensure_operator_can_work_stage(
            record,
            operator
        )
    )

    # -----------------------------------------------------
    # SHEET
    # -----------------------------------------------------

    sheet = get_sheet(
        record,
        stage,
        sheet_name
    )

    if not sheet:

        raise HTTPException(
            status_code=404,
            detail="Sheet not found"
        )

    # -----------------------------------------------------
    # PASSED SHEETS ARE LOCKED
    # -----------------------------------------------------

    if sheet.get("status") in [
        "PASS",
        "PASSED",
    ]:

        raise HTTPException(
            status_code=403,
            detail="Sheet already passed"
        )

    # -----------------------------------------------------
    # SAVE DATA
    #
    # Do not validate here because operator may save
    # partially completed data.
    #
    # PASS will perform complete YES/NO validation.
    # -----------------------------------------------------

    incoming_data = (
        request.data
    )

    now = utc_now()

    # -----------------------------------------------------
    # CALCULATE CURRENT RESULT
    # -----------------------------------------------------

    result_status = (
        "NOK"
        if collect_nok(
            incoming_data
        )
        else "OK"
    )

    # -----------------------------------------------------
    # UPDATE SHEET
    # -----------------------------------------------------

    inspection_collection.update_one(
        {
            "_id": object_id
        },
        {
            "$set": {

                f"stages.{stage}.sheets.{sheet_name}.data":
                    incoming_data,

                f"stages.{stage}.sheets.{sheet_name}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"stages.{stage}.sheets.{sheet_name}.operator_name":
                    operator.get(
                        "name"
                    ),

                f"stages.{stage}.sheets.{sheet_name}.status":
                    "IN_PROGRESS",

                f"stages.{stage}.sheets.{sheet_name}.result_status":
                    result_status,

                f"stages.{stage}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"stages.{stage}.operator_name":
                    operator.get(
                        "name"
                    ),

                f"stages.{stage}.shift":
                    operator.get(
                        "shift"
                    ),

                f"stages.{stage}.status":
                    "IN_PROGRESS",

                # Informational only. This does not make OP40 stages
                # sequential; another OP40 stage can still work.
                "current_stage":
                    stage,

                "current_station":
                    "OP40",

                "overall_status":
                    "OP40_IN_PROGRESS",

                "updated_at":
                    now,
            }
        }
    )

    updated = (
        inspection_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    return serialize_record(
        updated
    )


# =========================================================
# PASS SHEET
#
# OP40 ONLY
# =========================================================

@router.post(
    "/inspection/{record_id}/sheet/{sheet_name}/pass"
)
def pass_sheet(
    record_id: str,
    sheet_name: str,
    operator=Depends(require_op40),
):

    # -----------------------------------------------------
    # VALIDATE SHEET
    # -----------------------------------------------------

    validate_sheet(
        sheet_name
    )

    # -----------------------------------------------------
    # RECORD
    # -----------------------------------------------------

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
            detail="Inspection not found"
        )

    # -----------------------------------------------------
    # OPERATOR STAGE
    # -----------------------------------------------------

    stage = (
        ensure_operator_can_work_stage(
            record,
            operator
        )
    )

    # -----------------------------------------------------
    # SHEET
    # -----------------------------------------------------

    sheet = get_sheet(
        record,
        stage,
        sheet_name
    )

    if not sheet:

        raise HTTPException(
            status_code=404,
            detail="Sheet not found"
        )

    # -----------------------------------------------------
    # ALREADY PASSED
    # -----------------------------------------------------

    if sheet.get("status") in [
        "PASS",
        "PASSED",
    ]:

        return {
            "message":
                "Sheet already passed",

            "stage":
                stage,

            "sheet":
                sheet_name,
        }

    # -----------------------------------------------------
    # DATA
    # -----------------------------------------------------

    data = sheet.get(
        "data",
        {}
    )

    # -----------------------------------------------------
    # REQUIRED YES / NO VALIDATION
    # -----------------------------------------------------

    validate_yes_no(
        sheet_name,
        data
    )

    # -----------------------------------------------------
    # SHEET RESULT
    # -----------------------------------------------------

    nok_fields = collect_nok(
        data
    )

    result_status = (
        "NOK"
        if nok_fields
        else "OK"
    )

    now = utc_now()

    # -----------------------------------------------------
    # PASS THE SHEET
    # -----------------------------------------------------

    inspection_collection.update_one(
        {
            "_id": object_id
        },
        {
            "$set": {

                f"stages.{stage}.sheets.{sheet_name}.status":
                    "PASSED",

                f"stages.{stage}.sheets.{sheet_name}.result_status":
                    result_status,

                f"stages.{stage}.sheets.{sheet_name}.passed_by":
                    operator.get(
                        "name"
                    ),

                f"stages.{stage}.sheets.{sheet_name}.passed_at":
                    now,

                f"stages.{stage}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"stages.{stage}.operator_name":
                    operator.get(
                        "name"
                    ),

                f"stages.{stage}.shift":
                    operator.get(
                        "shift"
                    ),

                "updated_at":
                    now,
            }
        }
    )

    # -----------------------------------------------------
    # RELOAD
    # -----------------------------------------------------

    record = (
        inspection_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    # -----------------------------------------------------
    # CHECK WHETHER THIS STAGE IS COMPLETE
    # -----------------------------------------------------

    if not all_sheets_passed(
        record,
        stage
    ):

        return serialize_record(
            record
        )

    # -----------------------------------------------------
    # STAGE IS COMPLETE
    # -----------------------------------------------------

    stage_nok_items = (
        get_stage_nok_items(
            record,
            stage
        )
    )

    stage_result = (
        "NOK"
        if stage_nok_items
        else "OK"
    )

    # The current stage is about to be marked COMPLETED below.
    # Reflect that in the in-memory record before checking whether
    # all independent OP40 stages are complete.
    record.setdefault("stages", {})
    record.setdefault("stages", {}).setdefault(stage, {})
    record["stages"][stage]["status"] = "COMPLETED"
    record["stages"][stage]["result_status"] = stage_result

    all_op40_stages_will_be_completed = (
        all_stages_completed(record)
    )

    update = {

        f"stages.{stage}.status":
            "COMPLETED",

        f"stages.{stage}.result_status":
            stage_result,

        f"stages.{stage}.completed_at":
            now,

        "updated_at":
            now,
    }

    # -----------------------------------------------------
    # FRAME HISTORY
    # -----------------------------------------------------
    # Record completion of the actual OP40 stage.

    frame_history_entry = {
        "station": "OP40",
        "stage": stage,
        "action": "STATION_COMPLETED",
        "status": stage_result,
        "operator_id": operator.get("operator_id"),
        "operator_name": operator.get("name"),
        "shift": operator.get("shift"),
        "completed_at": now,
    }

    # -----------------------------------------------------
    # DETERMINE NEXT WORKFLOW STATE
    # -----------------------------------------------------
    #
    # STAGE_1 / STAGE_2 / STAGE_3 are independent.
    # Completing one stage does NOT activate another stage
    # and does NOT require another stage to be completed first.
    #
    # PDI is allowed only after ALL OP40 stages are complete
    # and there are no outstanding OP40 NOK items.
    # -----------------------------------------------------

    if stage_nok_items:
    # -----------------------------------------------------
    # OP40 NOK -> OP60 REWORK
    # -----------------------------------------------------
    #
    # If all three OP40 stages are already completed,
    # OP60 is the final rework before PDI STATION 3.
    #
    # Therefore:
    #
    # OP40 -> NOK -> OP60 -> PDI STATION 3
    #
    # We do NOT send the frame back to the completed
    # OP40 stage.
    # -----------------------------------------------------

        update["overall_status"] = "OP60_REWORK"
        update["current_stage"] = "OP60"
        update["current_station"] = "OP60"

        # OP60 is the rework station after an OP40 NOK.
        # Once OP60 finishes the rework, the SAME frame must go
        # to PDI STATION 3. It must never return to OP40 here.
        update["op60_return_station"] = "PDI_STATION_3"

        update["nok_items"] = stage_nok_items

    elif all_op40_stages_will_be_completed:
        # Every independent OP40 stage is now complete and
        # there are no outstanding OP40 NOK items.
        update["overall_status"] = "PDI_PENDING"
        update["current_stage"] = "PDI_STATION_3"
        update["current_station"] = "PDI_STATION_3"
        update["op60_return_station"] = None
        update["nok_items"] = []
        update["completed_at"] = None

    else:
        # Other OP40 stages may still be WAITING or IN_PROGRESS.
        # They remain independently available to their assigned
        # operators. Keep the frame at OP40.
        update["overall_status"] = "OP40_IN_PROGRESS"
        update["current_stage"] = stage
        update["current_station"] = "OP40"
        update["op60_return_station"] = None
        update["nok_items"] = []

    # -----------------------------------------------------
    # UPDATE DATABASE
    # -----------------------------------------------------

    inspection_collection.update_one(
        {
            "_id": object_id
        },
        {
            "$set": update,
            "$push": {
                "frame_history": frame_history_entry,
            },
        }
    )

    # -----------------------------------------------------
    # FINAL RECORD
    # -----------------------------------------------------

    final_record = (
        inspection_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    return serialize_record(
        final_record
    )
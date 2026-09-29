from datetime import datetime, timezone


# ============================================================
# CONSTANTS
# ============================================================

STAGES = [
    "STAGE_1",
    "STAGE_2",
    "STAGE_3",
]

SHEETS = [
    "leakage",
    "defect",
    "spatter",
    "pdi",
]


# ============================================================
# TIME
# ============================================================

def utc_now():
    return datetime.now(timezone.utc)


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_value(value):
    """
    Normalize YES/NO values.

    Returns:
        YES
        NO
        None
    """

    if value is None:
        return None

    if isinstance(value, bool):
        return "YES" if value else "NO"

    value = str(value).strip().upper()

    if value in {"YES", "Y", "OK", "PASS"}:
        return "YES"

    if value in {"NO", "N", "NOK", "FAIL"}:
        return "NO"

    return None


# ============================================================
# FIND NO / NOK VALUES
# ============================================================

def collect_nok_fields(data, prefix=""):
    """
    Recursively find fields containing NO/NOK.

    Example:
        {
            "leakage_cp1": "YES",
            "leakage_cp2": "NO"
        }

    returns:
        ["leakage_cp2"]
    """

    nok_fields = []

    if isinstance(data, dict):

        for key, value in data.items():

            current_path = (
                f"{prefix}.{key}"
                if prefix
                else key
            )

            if isinstance(value, str):

                if value.strip().upper() in {
                    "NO",
                    "NOK",
                }:
                    nok_fields.append(
                        current_path
                    )

            elif isinstance(value, (dict, list)):

                nok_fields.extend(
                    collect_nok_fields(
                        value,
                        current_path
                    )
                )

    elif isinstance(data, list):

        for index, value in enumerate(data):

            current_path = (
                f"{prefix}.{index}"
                if prefix
                else str(index)
            )

            if isinstance(value, str):

                if value.strip().upper() in {
                    "NO",
                    "NOK",
                }:
                    nok_fields.append(
                        current_path
                    )

            elif isinstance(value, (dict, list)):

                nok_fields.extend(
                    collect_nok_fields(
                        value,
                        current_path
                    )
                )

    return nok_fields


# ============================================================
# VALIDATION
# ============================================================

def find_unanswered_fields(data):
    """
    Recursively find fields that are not YES or NO.

    Used to prevent a sheet from being passed
    before every required checkpoint is answered.
    """

    unanswered = []

    if isinstance(data, dict):

        for key, value in data.items():

            # Ignore metadata fields
            if key in {
                "created_at",
                "updated_at",
                "passed",
                "status",
                "operator_id",
                "operator_name",
                "rework_history",
                "nok_items",
            }:
                continue

            if isinstance(value, str):

                normalized = value.strip().upper()

                if normalized not in {
                    "YES",
                    "NO",
                    "OK",
                    "NOK",
                    "PASS",
                    "FAIL",
                }:
                    unanswered.append(key)

            elif isinstance(value, (dict, list)):

                unanswered.extend(
                    find_unanswered_fields(
                        value
                    )
                )

    elif isinstance(data, list):

        for index, value in enumerate(data):

            if isinstance(value, str):

                normalized = value.strip().upper()

                if normalized not in {
                    "YES",
                    "NO",
                    "OK",
                    "NOK",
                    "PASS",
                    "FAIL",
                }:
                    unanswered.append(
                        str(index)
                    )

            elif isinstance(value, (dict, list)):

                unanswered.extend(
                    find_unanswered_fields(
                        value
                    )
                )

    return unanswered


def is_sheet_complete(data):
    """
    A sheet is complete only when there are
    no unanswered YES/NO fields.
    """

    return len(
        find_unanswered_fields(data)
    ) == 0


# ============================================================
# SHEET STATUS
# ============================================================

def calculate_sheet_status(data):
    """
    Calculate sheet status.

    INCOMPLETE:
        At least one checkpoint unanswered.

    NOK:
        All answered, but at least one NO.

    PASS:
        All answered and all YES.
    """

    if not is_sheet_complete(data):
        return "INCOMPLETE"

    nok_fields = collect_nok_fields(data)

    if nok_fields:
        return "NOK"

    return "PASS"


# ============================================================
# STAGE STATUS
# ============================================================

def calculate_stage_status(stage_data):
    """
    Calculate stage status from its sheets.
    """

    if not isinstance(stage_data, dict):
        return "INCOMPLETE"

    statuses = []

    for sheet in SHEETS:

        sheet_data = stage_data.get(
            sheet,
            {}
        )

        if not isinstance(sheet_data, dict):
            return "INCOMPLETE"

        status = calculate_sheet_status(
            sheet_data
        )

        statuses.append(status)

    if "INCOMPLETE" in statuses:
        return "INCOMPLETE"

    if "NOK" in statuses:
        return "NOK"

    return "PASS"


# ============================================================
# GET ALL INSPECTION NOKs
# ============================================================

def get_all_nok_items(record):
    """
    Collect all NOK fields from STAGE_1,
    STAGE_2 and STAGE_3.

    Output:

    [
        {
            "stage": "STAGE_1",
            "field": "leakage.leakage_cp3"
        }
    ]
    """

    nok_items = []

    for stage in STAGES:

        stage_data = record.get(
            stage,
            {}
        )

        if not isinstance(stage_data, dict):
            continue

        for sheet_name, sheet_data in stage_data.items():

            if not isinstance(
                sheet_data,
                (dict, list)
            ):
                continue

            fields = collect_nok_fields(
                sheet_data,
                sheet_name
            )

            for field in fields:

                nok_items.append({
                    "stage": stage,
                    "field": field,
                })

    return nok_items


# ============================================================
# OVERALL STATUS
# ============================================================

def calculate_overall_status(record):
    """
    Calculate overall inspection status.

    Priority:

        INCOMPLETE
            ↓
        OP60_REWORK
            ↓
        COMPLETED
    """

    for stage in STAGES:

        stage_data = record.get(
            stage,
            {}
        )

        if not stage_data:
            return "INCOMPLETE"

        stage_status = calculate_stage_status(
            stage_data
        )

        if stage_status == "INCOMPLETE":
            return "INCOMPLETE"

    nok_items = get_all_nok_items(record)

    if nok_items:
        return "OP60_REWORK"

    return "COMPLETED"


# ============================================================
# REWORK HISTORY
# ============================================================

def build_rework_entry(
    operator,
    stage,
    field,
    remarks=None,
):
    """
    Create a rework history entry.
    """

    entry = {
        "operator_id": operator.get(
            "operator_id"
        ),
        "operator_name": operator.get(
            "name"
        ),
        "stage": stage,
        "field": field,
        "timestamp": utc_now(),
        "action": "REWORK_COMPLETED",
    }

    if remarks:
        entry["remarks"] = remarks

    return entry


# ============================================================
# SERIALIZATION
# ============================================================

def serialize_datetime(value):
    """
    Convert datetime to ISO string.
    """

    if isinstance(value, datetime):
        return value.isoformat()

    return value


def serialize_record(record):
    """
    Convert MongoDB inspection document
    into JSON-friendly data.
    """

    result = dict(record)

    if "_id" in result:
        result["id"] = str(
            result.pop("_id")
        )

    for key, value in list(
        result.items()
    ):

        if isinstance(value, datetime):
            result[key] = serialize_datetime(
                value
            )

    return result
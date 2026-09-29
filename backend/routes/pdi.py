# pdi.py
#
# IMPORTANT:
# The normal PDI checklist remains unchanged.
# Gauge inspection is defined separately for PDI_STATION_3.
# Gauge inspection is mandatory for PDI_STATION_3 before PASS.
# PDI_STATION_4 has no separate Gauge checklist.

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database.mongodb import inspection_collection
from routes.core.operator_security import get_operator


router = APIRouter(
    prefix="/pdi",
    tags=["PDI"],
)


# =========================================================
# PDI STATIONS
# =========================================================

PDI_STATIONS = [
    "PDI_STATION_3",
    "PDI_STATION_4",
]

PDI_STATION_LABELS = {
    "PDI_STATION_3": "PDI STATION 3",
    "PDI_STATION_4": "PDI STATION 4",
}


# =========================================================
# GAUGE INSPECTION CHECKLIST
#
# Source:
# Gauge Inspection Monitoring Sheet
# Doc. No. - MOB-QA-FMT-46
#
# These checks are performed at PDI STATION 3.
#
# IMPORTANT:
# Gauge inspection is stored separately from the normal
# PDI checklist.
#
# Gauge inspection is mandatory for PDI_STATION_3 before PASS.
# =========================================================

GAUGE_CHECKPOINTS = {
    "PDI_STATION_3": [

        {
            "sr_no": 1,
            "checkpoint": (
                "Check CM2 & CM3 mounting hole threading"
            ),
            "position": (
                "RM side(bottom)/ TOP"
            ),
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "M6 x 1.0 - 6H"
            ),
            "specification": (
                "M6 x 1.0 - 6H"
            ),
            "no_of_holes": (
                "CM2-4H, CM3-6H"
            ),
            "method": "TPG",
            "confirmation_marking": (
                ". (RM side)"
            ),
        },

        {
            "sr_no": 2,
            "checkpoint": (
                "Check LH/RH/Front/Rear member mounting hole "
                "diameter (Each members corners 1-1 hole)"
            ),
            "position": "Top",
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "22.0 +0.2 mm"
            ),
            "specification": (
                "22.0 +0.2 mm"
            ),
            "no_of_holes": (
                "LH-02, RH-02, FM-02, RM-02"
            ),
            "method": "PPG",
            "confirmation_marking": ".",
        },

        {
            "sr_no": 3,
            "checkpoint": (
                "Check LH/RH/Front/Rear member mounting hole "
                "diameter (Each members corners 1-1 hole)"
            ),
            "position": "Top",
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "18.0 +0.2 mm"
            ),
            "specification": (
                "18.0 +0.2 mm"
            ),
            "no_of_holes": (
                "LH-02, RH-02, FM-02, RM-02"
            ),
            "method": "PPG",
            "confirmation_marking": ".",
        },

        {
            "sr_no": 4,
            "checkpoint": (
                "Check BDU boss hole threading "
                "(Both side checking)"
            ),
            "position": "Top",
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "M6 x 1.0 - 6H"
            ),
            "specification": (
                "M6 x 1.0 - 6H"
            ),
            "no_of_holes": "3H",
            "method": "TPG",
            "confirmation_marking": ".",
        },

        {
            "sr_no": 5,
            "checkpoint": (
                "Check front member hole threading"
            ),
            "position": "Top",
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "M5 x 0.8 - 6H"
            ),
            "specification": (
                "M5 x 0.8 - 6H"
            ),
            "no_of_holes": "5H",
            "method": "TPG",
            "confirmation_marking": None,
        },

        {
            "sr_no": 6,
            "checkpoint": (
                "Check front member hole threading "
                "(Check weld side hole)"
            ),
            "position": "Top",
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "M6 x 1.0 - 6H"
            ),
            "specification": (
                "M6 x 1.0 - 6H"
            ),
            "no_of_holes": "16H",
            "method": "TPG",
            "confirmation_marking": "No marking",
        },

        {
            "sr_no": 7,
            "checkpoint": (
                "CM3 & CM4 hole threading "
                "(Module plate fitment hole)"
            ),
            "position": "Top",
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "M6 x 1.0 - 6H"
            ),
            "specification": (
                "M6 x 1.0 - 6H"
            ),
            "no_of_holes": (
                "CM2-8H, CM3-, CM4"
            ),
            "method": "TPG",
            "confirmation_marking": ". (side)",
        },

        {
            "sr_no": 8,
            "checkpoint": (
                "Centre member BDU Bracket fitment "
                "Centre member to rear member"
            ),
            "position": "Top",
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "As per SOP"
            ),
            "specification": (
                "As per SOP"
            ),
            "no_of_holes": None,
            "method": "BDU bracket",
            "confirmation_marking": "✔",
        },

        {
            "sr_no": 9,
            "checkpoint": (
                "Check Center member sleeve thread "
                "from Top side"
            ),
            "position": "Top",
            "station": "PDI",
            "frequency": 1,
            "criteria": (
                "M22.0 x 2.0 - 6H"
            ),
            "specification": (
                "M22.0 x 2.0 - 6H"
            ),
            "no_of_holes": "4H",
            "method": "Sleeve matting bolt",
            "confirmation_marking": (
                ". 4 sleeve"
            ),
        },
    ],

    "PDI_STATION_4": [],
}


# =========================================================
# PDI CHECKLISTS
# =========================================================

PDI_CHECKPOINTS = {

    "PDI_STATION_3": [
        {
            "sr_no": 1,
            "checkpoint": (
                "Top corners appearance. No steps, heavy porosity. "
                "Top face appearance, Mounting Dowels, Mounting holes "
                "appearance, no spatters, dent damages allowed near "
                "mounting holes. When at rear member check for Header "
                "Unit crack, spatters, dent damages. Check for BDU "
                "appearance for spatters, dents, chamfer and damages. "
                "When at Front Member check for vent valve appearance "
                "from inside and outside and block support inside burr "
                "sticky chips"
            ),
            "criteria": (
                "Top corners appearance. No steps, scratch heavy porosity. "
                "Top face appearance, Mounting Dowels, Mounting holes "
                "appearance, no spatters, dent damages allowed near "
                "mounting holes. When at rear member check for Header "
                "Unit crack, spatters, dent damages. Check for BDU "
                "appearance for spatters, dents, chamfer and damages. "
                "When at Front Member check for vent valve appearance "
                "from inside and outside and block support inside burr "
                "sticky chips"
            ),
            "method": "Visually",
        },
        {
            "sr_no": 2,
            "checkpoint": "Check vent valve face - Appearance",
            "criteria": "Free from dent, damage & spatters",
            "method": "Visually",
        },
        {
            "sr_no": 3,
            "checkpoint": "Header unit",
            "criteria": (
                "Crack not allowed at header unit ,damage,burr not "
                "allowed at any area"
            ),
            "method": "Visually",
        },
        {
            "sr_no": 4,
            "checkpoint": "Dust on frame",
            "criteria": "Frame should be free from dust",
            "method": "Visual",
        },
        {
            "sr_no": 5,
            "checkpoint": "Top cover mounting area",
            "criteria": (
                "No hard burr allowed at top cover mounting area"
            ),
            "method": "Visually",
        },
        {
            "sr_no": 6,
            "checkpoint": "Porosity on top corners",
            "criteria": "Through hole not accepted in porosity",
            "method": "Pin 2mm",
        },
        {
            "sr_no": 7,
            "checkpoint": "Check laser marking content (Traceability)",
            "criteria": (
                "Part identification code mahindra part no,vendor code,"
                "production day month year,manufacturing shift ,supplier "
                "serial number. Barcode should be visible no blur barcode "
                "is allowed"
            ),
            "method": "Visually",
        },
        {
            "sr_no": 8,
            "checkpoint": "non std marking on frame",
            "criteria": (
                "Frame should be free from nonstd marking"
            ),
            "method": "visual",
        },
        {
            "sr_no": 9,
            "checkpoint": "Frame",
            "criteria": (
                "No water mark or excessive heat mark presence at any "
                "corner or any child part of frame. Should be free from "
                "loose dust and oil"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 10,
            "checkpoint": "weld spatter in bdu bracket",
            "criteria": "No weld spatter allowed at bdu bracket",
            "method": "visual",
        },
        {
            "sr_no": 11,
            "checkpoint": "Bdu boss mounting thread",
            "criteria": "Bdu boss mounting thread should present",
            "method": "visual",
        },
        {
            "sr_no": 12,
            "checkpoint": (
                "Masking tape CM2 & 3 RH BDU bracket hole in frame assy."
            ),
            "criteria": (
                "Frame should be free from Masking tape CM2 & 3 RH "
                "BDU bracket hole in frame"
            ),
            "method": "visual",
        },
        {
            "sr_no": 13,
            "checkpoint": (
                "M22 sleeve extra material, extra weld flow ,"
                "thread damage ,thread miss"
            ),
            "criteria": (
                "Burr or extra weld should not present in sleeve,"
                "thread should not damage neither miss picth should proper"
            ),
            "method": "visual",
        },
        {
            "sr_no": 14,
            "checkpoint": "Centre member",
            "criteria": (
                "Centre member should free from spatters,burr in pockets,holes"
            ),
            "method": "Visually",
        },
        {
            "sr_no": 15,
            "checkpoint": "Centre member",
            "criteria": (
                "No excess weld allowed inside centre member compartment "
                "also in any other places. centre member hole should not shift"
            ),
            "method": "visual",
        },
        {
            "sr_no": 16,
            "checkpoint": "Check sleeve position",
            "criteria": (
                "Sleeve perpendicular to the centre member"
            ),
            "method": "Visually",
        },
        {
            "sr_no": 17,
            "checkpoint": (
                "M22 sleeve extra material, extra weld flow"
            ),
            "criteria": (
                "Burr or extra weld should not present in sleeve"
            ),
            "method": "visual",
        },
        {
            "sr_no": 18,
            "checkpoint": "Centre member Dia",
            "criteria": (
                "all centre member Dia should ok no damage dent allowed. "
                "centre member hole should not shift"
            ),
            "method": "visual",
        },
        {
            "sr_no": 19,
            "checkpoint": "All hole thread",
            "criteria": (
                "Thread should not miss or half thread should not present "
                "and it should not damage"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 20,
            "checkpoint": "Spatter on cross Member",
            "criteria": (
                "Spatter free Cross Member 1,2,3 &4"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 21,
            "checkpoint": "Rust on Cross Member 1 Pocket",
            "criteria": "Rust free Cross Member 1",
            "method": "Visual",
        },
        {
            "sr_no": 22,
            "checkpoint": "Dimond File on Frame",
            "criteria": (
                "Frame should be free from Files and any foregin particles"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 23,
            "checkpoint": (
                "Cotton Cloth on Cross member and Centre member Joint"
            ),
            "criteria": "Cross members & centre Member",
            "method": "Visual",
        },
        {
            "sr_no": 24,
            "checkpoint": (
                "Masking tape found on Center member drain hole"
            ),
            "criteria": "Center member Top side",
            "method": "Visual",
        },
        {
            "sr_no": 25,
            "checkpoint": (
                "Cross Member 1,2,3,4 holes thread"
            ),
            "criteria": (
                "Cross member Holes should have threads"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 26,
            "checkpoint": "Chip ,burr in frame",
            "criteria": (
                "Frame should be free from chip and burr"
            ),
            "method": "Visual",
        },
    ],

    "PDI_STATION_4": [
        {
            "sr_no": 1,
            "checkpoint": (
                "Module plate mounting and top cover mounting face "
                "of cross members"
            ),
            "criteria": (
                "Module plate mounting and top cover mounting face of "
                "cross members for spatters, dents and damages. Module "
                "mounting face of front member for spatters, dents and damages."
            ),
            "method": "visual",
        },
        {
            "sr_no": 2,
            "checkpoint": "Centre member bdu bracket assembly",
            "criteria": (
                "Bdu fitment should not tight due to extra weld or any "
                "other reason bdu bracket aguge and centre meber hole "
                "should match perfectly"
            ),
            "method": "visual",
        },
        {
            "sr_no": 3,
            "checkpoint": "QR code of frame",
            "criteria": (
                "Qr code should not miss,doble punch, light qre code "
                "not accepted, any rework mark on qre code not accepted. "
                "check for qre code visibility"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 4,
            "checkpoint": "weld spatter in bdu bracket",
            "criteria": "No weld spatter allowed at bdu bracket",
            "method": "visual",
        },
        {
            "sr_no": 5,
            "checkpoint": "",
            "criteria": (
                "tape should properly stick on rear member no open "
                "point should be there"
            ),
            "method": "Visually",
        },
        {
            "sr_no": 6,
            "checkpoint": (
                "Check centre member for extra weld or weld shift"
            ),
            "criteria": (
                "Bdu bracket should be assemble freely no weld should "
                "present below bdu"
            ),
            "method": "Bdu bracket",
        },
        {
            "sr_no": 7,
            "checkpoint": "Spatter inside sleeve",
            "criteria": (
                "Spatter not allowed inside sleeve"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 8,
            "checkpoint": "Sleeve crack",
            "criteria": (
                "Check for sleeve crack it should not present on sleeve,"
                "thread should not damage,miss"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 9,
            "checkpoint": "",
            "criteria": (
                "Do the vibration from top on vibrometer tilt the "
                "frame give vibration from bottom side"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 10,
            "checkpoint": "",
            "criteria": (
                "Check all inspection of all above four stages excluding "
                "gauge chcek also check burr in frame front member m6 holes "
                "and pocket all outer corner of frame cross member holes "
                "centre member pocket and sleeve holes extra weld in bdu bracket"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 11,
            "checkpoint": "",
            "criteria": (
                "Do the bubble test on top outer corners bid ensure no "
                "leakadge and send to ecocelan"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 12,
            "checkpoint": "Spatter on cross Member",
            "criteria": (
                "Spatter free Cross Member 1,2,3 &4"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 13,
            "checkpoint": "Rust on Cross Member 1 Pocket",
            "criteria": "Rust free Cross Member 1",
            "method": "Visual",
        },
        {
            "sr_no": 14,
            "checkpoint": "Dimond File on Frame",
            "criteria": (
                "Frame should be free from Files and any foregin particles"
            ),
            "method": "Visual",
        },
        {
            "sr_no": 15,
            "checkpoint": (
                "Cotton Cloth on Cross member and Centre member Joint"
            ),
            "criteria": "Cross members & centre Member",
            "method": "Visual",
        },
        {
            "sr_no": 16,
            "checkpoint": (
                "Masking tape found on Center member drain hole"
            ),
            "criteria": "Center member Top side",
            "method": "Visual",
        },
        {
            "sr_no": 17,
            "checkpoint": (
                "Cross Member 1,2,3,4 holes thread"
            ),
            "criteria": (
                "Cross member Holes should have threads"
            ),
            "method": "Visual",
        },
    ],
}


# =========================================================
# REQUEST MODELS
# =========================================================

class PDIStartRequest(BaseModel):
    record_id: str


class PDICheckpointSaveRequest(BaseModel):
    value: str = Field(
        ...,
        description="YES or NO",
    )


class PDIGaugeCheckpointSaveRequest(BaseModel):
    value: str = Field(
        ...,
        description="YES or NO",
    )


# =========================================================
# HELPERS
# =========================================================

def utc_now():
    return datetime.now(timezone.utc)


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


def check_id(record_id):
    if not ObjectId.is_valid(record_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid record ID",
        )

    return ObjectId(record_id)


def get_pdi_station(operator):
    station = str(
        operator.get(
            "station",
            "",
        )
    ).strip().upper()

    if station not in PDI_STATIONS:
        raise HTTPException(
            status_code=403,
            detail="PDI station operator access required",
        )

    return station


def check_shift(record, operator):
    record_shift = record.get("shift")
    operator_shift = operator.get("shift")

    if (
        record_shift
        and operator_shift
        and record_shift != operator_shift
    ):
        raise HTTPException(
            status_code=403,
            detail="Operator shift does not match frame shift",
        )


# =========================================================
# OP40 ELIGIBILITY
# =========================================================

def all_op40_stages_completed(record):
    """
    STAGE_1, STAGE_2 and STAGE_3 are alternative OP40 stages.

    A frame goes through ONLY ONE of them.

    Therefore the frame is ready for PDI when ANY ONE
    of the three stages is COMPLETED.
    """

    stages = record.get(
        "stages",
        {}
    )

    for stage_name in [
        "STAGE_1",
        "STAGE_2",
        "STAGE_3",
    ]:
        stage = stages.get(
            stage_name,
            {}
        )

        if stage.get(
            "status"
        ) == "COMPLETED":
            return True

    return False


# =========================================================
# BUILD NORMAL PDI CHECKPOINTS
# =========================================================

def build_empty_checkpoints(station):

    checkpoints = {}

    for item in PDI_CHECKPOINTS[station]:

        checkpoint_id = (
            f"CP_{item['sr_no']}"
        )

        checkpoints[checkpoint_id] = {
            "sr_no":
                item["sr_no"],

            "checkpoint":
                item["checkpoint"],

            "criteria":
                item["criteria"],

            "method":
                item["method"],

            "value":
                None,

            "status":
                "PENDING",

            "operator_id":
                None,

            "operator_name":
                None,

            "saved_at":
                None,

            "history":
                [],
        }

    return checkpoints


# =========================================================
# BUILD GAUGE CHECKPOINTS
# =========================================================

def build_empty_gauge_checkpoints(station):

    gauge_checkpoints = {}

    # Gauge is currently defined only for ST-3.
    gauge_items = GAUGE_CHECKPOINTS.get(
        station,
        []
    )

    for item in gauge_items:

        checkpoint_id = (
            f"GAUGE_CP_{item['sr_no']}"
        )

        gauge_checkpoints[checkpoint_id] = {
            "sr_no":
                item["sr_no"],

            "checkpoint":
                item.get(
                    "checkpoint",
                    "",
                ),

            "position":
                item.get(
                    "position",
                    "",
                ),

            "station":
                item.get(
                    "station",
                    "PDI",
                ),

            "frequency":
                item.get(
                    "frequency",
                    1,
                ),

            "criteria":
                item.get(
                    "criteria",
                    "",
                ),

            "specification":
                item.get(
                    "specification",
                    item.get(
                        "criteria",
                        "",
                    ),
                ),

            "no_of_holes":
                item.get(
                    "no_of_holes"
                ),

            "method":
                item.get(
                    "method",
                    "",
                ),

            "confirmation_marking":
                item.get(
                    "confirmation_marking"
                ),

            "value":
                None,

            "status":
                "PENDING",

            "operator_id":
                None,

            "operator_name":
                None,

            "saved_at":
                None,

            "history":
                [],
        }

    return gauge_checkpoints


# =========================================================
# PDI STATION DATA
# =========================================================
def build_empty_station(station):

    checkpoints = (
        build_empty_checkpoints(
            station
        )
    )

    gauge_checkpoints = (
        build_empty_gauge_checkpoints(
            station
        )
    )

    return {
        "station":
            station,

        "station_label":
            PDI_STATION_LABELS[
                station
            ],

        "status":
            "WAITING",

        "result_status":
            None,

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

        "nok_items":
            [],

        # Normal PDI checklist
        "checkpoints":
            checkpoints,

        # Separate Gauge checklist
        "gauge_checkpoints":
            gauge_checkpoints,
    }


def build_pdi_structure():

    stations = {}

    for station in PDI_STATIONS:

        stations[station] = (
            build_empty_station(
                station
            )
        )

    return {
        "status":
            "IN_PROGRESS",

        "current_station":
            "PDI_STATION_3",

        "started_at":
            None,

        "completed_at":
            None,

        "stations":
            stations,
    }


def get_station_data(
    record,
    station,
):

    return (
        record
        .get(
            "pdi",
            {}
        )
        .get(
            "stations",
            {}
        )
        .get(
            station
        )
    )


# =========================================================
# PDI SUMMARY
# =========================================================

def pdi_summary(record):

    pdi = record.get(
        "pdi",
        {}
    ) or {}

    stations = pdi.get(
        "stations",
        {}
    ) or {}

    summary = []

    for station in PDI_STATIONS:

        station_data = (
            stations.get(
                station,
                {}
            ) or {}
        )

        checkpoints = (
            station_data.get(
                "checkpoints",
                {}
            ) or {}
        )

        answered = sum(
            1
            for checkpoint in checkpoints.values()
            if checkpoint.get(
                "value"
            ) in [
                "YES",
                "NO",
            ]
        )

        gauge_checkpoints = (
            station_data.get(
                "gauge_checkpoints",
                {}
            ) or {}
        )

        gauge_answered = sum(
            1
            for checkpoint in gauge_checkpoints.values()
            if checkpoint.get(
                "value"
            ) in [
                "YES",
                "NO",
            ]
        )

        summary.append(
            {
                "station":
                    station,

                "station_label":
                    PDI_STATION_LABELS[
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
                    len(checkpoints),

                "gauge_answered":
                    gauge_answered,

                "gauge_total":
                    len(
                        gauge_checkpoints
                    ),
            }
        )

    return summary


# =========================================================
# CHECK WHETHER ALL PDI STATIONS PASSED
# =========================================================

def all_pdi_stations_passed(record):

    pdi = record.get(
        "pdi",
        {}
    ) or {}

    stations = pdi.get(
        "stations",
        {}
    ) or {}

    for station in PDI_STATIONS:

        station_data = (
            stations.get(
                station,
                {}
            ) or {}
        )

        if station_data.get(
            "status"
        ) != "PASSED":
            return False

    return True


# =========================================================
# STATION ACCESS
# =========================================================

def ensure_station_access(
    record,
    operator,
):
    """
    Verify that the logged-in operator can work on
    their assigned PDI station.

    A station that is already PASSED or has been handed
    over to OP60 for rework is locked for further PDI edits.
    """

    station = get_pdi_station(
        operator
    )

    check_shift(
        record,
        operator
    )

    pdi = record.get(
        "pdi"
    )

    if not pdi:

        if not all_op40_stages_completed(
            record
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "The OP40 stage used by "
                    "this frame is not completed."
                ),
            )

        if str(
            record.get("overall_status", "")
        ).strip().upper() not in {
            "COMPLETED",
            "PDI_PENDING",
        }:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Frame is not ready for PDI."
                ),
            )

        if station != "PDI_STATION_3":
            raise HTTPException(
                status_code=403,
                detail=(
                    "PDI Station 3 must be completed before PDI Station 4."
                ),
            )

        return station

    station_data = get_station_data(
        record,
        station
    )

    if not station_data:
        raise HTTPException(
            status_code=404,
            detail=(
                f"PDI data for {station} "
                "not found."
            ),
        )

    station_status = str(
        station_data.get(
            "status",
            ""
        )
    ).strip().upper()

    overall_status = str(
        record.get(
            "overall_status",
            ""
        )
    ).strip().upper()

    current_stage = str(
        record.get(
            "current_stage",
            ""
        )
    ).strip().upper()

    current_station = str(
        record.get(
            "current_station",
            ""
        )
    ).strip().upper()

    if current_station != station:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Frame is currently at {current_station or 'UNKNOWN'}, "
                f"not {station}."
            ),
        )

    if (
        station_status in {
            "PASSED",
            "NOK",
        }
        or overall_status == "OP60_REWORK"
        or current_stage == "OP60"
        or current_station == "OP60"
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "This PDI frame is locked because "
                "it has already been completed or "
                "handed over to OP60 for rework."
            ),
        )

    return station


# =========================================================
# MISSING CHECKPOINTS
# =========================================================

def get_missing_checkpoints(
    station_data
):

    missing = []

    checkpoints = (
        station_data
        .get(
            "checkpoints",
            {}
        )
    )

    for (
        checkpoint_id,
        checkpoint
    ) in checkpoints.items():

        if checkpoint.get(
            "value"
        ) not in [
            "YES",
            "NO",
        ]:

            missing.append(
                checkpoint_id
            )

    return missing


# =========================================================
# NOK CHECKPOINTS
# =========================================================

def get_nok_checkpoints(
    station_data
):

    result = []

    checkpoints = (
        station_data
        .get(
            "checkpoints",
            {}
        )
    )

    for (
        checkpoint_id,
        checkpoint
    ) in checkpoints.items():

        if checkpoint.get(
            "value"
        ) == "NO":

            result.append(
                {
                    "checkpoint_id":
                        checkpoint_id,

                    "sr_no":
                        checkpoint.get(
                            "sr_no"
                        ),

                    "checkpoint":
                        checkpoint.get(
                            "checkpoint"
                        ),

                    "criteria":
                        checkpoint.get(
                            "criteria"
                        ),

                    "method":
                        checkpoint.get(
                            "method"
                        ),

                    "status":
                        "NOK",
                }
            )

    return result


# =========================================================
# GAUGE CHECKPOINT HELPERS
# =========================================================

def get_missing_gauge_checkpoints(
    station_data
):

    missing = []

    gauge_checkpoints = (
        station_data
        .get(
            "gauge_checkpoints",
            {}
        )
    )

    for (
        checkpoint_id,
        checkpoint
    ) in gauge_checkpoints.items():

        if checkpoint.get(
            "value"
        ) not in [
            "YES",
            "NO",
        ]:

            missing.append(
                checkpoint_id
            )

    return missing


def get_nok_gauge_checkpoints(
    station_data
):

    result = []

    gauge_checkpoints = (
        station_data
        .get(
            "gauge_checkpoints",
            {}
        )
    )

    for (
        checkpoint_id,
        checkpoint
    ) in gauge_checkpoints.items():

        if checkpoint.get(
            "value"
        ) == "NO":

            result.append(
                {
                    "checkpoint_id":
                        checkpoint_id,

                    "sr_no":
                        checkpoint.get(
                            "sr_no"
                        ),

                    "checkpoint":
                        checkpoint.get(
                            "checkpoint"
                        ),

                    "criteria":
                        checkpoint.get(
                            "criteria"
                        ),

                    "method":
                        checkpoint.get(
                            "method"
                        ),

                    "status":
                        "NOK",
                }
            )

    return result


# =========================================================
# PDI QUEUE
# =========================================================

@router.get("/queue")
def get_pdi_queue(
    operator=Depends(get_operator),
):
    """
    Return only frames that are currently available
    for inspection at the logged-in PDI station.

    A frame is shown according to its CURRENT station.
    """

    station = get_pdi_station(
        operator
    )

    # =====================================================
    # OP40 MUST BE COMPLETED FIRST
    # =====================================================

    op40_completed = {
        "$or": [
            {
                "stages.STAGE_1.status":
                    "COMPLETED"
            },
            {
                "stages.STAGE_2.status":
                    "COMPLETED"
            },
            {
                "stages.STAGE_3.status":
                    "COMPLETED"
            },
        ]
    }

    # =====================================================
    # PDI QUEUE
    #
    # Fresh frame:
    #   OP40 completed
    #   PDI pending
    #
    # Existing frame:
    #   PDI current_station = logged-in station
    #   station status = WAITING / IN_PROGRESS
    #
    # Never include:
    #   OP60
    #   NOK
    #   PASSED
    #   completed PDI
    # =====================================================

    query = {
        "$and": [

            op40_completed,

            {
                "$or": [

                    # -------------------------------------------------
                    # FRESH FRAME - PDI HAS NOT STARTED
                    # -------------------------------------------------
                    {
                        "$and": [

                            {
                                "pdi": {
                                    "$exists":
                                        False
                                }
                            },

                            {
                                "overall_status": {
                                    "$in": [
                                        "PDI_PENDING",
                                        "COMPLETED",
                                    ]
                                }
                            },

                        ]
                    },

                    # -------------------------------------------------
                    # EXISTING PDI FRAME
                    # -------------------------------------------------
                    {
                        "$and": [

                            {
                                "pdi": {
                                    "$exists":
                                        True
                                }
                            },

                            {
                                "pdi.current_station":
                                    station
                            },

                            {
                                f"pdi.stations.{station}.status": {
                                    "$in": [
                                        "WAITING",
                                        "IN_PROGRESS",
                                    ]
                                }
                            },

                            {
                                "current_station":
                                    station
                            },

                        ]
                    },

                ]
            },

        ]
    }

    records = list(
        inspection_collection
        .find(
            query
        )
        .sort(
            "updated_at",
            -1,
        )
    )

    result = []

    for record in records:

        pdi = (
            record.get(
                "pdi"
            )
            or {}
        )

        station_data = (
            pdi
            .get(
                "stations",
                {}
            )
            .get(
                station,
                {}
            )
            or {}
        )

        station_status = str(
            station_data.get(
                "status",
                ""
            )
        ).strip().upper()

        overall_status = str(
            record.get(
                "overall_status",
                ""
            )
        ).strip().upper()

        current_stage = str(
            record.get(
                "current_stage",
                ""
            )
        ).strip().upper()

        current_station = str(
            record.get(
                "current_station",
                ""
            )
        ).strip().upper()

        if station_status in {
            "NOK",
            "PASSED",
        }:
            continue

        if overall_status == "OP60_REWORK":
            continue

        if current_stage == "OP60":
            continue

        if current_station == "OP60":
            continue

        if pdi.get(
            "status"
        ) == "COMPLETED":
            continue

        item = serialize(
            record
        )

        item["record_id"] = str(
            record.get(
                "_id"
            )
        )

        item["frame_no"] = str(
            record.get(
                "frame_no",
                ""
            )
        )

        item["date"] = record.get(
            "date"
        )

        item["shift"] = record.get(
            "shift"
        )

        item["overall_status"] = (
            record.get(
                "overall_status"
            )
        )

        item["current_stage"] = (
            record.get(
                "current_stage"
            )
        )

        item["current_station"] = (
            record.get(
                "current_station"
            )
        )

        item["pdi_summary"] = (
            pdi_summary(
                record
            )
        )

        result.append(
            item
        )

    return result


# =========================================================
# GET ONE PDI FRAME
# =========================================================

@router.get(
    "/frame/{record_id}"
)
def get_pdi_frame(
    record_id: str,
    operator=Depends(get_operator),
):

    object_id = check_id(
        record_id
    )

    record = (
        inspection_collection
        .find_one(
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

    station = get_pdi_station(
        operator
    )

    check_shift(
        record,
        operator
    )

    pdi = record.get(
        "pdi"
    )

    if not pdi:

        if not all_op40_stages_completed(
            record
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "The OP40 stage used by "
                    "this frame is not completed."
                ),
            )

        if str(
            record.get(
                "overall_status",
                ""
            )
        ).strip().upper() not in {
            "COMPLETED",
            "PDI_PENDING",
        }:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Frame is not ready for PDI."
                ),
            )

        if station != "PDI_STATION_3":
            raise HTTPException(
                status_code=403,
                detail=(
                    "PDI Station 3 must be completed "
                    "before PDI Station 4."
                ),
            )

    else:

        station_data = get_station_data(
            record,
            station
        )

        if not station_data:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"PDI data for "
                    f"{station} not found."
                ),
            )

        current_station = str(
            record.get(
                "current_station",
                ""
            )
        ).strip().upper()

        if current_station != station:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Frame is currently at "
                    f"{current_station or 'UNKNOWN'}, "
                    f"not {station}."
                ),
            )

    result = serialize(
        record
    )

    result["pdi_summary"] = (
        pdi_summary(
            record
        )
    )

    return result


# =========================================================
# START / RESUME PDI
# =========================================================

@router.post("/start")
def start_pdi(
    request: PDIStartRequest,
    operator=Depends(get_operator),
):

    object_id = check_id(
        request.record_id
    )

    record = (
        inspection_collection
        .find_one(
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

    station = get_pdi_station(
        operator
    )

    check_shift(
        record,
        operator
    )

    pdi = record.get(
        "pdi"
    )

    # =====================================================
    # FIRST PDI START
    # =====================================================

    if not pdi:

        if station != "PDI_STATION_3":
            raise HTTPException(
                status_code=403,
                detail=(
                    "PDI Station 3 must be completed "
                    "before PDI Station 4."
                ),
            )

        if not all_op40_stages_completed(
            record
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "The OP40 stage used by "
                    "this frame is not completed."
                ),
            )

        if str(
            record.get(
                "overall_status",
                ""
            )
        ).strip().upper() not in {
            "COMPLETED",
            "PDI_PENDING",
        }:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Frame is not ready for PDI."
                ),
            )

        pdi = build_pdi_structure()

        now = utc_now()

        pdi["started_at"] = now

        station_data = (
            pdi[
                "stations"
            ][station]
        )

        station_data[
            "status"
        ] = "IN_PROGRESS"

        station_data[
            "operator_id"
        ] = operator.get(
            "operator_id"
        )

        station_data[
            "operator_name"
        ] = operator.get(
            "name"
        )

        station_data[
            "shift"
        ] = operator.get(
            "shift"
        )

        station_data[
            "started_at"
        ] = now

        inspection_collection.update_one(
            {
                "_id":
                    object_id
            },
            {
                "$set": {

                    "pdi":
                        pdi,

                    "overall_status":
                        "PDI_IN_PROGRESS",

                    "current_stage":
                        "PDI_STATION_3",

                    "current_station":
                        "PDI_STATION_3",

                    "updated_at":
                        now,
                }
            }
        )

    # =====================================================
    # RESUME EXISTING PDI
    # =====================================================

    else:

        station_data = get_station_data(
            record,
            station
        )

        if not station_data:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"PDI data for "
                    f"{station} not found."
                ),
            )

        station_status = str(
            station_data.get(
                "status",
                ""
            )
        ).strip().upper()

        overall_status = str(
            record.get(
                "overall_status",
                ""
            )
        ).strip().upper()

        current_stage = str(
            record.get(
                "current_stage",
                ""
            )
        ).strip().upper()

        current_station = str(
            record.get(
                "current_station",
                ""
            )
        ).strip().upper()

        if current_station != station:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Frame is currently at "
                    f"{current_station or 'UNKNOWN'}, "
                    f"not {station}."
                ),
            )

        if (
            station_status in {
                "PASSED",
                "NOK",
            }
            or overall_status == "OP60_REWORK"
            or current_stage == "OP60"
            or current_station == "OP60"
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "This PDI frame is locked because "
                    "it has already been completed or "
                    "handed over to OP60 for rework."
                ),
            )

        now = utc_now()

        # =================================================
        # MIGRATE / REPAIR NORMAL PDI CHECKLIST
        #
        # Older / reworked PDI records may have an empty
        # or incomplete normal checklist.
        #
        # IMPORTANT:
        # - Do NOT overwrite existing answers
        # - Do NOT reset PASS/NOK results
        # - Only add missing checkpoint definitions
        # =================================================

        existing_checkpoints = (
            station_data.get(
                "checkpoints",
                {}
            )
            or {}
        )

        if not isinstance(
            existing_checkpoints,
            dict
        ):
            existing_checkpoints = {}

        expected_checkpoints = (
            build_empty_checkpoints(
                station
            )
        )

        changed_checkpoints = False

        for (
            checkpoint_id,
            template
        ) in expected_checkpoints.items():

            if checkpoint_id not in existing_checkpoints:

                existing_checkpoints[
                    checkpoint_id
                ] = template

                changed_checkpoints = True

        if changed_checkpoints:

            inspection_collection.update_one(
                {
                    "_id":
                        object_id
                },
                {
                    "$set": {
                        f"pdi.stations.{station}.checkpoints":
                            existing_checkpoints,
                    }
                }
            )

            station_data[
                "checkpoints"
            ] = existing_checkpoints


        # =================================================
        # MIGRATE / REPAIR GAUGE CHECKLIST
        #
        # Older ST-3 records may not contain all 9 Gauge
        # checkpoints. Add missing entries without
        # overwriting existing Gauge results.
        # =================================================

        if station == "PDI_STATION_3":

            existing_gauge = (
                station_data.get(
                    "gauge_checkpoints",
                    {}
                )
                or {}
            )

            if not isinstance(
                existing_gauge,
                dict
            ):
                existing_gauge = {}

            expected_gauge = (
                build_empty_gauge_checkpoints(
                    station
                )
            )

            changed_gauge = False

            for (
                checkpoint_id,
                template
            ) in expected_gauge.items():

                if checkpoint_id not in existing_gauge:

                    existing_gauge[
                        checkpoint_id
                    ] = template

                    changed_gauge = True

            if changed_gauge:

                inspection_collection.update_one(
                    {
                        "_id":
                            object_id
                    },
                    {
                        "$set": {
                            f"pdi.stations.{station}.gauge_checkpoints":
                                existing_gauge,
                        }
                    }
                )

                station_data[
                    "gauge_checkpoints"
                ] = existing_gauge

        inspection_collection.update_one(
            {
                "_id":
                    object_id
            },
            {
                "$set": {

                    f"pdi.stations.{station}.status":
                        "IN_PROGRESS",

                    f"pdi.stations.{station}.operator_id":
                        operator.get(
                            "operator_id"
                        ),

                    f"pdi.stations.{station}.operator_name":
                        operator.get(
                            "name"
                        ),

                    f"pdi.stations.{station}.shift":
                        operator.get(
                            "shift"
                        ),

                    f"pdi.stations.{station}.started_at":
                        station_data.get(
                            "started_at"
                        ) or now,

                    "pdi.status":
                        "IN_PROGRESS",

                    "overall_status":
                        "PDI_IN_PROGRESS",

                    "current_stage":
                        station,

                    "current_station":
                        station,

                    "updated_at":
                        now,
                }
            }
        )

    updated = (
        inspection_collection
        .find_one(
            {
                "_id":
                    object_id
            }
        )
    )

    result = serialize(
        updated
    )

    result["pdi_summary"] = (
        pdi_summary(
            updated
        )
    )

    return result


# =========================================================
# SAVE PDI CHECKPOINT
# =========================================================

@router.put(
    "/frame/{record_id}/checkpoint/{checkpoint_id}"
)
def save_pdi_checkpoint(
    record_id: str,
    checkpoint_id: str,
    request: PDICheckpointSaveRequest,
    operator=Depends(get_operator),
):

    value = str(
        request.value
    ).strip().upper()

    if value not in [
        "YES",
        "NO",
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Checkpoint value must be YES or NO"
            ),
        )

    object_id = check_id(
        record_id
    )

    record = (
        inspection_collection
        .find_one(
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

    station = ensure_station_access(
        record,
        operator
    )

    station_data = get_station_data(
        record,
        station
    )

    if not station_data:
        raise HTTPException(
            status_code=404,
            detail=(
                "PDI station data not found"
            ),
        )

    checkpoint = (
        station_data
        .get(
            "checkpoints",
            {}
        )
        .get(
            checkpoint_id
        )
    )

    if not checkpoint:
        raise HTTPException(
            status_code=404,
            detail=(
                "PDI checkpoint not found"
            ),
        )

    station_status = str(
        station_data.get(
            "status",
            ""
        )
    ).strip().upper()

    overall_status = str(
        record.get(
            "overall_status",
            ""
        )
    ).strip().upper()

    current_stage = str(
        record.get(
            "current_stage",
            ""
        )
    ).strip().upper()

    current_station = str(
        record.get(
            "current_station",
            ""
        )
    ).strip().upper()

    if (
        station_status in {
            "PASSED",
            "NOK",
        }
        or overall_status == "OP60_REWORK"
        or current_stage == "OP60"
        or current_station == "OP60"
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "This PDI frame is locked because "
                "it has already been completed or "
                "handed over to OP60 for rework."
            ),
        )

    now = utc_now()

    history_entry = {
        "value":
            value,

        "operator_id":
            operator.get(
                "operator_id"
            ),

        "operator_name":
            operator.get(
                "name"
            ),

        "saved_at":
            now,
    }

    current_status = (
        "NOK"
        if value == "NO"
        else "OK"
    )

    inspection_collection.update_one(
        {
            "_id":
                object_id
        },

        {
            "$set": {

                f"pdi.stations.{station}.checkpoints.{checkpoint_id}.value":
                    value,

                f"pdi.stations.{station}.checkpoints.{checkpoint_id}.status":
                    current_status,

                f"pdi.stations.{station}.checkpoints.{checkpoint_id}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"pdi.stations.{station}.checkpoints.{checkpoint_id}.operator_name":
                    operator.get(
                        "name"
                    ),

                f"pdi.stations.{station}.checkpoints.{checkpoint_id}.saved_at":
                    now,

                f"pdi.stations.{station}.status":
                    "IN_PROGRESS",

                f"pdi.stations.{station}.result_status":
                    None,

                f"pdi.stations.{station}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"pdi.stations.{station}.operator_name":
                    operator.get(
                        "name"
                    ),

                "pdi.status":
                    "IN_PROGRESS",

                "overall_status":
                    "PDI_IN_PROGRESS",

                "current_stage":
                    station,

                "current_station":
                    station,

                "pdi_nok_items":
                    [],

                "updated_at":
                    now,
            },

            "$push": {

                f"pdi.stations.{station}.checkpoints.{checkpoint_id}.history":
                    history_entry,
            },
        }
    )

    updated = (
        inspection_collection
        .find_one(
            {
                "_id":
                    object_id
            }
        )
    )

    result = serialize(
        updated
    )

    result["pdi_summary"] = (
        pdi_summary(
            updated
        )
    )

    return result


# =========================================================
# SAVE GAUGE CHECKPOINT
#
# Gauge is separate from the normal PDI checklist.
#
# Gauge is mandatory for PDI_STATION_3 before PASS.
# =========================================================

@router.put(
    "/frame/{record_id}/gauge/{checkpoint_id}"
)
def save_pdi_gauge_checkpoint(
    record_id: str,
    checkpoint_id: str,
    request: PDIGaugeCheckpointSaveRequest,
    operator=Depends(get_operator),
):

    value = str(
        request.value
    ).strip().upper()

    if value not in [
        "YES",
        "NO",
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Gauge checkpoint value must be YES or NO"
            ),
        )

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

    station = ensure_station_access(
        record,
        operator
    )

    if station != "PDI_STATION_3":
        raise HTTPException(
            status_code=403,
            detail=(
                "Gauge inspection is available only "
                "at PDI Station 3."
            ),
        )

    station_data = get_station_data(
        record,
        station
    )

    if not station_data:
        raise HTTPException(
            status_code=404,
            detail=(
                "PDI station data not found"
            ),
        )

    gauge_checkpoints = (
        station_data.get(
            "gauge_checkpoints",
            {}
        ) or {}
    )

    checkpoint = gauge_checkpoints.get(
        checkpoint_id
    )

    if not checkpoint:
        raise HTTPException(
            status_code=404,
            detail=(
                "Gauge checkpoint not found"
            ),
        )

    if station_data.get(
        "status"
    ) == "PASSED":
        raise HTTPException(
            status_code=403,
            detail=(
                "This PDI station is already "
                "passed and locked"
            ),
        )

    now = utc_now()

    history_entry = {
        "value":
            value,

        "operator_id":
            operator.get(
                "operator_id"
            ),

        "operator_name":
            operator.get(
                "name"
            ),

        "saved_at":
            now,
    }

    current_status = (
        "NOK"
        if value == "NO"
        else "OK"
    )

    inspection_collection.update_one(
        {
            "_id":
                object_id
        },

        {
            "$set": {

                f"pdi.stations.{station}.gauge_checkpoints.{checkpoint_id}.value":
                    value,

                f"pdi.stations.{station}.gauge_checkpoints.{checkpoint_id}.status":
                    current_status,

                f"pdi.stations.{station}.gauge_checkpoints.{checkpoint_id}.operator_id":
                    operator.get(
                        "operator_id"
                    ),

                f"pdi.stations.{station}.gauge_checkpoints.{checkpoint_id}.operator_name":
                    operator.get(
                        "name"
                    ),

                f"pdi.stations.{station}.gauge_checkpoints.{checkpoint_id}.saved_at":
                    now,

                f"pdi.stations.{station}.status":
                    "IN_PROGRESS",

                f"pdi.stations.{station}.result_status":
                    None,

                "pdi.status":
                    "IN_PROGRESS",

                "overall_status":
                    "PDI_IN_PROGRESS",

                "current_stage":
                    station,

                "current_station":
                    station,

                "updated_at":
                    now,
            },

            "$push": {

                f"pdi.stations.{station}.gauge_checkpoints.{checkpoint_id}.history":
                    history_entry,
            },
        }
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

    result["pdi_summary"] = (
        pdi_summary(
            updated
        )
    )

    return result


# =========================================================
# GET GAUGE CHECKLIST
# =========================================================

@router.get(
    "/gauge-checklists"
)
def get_gauge_checklists(
    operator=Depends(get_operator),
):

    station = get_pdi_station(
        operator
    )

    if station != "PDI_STATION_3":
        raise HTTPException(
            status_code=403,
            detail=(
                "Gauge inspection is available only "
                "at PDI Station 3."
            ),
        )

    return {
        "station":
            station,

        "station_label":
            PDI_STATION_LABELS[
                station
            ],

        "checkpoints":
            GAUGE_CHECKPOINTS.get(
                station,
                []
            ),
    }


# =========================================================
# PASS CURRENT PDI STATION
#
# PDI STATION 3:
#   - Every normal PDI checkpoint must be answered.
#   - Every Gauge checkpoint must be answered.
#
# PDI STATION 4:
#   - Every normal PDI checkpoint must be answered.
#
# YES and NO are both valid answers.
# =========================================================

@router.post(
    "/frame/{record_id}/pass"
)
def pass_pdi_station(
    record_id: str,
    operator=Depends(get_operator),
):

    object_id = check_id(
        record_id
    )

    record = (
        inspection_collection
        .find_one(
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

    station = get_pdi_station(
        operator
    )

    check_shift(
        record,
        operator
    )

    # =====================================================
    # INITIALIZE PDI IF NECESSARY
    # =====================================================

    if not record.get(
        "pdi"
    ):

        if station != "PDI_STATION_3":
            raise HTTPException(
                status_code=403,
                detail=(
                    "PDI Station 3 must be completed "
                    "before PDI Station 4."
                ),
            )

        if not all_op40_stages_completed(
            record
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "The OP40 stage used by "
                    "this frame is not completed."
                ),
            )

        if str(
            record.get("overall_status", "")
        ).strip().upper() not in {
            "COMPLETED",
            "PDI_PENDING",
        }:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Frame is not ready for PDI."
                ),
            )

        now = utc_now()

        pdi = build_pdi_structure()

        pdi["started_at"] = now

        station_data = (
            pdi[
                "stations"
            ][station]
        )

        station_data[
            "status"
        ] = "IN_PROGRESS"

        station_data[
            "operator_id"
        ] = operator.get(
            "operator_id"
        )

        station_data[
            "operator_name"
        ] = operator.get(
            "name"
        )

        station_data[
            "shift"
        ] = operator.get(
            "shift"
        )

        station_data[
            "started_at"
        ] = now

        inspection_collection.update_one(
            {
                "_id":
                    object_id
            },
            {
                "$set": {
                    "pdi":
                        pdi,

                    "overall_status":
                        "PDI_IN_PROGRESS",

                    "current_stage":
                        "PDI_STATION_3",

                    "current_station":
                        "PDI_STATION_3",

                    "updated_at":
                        now,
                }
            }
        )

        record = (
            inspection_collection
            .find_one(
                {
                    "_id":
                        object_id
                }
            )
        )

    station_data = get_station_data(
        record,
        station
    )

    if not station_data:
        raise HTTPException(
            status_code=404,
            detail=(
                f"PDI data for {station} "
                "not found."
            ),
        )

    current_station = str(
        record.get(
            "current_station",
            ""
        )
    ).strip().upper()

    if current_station != station:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Frame is currently at "
                f"{current_station or 'UNKNOWN'}, "
                f"not {station}."
            ),
        )

    # =====================================================
    # ALREADY PASSED
    # =====================================================

    if station_data.get(
        "status"
    ) == "PASSED":
        return serialize(
            record
        )

    # =====================================================
    # CHECK NORMAL PDI CHECKLIST
    # =====================================================

    missing = get_missing_checkpoints(
        station_data
    )

    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "All PDI checkpoints must be "
                    "answered YES or NO before PASS."
                ),
                "missing":
                    missing,
            },
        )

    # =====================================================
    # CHECK GAUGE CHECKLIST
    #
    # Gauge is mandatory ONLY for PDI STATION 3.
    #
    # Every one of the 9 defined Gauge checkpoints
    # must exist and must be answered YES or NO.
    # =====================================================

    if station == "PDI_STATION_3":

        gauge_checkpoints = (
            station_data.get(
                "gauge_checkpoints",
                {}
            )
            or {}
        )

        if not isinstance(
            gauge_checkpoints,
            dict
        ):
            gauge_checkpoints = {}

        expected_gauge_items = (
            GAUGE_CHECKPOINTS.get(
                station,
                []
            )
        )

        expected_gauge_ids = {
            f"GAUGE_CP_{item['sr_no']}"
            for item in expected_gauge_items
        }

        missing_gauge = []

        for checkpoint_id in expected_gauge_ids:

            checkpoint = (
                gauge_checkpoints.get(
                    checkpoint_id
                )
            )

            if (
                not checkpoint
                or checkpoint.get(
                    "value"
                ) not in {
                    "YES",
                    "NO",
                }
            ):
                missing_gauge.append(
                    checkpoint_id
                )

        missing_gauge.sort()

        if missing_gauge:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": (
                        "All Gauge inspection checkpoints "
                        "must be answered YES or NO before "
                        "completing PDI Station 3."
                    ),
                    "missing_gauge":
                        missing_gauge,
                    "missing_gauge_count":
                        len(
                            missing_gauge
                        ),
                },
            )

    # =====================================================
    # FIND NORMAL PDI NOK ITEMS
    #
    # YES = OK
    # NO  = NOK
    #
    # A NOK station is completed for PDI purposes and
    # remains locked while OP60 handles the rework.
    # =====================================================

    nok_items = get_nok_checkpoints(
        station_data
    )

    now = utc_now()

    # =====================================================
    # THIS STATION HAS NOK
    # =====================================================

    if nok_items:

        frame_history_entry = {
            "station":
                station,

            "stage":
                "PDI",

            "action":
                "STATION_COMPLETED",

            "status":
                "NOK",

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

        inspection_collection.update_one(
            {
                "_id":
                    object_id
            },
            {
                "$set": {

                    f"pdi.stations.{station}.status":
                        "NOK",

                    f"pdi.stations.{station}.result_status":
                        "NOK",

                    f"pdi.stations.{station}.completed_at":
                        now,

                    f"pdi.stations.{station}.nok_items":
                        nok_items,

                    "pdi.status":
                        "IN_PROGRESS",

                    "overall_status":
                        "OP60_REWORK",

                    "current_stage":
                        "OP60",

                    "current_station":
                        "OP60",

                    "pdi_nok_items":
                        nok_items,

                    "updated_at":
                        now,
                },

                "$push": {
                    "frame_history":
                        frame_history_entry,
                },
            }
        )

        updated = (
            inspection_collection
            .find_one(
                {
                    "_id":
                        object_id
                }
            )
        )

        result = serialize(
            updated
        )

        result["pdi_summary"] = (
            pdi_summary(
                updated
            )
        )

        return result

    # =====================================================
    # THIS STATION PASSED
    # =====================================================

    frame_history_entry = {
        "station":
            station,

        "stage":
            "PDI",

        "action":
            "STATION_COMPLETED",

        "status":
            "OK",

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

    update = {

        f"pdi.stations.{station}.status":
            "PASSED",

        f"pdi.stations.{station}.result_status":
            "OK",

        f"pdi.stations.{station}.completed_at":
            now,

        f"pdi.stations.{station}.nok_items":
            [],

        "pdi.status":
            "IN_PROGRESS",

        # Keep nested PDI station synchronized with the top-level
        # station. The PDI queue uses pdi.current_station.
        "pdi.current_station":
            (
                "PDI_STATION_4"
                if station == "PDI_STATION_3"
                else "FIREWALL"
            ),

        "overall_status":
            "PDI_IN_PROGRESS",

        "current_stage":
            (
                "PDI_STATION_4"
                if station == "PDI_STATION_3"
                else "FIREWALL"
            ),

        "current_station":
            (
                "PDI_STATION_4"
                if station == "PDI_STATION_3"
                else "FIREWALL"
            ),

        "pdi_nok_items":
            [],

        "updated_at":
            now,
    }

    inspection_collection.update_one(
        {
            "_id":
                object_id
        },
        {
            "$set":
                update,

            "$push": {
                "frame_history":
                    frame_history_entry,
            },
        }
    )

    updated = (
        inspection_collection
        .find_one(
            {
                "_id":
                    object_id
            }
        )
    )

    # =====================================================
    # BOTH PDI STATIONS PASSED -> FIREWALL
    # =====================================================

    if all_pdi_stations_passed(
        updated
    ):

        inspection_collection.update_one(
            {
                "_id":
                    object_id
            },
            {
                "$set": {

                    "pdi.status":
                        "COMPLETED",

                    "pdi.completed_at":
                        now,

                    "pdi.current_station":
                        "COMPLETED",

                    "overall_status":
                        "FIREWALL_PENDING",

                    "current_stage":
                        "FIREWALL",

                    "current_station":
                        "FIREWALL",

                    "pdi_nok_items":
                        [],

                    "updated_at":
                        now,
                }
            }
        )

        updated = (
            inspection_collection
            .find_one(
                {
                    "_id":
                        object_id
                }
            )
        )

    result = serialize(
        updated
    )

    result["pdi_summary"] = (
        pdi_summary(
            updated
        )
    )

    return result


# =========================================================
# GET NORMAL PDI CHECKLIST
# =========================================================

@router.get(
    "/checklists"
)
def get_pdi_checklists(
    operator=Depends(get_operator),
):

    station = get_pdi_station(
        operator
    )

    return {
        "station":
            station,

        "station_label":
            PDI_STATION_LABELS[
                station
            ],

        "checkpoints":
            PDI_CHECKPOINTS[
                station
            ],
    }
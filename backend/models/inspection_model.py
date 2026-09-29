from pydantic import BaseModel
from typing import List, Optional

class SpatterLocation(BaseModel):
    frame_centre_member_no: str
    location: str
    remark: str

class Inspection(BaseModel):
    # Header
    frame_no: str
    date: str
    shift: str
    operator_name: str
    stage: str

    # Leakage Sheet
    top_T1: bool
    top_T3_I: bool
    top_T1_O: bool
    top_T2: bool
    top_T2_I: bool
    top_T2_O: bool
    top_T3: bool
    top_T3_I_2: bool
    top_T3_O: bool
    top_T4: bool
    top_T4_I: bool
    top_T4_O: bool
    bottom_B1: bool
    bottom_B2: bool
    bottom_B3: bool
    bottom_B4: bool
    vent_valve_I: bool

    fm_cm: str
    rm_cm: str
    leakage_ok: str
    leakage_remark: str

    # Defects
    porosity_above_2mm: bool
    excess_welding_BDU: bool
    welding_lump: bool
    protrusion_inside_cm: bool
    no_masking_tape: bool
    excess_welding_top_corner: bool
    loose_burr_rivet: bool
    excess_welding_top_surface: bool
    leak_of_frame: bool
    centre_member_dowel_damage: bool
    top_side_corner_unfilled: bool
    chips_header_unit: bool
    spatter_burr_sleeve_cm: bool
    cm4_top_m6_thread_damage: bool
    dent_top_sleeve: bool

    defect_ok: str
    defect_remark: str

    # Spatter
    spatter_present: bool
    spatter_locations: List[SpatterLocation]

    # PDI
    pdi_cp1: bool
    pdi_cp2: bool
    pdi_cp3: bool
    pdi_cp4: bool
    pdi_cp5: bool
    pdi_cp6: bool
    pdi_cp7: bool
    pdi_cp8: bool
    pdi_cp9: bool
    pdi_cp10: bool
    pdi_cp11: bool
    pdi_cp12: bool
    pdi_cp13: bool
    pdi_cp14: bool
    pdi_cp15: bool
    pdi_cp16: bool
    pdi_cp17: bool
    pdi_cp18: bool
    pdi_cp19: bool

    pdi_remark: str

    # Final
    final_status: str
    rework_required: bool
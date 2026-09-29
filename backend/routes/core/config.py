# core/config.py

STAGES = [
    "STAGE_1",
    "STAGE_2",
    "STAGE_3",
    "OP60",
]

STATIONS = [
    "OP40",
    "OP60",
]

SHIFTS = [
    "A",
    "B",
    "C",
]

SHEETS = [
    "sheet1",
    "sheet2",
    "sheet3",
]


REQUIRED_FIELDS = {
    "sheet1": [
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
    ],

    "sheet2": [
        "porosity_above_2mm",
        "excess_welding_BDU",
        "welding_lump",
        "protrusion_inside_cm",
        "no_masking_tape",
        "excess_welding_top_corner",
        "loose_burr_rivet",
        "excess_welding_top_surface",
        "leak_of_frame",
        "centre_member_dowel_damage",
        "top_side_corner_unfilled",
        "chips_header_unit",
        "spatter_burr_sleeve_cm",
        "cm4_top_m6_thread_damage",
        "dent_top_sleeve",
    ],

    "sheet3": [
        "spatter_present",
    ],
}
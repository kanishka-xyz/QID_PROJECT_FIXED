from fastapi import APIRouter
from database.mongodb import operator_collection

router = APIRouter()


@router.get("/operators")
def get_operators():

    operators = list(
        operator_collection.find(
            {},
            {"_id": 0}
        ).sort("name", 1)
    )

    return operators


@router.post("/operators")
def create_operator(data: dict):

    name = data.get("name", "").strip()

    if not name:
        return {
            "message": "Operator name is required"
        }

    existing = operator_collection.find_one({
        "name": {
            "$regex": f"^{name}$",
            "$options": "i"
        }
    })

    if existing:
        return {
            "message": "Operator already exists",
            "operator": {
                "name": existing["name"]
            }
        }

    operator_collection.insert_one({
        "name": name
    })

    return {
        "message": "Operator added successfully",
        "operator": {
            "name": name
        }
    }
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.inspection import router as inspection_router
from routes.admin import router as admin_router
from routes.op60 import router as op60_router
from routes.pdi import router as pdi_router
from routes.firewall import router as firewall_router
from routes.dock import router as dock_router




app = FastAPI(title="QID Inspection System")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# REGISTER ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(inspection_router)
app.include_router(admin_router)
app.include_router(op60_router)
app.include_router(pdi_router)
app.include_router(firewall_router)
app.include_router(dock_router)

@app.get("/")
def root():
    return {
        "message": "QID Inspection API"
    }
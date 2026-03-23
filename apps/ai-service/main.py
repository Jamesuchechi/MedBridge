from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

from routers import symptom, document, drug, pharmacy, copilot

app = FastAPI(title="MedBridge AI Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(symptom.router, prefix="/internal/symptom", tags=["symptom"])
app.include_router(document.router, prefix="/internal/document", tags=["document"])
app.include_router(drug.router, prefix="/internal/drugs", tags=["drug"])
app.include_router(pharmacy.router, prefix="/internal/pharmacy", tags=["pharmacy"])
app.include_router(copilot.router, prefix="/internal/copilot", tags=["copilot"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

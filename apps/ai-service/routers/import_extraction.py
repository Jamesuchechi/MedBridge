from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from core.llm import call_llm
from core.prompts import render_prompt
import json

router = APIRouter()

class ExtractedPatient(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class ExtractionResponse(BaseModel):
    patients: List[ExtractedPatient]
    raw_extraction: Optional[str] = None

class TextExtractionRequest(BaseModel):
    text: str

@router.post("/extract", response_model=ExtractionResponse)
async def extract_from_file(file: UploadFile = File(...)):
    """Extract patient data from unstructured files (PDF, Images, HTML)."""
    # 1. Read file content
    content = await file.read()
    filename = file.filename
    extension = filename.split(".")[-1].lower()

    # 2. Extract text (Dummy for now, in a real app would use OCR/PDF-parse)
    # Since we have document.py already, we could reuse it.
    # For now, let's assume we extract text or use vision models.
    text_content = ""
    if extension in ["txt", "html", "htm"]:
        text_content = content.decode("utf-8", errors="ignore")
    else:
        # For PDF/Images, we'd use OCR. 
        # Here we simulate the extraction or use a Vision LLM if available.
        text_content = "[UNSTRUCTURED FILE CONTENT - REQUIRES VISION/OCR]"

    return await extract_from_text(TextExtractionRequest(text=text_content))

@router.post("/extract-text", response_model=ExtractionResponse)
async def extract_from_text(request: TextExtractionRequest):
    """Extract patient data from raw text using LLM."""
    try:
        # Write/render prompt
        prompt = render_prompt("import_extraction/v1.j2", {
            "text": request.text
        })

        # Call LLM
        response_text = await call_llm(prompt, response_format={"type": "json_object"})
        
        # Parse JSON
        data = json.loads(response_text)
        patients = data.get("patients", [])
        
        return ExtractionResponse(
            patients=[ExtractedPatient(**p) for p in patients],
            raw_extraction=response_text
        )
    except Exception as e:
        print(f"[extract_from_text] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

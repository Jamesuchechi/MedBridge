from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import subprocess
import requests
import base64
import tempfile
import glob

from core.llm import call_llm_with_fallback

router = APIRouter()

def pdf_to_base64_images(pdf_url: str) -> List[str]:
    """
    Downloads a PDF and converts its first page to a base64 encoded PNG.
    Using pdftoppm (part of poppler-utils) which is available on the system.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = os.path.join(tmpdir, "doc.pdf")
        
        # 1. Download PDF
        response = requests.get(pdf_url)
        if response.status_code != 200:
            raise Exception(f"Failed to download PDF: {response.status_code}")
        
        with open(pdf_path, "wb") as f:
            f.write(response.content)
            
        # 2. Convert to images (first page only for now to keep it fast)
        # pdftoppm -png -f 1 -l 1 [pdf] [prefix]
        prefix = os.path.join(tmpdir, "page")
        try:
            subprocess.run(["pdftoppm", "-png", "-f", "1", "-l", "1", pdf_path, prefix], check=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f"pdftoppm failed: {e}")
        
        # 3. Read the generated image
        image_files = sorted(glob.glob(f"{prefix}-*.png"))
        if not image_files:
            raise Exception("No images generated from PDF")
            
        with open(image_files[0], "rb") as f:
            base64_image = base64.b64encode(f.read()).decode("utf-8")
            
        return [f"data:image/png;base64,{base64_image}"]

class AnalysisRequest(BaseModel):
    fileUrl: str
    docType: str

class Finding(BaseModel):
    id: str
    name: str
    value: str
    unit: str
    referenceRange: str
    flag: str # normal, borderline, abnormal, critical
    interpretation: str

class RiskFlag(BaseModel):
    id: str
    level: str # info, warn, critical
    title: str
    detail: str

class AnalysisResponse(BaseModel):
    docType: str
    title: str
    issuedBy: str
    issuedDate: str
    patientName: str
    summary: str
    findings: List[Finding]
    riskFlags: List[RiskFlag]
    plainEnglish: str
    recommendations: List[str]
    processingTime: int

BASE_PROMPT = """
You are a medical document analysis AI. Your task is to extract structured information from medical documents.
Analyze the provided image and return a JSON object matching this EXACT structure:

{
  "docType": "lab_result | prescription | radiology | report",
  "title": "Document title",
  "issuedBy": "Doctor or Hospital name",
  "issuedDate": "YYYY-MM-DD",
  "patientName": "Full name",
  "summary": "Brief medical summary",
  "findings": [
    {
      "id": "finding_1",
      "name": "Test or Drug name",
      "value": "Result or Dosage",
      "unit": "Unit (if any)",
      "referenceRange": "Normal range (if any)",
      "flag": "normal | borderline | abnormal | critical",
      "interpretation": "Brief explanation"
    }
  ],
  "riskFlags": [
    {
      "id": "risk_1",
      "level": "info | warn | critical",
      "title": "Short title",
      "detail": "Full explanation of the risk"
    }
  ],
  "plainEnglish": "A simple explanation for the patient",
  "recommendations": ["Actionable step 1", "Actionable step 2"]
}

Be precise. If a value is missing, use "N/A" or empty lists.
The output MUST be a valid JSON object matching the schema above.
"""


PROMPTS = {
    "lab_result": BASE_PROMPT + """
Focus on extracting laboratory test results. 
Identify each test name, the measured value, units, and the reference range.
Compare the value against the reference range to set the 'flag' (normal, borderline, abnormal, critical).
Highlight any values that are outside the normal range in the 'summary' and 'riskFlags'.
""",
    "prescription": BASE_PROMPT + """
Focus on extracting medication information.
Identify the drug name, dosage, frequency, and duration.
In the 'findings' section, use the drug name as 'name' and the dosage/frequency as 'value'.
Flag any potential issues or missing instructions as 'riskFlags'.
Provide clear 'recommendations' on how to take the medication based on the instructions.
""",
    "radiology": BASE_PROMPT + """
Focus on extracting clinical findings from the radiology report (X-ray, MRI, CT, etc.).
Identify the body part, the procedure, and the key impressions/conclusions.
In the 'findings' section, summarize key observations.
Use 'riskFlags' for any urgent findings (e.g., fractures, masses, acute issues).
""",
    "report": BASE_PROMPT + """
Analyze the medical report or clinical note.
Extract the chief complaint, diagnosis, and plan.
Summarize the key takeaways in 'plainEnglish'.
Identify any follow-up actions in 'recommendations'.
"""
}

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_document(req: AnalysisRequest):
    # Select prompt based on docType
    system_prompt = PROMPTS.get(req.docType, BASE_PROMPT)

    content_list = [
        {"type": "text", "text": f"Analyze this {req.docType} document and extract all relevant information into the specified JSON format."}
    ]

    # Handle PDF vs Image
    if req.fileUrl.lower().endswith(".pdf"):
        try:
            print(f"INFO: Converting PDF to image: {req.fileUrl}")
            base64_images = pdf_to_base64_images(req.fileUrl)
            for img_data in base64_images:
                content_list.append({
                    "type": "image_url",
                    "image_url": {"url": img_data}
                })
        except Exception as e:
            print(f"WARN: PDF conversion failed: {e}. Falling back to sending URL directly.")
            content_list.append({
                "type": "image_url",
                "image_url": {"url": req.fileUrl}
            })
    else:
        content_list.append({
            "type": "image_url",
            "image_url": {"url": req.fileUrl}
        })

    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": content_list,
        }
    ]

    try:
        content, provider, model = await call_llm_with_fallback(
            messages=messages,
            require_vision=True,
            response_format={"type": "json_object"},
            max_tokens=10000

        )

        if not content:
            raise HTTPException(status_code=500, detail="Failed to analyze document with any available model")

        # Manual extraction in case LLM wraps it in markdown code blocks
        if content.startswith("```"):
            content = content[content.find("{"):content.rfind("}")+1]
        
        result_json = json.loads(content)

        # 2. Add some metadata
        result_json["processingTime"] = 3800 # Placeholder for actual time measure if needed

        return result_json

    except Exception as e:
        print(f"[AI SERVICE ERROR]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

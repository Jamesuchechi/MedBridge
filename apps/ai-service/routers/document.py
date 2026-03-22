from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from openai import OpenAI

from core.llm import get_llm_client, call_llm_with_fallback

router = APIRouter()

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
Analyze the provided image and return a JSON object matching the requested structure.
Be precise. If a value is missing, use "N/A" or empty lists.
Generate a 'plainEnglish' explanation that is easy for a patient to understand.
Provide actionable 'recommendations' based on the findings.
Include 'riskFlags' for any critical or warning-level issues.
The output MUST be a valid JSON object.
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

    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": f"Analyze this {req.docType} document and extract all relevant information into the specified JSON format."},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": req.fileUrl,
                    },
                },
            ],
        }
    ]

    try:
        content, provider, model = await call_llm_with_fallback(
            messages=messages,
            require_vision=True,
            response_format={"type": "json_object"},
            max_tokens=2000
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

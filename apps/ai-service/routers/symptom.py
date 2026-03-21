from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
from openai import OpenAI
from groq import Groq
from mistralai.client import Mistral
from jinja2 import Template
from core.afridx import apply_afridx_weighting

router = APIRouter(prefix="/internal/symptom", tags=["symptom"])
from core.llm import get_llm_client

# ─── Models ───────────────────────────────────────────────────────────────────

class Condition(BaseModel):
    name: str
    probability: int
    description: str
    icdCode: str
    afridxAdjusted: bool = False

class SymptomAnalysisRequest(BaseModel):
    symptoms: List[str]
    duration: str
    durationUnit: str
    severity: int
    hasFever: bool
    location: Optional[str] = "Nigeria"
    genotype: Optional[str] = None
    knownConditions: List[str] = []

class SymptomAnalysisResult(BaseModel):
    urgency: str # low, moderate, high, emergency
    urgencyScore: int
    conditions: List[Condition]
    nextSteps: List[str]
    afridxInsight: str
    disclaimer: str

# ─── Constants ────────────────────────────────────────────────────────────────

AFRIDX_INSIGHTS = {
    "low": "AfriDx regional analysis: Symptoms consistent with common seasonal illness. Disease prevalence in your area indicates low risk for serious tropical conditions.",
    "moderate": "AfriDx regional analysis: Symptom pattern warrants clinical evaluation. Malaria and typhoid are in the differential given your region and current season.",
    "high": "AfriDx regional analysis: High-priority symptom cluster detected. Malaria (P. falciparum), typhoid fever, and meningitis elevated in differential based on regional prevalence.",
    "emergency": "AfriDx emergency protocol: Critical symptom pattern detected. This matches emergency presentations for severe malaria, sepsis, or acute cardiac events in your region.",
}

# ─── Logic ────────────────────────────────────────────────────────────────────

# Shared LLM client moved to core/llm.py

async def run_llm_analysis(client, provider, model, prompt_data):
    """Executes the LLM call based on the provider."""
    # Load prompt template
    prompt_path = os.path.join(os.path.dirname(__file__), "../prompts/symptom_analysis/v1.j2")
    with open(prompt_path, "r") as f:
        template = Template(f.read())
    
    system_prompt = template.render(**prompt_data)
    user_prompt = "Provide analysis for the symptoms reported above in JSON format."

    try:
        if provider == "groq":
            res = client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(res.choices[0].message.content)
        
        elif provider == "mistral":
            res = client.chat.complete(
                model=model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
            )
            # Mistral doesn't always support response_format easily in all versions, so we parse manually
            content = res.choices[0].message.content
            return json.loads(content[content.find('{'):content.rfind('}')+1])

        elif provider in ["openai", "openrouter"]:
            res = client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                response_format={"type": "json_object"} if provider == "openai" else None
            )
            content = res.choices[0].message.content
            return json.loads(content[content.find('{'):content.rfind('}')+1])
            
    except Exception as e:
        print(f"LLM Error ({provider}):", str(e))
        return None

@router.post("/analyze", response_model=SymptomAnalysisResult)
async def analyze_symptoms(request: SymptomAnalysisRequest):
    client, provider, model = get_llm_client()
    
    # 1. Emergency Keywords Check (Static Layer)
    emergency_keywords = ["chest pain", "difficulty breathing", "unconscious", "stroke", "seizure"]
    is_emergency = any(kw in " ".join(request.symptoms).lower() for kw in emergency_keywords)
    
    if is_emergency:
        return SymptomAnalysisResult(
            urgency="emergency",
            urgencyScore=98,
            conditions=[
                Condition(name="Acute Medical Emergency", probability=90, description="Critical symptoms detected requiring immediate intervention.", icdCode="R99", afridxAdjusted=True)
            ],
            nextSteps=["Call emergency services (112) immediately", "Seek nearest hospital emergency room", "Do not drive yourself"],
            afridxInsight=AFRIDX_INSIGHTS["emergency"],
            disclaimer="EMERGENCY ALERT: This is not a diagnosis. Seek help now."
        )

    # 2. Run LLM Analysis if available
    llm_result = None
    if provider != "mock" and os.getenv("USE_MOCK_LLM") != "true":
        llm_result = await run_llm_analysis(client, provider, model, request.dict())

    # 3. Rule-based fallback or post-processing
    if not llm_result:
        # Fallback to smart rules if LLM fails or is disabled
        has_fever = request.hasFever or any("fever" in s.lower() for s in request.symptoms)
        if has_fever:
            conditions = [
                {"name": "Malaria (P. falciparum)", "probability": 75, "description": "High prevalence in Nigeria. Febrile illness must rule out malaria.", "icdCode": "B50.9"},
                {"name": "Typhoid Fever", "probability": 40, "description": "Common bacterial infection in urban and rural Nigeria.", "icdCode": "A01.0"},
                {"name": "Viral Syndrome", "probability": 30, "description": "Non-specific viral infection.", "icdCode": "B34.9"},
            ]
            urgency = "high" if request.severity >= 7 else "moderate"
        else:
            conditions = [
                {"name": "Upper Respiratory Infection", "probability": 80, "description": "Common cold or mild viral infection.", "icdCode": "J06.9"},
                {"name": "Allergic Rhinitis", "probability": 25, "description": "Seasonal allergies common in Nigeria.", "icdCode": "J30.4"},
            ]
            urgency = "low"
        
        llm_result = {
            "urgency": urgency,
            "urgencyScore": {"low": 20, "moderate": 55, "high": 78}[urgency],
            "conditions": conditions,
            "nextSteps": ["Consult a doctor for evaluation", "Stay hydrated", "Monitor symptoms"],
            "afridxInsight": AFRIDX_INSIGHTS[urgency]
        }

    # 4. Apply AfriDx weighting logic
    weighted_conditions = apply_afridx_weighting(
        llm_result["conditions"], 
        location=request.location or "", 
        genotype=request.genotype or "",
        symptoms=request.symptoms
    )
    
    res_conditions = [Condition(**c) for c in weighted_conditions]

    return SymptomAnalysisResult(
        urgency=llm_result["urgency"],
        urgencyScore=llm_result["urgencyScore"],
        conditions=res_conditions,
        nextSteps=llm_result["nextSteps"],
        afridxInsight=llm_result["afridxInsight"] or AFRIDX_INSIGHTS[llm_result["urgency"]],
        disclaimer="This is for information only. Not a medical diagnosis."
    )

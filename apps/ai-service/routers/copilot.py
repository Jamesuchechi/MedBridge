from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import json
from jinja2 import Template
from core.llm import call_llm_with_fallback
from core.afridx import apply_afridx_weighting

router = APIRouter()

# ─── Models ───────────────────────────────────────────────────────────────────

class Vitals(BaseModel):
    bp: str
    temp: str
    pulse: str
    rr: str
    spO2: str

class CaseAnalysisRequest(BaseModel):
    patientAge: str
    patientSex: str
    chiefComplaint: str
    vitals: Vitals
    hpi: str
    ros: Dict[str, bool]
    examFindings: str

class Differential(BaseModel):
    diagnosis: str
    reasoning: str
    confidence: float
    urgency: str

class CaseAnalysisResponse(BaseModel):
    summary: str
    differentials: List[Differential]
    investigations: List[str]

class SoapNoteRequest(BaseModel):
    caseData: CaseAnalysisRequest
    analysis: CaseAnalysisResponse

class SoapNoteResponse(BaseModel):
    soapNote: str

# ─── Helpers ──────────────────────────────────────────────────────────────────

async def run_templated_llm(template_name: str, data: Dict[str, Any], is_json: bool = False) -> Optional[str]:
    """Helper to render a template and call the LLM."""
    template_path = os.path.join(os.path.dirname(__file__), f"../prompts/copilot/{template_name}.j2")
    
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template {template_name} not found at {template_path}")
        
    with open(template_path, "r") as f:
        template = Template(f.read())
    
    prompt = template.render(**data)
    
    messages = [
        {"role": "system", "content": "You are a specialized medical AI assistant for doctors in Nigeria."},
        {"role": "user", "content": prompt}
    ]

    content, provider, model = await call_llm_with_fallback(
        messages=messages,
        response_format={"type": "json_object"} if is_json else None
    )
    
    return content

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=CaseAnalysisResponse)
async def analyze_case(request: CaseAnalysisRequest):
    try:
        content = await run_templated_llm("analysis", request.model_dump(), is_json=True)
        
        if not content:
            raise HTTPException(status_code=500, detail="Failed to get analysis from LLM")
            
        # Extract JSON if LLM added markdown wrappers
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            json_str = content[start:end]
            result = json.loads(json_str)
            
            # Apply AfriDx weighting for regional accuracy
            weighted_diffs = apply_afridx_weighting(
                result["differentials"],
                location="Nigeria", # Future: get from doctor profile context
                symptoms=[request.chiefComplaint]
            )
            result["differentials"] = weighted_diffs
            
            return CaseAnalysisResponse(**result)
        except Exception as e:
            print(f"ERROR parsing LLM response: {e}\nContent: {content}")
            raise HTTPException(status_code=500, detail="AI returned invalid format")
            
    except Exception as e:
        print(f"ERROR in analyze_case: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-soap", response_model=SoapNoteResponse)
async def generate_soap(request: SoapNoteRequest):
    try:
        # Combine case data and analysis for the template
        template_data = {
            **request.caseData.model_dump(),
            "differentials": [d.model_dump() for d in request.analysis.differentials],
            "investigations": request.analysis.investigations
        }
        
        soap_content = await run_templated_llm("soap", template_data, is_json=False)
        
        if not soap_content:
            raise HTTPException(status_code=500, detail="Failed to generate SOAP note")
            
        return SoapNoteResponse(soapNote=soap_content.strip())
            
    except Exception as e:
        print(f"ERROR in generate_soap: {e}")
        raise HTTPException(status_code=500, detail=str(e))

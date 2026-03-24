"""
Drug Intelligence AI Router
============================
Handles AI-powered drug interaction checking and drug explanation.
Mounted at: /internal/drugs

Endpoints:
  POST /internal/drugs/interactions   - AI interaction analysis
  POST /internal/drugs/explain        - Plain English drug explanation
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
from core.llm import get_llm_client, call_llm_with_fallback

router = APIRouter()
EXPLAIN_CACHE: Dict[str, Any] = {}


# ─── Models ───────────────────────────────────────────────────────────────────

class DrugDetail(BaseModel):
    id: Optional[str] = None
    name: str
    genericName: Optional[str] = None
    category: Optional[str] = None
    interactions: Optional[List[str]] = []  # Known interactions from DB

class InteractionRequest(BaseModel):
    drugs: List[str] = Field(..., min_length=2, max_length=8)
    drugDetails: Optional[List[Dict[str, Any]]] = []
    patientDetails: Optional[Dict[str, Any]] = None # conditions, allergies, medications

class InteractionPair(BaseModel):
    drug1: str
    drug2: str
    severity: str  # "none" | "minor" | "moderate" | "severe" | "contraindicated"
    mechanism: str
    clinicalEffect: str
    management: str

class InteractionResponse(BaseModel):
    interactions: List[InteractionPair]
    overallSeverity: str
    summary: str
    disclaimer: str

class DrugExplainRequest(BaseModel):
    drugName: str
    question: Optional[str] = "Explain this drug in plain English for a patient"
    patientContext: Optional[str] = None  # e.g. "diabetic patient, 45 years old"

class DrugExplainResponse(BaseModel):
    drugName: str
    explanation: str
    keyPoints: List[str]
    warning: Optional[str] = None
    disclaimer: str


# ─── Interaction severity scoring ─────────────────────────────────────────────

SEVERITY_RANK = {
    "none": 0,
    "minor": 1,
    "moderate": 2,
    "severe": 3,
    "contraindicated": 4
}

def highest_severity(severities: List[str]) -> str:
    if not severities:
        return "none"
    return max(severities, key=lambda s: SEVERITY_RANK.get(s, 0))


# ─── Known interaction database (high-priority Nigerian context) ──────────────
# Pre-computed pairs to avoid LLM call for well-known dangerous combinations

KNOWN_INTERACTIONS = {
    frozenset(["warfarin", "aspirin"]): {
        "severity": "severe",
        "mechanism": "Additive antiplatelet and anticoagulant effects",
        "clinicalEffect": "Significantly increased risk of bleeding, including GI and intracranial haemorrhage",
        "management": "Avoid combination unless benefit outweighs risk. If necessary, use lowest doses and monitor INR closely."
    },
    frozenset(["warfarin", "ibuprofen"]): {
        "severity": "severe",
        "mechanism": "NSAIDs inhibit platelet function and may displace warfarin from protein binding",
        "clinicalEffect": "Increased anticoagulant effect and GI bleeding risk",
        "management": "Avoid NSAIDs with warfarin. Use paracetamol for pain if anticoagulation is needed."
    },
    frozenset(["metformin", "alcohol"]): {
        "severity": "moderate",
        "mechanism": "Alcohol increases lactate production and metformin reduces its clearance",
        "clinicalEffect": "Increased risk of lactic acidosis",
        "management": "Advise patient to limit alcohol to 1-2 units/day. Avoid binge drinking."
    },
    frozenset(["ciprofloxacin", "antacids"]): {
        "severity": "moderate",
        "mechanism": "Antacids (Mg²⁺, Al³⁺, Ca²⁺) chelate ciprofloxacin and reduce absorption by up to 90%",
        "clinicalEffect": "Significantly reduced ciprofloxacin blood levels and treatment failure risk",
        "management": "Take ciprofloxacin 2 hours before or 6 hours after antacids."
    },
    frozenset(["artemether", "halofantrine"]): {
        "severity": "contraindicated",
        "mechanism": "Both drugs prolong QT interval",
        "clinicalEffect": "Risk of fatal cardiac arrhythmia (Torsades de Pointes)",
        "management": "Contraindicated. Never co-administer."
    },
    frozenset(["diazepam", "alcohol"]): {
        "severity": "severe",
        "mechanism": "Synergistic CNS and respiratory depression",
        "clinicalEffect": "Profound sedation, respiratory depression, coma, death",
        "management": "Strictly contraindicated. Counsel all patients prescribed benzodiazepines."
    },
    frozenset(["metronidazole", "alcohol"]): {
        "severity": "severe",
        "mechanism": "Metronidazole inhibits aldehyde dehydrogenase causing acetaldehyde accumulation",
        "clinicalEffect": "Disulfiram-like reaction: flushing, nausea, vomiting, tachycardia, hypotension",
        "management": "Avoid alcohol during and for 48 hours after metronidazole course."
    },
    frozenset(["lisinopril", "potassium"]): {
        "severity": "moderate",
        "mechanism": "ACE inhibitors reduce potassium excretion; additive with potassium supplements",
        "clinicalEffect": "Hyperkalaemia (can cause fatal arrhythmia)",
        "management": "Monitor serum potassium regularly. Avoid KCl supplements unless hypokalaemic."
    },
    frozenset(["atorvastatin", "clarithromycin"]): {
        "severity": "severe",
        "mechanism": "Clarithromycin inhibits CYP3A4, markedly increasing atorvastatin plasma levels",
        "clinicalEffect": "Increased risk of myopathy and rhabdomyolysis",
        "management": "Suspend atorvastatin during short clarithromycin courses, or use a non-CYP3A4 statin."
    },
    frozenset(["phenytoin", "oral contraceptives"]): {
        "severity": "moderate",
        "mechanism": "Phenytoin induces CYP3A4, accelerating oestrogen/progestogen metabolism",
        "clinicalEffect": "Reduced contraceptive efficacy, risk of unintended pregnancy",
        "management": "Use additional/alternative contraception (e.g. barrier method or DMPA injection)."
    },
}


def check_known_interactions(drug_names: List[str]) -> List[Dict]:
    """Check drug names against the curated known-interactions dictionary."""
    found = []
    lower_names = [d.lower() for d in drug_names]

    for i, d1 in enumerate(lower_names):
        for j, d2 in enumerate(lower_names):
            if i >= j:
                continue
            pair = frozenset([d1, d2])
            for known_pair, data in KNOWN_INTERACTIONS.items():
                if d1 in " ".join(known_pair) and d2 in " ".join(known_pair):
                    found.append({
                        "drug1": drug_names[i],
                        "drug2": drug_names[j],
                        **data
                    })
                    break
    return found


# ─── LLM interaction check ────────────────────────────────────────────────────

INTERACTION_SYSTEM_PROMPT = """You are a clinical pharmacist AI specialised in drug interactions for the Nigerian healthcare context.

Analyse the provided drugs for interactions. For each pair, provide:
- Severity: "none", "minor", "moderate", "severe", or "contraindicated"  
- Mechanism of interaction
- Clinical effect in plain language
- Management recommendation

Consider:
- Drugs commonly used in Nigeria (antimalarials, ARVs, antihypertensives)
- The patient may be self-medicating (OTC combinations)
- Herbal/traditional medicine interactions where relevant

Respond ONLY in valid JSON:
{
  "interactions": [
    {
      "drug1": "Drug name",
      "drug2": "Drug name", 
      "severity": "moderate",
      "mechanism": "Brief mechanism",
      "clinicalEffect": "Plain English effect",
      "management": "What to do"
    }
  ],
  "overallSeverity": "moderate",
  "summary": "2-3 sentence plain English summary for the patient"
}

If there are no interactions, return interactions as empty array and overallSeverity as "none".
NEVER fabricate drug names or invent interactions. If you are uncertain, state that.
"""


async def run_llm_interaction_check(drugs: List[str], drug_details: List[Dict], patient_details: Optional[Dict] = None) -> Optional[Dict]:
    """Call LLM for interaction analysis with fallback."""
    user_msg = f"""Check interactions between these drugs: {', '.join(drugs)}

Known drug data from our database:
{json.dumps(drug_details, indent=2)[:3000]}

Patient Context (CHRONIC CONDITIONS, ALLERGIES, EXISTING MEDS, VACCINATIONS, MEDICAL/SURGICAL HISTORY, FAMILY HISTORY):
{json.dumps(patient_details, indent=2) if patient_details else "N/A"}

Provide interaction analysis for ALL possible pairs of the NEW drugs, AND flag any severe interactions or risks between the NEW drugs and the patient's FULL clinical history."""

    messages = [
        {"role": "system", "content": INTERACTION_SYSTEM_PROMPT},
        {"role": "user", "content": user_msg}
    ]

    content, provider, model = await call_llm_with_fallback(
        messages=messages,
        response_format={"type": "json_object"}
    )

    if content:
        try:
            return json.loads(content[content.find('{'):content.rfind('}')+1])
        except Exception as e:
            print(f"[JSON DECODE ERROR] ({provider}): {e}")
    return None


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/interactions", response_model=InteractionResponse)
async def check_drug_interactions(request: InteractionRequest):
    # 1. Check curated known interactions first (fast, no LLM call)
    known = check_known_interactions(request.drugs)

    llm_result = None

    # 2. Only call LLM if not all pairs are covered by known interactions
    n_drugs = len(request.drugs)
    n_pairs = n_drugs * (n_drugs - 1) // 2
    if len(known) < n_pairs:
        llm_result = await run_llm_interaction_check(
            request.drugs, request.drugDetails or [], request.patientDetails
        )

    # 3. Merge known + LLM results (known takes precedence)
    all_interactions = known.copy()

    if llm_result and llm_result.get("interactions"):
        known_pairs = {frozenset([i["drug1"].lower(), i["drug2"].lower()]) for i in known}
        for llm_int in llm_result["interactions"]:
            pair = frozenset([llm_int["drug1"].lower(), llm_int["drug2"].lower()])
            if pair not in known_pairs:
                all_interactions.append(llm_int)

    # 4. Calculate overall severity
    severities = [i.get("severity", "none") for i in all_interactions]
    overall = highest_severity(severities) if severities else "none"

    # 5. Build summary
    if overall == "none":
        summary = f"No clinically significant interactions were found between {', '.join(request.drugs)}. Always inform your doctor and pharmacist about all medicines you are taking."
    elif overall in ["severe", "contraindicated"]:
        summary = f"⚠️ Serious interactions detected. {len([i for i in all_interactions if i.get('severity') in ['severe', 'contraindicated']])} potentially dangerous combination(s) found. Do not take these drugs together without medical supervision."
    else:
        summary = f"{len(all_interactions)} interaction(s) found. Please review the details below and consult your pharmacist before combining these medications."

    return InteractionResponse(
        interactions=[InteractionPair(**i) for i in all_interactions],
        overallSeverity=overall,
        summary=summary,
        disclaimer="This is for informational purposes only. Always consult a qualified pharmacist or doctor before combining medications."
    )


@router.post("/explain", response_model=DrugExplainResponse)
async def explain_drug(request: DrugExplainRequest):
    system = """You are a clinical pharmacist AI helping patients in Nigeria understand their medications.
Explain drugs in simple, clear language that a patient with basic education can understand.
Consider common drug use patterns in Nigeria (malaria, hypertension, diabetes, HIV).
Respond ONLY in valid JSON:
{
  "explanation": "Plain English explanation (3-4 sentences)",
  "keyPoints": ["Up to 5 bullet points the patient must know"],
  "warning": "Important warning if any (null if none)"
}"""

    user = f"""Drug: {request.drugName}
Question: {request.question}
Patient context: {request.patientContext or 'General adult patient'}
"""
    
    # Simple cache key
    cache_key = f"{request.drugName}:{request.question}:{request.patientContext or ''}"
    if cache_key in EXPLAIN_CACHE:
        print(f"DEBUG: Cache hit for {request.drugName}")
        return DrugExplainResponse(**EXPLAIN_CACHE[cache_key])

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user + "\nExplain in simple terms what this drug is for, how to take it, and what to watch out for."}
    ]

    content, provider, model = await call_llm_with_fallback(
        messages=messages,
        response_format={"type": "json_object"},
        max_tokens=800
    )

    if content:
        try:
            data = json.loads(content[content.find('{'):content.rfind('}')+1])
            response_data = {
                "drugName": request.drugName,
                "explanation": data.get("explanation", ""),
                "keyPoints": data.get("keyPoints", []),
                "warning": data.get("warning"),
                "disclaimer": "This explanation is for general information only. Always follow your doctor's or pharmacist's instructions."
            }
            # Cache the response
            EXPLAIN_CACHE[cache_key] = response_data
            return DrugExplainResponse(**response_data)
        except Exception as e:
            print(f"[JSON DECODE ERROR] ({provider}): {e}")

    return DrugExplainResponse(
        drugName=request.drugName,
        explanation="Unable to generate explanation at this time.",
        keyPoints=["Consult your pharmacist for detailed information"],
        disclaimer="This is for informational purposes only."
    )
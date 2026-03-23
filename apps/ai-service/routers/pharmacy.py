from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import json
from core.llm import call_llm_with_fallback

router = APIRouter()

class SearchIntentRequest(BaseModel):
    query: str
    state: Optional[str] = None

class SearchIntentResponse(BaseModel):
    intent: str  # "location_search", "name_search", or "hybrid"
    location: Optional[str] = None
    extractedName: Optional[str] = None
    state: Optional[str] = None
    suggestedQueries: List[str]
    confidence: float

SYSTEM_PROMPT = """You are a search intent analyzer for a Nigerian pharmacy directory app.
Your goal is to parse messy user search queries into structured data.

Intent types:
- "location_search": User is looking for ANY pharmacy in a specific area (e.g., "Bwari", "Ikeja Lagos").
- "name_search": User is looking for a SPECIFIC pharmacy (e.g., "Medplus", "Emzor Pharmacy").
- "hybrid": Both name and location (e.g., "HealthPlus in Yaba").

Return JSON ONLY:
{
  "intent": "location_search" | "name_search" | "hybrid",
  "location": "Extracted location if any",
  "extractedName": "Extracted pharmacy name if any",
  "state": "The Nigerian state if identifiable",
  "suggestedQueries": ["List of 2-3 optimized search strings for OpenStreetMap"],
  "confidence": 0.0 to 1.0
}

Example 1: "Bwari, Abuja"
{
  "intent": "location_search",
  "location": "Bwari, Abuja",
  "state": "FCT",
  "suggestedQueries": ["Bwari, Abuja", "Bwari"],
  "confidence": 0.95
}

Example 2: "Medplus Lagos"
{
  "intent": "hybrid",
  "location": "Lagos",
  "extractedName": "Medplus",
  "state": "Lagos",
  "suggestedQueries": ["Medplus Pharmacy Lagos", "Medplus Lagos"],
  "confidence": 0.9
}
"""

@router.post("/search-intent", response_model=SearchIntentResponse)
async def analyze_search_intent(request: SearchIntentRequest):
    user_msg = f"Query: {request.query}\nContext State: {request.state or 'None'}"
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg}
    ]

    content, provider, model = await call_llm_with_fallback(
        messages=messages,
        response_format={"type": "json_object"}
    )

    if content:
        try:
            data = json.loads(content[content.find('{'):content.rfind('}')+1])
            return SearchIntentResponse(
                intent=data.get("intent", "hybrid"),
                location=data.get("location"),
                extractedName=data.get("extractedName"),
                state=data.get("state") or request.state,
                suggestedQueries=data.get("suggestedQueries", [request.query]),
                confidence=data.get("confidence", 0.5)
            )
        except Exception as e:
            print(f"[JSON DECODE ERROR] {e}")

    # Fallback
    return SearchIntentResponse(
        intent="hybrid",
        suggestedQueries=[request.query],
        confidence=0.1
    )

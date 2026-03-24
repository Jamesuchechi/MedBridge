from typing import List, Dict, Any
from datetime import datetime

# Nigeria regional prevalence weights (simplified)
# Higher value = more common in that region/context
PREVALENCE_WEIGHTS = {
    "Malaria": {"base": 0.9, "rainy_season": 0.2, "dry_season": 0.05},
    "Typhoid fever": {"base": 0.6, "urban": 0.1, "rural": 0.2},
    "Yellow Fever": {"base": 0.1, "outbreak_zones": ["Edo", "Kwara", "Bauchi", "Kogi"]},
    "Lassa Fever": {"base": 0.05, "outbreak_zones": ["Edo", "Ondo", "Ebonyi"]},
    "Cholera": {"base": 0.02, "rainy_season": 0.1},
}

SICKLE_CELL_CRISIS_TRIGGERS = ["Joint pain", "Bone pain", "Fatigue", "Anemia"]

def is_rainy_season() -> bool:
    month = datetime.now().month
    # Nigeria rainy season is generally May to October
    return 5 <= month <= 10

def apply_afridx_weighting(
    conditions: List[Dict[str, Any]],
    location: str = "",
    genotype: str = "",
    symptoms: List[str] = []
) -> List[Dict[str, Any]]:
    """
    Adjusts the probability of conditions based on regional prevalence,
    seasonality, and patient genotype.
    """
    rainy = is_rainy_season()
    
    for condition in conditions:
        # Support both 'name' (symptom checker) and 'diagnosis' (doctor copilot)
        name = condition.get("name") or condition.get("diagnosis", "Unknown")
        
        # Support both 'probability' (int 0-100) and 'confidence' (float 0-1)
        # We'll work with 0-100 internally for weighting logic
        orig_prob = condition.get("probability")
        if orig_prob is None:
            conf = condition.get("confidence", 0)
            prob = conf * 100
        else:
            prob = float(orig_prob)
            
        adjusted = False

        # 1. Malaria weighting
        if "Malaria" in name:
            if rainy:
                prob += PREVALENCE_WEIGHTS["Malaria"]["rainy_season"] * 100
            else:
                prob += PREVALENCE_WEIGHTS["Malaria"]["dry_season"] * 100
            adjusted = True

        # 2. Typhoid weighting
        if "Typhoid" in name:
            prob += PREVALENCE_WEIGHTS["Typhoid fever"]["base"] * 10
            adjusted = True

        # 3. Sickle Cell intersection
        if genotype == "SS" or genotype == "SC":
            has_trigger = any(s.lower() in " ".join(symptoms).lower() for s in SICKLE_CELL_CRISIS_TRIGGERS)
            if has_trigger and "Sickle Cell" in name:
                prob += 30
                adjusted = True
            elif has_trigger and "Crisis" in name:
                prob += 40
                adjusted = True

        # 4. Lassa Fever / Yellow Fever (Location based)
        for cf in ["Lassa", "Yellow"]:
            if cf in name and any(zone.lower() in location.lower() for zone in PREVALENCE_WEIGHTS.get(f"{cf} Fever", {}).get("outbreak_zones", [])):
                prob += 20
                adjusted = True

        # Clamp and Write Back
        final_prob = min(99, max(1, round(prob)))
        
        if "probability" in condition or orig_prob is not None:
            condition["probability"] = final_prob
        
        if "confidence" in condition or "diagnosis" in condition:
            condition["confidence"] = final_prob / 100.0
            
        condition["afridxAdjusted"] = adjusted

    # Sort by probability/confidence descending
    return sorted(conditions, key=lambda x: x.get("probability") or x.get("confidence", 0), reverse=True)

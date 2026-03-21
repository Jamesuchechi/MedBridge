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
        name = condition["name"]
        prob = condition["probability"]
        adjusted = False

        # 1. Malaria weighting
        if "Malaria" in name:
            weight = PREVALENCE_WEIGHTS["Malaria"]["base"]
            if rainy:
                prob += PREVALENCE_WEIGHTS["Malaria"]["rainy_season"] * 10
            else:
                prob += PREVALENCE_WEIGHTS["Malaria"]["dry_season"] * 10
            adjusted = True

        # 2. Typhoid weighting
        if "Typhoid" in name:
            prob += PREVALENCE_WEIGHTS["Typhoid fever"]["base"] * 5
            adjusted = True

        # 3. Sickle Cell intersection
        if genotype == "SS" or genotype == "SC":
            has_trigger = any(s in symptoms for s in SICKLE_CELL_CRISIS_TRIGGERS)
            if has_trigger and "Sickle Cell" in name:
                prob += 30
                adjusted = True
            elif has_trigger and "Crisis" in name:
                prob += 40
                adjusted = True

        # 4. Lassa Fever / Yellow Fever (Location based)
        for cf in ["Lassa", "Yellow"]:
            if cf in name and any(zone.lower() in location.lower() for zone in PREVALENCE_WEIGHTS[f"{cf} Fever"]["outbreak_zones"]):
                prob += 15
                adjusted = True

        # Clamp probability
        condition["probability"] = min(99, max(1, round(prob)))
        condition["afridxAdjusted"] = adjusted

    # Sort by probability descending
    return sorted(conditions, key=lambda x: x["probability"], reverse=True)

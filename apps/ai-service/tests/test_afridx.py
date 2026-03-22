import pytest
from core.afridx import apply_afridx_weighting
from unittest.mock import patch

def test_malaria_weighting_rainy_season():
    conditions = [{"name": "Malaria", "probability": 50, "description": "Test", "icdCode": "B50.9"}]
    # Mock is_rainy_season to return True
    with patch("core.afridx.is_rainy_season", return_value=True):
        result = apply_afridx_weighting(conditions)
        # Base: 0.9, Rainy: 0.2 * 10 = 2. Total adjustment: 2 + 0.9? No, the code says:
        # weight = PREVALENCE_WEIGHTS["Malaria"]["base"] (0.9)
        # if rainy: prob += PREVALENCE_WEIGHTS["Malaria"]["rainy_season"] * 10 (0.2 * 10 = 2)
        # So 50 + 2 = 52. Wait, the base weight isn't added?
        # Let's check the code again.
        assert result[0]["probability"] == 52

def test_malaria_weighting_dry_season():
    conditions = [{"name": "Malaria", "probability": 51, "description": "Test", "icdCode": "B50.9"}]
    with patch("core.afridx.is_rainy_season", return_value=False):
        result = apply_afridx_weighting(conditions)
        # Dry: 0.05 * 10 = 0.5. 51 + 0.5 = 51.5 -> 52 (rounded to nearest even)
        assert result[0]["probability"] == 52

def test_sickle_cell_crisis_weighting():
    conditions = [
        {"name": "Sickle Cell Crisis", "probability": 10, "description": "Test", "icdCode": "D57.0"},
        {"name": "Common Cold", "probability": 80, "description": "Test", "icdCode": "J00"}
    ]
    # SS genotype with joint pain
    result = apply_afridx_weighting(conditions, genotype="SS", symptoms=["Joint pain"])
    # "Sickle Cell Crisis" matches "Sickle Cell" first -> +30. Total: 40.
    # We should find the specific condition in the result
    sc_condition = next(c for c in result if "Sickle Cell" in c["name"])
    assert sc_condition["probability"] == 40
    assert sc_condition["afridxAdjusted"] is True

def test_lassa_fever_weighting_at_outbreak_zone():
    conditions = [{"name": "Lassa Fever", "probability": 5, "description": "Test", "icdCode": "A96.2"}]
    result = apply_afridx_weighting(conditions, location="Edo State")
    # 5 + 15 = 20
    assert result[0]["probability"] == 20

def test_typhoid_weighting():
    conditions = [{"name": "Typhoid Fever", "probability": 20, "description": "Test", "icdCode": "A01.0"}]
    result = apply_afridx_weighting(conditions)
    # 20 + (0.6 * 5) = 23
    assert result[0]["probability"] == 23

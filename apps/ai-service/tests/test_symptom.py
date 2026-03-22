import pytest
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch, MagicMock

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ai-service"}

def test_emergency_trigger():
    # Test that emergency symptoms bypass LLM and return emergency urgency
    request_data = {
        "symptoms": ["chest pain", "difficulty breathing"],
        "duration": "1",
        "durationUnit": "hour",
        "severity": 10,
        "hasFever": False
    }
    response = client.post("/internal/symptom/analyze", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "emergency"
    assert data["conditions"][0]["name"] == "Acute Medical Emergency"

@patch("routers.symptom.get_llm_client")
@patch("routers.symptom.run_llm_analysis")
def test_symptom_analysis_fallback_on_llm_failure(mock_run_llm, mock_get_client):
    # Mock LLM failure (returns None)
    mock_get_client.return_value = (MagicMock(), "openai", "gpt-4o")
    mock_run_llm.return_value = None
    
    request_data = {
        "symptoms": ["headache"],
        "duration": "2",
        "durationUnit": "days",
        "severity": 3,
        "hasFever": True
    }
    response = client.post("/internal/symptom/analyze", json=request_data)
    assert response.status_code == 200
    data = response.json()
    # Should fall back to rule-based analysis (Malaria/Typhoid if fever)
    assert any("Malaria" in c["name"] for c in data["conditions"])
    assert data["urgency"] in ["moderate", "high"]

@patch("routers.symptom.get_llm_client")
@patch("routers.symptom.run_llm_analysis")
def test_symptom_analysis_success_with_afridx_adjustment(mock_run_llm, mock_get_client):
    # Mock successful LLM response
    mock_get_client.return_value = (MagicMock(), "openai", "gpt-4o")
    mock_run_llm.return_value = {
        "urgency": "moderate",
        "urgencyScore": 50,
        "conditions": [
            {"name": "Malaria", "probability": 40, "description": "LLM desc", "icdCode": "B50.9"},
            {"name": "Flu", "probability": 30, "description": "LLM desc", "icdCode": "J10"}
        ],
        "nextSteps": ["Step 1"],
        "afridxInsight": "Mock insight"
    }
    
    request_data = {
        "symptoms": ["fever"],
        "duration": "3",
        "durationUnit": "days",
        "severity": 5,
        "hasFever": True,
        "location": "Lagos"
    }
    
    # Mock is_rainy_season to ensure consistent AfriDx weighting
    with patch("core.afridx.is_rainy_season", return_value=True):
        response = client.post("/internal/symptom/analyze", json=request_data)
    
    assert response.status_code == 200
    data = response.json()
    # Malaria (40) should be adjusted (Rainy: +2) -> 42. Wait, the code says +2.0 (0.2 * 10).
    malaria = next(c for c in data["conditions"] if c["name"] == "Malaria")
    assert malaria["probability"] == 42
    assert malaria["afridxAdjusted"] is True

@patch("routers.symptom.get_llm_client")
@patch("routers.symptom.run_llm_analysis")
def test_symptom_analysis_health_profile_enrichment(mock_run_llm, mock_get_client):
    # Mock LLM response with a generic "Crisis" condition
    mock_get_client.return_value = (MagicMock(), "openai", "gpt-4o")
    mock_run_llm.return_value = {
        "urgency": "high",
        "urgencyScore": 80,
        "conditions": [
            {"name": "Crisis", "probability": 20, "description": "LLM desc", "icdCode": "D57.0"},
            {"name": "Infection", "probability": 30, "description": "LLM desc", "icdCode": "B99"}
        ],
        "nextSteps": ["Step 1"],
        "afridxInsight": "Mock insight"
    }
    
    # Request with SS genotype and joint pain symptoms
    request_data = {
        "symptoms": ["Joint pain", "Bone pain"],
        "duration": "1",
        "durationUnit": "days",
        "severity": 8,
        "hasFever": False,
        "genotype": "SS"
    }
    
    response = client.post("/internal/symptom/analyze", json=request_data)
    
    assert response.status_code == 200
    data = response.json()
    
    # "Crisis" (20) should be adjusted (SS + Joint pain trigger: +40) -> 60.
    crisis = next(c for c in data["conditions"] if "Crisis" in c["name"])
    assert crisis["probability"] == 60
    assert crisis["afridxAdjusted"] is True

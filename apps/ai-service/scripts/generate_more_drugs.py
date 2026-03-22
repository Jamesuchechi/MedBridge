import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

prompt = """
Generate 50 realistic NAFDAC-registered drugs commonly used in Nigeria. Return ONLY a valid JSON array of objects.
Each object must have these EXACT keys:
- "nafdacNumber" (string, e.g. "A4-1234")
- "name" (string, e.g. "Panadol Extra")
- "genericName" (string, e.g. "Paracetamol + Caffeine")
- "manufacturer" (string, e.g. "Emzor")
- "category" (string)
- "form" (string)
- "strength" (string)
- "brandNames" (array of strings)
- "uses" (array of strings)
- "contraindications" (array of strings)
- "sideEffects" (array of strings)
- "interactions" (array of strings)
- "priceRangeMin" (number)
- "priceRangeMax" (number)
- "requiresPrescription" (boolean)
- "controlled" (boolean)
- "atcCode" (string)
- "icdIndications" (array of strings)
Do NOT include markdown formatting. ONLY JSON.
"""

def generate_drugs():
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "mixtral-8x7b-32768",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "response_format": {"type": "json_object"}
    }
    
    print("Generating extra drugs from Groq...")
    response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    
    try:
        drugs = json.loads(content)
        if isinstance(drugs, dict) and "drugs" in drugs:
            drugs = drugs["drugs"]
        
        output_file = "../../packages/db/seed/drugs_extra.json"
        with open(output_file, "w") as f:
            json.dump(drugs, f, indent=2)
        print(f"✅ Generated {len(drugs)} extra drugs at {output_file}")
    except Exception as e:
        print("Error parsing JSON:", e)

if __name__ == "__main__":
    generate_drugs()

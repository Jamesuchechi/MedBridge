import os
from openai import OpenAI
from groq import Groq
from mistralai import Mistral

def get_llm_client(require_vision=False):
    """
    Returns the best available LLM client and model.
    If require_vision is True, it prioritizes Gemini (OpenRouter) or GPT-4o.
    """
    # 1. OpenRouter (Gemini 1.5 Pro - Great for Vision)
    or_key = os.getenv("OPENROUTER_API_KEY")
    if or_key and or_key.startswith("sk-or-"):
        return OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=or_key,
        ), "openrouter", "google/gemini-pro-1.5"

    # 2. OpenAI (GPT-4o - Great for Vision)
    oa_key = os.getenv("OPENAI_API_KEY")
    if oa_key and oa_key.startswith("sk-"):
        return OpenAI(api_key=oa_key), "openai", "gpt-4o"

    # If vision is not required, we can use Groq/Mistral
    if not require_vision:
        # 3. Groq
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key and groq_key.startswith("gsk_"):
            return Groq(api_key=groq_key), "groq", "llama-3.1-70b-versatile"
        
        # 4. Mistral
        mistral_key = os.getenv("MISTRAL_API_KEY")
        if mistral_key and not mistral_key.startswith("your-"):
            return Mistral(api_key=mistral_key), "mistral", "mistral-large-latest"

    # Fallback/Mock
    return None, "mock", "rule-based"

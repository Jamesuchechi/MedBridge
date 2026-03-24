import os
import json
from openai import OpenAI
from groq import Groq
from mistralai.client import Mistral
from typing import List, Tuple, Any, Optional, Dict

def get_llm_candidates(require_vision: bool = False) -> List[Tuple[Any, str, str]]:
    """
    Returns a prioritized list of (client, provider, model) tuples.
    """
    candidates = []

    # 1. OpenRouter (Multi-model Fallback)
    or_key = os.getenv("OPENROUTER_API_KEY")
    if or_key and or_key.startswith("sk-or-"):
        or_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=or_key,
        )
        # Prioritized models on OpenRouter
        if require_vision:
            or_models = [
                "google/gemini-2.0-flash-001",
                "google/gemini-flash-1.5", 
                "openai/gpt-4o-mini",
                "anthropic/claude-3-haiku",
                "google/gemini-pro-1.5"
            ]
        else:
            or_models = [
                "anthropic/claude-3-haiku",
                "openai/gpt-4o-mini",
                "meta-llama/llama-3.3-70b-instruct:free",
                "google/gemini-2.0-flash-001"
            ]
        for m in or_models:
            candidates.append((or_client, "openrouter", m))

    # 2. OpenAI Direct
    oa_key = os.getenv("OPENAI_API_KEY")
    if oa_key and oa_key.startswith("sk-"):
        oa_client = OpenAI(api_key=oa_key)
        candidates.append((oa_client, "openai", "gpt-4o"))
        candidates.append((oa_client, "openai", "gpt-4o-mini"))

    # 3. Groq
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key and groq_key.startswith("gsk_"):
        groq_client = Groq(api_key=groq_key)
        if require_vision:
            candidates.append((groq_client, "groq", "llama-3.2-90b-vision-preview"))
        else:
            candidates.append((groq_client, "groq", "llama-3.1-70b-versatile"))
            candidates.append((groq_client, "groq", "llama-3.1-8b-instant"))

    # 4. Mistral
    mistral_key = os.getenv("MISTRAL_API_KEY")
    if mistral_key and not mistral_key.startswith("your-"):
        mistral_client = Mistral(api_key=mistral_key)
        if not require_vision: # Skip Mistral for vision for now as it needs Pixtral
            candidates.append((mistral_client, "mistral", "mistral-large-latest"))

    return candidates

def get_llm_client(require_vision: bool = False):
    """
    Legacy helper. Returns the first available candidate.
    """
    candidates = get_llm_candidates(require_vision)
    if candidates:
        return candidates[0]
    return None, "mock", "rule-based"

async def call_llm_with_fallback(
    messages: List[Dict[str, str]], 
    require_vision: bool = False,
    response_format: Optional[Dict] = None,
    max_tokens: int = 1000,
    temperature: float = 0.1
) -> Tuple[Optional[str], str, str]:
    """
    Tries multiple LLM candidates until one succeeds.
    Returns (content, provider, model).
    """
    candidates = get_llm_candidates(require_vision)
    
    for client, provider, model in candidates:
        try:
            print(f"DEBUG: Trying LLM {provider}:{model}")
            if provider in ["openai", "openrouter", "groq"]:
                # Groq, OpenRouter and OpenAI share the same interface
                params = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                }
                
                if response_format and provider in ["openai", "groq", "openrouter"]:
                    params["response_format"] = response_format
                
                res = client.chat.completions.create(
                    **params,
                    timeout=15.0  # Per-try timeout to avoid hanging on a slow provider
                )
                content = res.choices[0].message.content
                if content:
                    return content, provider, model
            
            elif provider == "mistral":
                res = client.chat.complete(
                    model=model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                content = res.choices[0].message.content
                if content:
                    return content, provider, model
                    
        except Exception as e:
            print(f"WARN: LLM {provider}:{model} failed: {e}")
            continue
            
    return None, "mock", "fallback-failed"

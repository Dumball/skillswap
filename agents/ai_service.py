"""
Groq AI API Integration
Lightweight API-based AI inference instead of local ML models
"""
import os
import requests
import json
from typing import Optional

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-70b-8192"

def call_groq(user_prompt: str, system_prompt: str = "You are a helpful AI assistant.", temperature: float = 0.7) -> dict:
    """
    Call Groq API for text generation with proper debugging
    
    Args:
        user_prompt: The user prompt
        system_prompt: System prompt for context
        temperature: Temperature for generation (0.0-1.0)
    
    Returns:
        Dictionary with status and content/error
    """
    if not GROQ_API_KEY:
        print("[ERROR] GROQ_API_KEY environment variable not set")
        return {"error": "GROQ_API_KEY environment variable not set", "status": 500}
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        "temperature": temperature
    }
    
    print(f"[GROQ] Calling {GROQ_MODEL} with URL: {GROQ_API_URL}")
    print(f"[GROQ] Headers: {headers.get('Authorization', 'NO_KEY')[:20]}...")
    print(f"[GROQ] Data model: {data.get('model')}")
    
    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=30)
        
        print(f"[GROQ] Status Code: {response.status_code}")
        print(f"[GROQ] Response: {response.text[:500]}")
        
        if response.status_code != 200:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get("error", {}).get("message", error_detail)
            except:
                pass
            print(f"[ERROR] Groq API failed: {error_detail}")
            return {"error": f"Groq API error ({response.status_code}): {error_detail}", "status": response.status_code}
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        print(f"[GROQ] Success: Got response ({len(content)} chars)")
        return {"content": content, "status": 200}
    except requests.exceptions.Timeout:
        print("[ERROR] Groq API timeout (30s exceeded)")
        return {"error": "Groq API timeout (30s exceeded)", "status": 504}
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Request failed: {str(e)}")
        return {"error": f"Request failed: {str(e)}", "status": 500}
    except (KeyError, IndexError) as e:
        print(f"[ERROR] Invalid response format from Groq: {str(e)}")
        return {"error": f"Invalid response format from Groq: {str(e)}", "status": 502}


def generate_skill_test_questions(skill: str, difficulty: str = "medium") -> dict:
    """
    Generate MCQ test questions for a skill using Groq
    
    Args:
        skill: The skill to generate questions for
        difficulty: Question difficulty (easy, medium, hard)
    
    Returns:
        Dictionary with questions and answers
    """
    system_prompt = "You are a helpful AI that generates high-quality skill assessment questions. Always respond with valid JSON only, no markdown or extra text."
    
    user_prompt = f"""Generate 5 multiple-choice questions with 4 options each and correct answers for the skill: {skill} at {difficulty} difficulty level.

Return ONLY valid JSON (no markdown, no extra text) in this exact format:
{{
    "skill": "{skill}",
    "difficulty": "{difficulty}",
    "questions": [
        {{
            "id": 1,
            "question": "Question text here?",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correct_answer": "A",
            "explanation": "Why this is correct"
        }}
    ]
}}"""
    
    result = call_groq(user_prompt, system_prompt, temperature=0.5)
    
    if result["status"] != 200:
        return {"error": result.get("error", "Unknown error"), "skill": skill, "difficulty": difficulty}
    
    try:
        response_text = result["content"]
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse JSON response from AI",
            "skill": skill,
            "difficulty": difficulty,
            "raw_response": response_text
        }


def generate_auction_explanation(auction_type: str) -> dict:
    """
    Generate an explanation of an auction type using Groq
    
    Args:
        auction_type: Type of auction to explain
    
    Returns:
        Dictionary with explanation
    """
    system_prompt = "You are an expert in skill exchange marketplace auctions. Provide clear, concise explanations."
    
    user_prompt = f"""Explain the '{auction_type}' auction type in the context of a skill exchange marketplace in 2-3 sentences. 
Keep it concise and practical."""
    
    result = call_groq(user_prompt, system_prompt, temperature=0.6)
    
    if result["status"] != 200:
        return {"error": result.get("error", "Unknown error"), "auction_type": auction_type}
    
    return {"explanation": result["content"], "auction_type": auction_type}


def verify_skill_with_ai(skill_name: str, description: str) -> dict:
    """
    Use AI to verify and assess a skill submission
    
    Args:
        skill_name: Name of the skill
        description: Description provided by user
    
    Returns:
        Verification result with assessment
    """
    system_prompt = "You are a skill verification expert. Assess skills for a marketplace and respond with valid JSON only."
    
    user_prompt = f"""As a skill verification expert, assess this skill submission:

Skill: {skill_name}
Description: {description}

Provide a brief assessment on whether this is a valid, well-described skill for an exchange marketplace.

Respond with ONLY valid JSON (no markdown or extra text):
{{
    "is_valid": true or false,
    "confidence": 0.0 to 1.0,
    "assessment": "Your assessment here",
    "category": "suggested category"
}}"""
    
    result = call_groq(user_prompt, system_prompt, temperature=0.3)
    
    if result["status"] != 200:
        return {
            "is_valid": True,
            "confidence": 0.5,
            "assessment": "Could not verify with AI, manual review suggested",
            "error": result.get("error", "Unknown error")
        }
    
    try:
        response_text = result["content"]
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError:
        return {
            "is_valid": True,
            "confidence": 0.5,
            "assessment": "Skill appears valid but could not fully assess",
            "error": "Failed to parse AI response"
        }


def generate_learning_path(skill: str, user_level: str = "beginner") -> dict:
    """
    Generate a personalized learning path using Groq
    
    Args:
        skill: The skill to create a path for
        user_level: User's current level (beginner, intermediate, advanced)
    
    Returns:
        Learning path with steps
    """
    system_prompt = "You are an expert learning path designer. Create structured, actionable learning plans. Respond with valid JSON only."
    
    user_prompt = f"""Create a 5-step learning path for someone at {user_level} level learning '{skill}'.

Respond with ONLY valid JSON (no markdown or extra text):
{{
    "skill": "{skill}",
    "user_level": "{user_level}",
    "steps": [
        {{
            "step": 1,
            "title": "Step title",
            "description": "What to learn",
            "resources": "Where to learn",
            "estimated_time": "Time in hours"
        }}
    ]
}}"""
    
    result = call_groq(user_prompt, system_prompt, temperature=0.5)
    
    if result["status"] != 200:
        return {
            "skill": skill,
            "user_level": user_level,
            "error": result.get("error", "Unknown error")
        }
    
    try:
        response_text = result["content"]
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError:
        return {
            "skill": skill,
            "user_level": user_level,
            "error": "Failed to parse learning path response",
            "raw_response": response_text
        }

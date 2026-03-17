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

def call_groq(prompt: str, model: str = "llama-3.1-70b-versatile", temperature: float = 0.7) -> str:
    """
    Call Groq API for text generation
    
    Args:
        prompt: The user prompt
        model: Model to use (llama-3.1-70b-versatile by default)
        temperature: Temperature for generation (0.0-1.0)
    
    Returns:
        Generated text response
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable not set")
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": 2048
    }
    
    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        raise Exception(f"Groq API error: {str(e)}")


def generate_skill_test_questions(skill: str, difficulty: str = "medium") -> dict:
    """
    Generate MCQ test questions for a skill using Groq
    
    Args:
        skill: The skill to generate questions for
        difficulty: Question difficulty (easy, medium, hard)
    
    Returns:
        Dictionary with questions and answers
    """
    prompt = f"""Generate 5 high-quality multiple-choice questions for the skill '{skill}' at {difficulty} difficulty level.

Format your response as valid JSON (no markdown, just raw JSON) with this structure:
{{
    "skill": "{skill}",
    "difficulty": "{difficulty}",
    "questions": [
        {{
            "id": 1,
            "question": "Question text?",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correct_answer": "A",
            "explanation": "Why this is correct"
        }}
    ]
}}

Only return the JSON, no additional text."""
    
    try:
        response_text = call_groq(prompt, temperature=0.5)
        # Try to parse JSON response
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError:
        # If JSON parsing fails, return structured error
        return {
            "skill": skill,
            "difficulty": difficulty,
            "error": "Failed to parse AI response",
            "raw_response": response_text
        }


def generate_auction_explanation(auction_type: str) -> str:
    """
    Generate an explanation of an auction type using Groq
    
    Args:
        auction_type: Type of auction to explain
    
    Returns:
        Explanation text
    """
    prompt = f"""Explain the '{auction_type}' auction type in the context of a skill exchange marketplace in 2-3 sentences. 
Keep it concise and practical."""
    
    return call_groq(prompt, temperature=0.6)


def verify_skill_with_ai(skill_name: str, description: str) -> dict:
    """
    Use AI to verify and assess a skill submission
    
    Args:
        skill_name: Name of the skill
        description: Description provided by user
    
    Returns:
        Verification result with assessment
    """
    prompt = f"""As a skill verification expert, assess this skill submission:

Skill: {skill_name}
Description: {description}

Provide a brief assessment (2 sentences) on whether this is a valid, well-described skill for an exchange marketplace.

Response format (JSON):
{{
    "is_valid": true/false,
    "confidence": 0.0-1.0,
    "assessment": "Your assessment here",
    "category": "suggested category"
}}"""
    
    try:
        response_text = call_groq(prompt, temperature=0.3)
        data = json.loads(response_text)
        return data
    except (json.JSONDecodeError, Exception) as e:
        return {
            "is_valid": True,
            "confidence": 0.5,
            "assessment": "Could not verify with AI, manual review suggested",
            "error": str(e)
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
    prompt = f"""Create a 5-step learning path for someone at {user_level} level learning '{skill}'.

Format as JSON:
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
    
    try:
        response_text = call_groq(prompt, temperature=0.5)
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError:
        return {
            "skill": skill,
            "user_level": user_level,
            "error": "Failed to generate learning path",
            "raw_response": response_text
        }

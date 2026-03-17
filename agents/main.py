"""
SkillSwap AI Agent Microservice
FastAPI entry point - routes requests to the appropriate agent
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from ai_service import generate_skill_test_questions, generate_auction_explanation, verify_skill_with_ai, generate_learning_path
from models import (
    ChatRequest, ChatResponse,
    AuctionExplainRequest, AuctionExplainResponse,
    SkillVerifyRequest, SkillVerifyResponse,
    SkillTestRequest, SkillTestResponse,
    LearningPathRequest, LearningPathResponse,
)

load_dotenv()

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Fast startup - no heavy services needed with API-based approach"""
    print("AI Agent Microservice: Starting...")
    print(f"--- READY TO BIND ---")
    yield
    print("Agent microservice shut down cleanly")


app = FastAPI(
    title="SkillSwap AI Agent API",
    description="Multi-agent orchestration system for SkillSwap Auction platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - confirms agent service is running"""
    return {
        "status": "Agent is running",
        "service": "SkillSwap AI Agents",
        "version": "1.0.0",
        "message": "Use /docs for interactive API documentation"
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SkillSwap AI Agents", "version": "1.0.0"}


@app.post("/agents/chat", response_model=ChatResponse)
@limiter.limit("5/minute")
async def chat(request: ChatRequest, req: Request):
    """Portfolio Assistant Agent - general questions about SkillSwap"""
    try:
        # For now, return a simple response
        # In production, you could call Groq for dynamic responses
        return ChatResponse(response="Feature powered by Groq AI API", cached=False, agent="portfolio_assistant")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/explain-auction", response_model=AuctionExplainResponse)
async def explain_auction(request: AuctionExplainRequest):
    """Auction Explainer Agent - explains what a specific auction is asking for"""
    try:
        result = generate_auction_explanation(request.question)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return AuctionExplainResponse(explanation=result.get("explanation", ""), auction_id=request.auction_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/verify-skill", response_model=SkillVerifyResponse)
async def verify_skill(request: SkillVerifyRequest):
    """Skill Verification Agent - generates and evaluates skill challenges"""
    try:
        result = verify_skill_with_ai(request.skill_name, request.user_answer or "")
        return SkillVerifyResponse(
            is_valid=result.get("is_valid", True),
            skill_name=request.skill_name,
            assessment=result.get("assessment", "Skill verified")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/generate-test", response_model=SkillTestResponse)
async def generate_test(request: SkillTestRequest):
    """Skill Verification Agent - generates a structured multi-question test"""
    try:
        test_data = generate_skill_test_questions(request.skill_name, request.difficulty or "medium")
        if "error" in test_data:
            raise HTTPException(status_code=500, detail=test_data["error"])
        return SkillTestResponse(
            success=True,
            test=None,
            questions=test_data.get("questions", []),
            agent="skill_verifier"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/generate-test")
async def generate_test_get(skill: str = None, difficulty: str = "medium"):
    """GET endpoint for generating test questions - with query parameters"""
    if not skill or not skill.strip():
        raise HTTPException(status_code=400, detail="Skill parameter is required and cannot be empty")
    
    print(f"\n[TEST] Generating test for skill: {skill}, difficulty: {difficulty}")
    
    test_data = generate_skill_test_questions(skill.strip(), difficulty)
    
    if "error" in test_data:
        print(f"[TEST] Error: {test_data['error']}")
        raise HTTPException(status_code=500, detail=test_data["error"])
    
    print(f"[TEST] Success: Generated questions for {skill}")
    return {
        "success": True,
        "test": None,
        "questions": test_data.get("questions", []),
        "agent": "skill_verifier"
    }


@app.get("/debug/groq")
async def debug_groq():
    """Debug endpoint to test Groq API connectivity"""
    print("\n[DEBUG] Testing Groq API...")
    
    from ai_service import call_groq
    
    result = call_groq(
        user_prompt="Generate 1 simple multiple-choice question about Python with options A, B, C, D and answer A. Return only JSON.",
        system_prompt="You generate multiple-choice questions. Always respond with valid JSON only.",
        temperature=0.5
    )
    
    print(f"[DEBUG] Result: {result}")
    
    return {
        "status": "debug_test",
        "result": result,
        "groq_api_key_set": bool(os.getenv("GROQ_API_KEY")),
        "groq_model": "llama3-8b-8192"
    }


@app.post("/agents/learning-path", response_model=LearningPathResponse)
@limiter.limit("3/minute")
async def learning_path(request: LearningPathRequest, req: Request):
    """Learning Path Agent - personalized skill roadmaps"""
    try:
        path_data = generate_learning_path(request.target_skill, "beginner")
        if "error" in path_data:
            raise HTTPException(status_code=500, detail=path_data["error"])
        return LearningPathResponse(
            path=path_data.get("steps", []),
            target_skill=request.target_skill,
            cached=False,
            agent="learning_path"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents/architecture")
async def architecture():
    """Returns system architecture metadata for the Architecture page"""
    return {
        "agents": [
            {"name": "Portfolio Assistant", "purpose": "Answers general platform questions", "icon": ""},
            {"name": "Auction Explainer", "purpose": "Explains auction requirements and context", "icon": ""},
            {"name": "Skill Verifier", "purpose": "Generates and evaluates technical challenges", "icon": "OK"},
            {"name": "Learning Path", "purpose": "Generates personalized skill roadmaps", "icon": ""},
            {"name": "Architecture Analyst", "purpose": "Explains system design and data flows", "icon": ""},
        ],
        "databases": [
            {"name": "PostgreSQL", "role": "Primary structured data store", "color": "#336791"},
            {"name": "Qdrant", "role": "Vector embeddings & semantic search", "color": "#FF6B35"},
            {"name": "Neo4j", "role": "Skill relationship knowledge graph", "color": "#008CC1"},
            {"name": "Redis", "role": "Session memory & response cache", "color": "#DC382D"},
        ],
        "flow": [
            "User query arrives at frontend",
            "React component calls /api/agents/*",
            "Node.js proxies to Python FastAPI",
            "Orchestrator routes to correct agent",
            "Agent retrieves context from Qdrant + Neo4j + PostgreSQL",
            "LLM reasons over context",
            "Response cached in Redis & returned to user",
        ]
    }


import uvicorn

if __name__ == "__main__":
    # Render and other PaaS providers inject PORT environment variable
    # We prioritize PORT, then AGENTS_PORT, then default to 8000
    port = int(os.environ.get("PORT", os.environ.get("AGENTS_PORT", 8000)))
    
    print(f"--- Starting Server ---")
    print(f"Host: 0.0.0.0")
    print(f"Port: {port}")
    print(f"-----------------------")
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        log_level="info",
        proxy_headers=True,
        forwarded_allow_ips="*"
    )

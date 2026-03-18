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

from ai_service import call_groq, generate_skill_test_questions, generate_auction_explanation, verify_skill_with_ai, generate_learning_path
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
    try:
        print("\n" + "="*60)
        print("🚀 AI Agent Microservice: Starting...")
        print("="*60)
        print(f"📍 GROQ_API_KEY set: {bool(os.getenv('GROQ_API_KEY'))}")
        print(f"📍 Environment: {os.getenv('NODE_ENV', 'development')}")
        print(f"📍 Model: llama-3.1-8b-instant")
        print("="*60)
        print("✅ READY TO BIND")
        print("="*60 + "\n")
    except Exception as e:
        print(f"⚠️  Error during startup: {e}")
    
    yield
    
    try:
        print("\n✅ Agent microservice shut down cleanly\n")
    except Exception as e:
        print(f"⚠️  Error during shutdown: {e}")


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
        "message": "Use /docs for interactive API documentation",
        "timestamp": __import__('time').time()
    }


@app.get("/health")
async def health():
    """Health check - simple endpoint to verify service is responsive"""
    return {
        "status": "ok",
        "service": "SkillSwap AI Agents",
        "version": "1.0.0",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "timestamp": __import__('time').time()
    }


@app.post("/agents/chat")
@limiter.limit("5/minute")
async def chat(request: ChatRequest, req: Request):
    """Portfolio Assistant Agent - general questions about SkillSwap"""
    try:
        # Try to use Groq API for dynamic responses
        try:
            result = call_groq(
                user_prompt=request.message,
                system_prompt="You are a helpful SkillSwap assistant. Answer questions about the platform, auctions, and skill exchanges. Be concise.",
                temperature=0.7
            )
            if "error" in result:
                # Fallback to simple response if Groq fails
                response_text = "I'm here to help! The AI service had an issue, but I can still assist."
            else:
                response_text = result.get("content", "I'm ready to help!")
        except Exception as groq_err:
            print(f"[CHAT] Groq error: {groq_err}")
            response_text = "I'm here to help! The AI service had an issue, but I can still assist."
        
        return {
            "response": response_text,
            "agent": "portfolio_assistant",
            "cached": False,
            "success": True
        }
    except Exception as e:
        print(f"[CHAT] Error: {str(e)}")
        return {
            "response": "The AI service encountered an error. Please try again.",
            "agent": "portfolio_assistant",
            "cached": False,
            "success": False,
            "error": str(e)
        }


@app.post("/agents/explain-auction")
async def explain_auction(request: AuctionExplainRequest):
    """Auction Explainer Agent - explains what a specific auction is asking for"""
    try:
        result = generate_auction_explanation(request.question or "Explain this auction")
        if "error" in result:
            return {
                "explanation": "Could not generate explanation. Please try again.",
                "auction_id": request.auction_id,
                "agent": "auction_explainer",
                "success": False
            }
        return {
            "explanation": result.get("explanation", ""),
            "auction_id": request.auction_id,
            "agent": "auction_explainer",
            "success": True
        }
    except Exception as e:
        print(f"[AUCTION] Error: {str(e)}")
        return {
            "explanation": "Could not generate explanation. Please try again.",
            "auction_id": request.auction_id if hasattr(request, 'auction_id') else "unknown",
            "agent": "auction_explainer",
            "success": False,
            "error": str(e)
        }


@app.post("/agents/verify-skill")
async def verify_skill(request: SkillVerifyRequest):
    """Skill Verification Agent - generates and evaluates skill challenges"""
    try:
        result = verify_skill_with_ai(request.skill_name, request.user_answer or "")
        if "error" in result:
            return {
                "mode": "evaluation",
                "challenge": None,
                "evaluation": "Verification failed. Please try again.",
                "score": 0,
                "passed": False,
                "agent": "skill_verifier",
                "success": False
            }
        return {
            "mode": "evaluation",
            "challenge": None,
            "evaluation": result.get("assessment", "Skill verified"),
            "score": result.get("score", 0),
            "passed": result.get("is_valid", False),
            "agent": "skill_verifier",
            "success": True
        }
    except Exception as e:
        print(f"[VERIFY] Error: {str(e)}")
        return {
            "mode": "evaluation",
            "challenge": None,
            "evaluation": "Verification failed. Please try again.",
            "score": 0,
            "passed": False,
            "agent": "skill_verifier",
            "success": False,
            "error": str(e)
        }


@app.post("/agents/generate-test")
async def generate_test(request: SkillTestRequest):
    """Skill Verification Agent - generates a structured multi-question test"""
    try:
        test_data = generate_skill_test_questions(request.skill_name, request.difficulty or "medium")
        if "error" in test_data:
            return {
                "success": False,
                "test": None,
                "questions": [],
                "agent": "skill_verifier",
                "error": test_data.get("error", "Could not generate test")
            }
        return {
            "success": True,
            "test": None,
            "questions": test_data.get("questions", []),
            "agent": "skill_verifier"
        }
    except Exception as e:
        print(f"[TEST] Error: {str(e)}")
        return {
            "success": False,
            "test": None,
            "questions": [],
            "agent": "skill_verifier",
            "error": str(e)
        }


@app.get("/generate-test")
async def generate_test_get(skill: str = None, difficulty: str = "medium"):
    """GET endpoint for generating test questions - with query parameters"""
    if not skill or not skill.strip():
        return {
            "success": False,
            "test": None,
            "questions": [],
            "agent": "skill_verifier",
            "error": "Skill parameter is required"
        }
    
    try:
        print(f"\n[TEST] Generating test for skill: {skill}, difficulty: {difficulty}")
        
        test_data = generate_skill_test_questions(skill.strip(), difficulty)
        
        if "error" in test_data:
            print(f"[TEST] Error: {test_data['error']}")
            return {
                "success": False,
                "test": None,
                "questions": [],
                "agent": "skill_verifier",
                "error": test_data["error"]
            }
        
        print(f"[TEST] Success: Generated questions for {skill}")
        return {
            "success": True,
            "test": None,
            "questions": test_data.get("questions", []),
            "agent": "skill_verifier"
        }
    except Exception as e:
        print(f"[TEST] Error: {str(e)}")
        return {
            "success": False,
            "test": None,
            "questions": [],
            "agent": "skill_verifier",
            "error": str(e)
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


@app.post("/agents/learning-path")
@limiter.limit("3/minute")
async def learning_path(request: LearningPathRequest, req: Request):
    """Learning Path Agent - personalized skill roadmaps"""
    try:
        path_data = generate_learning_path(request.target_skill, "beginner")
        if "error" in path_data:
            return {
                "path": [],
                "target_skill": request.target_skill,
                "agent": "learning_path",
                "cached": False,
                "success": False,
                "error": path_data.get("error", "Could not generate learning path")
            }
        return {
            "path": path_data.get("steps", []),
            "target_skill": request.target_skill,
            "agent": "learning_path",
            "cached": False,
            "success": True
        }
    except Exception as e:
        print(f"[LEARNING] Error: {str(e)}")
        return {
            "path": [],
            "target_skill": request.target_skill if hasattr(request, 'target_skill') else "unknown",
            "agent": "learning_path",
            "cached": False,
            "success": False,
            "error": str(e)
        }


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
    try:
        # Render and other PaaS providers inject PORT environment variable
        # We prioritize PORT, then AGENTS_PORT, then default to 8000
        port = int(os.environ.get("PORT", os.environ.get("AGENTS_PORT", 8000)))
        
        print("\n" + "="*70)
        print("🚀 SkillSwap AI Agent Microservice - Starting Server")
        print("="*70)
        print(f"🔗 Host: 0.0.0.0")
        print(f"🔗 Port: {port}")
        print(f"📝 Log Level: info")
        print(f"🔐 GROQ_API_KEY: {'✅ Set' if os.getenv('GROQ_API_KEY') else '❌ Not Set'}")
        print("="*70)
        print("📚 Available Endpoints:")
        print("  GET  /                    - Root status")
        print("  GET  /health              - Health check")
        print("  GET  /docs                - API documentation")
        print("  POST /agents/chat         - Chat endpoint")
        print("  POST /agents/learning-path - Learning path generation")
        print("  POST /agents/verify-skill - Skill verification")
        print("="*70 + "\n")
        
        uvicorn.run(
            "main:app", 
            host="0.0.0.0", 
            port=port, 
            log_level="info",
            proxy_headers=True,
            forwarded_allow_ips="*"
        )
    except Exception as e:
        print(f"❌ STARTUP ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

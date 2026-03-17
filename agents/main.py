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

from orchestrator import AgentOrchestrator
from retrieval.qdrant_service import QdrantService
from retrieval.neo4j_service import Neo4jService
from retrieval.redis_service import RedisService
from indexing.indexer import DataIndexer
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

# Global service instances
qdrant_service: QdrantService = None
neo4j_service: Neo4jService = None
redis_service: RedisService = None
orchestrator: AgentOrchestrator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize all services on startup - fault-tolerant, DB failures won't crash the service"""
    global qdrant_service, neo4j_service, redis_service, orchestrator

    print("Starting AI Agent Microservice...")

    # --- Qdrant (optional) ---
    try:
        qdrant_service = QdrantService()
        print("[OK] Qdrant connected")
    except Exception as e:
        print(f"[WARN] Qdrant unavailable (vector search disabled): {e}")
        qdrant_service = None

    # --- Neo4j (optional) ---
    try:
        neo4j_service = Neo4jService()
        print("[OK] Neo4j connected")
    except Exception as e:
        print(f"[WARN] Neo4j unavailable (graph search disabled): {e}")
        neo4j_service = None

    # --- Redis (optional) ---
    try:
        redis_service = RedisService()
        print("[OK] Redis connected")
    except Exception as e:
        print(f"[WARN] Redis unavailable (caching disabled): {e}")
        redis_service = None

    # --- Data Indexer (only if both Qdrant + Neo4j are up) ---
    if qdrant_service and neo4j_service:
        try:
            indexer = DataIndexer(qdrant_service, neo4j_service)
            await indexer.seed_initial_data()
            print("[OK] Data index seeded")
        except Exception as e:
            print(f"[WARN] Data indexing skipped: {e}")
    else:
        print("[WARN] Skipping data indexer (Qdrant or Neo4j offline)")

    # --- Orchestrator (always starts - uses mocked services if needed) ---
    try:
        orchestrator = AgentOrchestrator(
            qdrant=qdrant_service,
            neo4j=neo4j_service,
            redis=redis_service
        )
        print("[OK] Orchestrator ready - LLM endpoints fully operational")
    except Exception as e:
        print(f"[ERROR] Orchestrator failed to start: {e}")
        raise  # Critical - can't serve any agent without orchestrator

    print("[READY] Agent microservice started successfully!")
    yield

    # Cleanup
    if neo4j_service:
        try:
            neo4j_service.close()
        except Exception:
            pass
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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SkillSwap AI Agents", "version": "1.0.0"}


@app.post("/agents/chat", response_model=ChatResponse)
@limiter.limit("5/minute")
async def chat(request: ChatRequest, req: Request):
    """Portfolio Assistant Agent - general questions about SkillSwap"""
    try:
        if redis_service:
            cached = await redis_service.get_cached(f"chat:{request.message[:80]}")
            if cached:
                return ChatResponse(response=cached, cached=True, agent="portfolio_assistant")

        result = await orchestrator.run_portfolio_assistant(
            message=request.message,
            session_id=request.session_id
        )
        if redis_service:
            await redis_service.cache(f"chat:{request.message[:80]}", result["response"], ttl=300)
        return ChatResponse(**result, cached=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/explain-auction", response_model=AuctionExplainResponse)
async def explain_auction(request: AuctionExplainRequest):
    """Auction Explainer Agent - explains what a specific auction is asking for"""
    try:
        result = await orchestrator.run_auction_explainer(
            auction_id=request.auction_id,
            question=request.question
        )
        return AuctionExplainResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/verify-skill", response_model=SkillVerifyResponse)
async def verify_skill(request: SkillVerifyRequest):
    """Skill Verification Agent - generates and evaluates skill challenges"""
    try:
        result = await orchestrator.run_skill_verifier(
            skill_name=request.skill_name,
            user_id=request.user_id,
            user_answer=request.user_answer
        )
        return SkillVerifyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/generate-test", response_model=SkillTestResponse)
async def generate_test(request: SkillTestRequest):
    """Skill Verification Agent - generates a structured multi-question test"""
    try:
        result = await orchestrator.run_skill_test_generator(
            skill_name=request.skill_name,
            difficulty=request.difficulty
        )
        return SkillTestResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/learning-path", response_model=LearningPathResponse)
@limiter.limit("3/minute")
async def learning_path(request: LearningPathRequest, req: Request):
    """Learning Path Agent - personalized skill roadmaps"""
    try:
        if redis_service:
            cached = await redis_service.get_cached(f"path:{request.target_skill}")
            if cached:
                return LearningPathResponse(path=cached, target_skill=request.target_skill, cached=True, agent="learning_path")

        result = await orchestrator.run_learning_path(
            target_skill=request.target_skill,
            current_skills=request.current_skills
        )
        if redis_service:
            await redis_service.cache(f"path:{request.target_skill}", result["path"], ttl=3600)
        return LearningPathResponse(**result, cached=False)
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("AGENTS_PORT", 8000)), reload=True)

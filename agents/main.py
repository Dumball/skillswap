"""
SkillSwap AI Agent Microservice
FastAPI entry point - routes requests to the appropriate agent
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    LearningPathRequest, LearningPathResponse,
)

load_dotenv()

# Global service instances
qdrant_service: QdrantService = None
neo4j_service: Neo4jService = None
redis_service: RedisService = None
orchestrator: AgentOrchestrator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize all services on startup"""
    global qdrant_service, neo4j_service, redis_service, orchestrator

    print("Starting AI Agent Microservice...")

    # Initialize retrieval services
    qdrant_service = QdrantService()
    neo4j_service = Neo4jService()
    redis_service = RedisService()

    # Initialize and seed data indexer
    indexer = DataIndexer(qdrant_service, neo4j_service)
    await indexer.seed_initial_data()

    # Initialize orchestrator with all services
    orchestrator = AgentOrchestrator(
        qdrant=qdrant_service,
        neo4j=neo4j_service,
        redis=redis_service
    )

    print("All services initialized and ready!")
    yield

    # Cleanup
    neo4j_service.close()
    print("Agent microservice shut down cleanly")


app = FastAPI(
    title="SkillSwap AI Agent API",
    description="Multi-agent orchestration system for SkillSwap Auction platform",
    version="1.0.0",
    lifespan=lifespan
)

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
async def chat(request: ChatRequest):
    """Portfolio Assistant Agent - general questions about SkillSwap"""
    try:
        cached = await redis_service.get_cached(f"chat:{request.message[:80]}")
        if cached:
            return ChatResponse(response=cached, cached=True, agent="portfolio_assistant")

        result = await orchestrator.run_portfolio_assistant(
            message=request.message,
            session_id=request.session_id
        )
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


@app.post("/agents/learning-path", response_model=LearningPathResponse)
async def learning_path(request: LearningPathRequest):
    """Learning Path Agent - personalized skill roadmaps"""
    try:
        cached = await redis_service.get_cached(f"path:{request.target_skill}")
        if cached:
            return LearningPathResponse(path=cached, cached=True, agent="learning_path")

        result = await orchestrator.run_learning_path(
            target_skill=request.target_skill,
            current_skills=request.current_skills
        )
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

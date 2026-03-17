"""
Agent Orchestrator using LangGraph
Routes requests to the correct agent and aggregates multi-DB context
"""
import os
from typing import Optional, List
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from retrieval.qdrant_service import QdrantService
from retrieval.neo4j_service import Neo4jService
from retrieval.redis_service import RedisService

from agents.portfolio_assistant import PortfolioAssistantAgent
from agents.auction_explainer import AuctionExplainerAgent
from agents.skill_verifier import SkillVerifierAgent
from agents.learning_path import LearningPathAgent
from agents.architecture_analyst import ArchitectureAnalystAgent

from dotenv import load_dotenv
load_dotenv()


class AgentOrchestrator:
    """
    Central orchestrator that routes requests to the appropriate agent
    and aggregates context from Qdrant, Neo4j, and PostgreSQL.
    """

    def __init__(self, qdrant: QdrantService, neo4j: Neo4jService, redis: RedisService):
        self.qdrant = qdrant
        self.neo4j = neo4j
        self.redis = redis
        
        # Use Groq model from environment
        self.llm = ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=0.7,
            groq_api_key=os.getenv("GROQ_API_KEY")
        )

        # Initialize all agents with shared services
        self.portfolio_agent = PortfolioAssistantAgent(self.llm, qdrant, neo4j)
        self.auction_explainer = AuctionExplainerAgent(self.llm, qdrant)
        self.skill_verifier = SkillVerifierAgent(self.llm, qdrant)
        self.learning_path_agent = LearningPathAgent(self.llm, neo4j, qdrant)
        self.arch_analyst = ArchitectureAnalystAgent(self.llm)

    async def run_portfolio_assistant(self, message: str, session_id: str = "default") -> dict:
        """Run the Portfolio Assistant Agent with conversation memory"""
        # Load session history from Redis
        history = await self.redis.get_session(session_id)

        # Build message list for the LLM
        messages = []
        for h in history[-6:]:  # Keep last 6 turns
            if h["role"] == "user":
                messages.append(HumanMessage(content=h["content"]))
            else:
                messages.append(AIMessage(content=h["content"]))

        # Run agent
        response = await self.portfolio_agent.run(message, history=messages)

        # Update and save session
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": response})
        await self.redis.save_session(session_id, history)

        return {"response": response, "agent": "portfolio_assistant", "session_id": session_id}

    async def run_auction_explainer(self, auction_id: str, question: str) -> dict:
        """Explain a specific auction using its ID to fetch context"""
        result = await self.auction_explainer.run(auction_id=auction_id, question=question)
        return {**result, "agent": "auction_explainer"}

    async def run_skill_verifier(self, skill_name: str, user_id: Optional[str], user_answer: Optional[str]) -> dict:
        """Generate challenge or evaluate answer"""
        result = await self.skill_verifier.run(
            skill_name=skill_name,
            user_id=user_id,
            user_answer=user_answer
        )
        return {**result, "agent": "skill_verifier"}

    async def run_skill_test_generator(self, skill_name: str, difficulty: str = "medium") -> dict:
        """Generate a structured multi-question test"""
        result = await self.skill_verifier.generate_test(
            skill_name=skill_name,
            difficulty=difficulty
        )
        return {**result, "agent": "skill_verifier"}

    async def run_learning_path(self, target_skill: str, current_skills: List[str]) -> dict:
        """Generate a learning roadmap"""
        result = await self.learning_path_agent.run(
            target_skill=target_skill,
            current_skills=current_skills
        )
        return {**result, "agent": "learning_path"}

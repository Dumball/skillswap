"""
Architecture Analyst Agent
Explains the SkillSwap system design and agent architecture
"""
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are an expert systems architect explaining the SkillSwap AI platform.

SkillSwap architecture overview:
- Frontend: React (Vite) SPA with live WebSocket updates via Socket.io
- Backend: Node.js + Express REST API with JWT authentication
- Databases: PostgreSQL (primary), Qdrant (vectors), Neo4j (knowledge graph), Redis (cache/memory)
- AI Layer: Python FastAPI microservice with LangGraph agent orchestration
- Agents: Portfolio Assistant, Auction Explainer, Skill Verifier, Learning Path, Architecture Analyst

Data flows:
1. User query -> React frontend -> /api/agents/* (Node.js proxy) -> Python FastAPI
2. Agent retrieves context from Qdrant (semantic search) + Neo4j (relationships) + PostgreSQL (metadata)
3. LLM (GPT-4o-mini) reasons over context -> response cached in Redis -> returned to user
4. Real-time auction events flow through Socket.io rooms

Answer questions about this architecture clearly and technically.
"""


class ArchitectureAnalystAgent:
    def __init__(self, llm):
        self.llm = llm

    async def run(self, question: str) -> str:
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=question)
        ]
        response = await self.llm.ainvoke(messages)
        return response.content

"""
Portfolio Assistant Agent
Answers general questions about SkillSwap platform using RAG
"""
from langchain_core.messages import HumanMessage, SystemMessage
from typing import List

SYSTEM_PROMPT = """You are the AI assistant for SkillSwap Auction — a platform where people bid using skills instead of money.
Your role is to help visitors understand:
- How the platform works
- What skill auctions are and how to create them
- How the bidding system works (users offer their skills as bids)
- How reputation and skill credits work
- How to find good skill exchange opportunities

You have access to relevant context from the platform knowledge base. Use it to give accurate, helpful answers.
Keep responses friendly, concise, and practical. If you don't know something specific, say so honestly.

Context from platform:
{context}
"""


class PortfolioAssistantAgent:
    def __init__(self, llm, qdrant, neo4j):
        self.llm = llm
        self.qdrant = qdrant
        self.neo4j = neo4j

    async def run(self, message: str, history: List = []) -> str:
        # Retrieve relevant context from Qdrant
        docs = self.qdrant.search(message, top_k=4, filter_type="platform_info")
        context = "\n\n".join([d["text"] for d in docs]) if docs else "No specific context found. Use your general knowledge about SkillSwap."

        messages = [
            SystemMessage(content=SYSTEM_PROMPT.format(context=context)),
            *history,
            HumanMessage(content=message)
        ]

        response = await self.llm.ainvoke(messages)
        return response.content

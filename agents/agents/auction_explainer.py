"""
Auction Explainer Agent
Explains what a specific auction is asking for and what skills are needed
"""
import os
import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from typing import Optional

SYSTEM_PROMPT = """You are an expert at explaining skill exchange auction listings on SkillSwap.
Given an auction's details, explain clearly:
1. What the auction poster needs help with
2. What skills are required to fulfill this auction
3. What a good bid/skill offer would look like
4. Tips for people considering bidding

Be practical and encouraging. Focus on helping skill providers understand if they can help.

Auction details:
{auction_details}

Related context from similar auctions:
{context}
"""


class AuctionExplainerAgent:
    def __init__(self, llm, qdrant):
        self.llm = llm
        self.qdrant = qdrant
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:5000")

    async def _fetch_auction(self, auction_id: str) -> Optional[dict]:
        """Fetch auction details from the backend"""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(f"{self.backend_url}/api/auctions/{auction_id}", timeout=5)
                if r.status_code == 200:
                    return r.json()
        except Exception as e:
            print(f"Could not fetch auction: {e}")
        return None

    async def run(self, auction_id: str, question: str) -> dict:
        # Fetch from backend
        auction = await self._fetch_auction(auction_id)
        if not auction:
            auction_text = f"Auction ID: {auction_id} (details unavailable)"
        else:
            auction_text = f"""
Title: {auction.get('title', 'N/A')}
Category: {auction.get('skill_category', 'N/A')}
Description: {auction.get('description', 'N/A')}
Minimum Credits: {auction.get('minimum_credit_value', 'N/A')}
"""

        # Semantic search for similar auction context
        search_query = auction.get("title", "") + " " + auction.get("description", "") if auction else question
        docs = self.qdrant.search(search_query, top_k=3, filter_type="auction")
        context = "\n\n".join([d["text"] for d in docs]) if docs else "No similar auctions found."

        # Find similar auctions from search results 
        similar = [{"id": d["id"], "title": d["payload"].get("title", ""), "score": round(d["score"], 2)} for d in docs[:3]]

        messages = [
            SystemMessage(content=SYSTEM_PROMPT.format(auction_details=auction_text, context=context)),
            HumanMessage(content=question)
        ]

        response = await self.llm.ainvoke(messages)
        return {
            "response": response.content,
            "auction_id": auction_id,
            "similar_auctions": similar
        }

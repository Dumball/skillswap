"""
Data Indexer - seeds Qdrant and Neo4j with initial platform knowledge
"""
import os
import asyncio
from retrieval.qdrant_service import QdrantService
from retrieval.neo4j_service import Neo4jService


PLATFORM_KNOWLEDGE = [
    {
        "id": 1,
        "text": "SkillSwap Auction is a unique marketplace where users bid using skills instead of money. Instead of offering payment, bidders propose skill exchanges - for example, offering Python tutoring in exchange for logo design.",
        "metadata": {"type": "platform_info", "topic": "overview"}
    },
    {
        "id": 2,
        "text": "To create an auction on SkillSwap, click 'Create Auction' in the navigation. You will need to provide a title, description of what you need, skill category, minimum skill credits value, and duration. Once posted, other users can bid by offering their skills.",
        "metadata": {"type": "platform_info", "topic": "create_auction"}
    },
    {
        "id": 3,
        "text": "Bidding on SkillSwap works by offering your own skills as payment. When you see an auction you can help with, click 'Place Bid', describe what skill you are offering and the credit value. The auction creator then selects the best offer.",
        "metadata": {"type": "platform_info", "topic": "bidding"}
    },
    {
        "id": 4,
        "text": "Skill Credits are the virtual currency of SkillSwap. Each skill has an estimated credit value based on market demand, expertise required, and time investment. Credits help compare different skill offers fairly.",
        "metadata": {"type": "platform_info", "topic": "credits"}
    },
    {
        "id": 5,
        "text": "Reputation on SkillSwap is built by completing successful exchanges and receiving positive ratings. Higher reputation means more trust from other users, and your auctions and bids are more likely to be accepted.",
        "metadata": {"type": "platform_info", "topic": "reputation"}
    },
    {
        "id": 6,
        "text": "The SkillSwap AI system uses multiple specialized agents to help users. The Portfolio Assistant answers platform questions, the Auction Explainer helps understand specific auctions, the Skill Verifier tests your skills, and the Learning Path agent creates personalized roadmaps.",
        "metadata": {"type": "platform_info", "topic": "ai_agents"}
    },
    {
        "id": 7,
        "text": "Common skill categories on SkillSwap include: Design (logo, UI/UX, graphics), Development (web, mobile, backend), Marketing (SEO, social media, content), Writing (copywriting, technical writing), and Video (editing, production, animation).",
        "metadata": {"type": "platform_info", "topic": "categories"}
    },
    {
        "id": 8,
        "text": "Real-time bidding updates are powered by WebSockets through Socket.io. When someone places a new bid on an auction you are viewing, it appears instantly without refreshing the page.",
        "metadata": {"type": "platform_info", "topic": "realtime"}
    },
]


class DataIndexer:
    def __init__(self, qdrant: QdrantService, neo4j: Neo4jService):
        self.qdrant = qdrant
        self.neo4j = neo4j

    async def seed_initial_data(self):
        """Seed Qdrant with platform knowledge and Neo4j skill graph"""
        print("Books Seeding initial platform data...")

        # Seed Qdrant with platform knowledge
        documents = [
            {"id": doc["id"], "text": doc["text"], "metadata": doc["metadata"]}
            for doc in PLATFORM_KNOWLEDGE
        ]
        self.qdrant.upsert_batch(documents)

        print("OK Data seeding complete")

from agents.learning_path import LearningPathAgent
from retrieval.neo4j_service import Neo4jService
from retrieval.qdrant_service import QdrantService
from langchain_groq import ChatGroq
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def test():
    llm = ChatGroq(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        temperature=0,
        groq_api_key=os.getenv("GROQ_API_KEY")
    )
    neo4j = Neo4jService()
    qdrant = QdrantService()
    
    agent = LearningPathAgent(llm, neo4j, qdrant)
    print("Running agent...")
    try:
        result = await agent.run("Python", [])
        print("Result:", result)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())

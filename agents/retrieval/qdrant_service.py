"""
Qdrant Vector Database Service
Handles embeddings creation and semantic similarity search
"""
import os
from typing import List, Optional
from qdrant_client import QdrantClient, AsyncQdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter,
    FieldCondition, MatchValue
)
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "skillswap_embeddings")
VECTOR_SIZE = 384  # all-MiniLM-L6-v2 dimension


class QdrantService:
    def __init__(self):
        url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.client = QdrantClient(url=url)
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self._ensure_collection()

    def _ensure_collection(self):
        """Create collection if it doesn't exist"""
        try:
            self.client.get_collection(COLLECTION_NAME)
        except Exception:
            self.client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
            )
            print(f"OK Created Qdrant collection: {COLLECTION_NAME}")

    def embed(self, text: str) -> List[float]:
        """Generate embedding for a text string"""
        return self.model.encode(text).tolist()

    def upsert(self, doc_id: int, text: str, metadata: dict):
        """Store a document with its embedding"""
        vector = self.embed(text)
        self.client.upsert(
            collection_name=COLLECTION_NAME,
            points=[PointStruct(id=doc_id, vector=vector, payload=metadata)]
        )

    def search(self, query: str, top_k: int = 5, filter_type: Optional[str] = None) -> List[dict]:
        """Semantic similarity search"""
        vector = self.embed(query)

        search_filter = None
        if filter_type:
            search_filter = Filter(
                must=[FieldCondition(key="type", match=MatchValue(value=filter_type))]
            )

        results = self.client.search(
            collection_name=COLLECTION_NAME,
            query_vector=vector,
            limit=top_k,
            query_filter=search_filter,
            with_payload=True
        )

        return [
            {
                "id": r.id,
                "score": r.score,
                "payload": r.payload,
                "text": r.payload.get("text", "")
            }
            for r in results
        ]

    def upsert_batch(self, documents: List[dict]):
        """Batch upsert for initial seeding"""
        points = []
        for i, doc in enumerate(documents):
            vector = self.embed(doc["text"])
            points.append(PointStruct(
                id=doc.get("id", i + 1000),
                vector=vector,
                payload={**doc.get("metadata", {}), "text": doc["text"]}
            ))
        self.client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"OK Upserted {len(points)} documents to Qdrant")

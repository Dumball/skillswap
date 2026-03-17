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
        self.url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.client = QdrantClient(url=self.url)
        self._model = None
        # We don't call _ensure_collection here to avoid blocking startup
        # It will be called lazily or backgrounded

    @property
    def model(self):
        """Lazy load the model to avoid blocking bridge startup"""
        if self._model is None:
            print("Loading SentenceTransformer model (all-MiniLM-L6-v2)...")
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
            print("Model loaded successfully.")
        return self._model

    def ensure_collection(self):
        """Create collection if it doesn't exist - can be called backgrounded"""
        try:
            self.client.get_collection(COLLECTION_NAME)
            print(f"Qdrant collection '{COLLECTION_NAME}' already exists.")
        except Exception:
            try:
                self.client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
                )
                print(f"OK Created Qdrant collection: {COLLECTION_NAME}")
            except Exception as e:
                print(f"ERROR creating Qdrant collection: {e}")

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

"""
Pydantic models for request/response schemas
"""
from typing import List, Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"


class ChatResponse(BaseModel):
    response: str
    agent: str = "portfolio_assistant"
    cached: bool = False


class AuctionExplainRequest(BaseModel):
    auction_id: str
    question: Optional[str] = "Explain this auction and what skills are needed"


class AuctionExplainResponse(BaseModel):
    response: str
    auction_id: str
    agent: str = "auction_explainer"
    similar_auctions: Optional[List[dict]] = []


class SkillVerifyRequest(BaseModel):
    skill_name: str
    user_id: Optional[str] = None
    user_answer: Optional[str] = None  # None = generate challenge, non-None = evaluate


class SkillVerifyResponse(BaseModel):
    mode: str  # "challenge" or "evaluation"
    challenge: Optional[str] = None
    evaluation: Optional[str] = None
    score: Optional[int] = None  # 0-100
    passed: Optional[bool] = None
    agent: str = "skill_verifier"


class SkillTestRequest(BaseModel):
    skill_name: str
    difficulty: Optional[str] = "medium"


class Question(BaseModel):
    id: int
    type: str # mcq
    question: str
    options: List[str]
    correct_answer: str
    explanation: str


class PracticalQuestion(BaseModel):
    id: int
    type: str # practical
    question: str
    requirements: Optional[List[str]] = []
    hints: Optional[List[str]] = []


class SubTest(BaseModel):
    skill: str
    difficulty: str
    questions: List[dict] # Use dict to allow mix of MCQ and Practical in the same list


class SkillTestResponse(BaseModel):
    success: bool
    test: Optional[SubTest] = None
    questions: Optional[List[dict]] = []  # Keep for backward compatibility
    agent: str = "skill_verifier"


class LearningPathRequest(BaseModel):
    target_skill: str
    current_skills: Optional[List[str]] = []


class LearningPathResponse(BaseModel):
    path: list
    target_skill: str = ""
    agent: str = "learning_path"
    cached: bool = False

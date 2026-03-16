"""
Skill Verification Agent
Generates technical challenges and evaluates user submissions
"""
import os
import json
import psycopg2
from langchain_core.messages import HumanMessage, SystemMessage
from typing import Optional
from datetime import datetime

CHALLENGE_PROMPT = """You are a technical interviewer for the SkillSwap platform.
Generate a concise, fair skill verification challenge for: {skill_name}

The challenge should:
- Take approximately 5-10 minutes to complete
- Be practical and demonstrate real-world competency
- Have clear requirements and evaluation criteria

Format your response as JSON:
{{
    "challenge": "The challenge description here",
    "example_solution_hints": ["hint1", "hint2"],
    "evaluation_criteria": ["criterion1", "criterion2"]
}}
"""

EVALUATION_PROMPT = """You are evaluating a skill submission on SkillSwap.

Skill: {skill_name}
Challenge: {challenge}
User's Answer: {user_answer}

Evaluate the submission and respond with JSON:
{{
    "score": <0-100>,
    "passed": <true/false>,
    "feedback": "Detailed feedback...",
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"]
}}

A score >= 70 should be considered "passed".
"""


class SkillVerifierAgent:
    def __init__(self, llm, qdrant):
        self.llm = llm
        self.qdrant = qdrant
        self.db_url = os.getenv("DATABASE_URL")

    def _log_verification(self, user_id: str, skill_name: str, score: int, passed: bool):
        """Log skill verification result to PostgreSQL"""
        if not user_id or not self.db_url:
            return
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO skill_verifications (user_id, skill_name, score, passed, verified_at)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT DO NOTHING""",
                (user_id, skill_name, score, passed, datetime.utcnow())
            )
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Warning: could not log verification (DB may be offline): {e}")

    async def run(self, skill_name: str, user_id: Optional[str], user_answer: Optional[str]) -> dict:
        if user_answer is None:
            # Generate a challenge
            messages = [
                SystemMessage(content="You are a technical interviewer. Always respond with valid JSON."),
                HumanMessage(content=CHALLENGE_PROMPT.format(skill_name=skill_name))
            ]
            response = await self.llm.ainvoke(messages)
            try:
                # Strip markdown code fences if present
                content = response.content.strip().strip("```json").strip("```").strip()
                data = json.loads(content)
            except json.JSONDecodeError:
                data = {"challenge": response.content, "example_solution_hints": [], "evaluation_criteria": []}

            return {
                "mode": "challenge",
                "challenge": data.get("challenge"),
                "evaluation_criteria": data.get("evaluation_criteria", []),
                "hints": data.get("example_solution_hints", []),
                "score": None,
                "passed": None,
            }
        else:
            # Evaluate user's answer - get challenge from cache
            challenge_text = f"A practical {skill_name} challenge"

            messages = [
                SystemMessage(content="You are evaluating a skill submission. Always respond with valid JSON."),
                HumanMessage(content=EVALUATION_PROMPT.format(
                    skill_name=skill_name,
                    challenge=challenge_text,
                    user_answer=user_answer
                ))
            ]
            response = await self.llm.ainvoke(messages)
            try:
                content = response.content.strip().strip("```json").strip("```").strip()
                data = json.loads(content)
            except json.JSONDecodeError:
                data = {"score": 0, "passed": False, "feedback": response.content, "strengths": [], "improvements": []}

            score = data.get("score", 0)
            passed = data.get("passed", score >= 70)

            # Log to database
            self._log_verification(user_id, skill_name, score, passed)

            return {
                "mode": "evaluation",
                "challenge": challenge_text,
                "evaluation": data.get("feedback"),
                "score": score,
                "passed": passed,
                "strengths": data.get("strengths", []),
                "improvements": data.get("improvements", []),
            }

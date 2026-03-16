"""
Learning Path Agent
Generates personalized skill roadmaps using Neo4j relationships
"""
import json
from langchain_core.messages import HumanMessage, SystemMessage
from typing import List

SYSTEM_PROMPT = """You are a skilled learning guide on the SkillSwap platform.
Create a personalized, practical learning roadmap for someone who wants to learn: {target_skill}

Their current skills: {current_skills}

Graph-based prerequisites from our knowledge base: {prerequisites}
Related technologies: {related_skills}

Respond with a JSON array of learning stages:
[
  {{
    "stage": 1,
    "title": "Stage title",
    "duration": "2-3 weeks",
    "topics": ["topic1", "topic2"],
    "resources": ["resource1", "resource2"],
    "skill_swap_tip": "How to use SkillSwap to learn this stage"
  }}
]

Be practical, motivating, and specific. Include 4-6 stages.
"""


class LearningPathAgent:
    def __init__(self, llm, neo4j, qdrant):
        self.llm = llm
        self.neo4j = neo4j
        self.qdrant = qdrant

    async def run(self, target_skill: str, current_skills: List[str]) -> dict:
        # Get prerequisites from Neo4j
        prerequisites = self.neo4j.get_learning_prerequisites(target_skill)
        related = self.neo4j.get_related_skills(target_skill, depth=2)

        # Filter out already known skills
        prerequisites = [p for p in prerequisites if p not in current_skills]
        related_names = [r["skill"] for r in related if r["skill"] not in current_skills]

        messages = [
            SystemMessage(content="You are a learning guide. Always respond with valid JSON array."),
            HumanMessage(content=SYSTEM_PROMPT.format(
                target_skill=target_skill,
                current_skills=", ".join(current_skills) if current_skills else "None specified",
                prerequisites=", ".join(prerequisites) if prerequisites else "None found in graph",
                related_skills=", ".join(related_names[:8]) if related_names else "None found",
            ))
        ]

        response = await self.llm.ainvoke(messages)
        try:
            content = response.content.strip().strip("```json").strip("```").strip()
            path = json.loads(content)
        except json.JSONDecodeError:
            # Fallback: return a simple structure
            path = [{"stage": 1, "title": "Getting Started", "duration": "2-4 weeks",
                      "topics": [f"Introduction to {target_skill}"],
                      "resources": ["Official documentation", "YouTube tutorials"],
                      "skill_swap_tip": f"Find a {target_skill} mentor on SkillSwap!"}]

        return {
            "path": path,
            "target_skill": target_skill,
            "prerequisites_found": prerequisites[:5],
            "related_skills": related_names[:6]
        }

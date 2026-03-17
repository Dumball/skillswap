"""
Neo4j Knowledge Graph Service
Models skill relationships and queries graph for context
"""
import os
from typing import List, Optional
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()


class Neo4jService:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "password")
        self.driver = None
        
    def connect(self):
        """Initialize driver and verify connectivity - called backgrounded"""
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            self._seed_schema()
            print("OK Neo4j connected and schema seeded")
        except Exception as e:
            self.driver = None
            print(f"WARNING: Neo4j not available (continuing without graph): {e}")

    def _seed_schema(self):
        """Seed initial skill graph relationships"""
        if not self.driver:
            return
        with self.driver.session() as session:
            # Skill hierarchy constraints and initial nodes
            session.run("CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE")
            session.run("CREATE CONSTRAINT tech_name IF NOT EXISTS FOR (t:Technology) REQUIRE t.name IS UNIQUE")

            # Core skill nodes
            skills = [
                "Python", "JavaScript", "React", "Node.js", "PostgreSQL", "Docker",
                "Machine Learning", "Data Analysis", "UI/UX Design", "Graphic Design",
                "SEO", "Content Writing", "Video Editing", "Marketing", "Java", "TypeScript"
            ]
            for skill in skills:
                session.run("MERGE (s:Skill {name: $name})", name=skill)

            # Skill relationships
            relationships = [
                ("Machine Learning", "REQUIRES", "Python"),
                ("Machine Learning", "REQUIRES", "Data Analysis"),
                ("React", "REQUIRES", "JavaScript"),
                ("Node.js", "REQUIRES", "JavaScript"),
                ("TypeScript", "REQUIRES", "JavaScript"),
                ("Docker", "REQUIRES", "Node.js"),
                ("Docker", "REQUIRES", "Python"),
                ("SEO", "RELATED_TO", "Content Writing"),
                ("SEO", "RELATED_TO", "Marketing"),
            ]
            for source, rel, target in relationships:
                session.run(
                    f"MATCH (a:Skill {{name: $source}}), (b:Skill {{name: $target}}) "
                    f"MERGE (a)-[:{rel}]->(b)",
                    source=source, target=target
                )

    def get_related_skills(self, skill_name: str, depth: int = 2) -> List[dict]:
        """Return skills related to the given skill up to given depth"""
        if not self.driver:
            return []
        with self.driver.session() as session:
            result = session.run(
                f"""
                MATCH (s:Skill {{name: $name}})-[r*1..{depth}]-(related:Skill)
                RETURN related.name as skill, type(r[0]) as relationship
                LIMIT 20
                """,
                name=skill_name
            )
            return [{"skill": r["skill"], "relationship": r["relationship"]} for r in result]

    def get_learning_prerequisites(self, target_skill: str) -> List[str]:
        """Return ordered list of prerequisites for a skill"""
        if not self.driver:
            return []
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (s:Skill {name: $name})-[:REQUIRES*]->(prereq:Skill)
                RETURN prereq.name as prerequisite
                """,
                name=target_skill
            )
            return [r["prerequisite"] for r in result]

    def link_user_skill(self, user_id: str, skill_name: str, verified: bool = False):
        """Link a user node to a skill in the graph"""
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MERGE (u:User {id: $user_id})
                MERGE (s:Skill {name: $skill})
                MERGE (u)-[:HAS_SKILL {verified: $verified}]->(s)
                """,
                user_id=user_id, skill=skill_name, verified=verified
            )

    def link_auction_skill(self, auction_id: str, skill_name: str, auction_title: str):
        """Link an auction to the skill it needs"""
        if not self.driver:
            return
        with self.driver.session() as session:
            session.run(
                """
                MERGE (a:Auction {id: $auction_id, title: $title})
                MERGE (s:Skill {name: $skill})
                MERGE (a)-[:NEEDS]->(s)
                """,
                auction_id=auction_id, title=auction_title, skill=skill_name
            )

    def close(self):
        if self.driver:
            self.driver.close()

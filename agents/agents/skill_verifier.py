"""
Skill Verification Agent
Generates technical challenges and evaluates user submissions
"""
import os
import json
import psycopg2
import asyncio
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

TEST_GENERATION_PROMPT = """Generate exactly 5 high-quality multiple choice questions and 1 practical question for the skill: {skill_name}.
Difficulty Level: {difficulty}

Rules:
- Questions must be professional, specific, and technically accurate for {skill_name}.
- Every question must be directly related to {skill_name}.
- NO dummy text, NO placeholders like 'Practice 1' or 'Option A'.
- Each MCQ must have 4 distinct options and one clear correct_answer.
- The practical question should be a real-world task or scenario.

Return ONLY valid JSON in this exact structure:
{{
  "questions": [
    {{
      "id": 1,
      "type": "mcq",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "...",
      "explanation": "..."
    }},
    ...
    {{
      "id": 6,
      "type": "practical",
      "question": "...",
      "requirements": ["...", "..."],
      "hints": ["...", "..."]
    }}
  ]
}}
"""

CATEGORY_FALLBACKS = {
    "ui/ux": [
        {"id": 1, "type": "mcq", "question": "Which principle ensures consistency across a multi-page application?", "options": ["Visual Hierarchy", "Consistency", "Complexity", "Opacity"], "correct_answer": "Consistency", "explanation": "Consistency improves usability by making behavior predictable."},
        {"id": 2, "type": "mcq", "question": "What is the primary purpose of a low-fidelity wireframe?", "options": ["Defining color palettes", "Mapping layout and structure", "Finalizing typography", "Testing backend API"], "correct_answer": "Mapping layout and structure", "explanation": "Wireframes focus on structure before visual design."},
        {"id": 3, "type": "mcq", "question": "Which term describes the ease with which users can navigate an interface?", "options": ["Learnability", "Affordance", "Discoverability", "Usability"], "correct_answer": "Usability", "explanation": "Usability is the core metric for how effective a design is for users."},
        {"id": 4, "type": "mcq", "question": "What does a 'Call to Action' (CTA) typically aim to achieve?", "options": ["Inform the user", "Prompt a specific user action", "Decorative aesthetic", "Slowing down navigation"], "correct_answer": "Prompt a specific user action", "explanation": "CTAs guide users toward a goal (e.g., 'Sign Up')."},
        {"id": 5, "type": "mcq", "question": "In mobile design, what does 'Thumb Zone' refer to?", "options": ["Fingerprint security", "The area most easily reachable by a thumb", "Screen brightness settings", "Gesture controls"], "correct_answer": "The area most easily reachable by a thumb", "explanation": "Designing for the thumb zone improves mobile ergonomics."},
        {"id": 6, "type": "practical", "question": "Design a simplified user flow for a 'Skill Exchange' request process. List 3 key screens and the primary action on each.", "requirements": ["Clear navigation", "Goal orientation", "Minimal friction"], "hints": ["Think about the user's intent", "Use action-oriented labels"]}
    ],
    "development": [
        {"id": 1, "type": "mcq", "question": "Which data structure is best for implementing a LIFO (Last-In-First-Out) behavior?", "options": ["Queue", "Stack", "Linked List", "Hash Map"], "correct_answer": "Stack", "explanation": "Stacks follow LIFO, where the last added item is the first removed."},
        {"id": 2, "type": "mcq", "question": "What does 'DRY' stand for in software development?", "options": ["Do Repeat Yourself", "Don't Repeat Yourself", "Delayed Response Yield", "Data Retrieval Yield"], "correct_answer": "Don't Repeat Yourself", "explanation": "DRY aims to reduce code repetition."},
        {"id": 3, "type": "mcq", "question": "Which HTTP method is most appropriate for updating an existing resource?", "options": ["GET", "POST", "PUT", "DELETE"], "correct_answer": "PUT", "explanation": "PUT (or PATCH) is used for updating existing resources."},
        {"id": 4, "type": "mcq", "question": "What is the purpose of a 'git merge' command?", "options": ["Creating a new branch", "Combining changes from different branches", "Deleting a remote repository", "Pushing to production"], "correct_answer": "Combining changes from different branches", "explanation": "Merge integrates history from another branch into the current one."},
        {"id": 5, "type": "mcq", "question": "What does a 404 HTTP status code indicate?", "options": ["Internal Server Error", "Unauthorized Access", "Resource Not Found", "Success"], "correct_answer": "Resource Not Found", "explanation": "404 means the requested URL was not found on the server."},
        {"id": 6, "type": "practical", "question": "Write a function interface or pseudo-code to fetch a user's skills and return them as a unique list. Handle potential empty results.", "requirements": ["Unique values", "Error handling", "Clean code"], "hints": ["Consider using a Set", "Check for null/undefined"]}
    ]
}


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

    async def generate_test(self, skill_name: str, difficulty: str = "medium") -> dict:
        """Generate a structured multi-question test with retries and category-specific fallback."""
        
        def get_fallback(skill):
            # Try to match a category
            skill_lower = skill.lower()
            if any(kw in skill_lower for kw in ["design", "ui", "ux", "visual", "interface"]):
                return CATEGORY_FALLBACKS["ui/ux"]
            if any(kw in skill_lower for kw in ["dev", "code", "programming", "software", "api", "web"]):
                return CATEGORY_FALLBACKS["development"]
            
            # General generic fallback if no category match
            return [
                {"id": 1, "type": "mcq", "question": "Which principle improves system reliability?", "options": ["Redundancy", "Complexity", "Obscurity", "Single point of failure"], "correct_answer": "Redundancy", "explanation": "Redundancy ensures backup systems are available if one fails."},
                {"id": 2, "type": "mcq", "question": "What is the benefit of modular design?", "options": ["Harder to maintain", "Easier to test and reuse", "Lower initial cost", "Better for small projects only"], "correct_answer": "Easier to test and reuse", "explanation": "Modules can be developed and tested independently."},
                {"id": 3, "type": "mcq", "question": "In team-based development, what is a primary goal of code reviews?", "options": ["Slowing down progress", "Ensuring code quality and knowledge sharing", "Assigning blame", "Micromanaging developers"], "correct_answer": "Ensuring code quality and knowledge sharing", "explanation": "Reviews help catch bugs and spread domain knowledge."},
                {"id": 4, "type": "mcq", "question": "What does scalability refer to in infrastructure?", "options": ["Security level", "Ability to handle increasing load", "Physical size of servers", "Cost efficiency"], "correct_answer": "Ability to handle increasing load", "explanation": "Scalability is about growing capacity as demand increases."},
                {"id": 5, "type": "mcq", "question": "What is 'Technical Debt'?", "options": ["Unpaid server bills", "Cost of future rework caused by choosing an easy solution now", "Standard loan for equipment", "Tax on software usage"], "correct_answer": "Cost of future rework caused by choosing an easy solution now", "explanation": "Choosing sub-optimal paths builds 'debt' that must be paid later by refactoring."},
                {"id": 6, "type": "practical", "question": f"Outline a professional approach to verifying expertise in {skill_name}. List 3 specific metrics or deliverables you would evaluate.", "requirements": ["Objectivity", "Practicality", "Relevance"], "hints": ["Think like an interviewer", "What demonstrates real mastery?"]}
            ]

        prompt = TEST_GENERATION_PROMPT.format(skill_name=skill_name, difficulty=difficulty)
        messages = [
            SystemMessage(content="You are a professional technical examiner. Always respond with ONLY valid JSON."),
            HumanMessage(content=prompt)
        ]
        
        max_retries = 2 # Increased retries
        timeout_seconds = 30

        for attempt in range(max_retries + 1):
            try:
                # LLM Call with timeout
                response = await asyncio.wait_for(self.llm.ainvoke(messages), timeout=timeout_seconds)
                content = response.content.strip()
                
                # Robust JSON extraction
                import re
                json_match = re.search(r'(\{.*\})', content, re.DOTALL)
                parse_target = json_match.group(1) if json_match else content.strip("```json").strip("```").strip()
                
                data = json.loads(parse_target)
                questions = data.get("questions", [])
                
                # Validation
                forbidden = ["practice 1", "placeholder", "option a", "example question"]
                content_lower = content.lower()
                if any(f in content_lower for f in forbidden):
                    raise ValueError("AI response contains low-quality placeholder text")

                if not questions or len(questions) < 5:
                    raise ValueError("Insufficient questions generated")
                
                # Ensure at least one practical question
                if not any(q.get("type") == "practical" for q in questions):
                    # Add a simple practical fallback to the AI result if missing
                    questions.append({
                        "id": len(questions) + 1,
                        "type": "practical",
                        "question": f"Demonstrate a real-world application of {skill_name} and explain your logic.",
                        "requirements": ["Practicality", "Clarity"],
                        "hints": ["Use a specific example", "Describe your workflow"]
                    })

                return {
                    "success": True,
                    "questions": questions
                }
                
            except Exception as e:
                print(f"Skill Test Generation Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries:
                    continue
                
                # Return category-specific fallback
                print(f"AI Generation failed. Returning category fallback for {skill_name}.")
                return {
                    "success": True,
                    "questions": get_fallback(skill_name),
                    "is_fallback": True
                }

    async def run(self, skill_name: str, user_id: Optional[str], user_answer: Optional[str]) -> dict:
        if user_answer is None:
            # Generate a challenge
            messages = [
                SystemMessage(content="You are a technical interviewer. Always respond with valid JSON."),
                HumanMessage(content=CHALLENGE_PROMPT.format(skill_name=skill_name))
            ]
            response = await self.llm.ainvoke(messages)
            try:
                # Use regex to find the first '{' and last '}' to extract JSON
                content = response.content.strip()
                json_match = re.search(r'(\{.*\})', content, re.DOTALL)
                if json_match:
                    content = json_match.group(1)
                else:
                    content = content.strip("```json").strip("```").strip()
                
                data = json.loads(content)
            except (json.JSONDecodeError, AttributeError, Exception) as e:
                print(f"Failed to parse JSON from AI: {e}")
                data = {"challenge": "Error: Unable to parse challenge format.", "example_solution_hints": [], "evaluation_criteria": []}

            return {
                "mode": "challenge",
                "challenge": data.get("challenge") if data else "Challenge unavailable",
                "evaluation_criteria": data.get("evaluation_criteria", []) if data else [],
                "hints": data.get("example_solution_hints", []) if data else [],
                "score": None,
                "passed": None,
            }
        else:
            # Evaluate user's answer
            is_full_test = False
            try:
                # Check if it's a structured test response
                test_data = json.loads(user_answer)
                if isinstance(test_data, dict) and 'mcqScore' in test_data:
                    is_full_test = True
                    mcq_score = test_data.get('mcqScore', 0)
                    practical = test_data.get('practicalResponse', [{}])[0]
                    challenge_text = practical.get('question', f"A practical {skill_name} challenge")
                    user_answer_text = practical.get('answer', '')
                    
                    # Evaluation prompt for practical part with MCQ context
                    eval_msg = f"""
                    Skill: {skill_name}
                    MCQ Score: {mcq_score}%
                    Practical Challenge: {challenge_text}
                    User's Practical Answer: {user_answer_text}
                    
                    Evaluate the practical answer and combine it with the MCQ score for a final overall result.
                    Respond ONLY with valid JSON in this exact structure:
                    {{
                        "score": <0-100 integer representing the final combined score>,
                        "passed": <true/false (true if score >= 70)>,
                        "feedback": "Detailed feedback explaining the score...",
                        "strengths": ["strength1", "strength2"],
                        "improvements": ["improvement1", "improvement2"]
                    }}
                    """
                else:
                    challenge_text = f"A practical {skill_name} challenge"
                    user_answer_text = user_answer
                    eval_msg = EVALUATION_PROMPT.format(
                        skill_name=skill_name,
                        challenge=challenge_text,
                        user_answer=user_answer_text
                    )
            except (json.JSONDecodeError, TypeError):
                challenge_text = f"A practical {skill_name} challenge"
                user_answer_text = user_answer
                eval_msg = EVALUATION_PROMPT.format(
                    skill_name=skill_name,
                    challenge=challenge_text,
                    user_answer=user_answer_text
                )

            messages = [
                SystemMessage(content="You are evaluating a skill submission. Always respond with valid JSON."),
                HumanMessage(content=eval_msg)
            ]
            response = await self.llm.ainvoke(messages)
            import re
            try:
                content = response.content.strip()
                json_match = re.search(r'(\{.*\})', content, re.DOTALL)
                if json_match:
                    content = json_match.group(1)
                else:
                    # Fallback if regex doesn't find a clear JSON block, try stripping common wrappers
                    content = content.strip("```json").strip("```").strip()
                data = json.loads(content)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Failed to parse Evaluation JSON: {e}")
                data = {"score": 0, "passed": False, "feedback": response.content, "strengths": [], "improvements": []}

            try:
                score = int(data.get("score", 0))
            except (ValueError, TypeError):
                score = 0
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

import asyncio
import os
import sys
from unittest.mock import MagicMock

# Add current dir to path to import agents
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.skill_verifier import SkillVerifierAgent

async def test_fallback_logic():
    print("Testing Skill Test Generation Fallback Logic...")
    
    # Mock LLM to always fail
    mock_llm = MagicMock()
    mock_llm.ainvoke.side_effect = Exception("AI Service Offline")
    
    agent = SkillVerifierAgent(llm=mock_llm, qdrant=MagicMock())
    
    # Test cases for categories
    test_cases = [
        {"name": "UI/UX Design", "expected": "Consistency"}, # From CATEGORY_FALLBACKS["ui/ux"]
        {"name": "React Development", "expected": "LIFO"}, # From CATEGORY_FALLBACKS["development"]
        {"name": "Cooking", "expected": "Redundancy"}, # From general fallback
    ]
    
    for case in test_cases:
        print(f"\nScanning skill: {case['name']}...")
        result = await agent.generate_test(case['name'])
        
        assert result["success"] is True
        assert result["is_fallback"] is True
        assert len(result["questions"]) >= 6
        
        # Verify content
        first_q = result["questions"][0]["question"]
        print(f"Resulting first question: {first_q}")
        
        if case['expected'] in str(result["questions"]):
            print(f"PASS: Correct fallback category matched for {case['name']}")
        else:
            print(f"FAIL: Unexpected fallback for {case['name']}")

if __name__ == "__main__":
    asyncio.run(test_fallback_logic())

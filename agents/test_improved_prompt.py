import requests
import json

def test_generate_test():
    url = "http://localhost:8000/agents/generate-test"
    payload = {
        "skill_name": "Python",
        "difficulty": "hard"
    }
    
    try:
        print(f"Calling {url} with {payload}...")
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        print("\n--- RESPONSE SUMMARY ---")
        print(f"Success: {data.get('success')}")
        if 'test' in data:
            test = data['test']
            print(f"Skill: {test.get('skill')}")
            print(f"Difficulty: {test.get('difficulty')}")
            print(f"Num Questions: {len(test.get('questions', []))}")
            
            print("\n--- FIRST MCQ ---")
            mcq = next((q for q in test['questions'] if q['type'] == 'mcq'), None)
            if mcq:
                print(f"Q: {mcq['question']}")
                print(f"Options: {mcq['options']}")
                print(f"Correct: {mcq['correct_answer']}")
                print(f"Explanation: {mcq.get('explanation', 'N/A')}")
            
            print("\n--- PRACTICAL QUESTION ---")
            practical = next((q for q in test['questions'] if q['type'] == 'practical'), None)
            if practical:
                print(f"Q: {practical['question']}")
                print(f"Hints: {practical.get('hints', [])}")
        else:
            print("ERROR: 'test' object missing in response.")
            print(json.dumps(data, indent=2))
            
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    test_generate_test()

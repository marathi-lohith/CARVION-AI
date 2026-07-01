import json

path = r"C:\Users\marat\.gemini\antigravity-ide\brain\ce6b722d-5073-4d78-ac84-bd8f743f6517\.system_generated\logs\transcript.jsonl"

with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get("content", "")
            if "capture_browser_console_logs" in str(data) or "console" in str(data).lower():
                # print summary
                print(f"Step: {data.get('step_index')} - Type: {data.get('type')}")
                if "console" in content.lower():
                    print(content[:500])
        except Exception as e:
            pass

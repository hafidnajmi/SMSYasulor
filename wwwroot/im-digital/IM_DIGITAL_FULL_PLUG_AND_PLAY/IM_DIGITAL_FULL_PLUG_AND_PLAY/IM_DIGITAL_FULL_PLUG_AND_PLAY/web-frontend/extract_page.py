import json

transcript_path = r"C:\Users\FACTIDLocal\.gemini\antigravity-ide\brain\c48fb5c9-bd35-4978-95af-13ecfba599ba\.system_generated\logs\transcript_full.jsonl"
res = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'PLANNER_RESPONSE':
                # check if there's a file view output
                pass
            if data.get('type') == 'TOOL_RESPONSE' and data.get('source') == 'SYSTEM':
                out = data.get('content', '')
                if 'const handleQcSubmit = () => {' in out:
                    res.append(out)
        except Exception as e:
            pass

print(len(res))
if res:
    with open('c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/extracted_handle.txt', 'w', encoding='utf8') as f:
        f.write(res[-1])

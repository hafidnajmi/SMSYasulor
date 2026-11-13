import json

transcript_path = r"C:\Users\FACTIDLocal\.gemini\antigravity-ide\brain\c48fb5c9-bd35-4978-95af-13ecfba599ba\.system_generated\logs\transcript_full.jsonl"
res = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'PLANNER_RESPONSE':
                for call in data.get('tool_calls', []):
                    if call.get('tool_name') in ['replace_file_content', 'multi_replace_file_content', 'write_to_file']:
                        args = call.get('arguments', {})
                        if 'page.tsx' in args.get('TargetFile', '') or 'page.tsx' in args.get('AbsolutePath', ''):
                            res.append(json.dumps(args, indent=2))
        except:
            pass

with open('c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/all_edits.txt', 'w', encoding='utf8') as f:
    f.write("\n\n=== NEXT ===\n\n".join(res))

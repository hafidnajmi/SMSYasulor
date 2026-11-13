import json

transcript_path = r"C:\Users\FACTIDLocal\.gemini\antigravity-ide\brain\c48fb5c9-bd35-4978-95af-13ecfba599ba\.system_generated\logs\transcript_full.jsonl"
res = None

# We look for a response where we viewed the file page.tsx. The output of view_file contains the lines in a format:
# <line_number>: <original_line>
# We can extract the file from that!
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'TOOL_RESPONSE' and 'page.tsx' in data.get('content', ''):
                out = data.get('content', '')
                if 'handleQcSubmit =' in out and 'renderDuoRow =' in out:
                    res = out
        except Exception as e:
            pass

if res:
    # let's parse the lines
    # lines look like:
    # 755:                             // Duo row (unchanged)
    extracted = []
    for line in res.split('\n'):
        # match digits: 
        parts = line.split(': ', 1)
        if len(parts) == 2 and parts[0].isdigit():
            extracted.append(parts[1])
    
    with open('c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/extracted_page.txt', 'w', encoding='utf8') as f:
        f.write('\n'.join(extracted))
    print('Found and extracted!')
else:
    print('Not found')

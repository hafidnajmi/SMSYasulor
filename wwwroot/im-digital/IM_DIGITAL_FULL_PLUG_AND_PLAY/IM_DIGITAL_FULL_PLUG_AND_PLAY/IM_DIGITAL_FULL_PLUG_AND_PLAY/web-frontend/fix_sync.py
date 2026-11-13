import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleOpenDoc to load from localStorage first
open_doc_old = """  const handleOpenDoc = async (doc: any) => {
    setOpenDoc(doc);
    try {
      const res = await fetch(`http://localhost:5268/api/im/${doc.id}/division/${encodeURIComponent(divisionName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.dataJson) {
          const parsed = JSON.parse(data.dataJson);"""

open_doc_new = """  const handleOpenDoc = async (doc: any) => {
    setOpenDoc(doc);
    try {
      const res = await fetch(`http://localhost:5268/api/im/${doc.id}/division/${encodeURIComponent(divisionName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.dataJson) {
          let parsed = JSON.parse(data.dataJson);
          
          // Cross-division sync using localStorage
          const localSync = localStorage.getItem(`im_sync_${doc.id}`);
          if (localSync) {
            try {
               const localParsed = JSON.parse(localSync);
               parsed = { ...parsed, ...localParsed };
            } catch (e) {}
          }"""

content = content.replace(open_doc_old, open_doc_new)

# 2. Update the POST block to also save to localStorage
post_old = """              try {
                await fetch(`http://localhost:5268/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dataJson: JSON.stringify(payload) })
                });
              } catch (err) {"""

post_new = """              try {
                localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(payload));
                await fetch(`http://localhost:5268/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dataJson: JSON.stringify(payload) })
                });
              } catch (err) {"""

content = content.replace(post_old, post_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Implemented cross-division data sync via localStorage!")

async function run() {
  const docsReq = await fetch('http://localhost:5268/api/im/active');
  const docs = await docsReq.json();
  const doc = docs.find(d => d.imCode === 'CAMERA');
  if (doc) {
    try {
      const divReq = await fetch(`http://localhost:5268/api/im/${doc.id}/division/POLE`);
      const divData = await divReq.json();
      if (divData && divData.dataJson) {
         let parsed = JSON.parse(divData.dataJson);
         if (parsed.is_filled !== undefined || parsed.status) {
           delete parsed.is_filled;
           delete parsed.status;
           await fetch(`http://localhost:5268/api/im/${doc.id}/division/POLE`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ dataJson: JSON.stringify(parsed) })
           });
           console.log('Fixed POLE for', doc.imCode);
         }
      }
    } catch (e) {
      console.error(e);
    }
  }
}
run();

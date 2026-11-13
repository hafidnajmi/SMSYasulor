async function run() {
  const docsReq = await fetch('http://localhost:5268/api/im/active');
  const docs = await docsReq.json();
  const doc = docs.find(d => d.imCode === 'CAMERA');
  if (doc) {
    try {
      const divReq = await fetch(`http://localhost:5268/api/im/${doc.id}/all-divisions`);
      const allDivs = await divReq.json();
      const mscData = allDivs.find(x => x.division === 'A.3. Appearance Packing (MSC)' || x.division === 'A.3. Appearance Packing');
      console.log('MSC Image Division exists:', !!mscData);
      if (mscData) {
         console.log('Has imageData:', !!mscData.imageData);
         console.log('Has dataJson:', !!mscData.dataJson);
         console.log('imageData length:', mscData.imageData ? mscData.imageData.length : 0);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
run();

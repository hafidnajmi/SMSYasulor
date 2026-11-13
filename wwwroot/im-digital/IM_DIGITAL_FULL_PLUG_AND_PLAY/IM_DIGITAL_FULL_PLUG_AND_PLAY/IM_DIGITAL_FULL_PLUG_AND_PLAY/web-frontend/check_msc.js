async function run() {
  const docsReq = await fetch('http://localhost:5268/api/im/active');
  const docs = await docsReq.json();
  const doc = docs.find(d => d.imCode === 'CAMERA');
  if (doc) {
    console.log("Template IM:", doc.templateIm);
    const isLipEyeMsc = doc.templateIm ? doc.templateIm.toLowerCase().includes('lip eye') : false;
    console.log("isLipEyeMsc (via rawDocument):", isLipEyeMsc);

    const divReq = await fetch(`http://localhost:5268/api/im/${doc.id}/division/UP`);
    const upDiv = await divReq.json();
    if (upDiv && upDiv.dataJson) {
       const upJson = JSON.parse(upDiv.dataJson);
       console.log("UP qcResult type:", upJson.savedQcResult?.type);
       const isLipEyeMscQc = upJson.savedQcResult?.type === 'LipEye';
       console.log("isLipEyeMsc (via qcResult):", isLipEyeMscQc);
    }
  }
}
run();

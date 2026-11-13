const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add State
if (!content.includes('const [showQcFillingModal, setShowQcFillingModal] = useState(false);')) {
    content = content.replace(
        "const [showUpModal, setShowUpModal] = useState(false);",
        "const [showUpModal, setShowUpModal] = useState(false);\n  const [showQcFillingModal, setShowQcFillingModal] = useState(false);\n  const [qcFillingData, setQcFillingData] = useState({ templateIm: 'Normal', volumeFg: '', density: '' });"
    );
}

// 2. Change the button action
// The Volume FG row button is located around line 258:
// <button onClick={() => setShowUpModal(true)} className="bg-[#1E3A8A] hover:bg-[#172554] ...
const volumeFgStart = content.indexOf('<span>Volume FG</span>');
const volumeFgEnd = content.indexOf('{/* A.4 Header */}', volumeFgStart);

if (volumeFgStart !== -1 && volumeFgEnd !== -1) {
    let volumeFgBlock = content.substring(volumeFgStart, volumeFgEnd);
    volumeFgBlock = volumeFgBlock.replace(
        "setShowUpModal(true)",
        "setShowQcFillingModal(true)"
    );
    content = content.substring(0, volumeFgStart) + volumeFgBlock + content.substring(volumeFgEnd);
}

// 3. Add the Modal UI
// Find the end of the UP modal block (which is around line 557)
const upModalEndStr = `          </div>
        )}
</div>
      </div>
    );
  }`;
const upModalEndIndex = content.indexOf(upModalEndStr);

if (upModalEndIndex !== -1) {
    const qcModalUI = `
        {/* QC Filling Modal */}
        {showQcFillingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#F8FAFC] w-[450px] rounded shadow-lg p-8 font-['Segoe_UI']">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[15px] font-bold text-[#0F172A] uppercase">FORM DATA QC FILLING</h2>
                <button onClick={() => setShowQcFillingModal(false)} className="text-gray-500 hover:text-black">✕</button>
              </div>
              
              <div className="flex flex-col space-y-4">
                <div className="flex items-center">
                  <span className="w-[120px] text-right pr-4 text-[11.5px] text-[#475569]">Template IM :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none rounded-[3px]"
                    value={qcFillingData.templateIm}
                    onChange={(e) => setQcFillingData({...qcFillingData, templateIm: e.target.value})}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Duo">Duo</option>
                    <option value="Biphase">Biphase</option>
                    <option value="LIP EYE MAKE UP REMOVER">LIP EYE MAKE UP REMOVER</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <span className="w-[120px] text-right pr-4 text-[11.5px] text-[#475569]">Volume FG (ml) :</span>
                  <input 
                    type="text"
                    placeholder="Contoh: 100"
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]"
                    value={qcFillingData.volumeFg}
                    onChange={(e) => setQcFillingData({...qcFillingData, volumeFg: e.target.value})}
                  />
                </div>
                
                <div className="flex items-center">
                  <span className="w-[120px] text-right pr-4 text-[11.5px] text-[#475569]">Density :</span>
                  <input 
                    type="text"
                    placeholder="Contoh: 1.05"
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]"
                    value={qcFillingData.density}
                    onChange={(e) => setQcFillingData({...qcFillingData, density: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-between mt-8 space-x-3">
                <button 
                  onClick={() => setShowQcFillingModal(false)}
                  className="w-[120px] h-[36px] bg-white border border-[#CBD5E1] text-[#334155] text-[12px] font-semibold hover:bg-[#F1F5F9] transition-colors rounded-[4px]"
                >
                  BATAL
                </button>
                <button 
                  onClick={() => {
                    alert('Data disimpan: ' + JSON.stringify(qcFillingData));
                    setShowQcFillingModal(false);
                  }}
                  className="flex-1 h-[36px] bg-[#005A9E] text-white text-[12px] font-bold hover:bg-[#004A83] transition-colors rounded-[4px]"
                >
                  HITUNG SIMPAN
                </button>
              </div>
            </div>
          </div>
        )}
`;

    content = content.replace(upModalEndStr, `          </div>
        )}
${qcModalUI}
</div>
      </div>
    );
  }`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done injecting QC modal!');

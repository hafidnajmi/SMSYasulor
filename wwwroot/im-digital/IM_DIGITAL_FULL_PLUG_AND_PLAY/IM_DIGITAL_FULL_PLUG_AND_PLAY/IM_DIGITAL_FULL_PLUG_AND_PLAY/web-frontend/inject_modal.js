const fs = require('fs');

const layoutPath = 'src/app/dashboard/divisions/[division]/page.tsx';
let content = fs.readFileSync(layoutPath, 'utf8');

const modalJSX = `
        {/* UP Modal */}
        {showUpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#F8FAFC] w-[480px] rounded shadow-lg p-8 font-['Segoe_UI']">
              <h2 className="text-[15px] font-bold text-[#0F172A] mb-6">UP DATA INPUT FORM</h2>
              
              <div className="flex flex-col space-y-4">
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">LINE TYPE :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                    value={upFormData.lineType}
                    onChange={(e) => setUpFormData({...upFormData, lineType: e.target.value})}
                  >
                    <option value="SACHET LINE">SACHET LINE</option>
                    <option value="BOTTLE LINE">BOTTLE LINE</option>
                    <option value="TUBE LINE">TUBE LINE</option>
                    <option value="JAR LINE">JAR LINE</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">KATEGORI :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                  >
                    <option>Pilih Kategori...</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">LINE :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                  >
                    <option>Pilih Line...</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">NUMBER OF NOZZLES :</span>
                  <div className="flex-1 h-[34px] bg-[#F1F5F9] border border-[#E2E8F0] flex items-center px-3">
                    <span className="text-[12px] font-semibold text-[#334155]">{upFormData.nozzles}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 space-x-4">
                <button 
                  onClick={() => setShowUpModal(false)}
                  className="flex-1 h-[36px] bg-white border border-[#CBD5E1] text-[#334155] text-[12px] font-semibold hover:bg-[#F1F5F9] transition-colors rounded-[4px]"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => {
                    alert('Data diproses! (Simulasi)');
                    setShowUpModal(false);
                  }}
                  className="flex-1 h-[36px] bg-[#1E3A8A] text-white text-[12px] font-bold hover:bg-[#1D4ED8] transition-colors rounded-[4px]"
                >
                  CONFIRM DATA
                </button>
              </div>
            </div>
          </div>
        )}
`;

const targetEnd = content.indexOf('</div>\n      </div>\n    );\n  }\n\n  return (');
if (targetEnd !== -1) {
    content = content.substring(0, targetEnd) + modalJSX + content.substring(targetEnd);
    fs.writeFileSync(layoutPath, content, 'utf8');
    console.log('Added modal successfully.');
} else {
    console.log('Could not find injection point');
}

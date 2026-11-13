const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `{/* UP Modal */}
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
                    onChange={(e) => handleLineTypeChange(e.target.value)}
                  >
                    <option value="BOTTLE LINE">BOTTLE LINE</option>
                    <option value="TUBE LINE">TUBE LINE</option>
                    <option value="SACHET LINE">SACHET LINE</option>
                    <option value="JAR LINE">JAR LINE</option>
                  </select>
                </div>
                
                {showKategori && (
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">KATEGORI :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                    value={upFormData.kategori}
                    onChange={(e) => setUpFormData({...upFormData, kategori: e.target.value})}
                  >
                    <option value="">Pilih Kategori...</option>
                    {kategoriOptions.map(kat => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                </div>
                )}
                
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">LINE :</span>
                  <div className="flex-1 relative">
                    <div 
                      onClick={() => setIsLineDropdownOpen(!isLineDropdownOpen)}
                      className="w-full h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{(upFormData.lines && upFormData.lines.length > 0) ? upFormData.lines.join(', ') : 'Pilih Line...'}</span>
                      <span className="text-[10px] text-[#64748B]">▼</span>
                    </div>
                    {isLineDropdownOpen && (
                      <div className="absolute top-full left-0 w-full bg-white border border-[#CBD5E1] shadow-lg max-h-[160px] overflow-y-auto z-10">
                        {lineOptions.map(l => (
                          <div 
                            key={l} 
                            onClick={() => toggleLineSelection(l)}
                            className="px-3 py-1.5 flex items-center hover:bg-[#F1F5F9] cursor-pointer"
                          >
                            <input 
                              type="checkbox" 
                              checked={(upFormData.lines || []).includes(l)}
                              readOnly
                              className="mr-2"
                            />
                            <span className="text-[12px] text-[#1E293B]">{l}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">NUMBER OF NOZZLES :</span>
                  <div className="flex-1 h-[34px] bg-[#F1F5F9] border border-[#E2E8F0] flex items-center px-3">
                    <span className="text-[12px] font-semibold text-[#334155]">{upFormData.nozzles || '2'}</span>
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
                    setIsUpDataConfirmed(true);
                    setShowUpModal(false);
                    setWarningMessage('');
                  }}
                  className="flex-1 h-[36px] bg-[#005A9E] text-white text-[12px] font-bold hover:bg-[#004A83] transition-colors rounded-[4px] ml-4"
                >
                  SIMPAN
                </button>
              </div>
            </div>
          </div>
        )}

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
                
                {qcFillingData.templateIm !== 'Duo' ? (
                  <>
                    <div className="flex items-center">
                      <span className="w-[120px] text-right pr-4 text-[11.5px] text-[#475569]">Volume FG (ml) :</span>
                      <input type="text" placeholder="Contoh: 100" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.volumeFg} onChange={(e) => setQcFillingData({...qcFillingData, volumeFg: e.target.value})} />
                    </div>
                    <div className="flex items-center">
                      <span className="w-[120px] text-right pr-4 text-[11.5px] text-[#475569]">Density :</span>
                      <input type="text" placeholder="Contoh: 1.05" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.density} onChange={(e) => setQcFillingData({...qcFillingData, density: e.target.value})} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="w-[120px] text-right pr-2 text-[11.5px] text-[#475569]">Phase 1 (Vol & Den):</span>
                      <input type="text" placeholder="Vol" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.volPhase1} onChange={(e) => setQcFillingData({...qcFillingData, volPhase1: e.target.value})} />
                      <input type="text" placeholder="Den" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.denPhase1} onChange={(e) => setQcFillingData({...qcFillingData, denPhase1: e.target.value})} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-[120px] text-right pr-2 text-[11.5px] text-[#475569]">Phase 2 (Vol & Den):</span>
                      <input type="text" placeholder="Vol" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.volPhase2} onChange={(e) => setQcFillingData({...qcFillingData, volPhase2: e.target.value})} />
                      <input type="text" placeholder="Den" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.denPhase2} onChange={(e) => setQcFillingData({...qcFillingData, denPhase2: e.target.value})} />
                    </div>
                  </>
                )}
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
                    handleQcSubmit();
                  }}
                  className="flex-1 h-[36px] bg-[#005A9E] text-white text-[12px] font-bold hover:bg-[#004A83] transition-colors rounded-[4px] ml-3"
                >
                  HITUNG SIMPAN
                </button>
              </div>
            </div>
          </div>
        )}
`;

const regex = /\{\/\* UP Modal \*\/\}.*?(?=\{\/\* Back Confirmation Modal \*\/})/s;

content = content.replace(regex, replacement + '\n      ');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Restored both modals perfectly');

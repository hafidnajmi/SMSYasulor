const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for the warning modal
if (!content.includes('const [showWarningModal, setShowWarningModal] = useState(false);')) {
    content = content.replace(
        "const [showQcFillingModal, setShowQcFillingModal] = useState(false);",
        "const [showQcFillingModal, setShowQcFillingModal] = useState(false);\n  const [showWarningModal, setShowWarningModal] = useState(false);\n  const [warningMessage, setWarningMessage] = useState('');"
    );
}

// 2. Change the button onClick to use the custom modal
content = content.replace(
    'alert("Harap isi Line Type terlebih dahulu sebelum memasukkan data Berat A.4.");',
    'setWarningMessage("Harap isi Line Type terlebih dahulu sebelum memasukkan data Berat A.4.");\n                              setShowWarningModal(true);'
);

// 3. Inject the UI for the warning modal
const upModalEndStr = `          </div>
        )}
`;

const warningModalUI = `
        {/* Windows-style Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20">
            <div className="bg-[#F3F3F3] w-[420px] rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-['Segoe_UI'] flex flex-col overflow-hidden border border-[#D1D1D1]">
              {/* Title Bar */}
              <div className="flex justify-between items-center px-3 py-2 bg-white border-b border-[#E5E5E5]">
                <div className="flex items-center space-x-2">
                  <span className="text-[12px]">📝</span>
                  <span className="text-[12px] text-[#000000]">Notification</span>
                </div>
                <button 
                  onClick={() => setShowWarningModal(false)}
                  className="hover:bg-[#E5E5E5] w-[24px] h-[24px] flex items-center justify-center rounded-[4px] text-[12px]"
                >
                  ✕
                </button>
              </div>
              
              {/* Body */}
              <div className="flex items-start px-6 py-6 bg-[#F3F3F3]">
                <div className="text-[28px] mr-4 leading-none">⚠️</div>
                <div className="text-[13px] text-[#000000] pt-1">
                  {warningMessage}
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex justify-end px-6 pb-6 bg-[#F3F3F3]">
                <button 
                  onClick={() => setShowWarningModal(false)}
                  className="px-6 py-1 bg-white border border-[#CCCCCC] rounded-[4px] text-[12px] hover:bg-[#E5E5E5] transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
`;

if (content.includes('{/* QC Filling Modal */}')) {
    content = content.replace('{/* QC Filling Modal */}', warningModalUI + '\n        {/* QC Filling Modal */}');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done injecting Warning modal!');

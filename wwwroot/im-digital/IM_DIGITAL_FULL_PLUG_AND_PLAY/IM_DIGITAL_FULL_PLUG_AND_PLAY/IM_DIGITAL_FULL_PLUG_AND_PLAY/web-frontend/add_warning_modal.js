const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const warningModalBlock = `
        {/* Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="bg-white rounded shadow-xl w-[380px] border border-[#CBD5E1] font-['Segoe_UI'] flex flex-col">
              <div className="flex justify-between items-center px-4 py-2 bg-[#F3F2F1] border-b border-[#E1DFDD]">
                <h2 className="text-[12px] text-black">Pemberitahuan</h2>
                <button onClick={() => setShowWarningModal(false)} className="text-[#605E5C] hover:bg-[#E1DFDD] px-2 py-1 text-[10px]">✕</button>
              </div>
              <div className="p-6 flex items-start space-x-4 bg-white">
                <div className="text-[28px] text-[#FFB900]">⚠️</div>
                <div className="text-[12px] text-black leading-snug pt-2">
                  {warningMessage}
                </div>
              </div>
              <div className="px-4 py-3 bg-[#F3F2F1] border-t border-[#E1DFDD] flex justify-end">
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="px-6 py-1 bg-white border border-[#8A8886] hover:border-[#323130] text-black text-[12px] focus:outline-none"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
`;

if (!c.includes("Warning Modal")) {
  c = c.replace("{/* Back Confirmation Modal */}", warningModalBlock + "\n        {/* Back Confirmation Modal */}");
  fs.writeFileSync(p, c, 'utf8');
  console.log('Added warning modal');
} else {
  console.log('Warning modal already exists');
}

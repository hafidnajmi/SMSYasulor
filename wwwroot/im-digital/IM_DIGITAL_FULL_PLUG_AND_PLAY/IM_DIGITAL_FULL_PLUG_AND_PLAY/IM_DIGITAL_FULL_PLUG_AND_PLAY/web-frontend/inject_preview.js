const fs = require('fs');

const layoutPath = 'src/app/dashboard/divisions/[division]/page.tsx';
const dashboardPath = 'src/app/dashboard/page.tsx';

let layoutContent = fs.readFileSync(layoutPath, 'utf8');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const previewStart = dashboardContent.indexOf('{/* Document Preview Container');
const previewEnd = dashboardContent.indexOf('</div>\n        </div>\n      ) : (');
const previewBlock = dashboardContent.substring(previewStart, previewEnd + 6); // include closing div

const modifiedPreviewBlock = previewBlock.replace(/previewDoc/g, 'openDoc.rawDocument');

layoutContent = layoutContent.replace(
  'const [search, setSearch] = useState("");',
  'const [search, setSearch] = useState("");\n  const [openDoc, setOpenDoc] = useState<any>(null);'
);

layoutContent = layoutContent.replace(
  /onClick=\{\(\) \=\> alert\('Fitur Open[^']+'\)\}/g,
  'onClick={() => setOpenDoc(doc)}'
);

const returnIndex = layoutContent.indexOf('return (');
const insertPreview = `
  if (openDoc) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#F3F4F6] p-6 overflow-auto font-['Segoe_UI'] h-full">
        <div className="flex space-x-2 mb-6 self-start shrink-0">
          <button 
            onClick={() => setOpenDoc(null)}
            className="bg-white border border-[#D1D5DB] px-4 py-1.5 rounded-[4px] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] flex items-center space-x-2 shadow-sm"
          >
            <span>← Back</span>
          </button>
          <button 
            onClick={() => { alert('Data berhasil disimpan (Mode Preview Web).'); setOpenDoc(null); }}
            className="bg-white border border-[#22C55E] text-[#16A34A] px-4 py-1.5 rounded-[4px] text-[13px] font-semibold hover:bg-[#DCFCE7] flex items-center space-x-2 shadow-sm"
          >
            <span>💾 Save & Close</span>
          </button>
        </div>
        ${modifiedPreviewBlock}
      </div>
    );
  }

`;

layoutContent = layoutContent.slice(0, returnIndex) + insertPreview + layoutContent.slice(returnIndex);

fs.writeFileSync(layoutPath, layoutContent, 'utf8');
console.log('Successfully injected preview block');

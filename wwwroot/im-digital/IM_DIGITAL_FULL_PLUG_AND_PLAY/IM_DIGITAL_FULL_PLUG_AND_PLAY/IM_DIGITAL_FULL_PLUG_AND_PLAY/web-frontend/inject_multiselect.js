const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. We need to add state for the multi-select dropdown toggle
// Check if isLineDropdownOpen already exists
if (!content.includes('const [isLineDropdownOpen, setIsLineDropdownOpen] = useState(false);')) {
    content = content.replace(
        "const [upFormData, setUpFormData] = useState({ lineType: 'BOTTLE LINE', kategori: '', line: '', nozzles: '2' });",
        "const [upFormData, setUpFormData] = useState({ lineType: 'BOTTLE LINE', kategori: '', lines: [] as string[], nozzles: '' });\n  const [isLineDropdownOpen, setIsLineDropdownOpen] = useState(false);"
    );
}

// 2. We need to update the logic block to handle lines array
const oldLogicStart = content.indexOf('  const handleLineTypeChange = (newLineType: string) => {');
const oldLogicEnd = content.indexOf('const kategoriOptions = getKategoriOptions(upFormData.lineType);');
if (oldLogicStart !== -1 && oldLogicEnd !== -1) {
    const newLogic = `
  const handleLineTypeChange = (newLineType: string) => {
    setUpFormData({
      ...upFormData,
      lineType: newLineType,
      kategori: '',
      lines: [],
      nozzles: ''
    });
    setIsLineDropdownOpen(false);
  };

  const toggleLineSelection = (lineName: string) => {
    let newLines = [...(upFormData.lines || [])];
    if (newLines.includes(lineName)) {
      newLines = newLines.filter(l => l !== lineName);
    } else {
      newLines.push(lineName);
    }
    
    // Sort logic (optional, but good for UX)
    const lineOptionsOrder = getLineOptions(upFormData.lineType);
    newLines.sort((a, b) => lineOptionsOrder.indexOf(a) - lineOptionsOrder.indexOf(b));

    const newNozzles = newLines.map(l => getNozzleCount(l).toString()).join(', ');

    setUpFormData({
      ...upFormData,
      lines: newLines,
      nozzles: newNozzles
    });
  };

  `;
    content = content.substring(0, oldLogicStart) + newLogic + content.substring(oldLogicEnd);
}

// 3. We need to update the UI for the LINE dropdown and the yellow box rendering
// Old line dropdown UI:
const oldLineUI = `<div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">LINE :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                    value={upFormData.line}
                    onChange={(e) => handleLineChange(e.target.value)}
                  >
                    <option value="">Pilih Line...</option>
                    {lineOptions.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>`;

const newLineUI = `<div className="flex items-center">
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
                </div>`;

content = content.replace(oldLineUI, newLineUI);

// Replace upFormData.line in the yellow box:
content = content.replace(
  '<div className="text-[#1E3A8A] font-extrabold text-[15px] mt-3 leading-tight">{upFormData.line || \'-\'}</div>',
  '<div className="text-[#1E3A8A] font-extrabold text-[15px] mt-3 leading-tight">{(upFormData.lines && upFormData.lines.length > 0) ? upFormData.lines.join(\', \') : \'-\'}</div>'
);

// Fix the default value of NUMBER OF NOZZLES
content = content.replace(
  "{upFormData.line === '' ? '2' : upFormData.nozzles}",
  "{(upFormData.lines && upFormData.lines.length > 0) ? upFormData.nozzles : '2'}"
);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Multi-select added!');

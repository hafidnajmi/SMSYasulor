const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The replacement logic block
const logicBlock = `
  const getNozzleCount = (lineName: string) => {
    if (!lineName) return 2;
    switch (lineName) {
      // Bottle Line
      case 'B5': case 'B16': return 1;
      case 'B10': case 'B11': return 5;
      case 'B17': case 'B18': case 'B24': return 6;
      case 'B20': case 'B21': case 'B22': return 8;
      case 'B19': return 10;
      // Sachet Line
      case 'S6': case 'S7': case 'S8': case 'S9': case 'S10': return 1;
      case 'S1': case 'S14': case 'S15': case 'S16': return 2;
      case 'S17': case 'S18': case 'S19': case 'S20': return 4;
      // Tube Line
      case 'T1': case 'T3': case 'T4': case 'T5': case 'T6': case 'T7': case 'T8': return 1;
      case 'T9': case 'T12': return 2;
      // Jar Line
      case 'J3': return 2;
      case 'J4': case 'J5': return 6;
      default: return 1;
    }
  };

  const getLineOptions = (lineType: string) => {
    switch (lineType) {
      case 'BOTTLE LINE': return ['B5', 'B10', 'B11', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21', 'B22', 'B24'];
      case 'SACHET LINE': return ['S1', 'S6', 'S7', 'S8', 'S9', 'S10', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20'];
      case 'TUBE LINE': return ['T1', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T12'];
      case 'JAR LINE': return ['J3', 'J4', 'J5'];
      default: return [];
    }
  };

  const getKategoriOptions = (lineType: string) => {
    switch (lineType) {
      case 'BOTTLE LINE': return ['Conditioner', 'Shampoo', 'Micellar', 'Skincare'];
      case 'SACHET LINE': return ['Sachet Spout', 'Sachet Non Spout'];
      default: return [];
    }
  };

  const handleLineTypeChange = (newLineType: string) => {
    setUpFormData({
      ...upFormData,
      lineType: newLineType,
      kategori: '',
      line: '',
      nozzles: '2' // default or reset
    });
  };

  const handleLineChange = (newLine: string) => {
    setUpFormData({
      ...upFormData,
      line: newLine,
      nozzles: getNozzleCount(newLine).toString()
    });
  };

  const kategoriOptions = getKategoriOptions(upFormData.lineType);
  const showKategori = kategoriOptions.length > 0;
  const lineOptions = getLineOptions(upFormData.lineType);
`;

// Insert the logic block after setUpFormData
content = content.replace(
  "const [upFormData, setUpFormData] = useState({ lineType: 'SACHET LINE', kategori: '', line: '', nozzles: '2' });",
  "const [upFormData, setUpFormData] = useState({ lineType: 'BOTTLE LINE', kategori: '', line: '', nozzles: '2' });\n" + logicBlock
);

// Replace the JSX for the form fields
const oldFormJSXStart = content.indexOf('<div className="flex flex-col space-y-4">');
const oldFormJSXEnd = content.indexOf('<div className="flex justify-between mt-8 space-x-4">');
const newFormJSX = `
              <div className="flex flex-col space-y-4">
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">LINE TYPE :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                    value={upFormData.lineType}
                    onChange={(e) => handleLineTypeChange(e.target.value)}
                  >
                    <option value="SACHET LINE">SACHET LINE</option>
                    <option value="BOTTLE LINE">BOTTLE LINE</option>
                    <option value="TUBE LINE">TUBE LINE</option>
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
                </div>
                
                <div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">NUMBER OF NOZZLES :</span>
                  <div className="flex-1 h-[34px] bg-[#F1F5F9] border border-[#E2E8F0] flex items-center px-3">
                    <span className="text-[12px] font-semibold text-[#334155]">
                      {upFormData.line === '' ? '2' : upFormData.nozzles}
                    </span>
                  </div>
                </div>
              </div>

              `;

content = content.substring(0, oldFormJSXStart) + newFormJSX + content.substring(oldFormJSXEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');

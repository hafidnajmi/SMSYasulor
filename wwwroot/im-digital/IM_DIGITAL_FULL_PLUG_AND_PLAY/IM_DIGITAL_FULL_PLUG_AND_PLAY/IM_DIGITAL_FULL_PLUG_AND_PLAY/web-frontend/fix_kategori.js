const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const wrongKategori = `<div className="flex items-center">
                  <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">Kategori :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                    value={upFormData.kategori}
                    onChange={(e) => setUpFormData({...upFormData, kategori: e.target.value})}
                  >
                    <option value="">Pilih Kategori...</option>
                    <option value="Conditioner">Conditioner</option>
                    <option value="Cream">Cream</option>
                    <option value="Foam">Foam</option>
                    <option value="Gel">Gel</option>
                    <option value="Liquid">Liquid</option>
                    <option value="Lotion">Lotion</option>
                    <option value="Mascara">Mascara</option>
                    <option value="Serum">Serum</option>
                    <option value="Shampoo">Shampoo</option>
                  </select>
                </div>`;

const correctKategori = `{showKategori && (
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
                )}`;

content = content.replace(wrongKategori, correctKategori);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Kategori dynamically!');

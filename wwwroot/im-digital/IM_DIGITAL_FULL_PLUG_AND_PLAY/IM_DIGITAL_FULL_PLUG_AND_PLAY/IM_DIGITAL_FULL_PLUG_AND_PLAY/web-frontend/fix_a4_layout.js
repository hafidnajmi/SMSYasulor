const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ubah background luar kertas dan padding agar identik dengan background PyQt6 #F1F5F9
const wrapperSearch = `className="flex-1 flex flex-col min-h-0 bg-[#F3F4F6] p-6 overflow-auto font-['Segoe_UI'] h-full"`;
const wrapperReplace = `className="flex-1 flex flex-col min-h-0 bg-[#F1F5F9] p-[40px] items-center overflow-auto font-['Segoe_UI'] h-full"`;
if (content.includes(wrapperSearch)) {
    content = content.replace(wrapperSearch, wrapperReplace);
}

// 2. Perbesar ukuran kertas A4 dari 1030px menjadi 1400px, beri padding 30px, dan tambahkan efek Shadow/Border versi Python
const paperSearch = `className="bg-white mx-auto w-[1030px] max-w-[1030px] shrink-0 shadow-md font-['Segoe_UI'] text-[12px] text-black p-[20px] print:p-0 print:shadow-none print:w-[29.7cm] print:max-w-none"`;
const paperReplace = `className="bg-white mx-auto w-[1400px] max-w-[1400px] shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-black font-['Segoe_UI'] text-[12px] text-black p-[30px] print:p-0 print:shadow-none print:w-[29.7cm] print:max-w-none"`;
if (content.includes(paperSearch)) {
    content = content.replace(paperSearch, paperReplace);
}

// 3. Agar tombol Back dan Save & Close tetap rata kiri/kanan seukuran kertas (1400px)
const toolbarSearch = `className="flex space-x-2 mb-6 self-start shrink-0"`;
const toolbarReplace = `className="flex space-x-2 mb-6 w-[1400px] shrink-0 justify-start"`;
if (content.includes(toolbarSearch)) {
    content = content.replace(toolbarSearch, toolbarReplace);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("✅ Berhasil! Tampilan kertas A4 sekarang sudah menyesuaikan dengan versi Python (IM DIGITAL NEW REV 1.8.6).");

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Kunci kertas A4 agar tingginya persis 1020px dan jadikan Flex Container
const paperSearch = `className="bg-white mx-auto w-[1400px] max-w-[1400px] shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-black font-['Segoe_UI'] text-[12px] text-black p-[30px] print:p-0 print:shadow-none print:w-[29.7cm] print:max-w-none"`;
const paperReplace = `className="bg-white mx-auto w-[1400px] max-w-[1400px] h-[1020px] flex flex-col shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-black font-['Segoe_UI'] text-[12px] text-black p-[30px] print:p-0 print:shadow-none print:w-[29.7cm] print:max-w-none"`;
if (content.includes(paperSearch)) {
    content = content.replace(paperSearch, paperReplace);
}

// 2. Beri sifat flex-1 ke Main Outer Container agar merenggang penuh ke 1020px
const mainOuterSearch = `{/* Main Outer Container matching Desktop App */}\n          <div className="border border-black">`;
const mainOuterReplace = `{/* Main Outer Container matching Desktop App */}\n          <div className="border border-black flex flex-col flex-1 min-h-0">`;
if (content.includes(mainOuterSearch)) {
    content = content.replace(mainOuterSearch, mainOuterReplace);
}

// 3. Form Sections juga diatur merenggang penuh
const formSectionSearch = `{/* Form Sections Flex Layout */}\n            <div className="flex w-full">`;
const formSectionReplace = `{/* Form Sections Flex Layout */}\n            <div className="flex w-full flex-1 min-h-0">`;
if (content.includes(formSectionSearch)) {
    content = content.replace(formSectionSearch, formSectionReplace);
}

// 4. Pastikan Left Column dapat menyusut dan menyesuaikan tinggi
const leftColSearch = `className="w-[670px] shrink-0 border-r border-black flex flex-col"`;
const leftColReplace = `className="w-[670px] shrink-0 border-r border-black flex flex-col flex-1 min-h-0"`;
if (content.includes(leftColSearch)) {
    content = content.replace(leftColSearch, leftColReplace);
}

// 5. UBAH SEMUA A.1 - A.3 MENJADI flex-1 min-h-0 agar ukurannya otomatis, alih-alih style hardcode height
const a123Search = `<div className="bg-[#EAEFE3] border-b border-black" style={{ height: appearanceHeight }}></div>`;
const a123Replace = `<div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>`;
// Replace semua instans
content = content.replace(new RegExp(a123Search.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'g'), a123Replace);

fs.writeFileSync(filePath, content, 'utf8');
console.log("✅ Berhasil! Kertas A4 sekarang dikunci pada h-[1020px] dan ruang A.1, A.2, A.3 akan otomatis melar/menyusut sesuai template.");

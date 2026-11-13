const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const wrongDropdown = `{isLineDropdownOpen && (
                      <div className="absolute top-full left-0 w-full bg-white border border-[#CBD5E1] shadow-lg max-h-[160px] overflow-y-auto z-10">`;

const correctDropdown = `{isLineDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-0" onClick={() => setIsLineDropdownOpen(false)}></div>
                        <div className="absolute top-full left-0 w-full bg-white border border-[#CBD5E1] shadow-lg max-h-[160px] overflow-y-auto z-10">`;

const wrongDropdownEnd = `</div>
                    )}`;

const correctDropdownEnd = `</div>
                      </>
                    )}`;

content = content.replace(wrongDropdown, correctDropdown);
content = content.replace(
    /<\/div>\s*\}\)/,
    "</div>\n                      </>\n                    })"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed dropdown click outside!');

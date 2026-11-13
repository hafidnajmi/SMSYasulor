const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

let cleaned = c.replace(/<\\/div>\s*<\/div>\s*<div className="flex flex-col items-center justify-start pt-\[2px\] relative">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\);/g, '</div>\n                              </div>\n                            );');

// Also BiphaseVolRow
cleaned = cleaned.replace(/<\\/div>\s*<\/div>\s*<div className="flex flex-col items-center justify-start pt-\[2px\] relative">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\);/g, '</div>\n                                  </div>\n                                );');

fs.writeFileSync(p, cleaned, 'utf8');
console.log('Cleaned up!');

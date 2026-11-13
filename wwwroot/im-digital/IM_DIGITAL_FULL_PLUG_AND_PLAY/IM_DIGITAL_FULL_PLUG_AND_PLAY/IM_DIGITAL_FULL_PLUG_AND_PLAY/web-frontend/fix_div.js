const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The missing </div> should be right before {/* Back Confirmation Modal */}
content = content.replace(
  "{/* Back Confirmation Modal */}",
  "</div>\n        {/* Back Confirmation Modal */}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed missing div closing tag');

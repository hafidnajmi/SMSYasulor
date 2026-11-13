const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const wrongLineType = `<option value="BOTTLE LINE">BOTTLE LINE</option>
                    <option value="TUBE LINE">TUBE LINE</option>
                    <option value="SACHET LINE">SACHET LINE</option>
                  </select>`;

const correctLineType = `<option value="BOTTLE LINE">BOTTLE LINE</option>
                    <option value="TUBE LINE">TUBE LINE</option>
                    <option value="SACHET LINE">SACHET LINE</option>
                    <option value="JAR LINE">JAR LINE</option>
                  </select>`;

content = content.replace(wrongLineType, correctLineType);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed JAR LINE in Line Type dropdown!');

const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const regex = /const appearanceHeight = \(qcResult && \(qcResult\.type === 'Duo' \|\| qcResult\.type === 'Biphase'\)\) \? '196px' : '220px';/;
const replacement = `let appearanceHeight = '220px';
                if (qcResult) {
                  if (qcResult.type === 'Biphase' || qcResult.type === 'LIP EYE MAKE UP REMOVER') {
                    appearanceHeight = '130px';
                  } else if (qcResult.type === 'Duo') {
                    appearanceHeight = '159px';
                  }
                }`;

if (c.match(regex)) {
  c = c.replace(regex, replacement);
  fs.writeFileSync(p, c, 'utf8');
  console.log('Successfully updated appearanceHeight');
} else {
  console.log('Regex did not match');
}

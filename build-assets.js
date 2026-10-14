const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, 'assets', 'mec-letterhead.jpeg');
if (fs.existsSync(imgPath)) {
  const b64 = fs.readFileSync(imgPath).toString('base64');
  const jsContent = `window.MEC_LETTERHEAD_BASE64 = "data:image/jpeg;base64,${b64}";\n`;
  fs.writeFileSync(path.join(__dirname, 'assets', 'mec-letterhead-base64.js'), jsContent);
  console.log('Successfully created assets/mec-letterhead-base64.js (size: ' + b64.length + ' chars)');
}

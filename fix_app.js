const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const oldInitSessionStart = code.indexOf('// Create initial transaction session with randomized store/invoice if enabled');
const oldInitSessionEnd = code.indexOf('// Update session handler');
if (oldInitSessionStart > -1 && oldInitSessionEnd > -1) {
  code = code.substring(0, oldInitSessionStart) + code.substring(oldInitSessionEnd);
  fs.writeFileSync('src/App.tsx', code);
}

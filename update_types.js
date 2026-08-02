const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

code = code.replace(/storeNamesList: string\[\];/, "storeNamesList: string[];\n  nagadTopLogoUrl?: string;\n  nagadInputLogoUrl?: string;\n  instructionsImageUrl?: string;");

code = code.replace(/gatewayTag: string;\n}/, "gatewayTag: string;\n  password?: string;\n  createdAt?: number;\n}");

fs.writeFileSync('src/types.ts', code);

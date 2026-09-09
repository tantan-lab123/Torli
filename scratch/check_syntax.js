const ts = require('typescript');
const fs = require('fs');
const content = fs.readFileSync('app/admin/page.tsx', 'utf8');
const sf = ts.createSourceFile('app/admin/page.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log('Diagnostics count:', sf.parseDiagnostics.length);
sf.parseDiagnostics.slice(0, 10).forEach(d => {
  const pos = sf.getLineAndCharacterOfPosition(d.start);
  console.log(`Line ${pos.line + 1}, col ${pos.character + 1}: ${d.messageText}`);
});

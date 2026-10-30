import fs from 'node:fs';
import path from 'node:path';

const distDocs = path.resolve('dist/docs');
const srcFile = path.resolve('src/docs/openapi.json');
const destFile = path.resolve(distDocs, 'openapi.json');

if (fs.existsSync(srcFile)) {
  fs.mkdirSync(distDocs, { recursive: true });
  fs.copyFileSync(srcFile, destFile);
  console.log('✅ OpenAPI specification copied to dist/docs/openapi.json');
}

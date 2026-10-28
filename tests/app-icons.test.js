const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const applications = [
  { id: 'gerencial', manifest: 'manifest.webmanifest', page: 'index.html', icon: 'icons/gerencial-icon-512.png', master: 'icons/gerencial-app.svg' },
  { id: 'resultado', manifest: 'resultados/manifest.webmanifest', page: 'resultados/index.html', icon: 'resultados/icons/icon-512.png', master: 'resultados/icons/resultado-app.svg' },
  { id: 'estoque', manifest: 'estoque/manifest.webmanifest', page: 'estoque/index.html', icon: 'estoque/icons/icon-512.png', master: 'estoque/icons/estoque-app.svg' }
];
const pngSizes = new Set();
for (const app of applications) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, app.manifest), 'utf8'));
  const page = fs.readFileSync(path.join(root, app.page), 'utf8');
  assert.ok(manifest.name, `${app.id} has a PWA name`);
  assert.ok(page.includes('manifest.webmanifest'), `${app.id} page links its manifest`);
  assert.ok(fs.existsSync(path.join(root, app.master)), `${app.id} has editable SVG artwork`);
  const anyIcon = manifest.icons.find(icon => icon.sizes === '512x512' && (!icon.purpose || icon.purpose === 'any'));
  const maskIcon = manifest.icons.find(icon => icon.sizes === '512x512' && icon.purpose === 'maskable');
  assert.ok(anyIcon && maskIcon, `${app.id} manifest declares 512px any and maskable icons`);
  for (const entry of [anyIcon, maskIcon]) {
    const bytes = fs.readFileSync(path.join(path.dirname(path.join(root, app.manifest)), entry.src));
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', `${app.id} ${entry.purpose} icon is PNG`);
    assert.equal(bytes.readUInt32BE(16), 512, `${app.id} ${entry.purpose} icon width`);
    assert.equal(bytes.readUInt32BE(20), 512, `${app.id} ${entry.purpose} icon height`);
  }
  pngSizes.add(fs.readFileSync(path.join(root, app.icon)).toString('base64'));
}
assert.equal(pngSizes.size, 3, 'Gerencial, Resultado e Estoque têm capas diferentes');
assert.ok(fs.existsSync(path.join(root, 'icons/avenida-logo-oficial-circular.png')), 'A logo oficial do site permanece preservada');
const stock = fs.readFileSync(path.join(root, 'estoque/index.html'), 'utf8');
assert.match(stock, /fiscal-wizard-modal[^}]*background:linear-gradient\(120deg,#14171a,#292f35\)/, 'Fiscalização usa o grafite do sistema');
assert.match(stock, /fiscal-wizard-score[^}]*--progress/, 'Fiscalização mantém indicador visual de progresso');
const resultSw = fs.readFileSync(path.join(root, 'resultados/sw-pwa.js'), 'utf8');
assert.match(resultSw, /av-resultados-v104-icones-finais-20261028/, 'A versão do cache atualiza as capas do Resultado');
console.log('PASS — variantes baseadas na marca AV, arquivos PWA válidos e identidade do site preservada');

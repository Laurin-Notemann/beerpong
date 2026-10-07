import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The deployed model is an immutable, evaluated release, never a checkpoint trained by CI.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const release = JSON.parse(await readFile(resolve(root, 'ml/cups/release.json'), 'utf8'));
if (
    !release.url.startsWith('https://github.com/Laurin-Notemann/beerpong/releases/download/') ||
    !/^[a-f0-9]{64}$/.test(release.sha256)
)
    throw Error('Invalid cup model release');
const response = await fetch(release.url);
if (!response.ok) throw Error(`Cup model bundle HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash('sha256').update(bytes).digest('hex') !== release.sha256)
    throw Error('Cup model bundle checksum mismatch');
const destination = resolve(root, 'apps/web/public/vision');
await mkdir(destination, { recursive: true });
const archive = resolve(destination, 'model.tar.gz');
await writeFile(archive, bytes);
const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
if (entries.some((name) => !/^(model.json|MODEL-LICENSE.txt|cups-[a-f0-9]{16}\.onnx)$/.test(name)))
    throw Error('Unexpected file in cup model bundle');
execFileSync('tar', ['-xzf', archive, '-C', destination]);
const manifest = JSON.parse(await readFile(resolve(destination, 'model.json'), 'utf8'));
if (!/^cups-[a-f0-9]{16}\.onnx$/.test(manifest.url)) throw Error('Invalid cup model filename');
const model = await readFile(resolve(destination, manifest.url));
if (
    model.length !== manifest.size ||
    createHash('sha256').update(model).digest('hex') !== manifest.sha256
)
    throw Error('Cup model checksum mismatch');
await import('node:fs/promises').then(({ unlink }) => unlink(archive));
console.log(`Cup model ${manifest.id}: ${model.length} bytes, verified`);

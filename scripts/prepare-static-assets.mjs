import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repositoryRoot, 'data', 'eso-set-catalog');
const destination = path.join(repositoryRoot, 'public', 'eso-set-catalog');

await mkdir(path.dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true, force: true });

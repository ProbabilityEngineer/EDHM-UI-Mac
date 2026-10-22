import fs from 'node:fs';
import path from 'node:path';

// Upstream's v22.02 hotfix retires these shaders. Keep recoverable backups,
// rather than importing the Windows-path deletion jobs into the macOS installer.
export function retireObsoleteOdysseyShaders(shaderDirectory) {
  for (const filename of ['044c584d09f94c08-ps.txt', '4b6d9d99c00a0e52-ps.txt']) {
    const source = path.join(shaderDirectory, filename);
    if (!fs.existsSync(source)) continue;
    let destination = `${source}.pre-v22.04.bak`;
    let suffix = 1;
    while (fs.existsSync(destination)) destination = `${source}.pre-v22.04.${suffix++}.bak`;
    fs.renameSync(source, destination);
  }
}

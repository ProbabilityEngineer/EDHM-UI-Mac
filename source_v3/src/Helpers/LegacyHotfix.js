import fs from 'node:fs';
import path from 'node:path';

function exists(filename) {
  try { fs.lstatSync(filename); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

// Only curated, game-relative backup jobs are supported. Never expand globs,
// delete user themes/DLLs, or mutate templates shared by multiple instances.
export function runLegacyHotfix(jobs, instances) {
  const results = [];
  for (const instance of instances) {
    const gamePath = Array.isArray(instance.path) ? instance.path[0] : instance.path;
    if (typeof gamePath !== 'string' || !gamePath) continue;
    const game = { ED_Odissey: 'ODYSSEY', ED_Horizons: 'HORIZONS' }[instance.key];
    for (const job of jobs) {
      if (!game || job.game !== game) continue;
      if (job.action !== 'BACKUP') throw new Error(`Unsupported hotfix action: ${job.action}`);
      const relative = job.file_path.replace(/^%GAME_PATH%[\\/]/, '');
      const parts = relative.split(/[\\/]/);
      if (relative === job.file_path || parts.some(part => !part || part === '.' ||
          part === '..' || /[:*?%]/.test(part))) {
        throw new Error(`Unsafe hotfix path: ${job.file_path}`);
      }
      const source = path.join(gamePath, ...parts);
      if (!exists(source)) continue;
      // Outside EDHM-ini so recursive INI includes cannot load archived mods.
      const root = path.join(gamePath, 'EDHM-UI-Backups', 'legacy-hotfix');
      let parent = gamePath;
      for (const part of ['EDHM-UI-Backups', 'legacy-hotfix', ...parts.slice(0, -1)]) {
        parent = path.join(parent, part);
        if (exists(parent)) {
          const stat = fs.lstatSync(parent);
          if (stat.isSymbolicLink() || !stat.isDirectory()) {
            throw new Error(`Unsafe hotfix backup directory: ${parent}`);
          }
        } else fs.mkdirSync(parent);
      }
      const base = path.join(root, ...parts);
      let destination = base, suffix = 1;
      while (exists(destination)) destination = `${base}.${suffix++}`;
      // Renames symlinks themselves; never traverses/deletes their targets.
      try {
        fs.renameSync(source, destination);
      } catch (error) {
        if (error.code !== 'EXDEV') throw error;
        // CrossOver installations and external app data can be on different
        // volumes. Preserve a full backup before removing the obsolete source.
        fs.cpSync(source, destination, {
          recursive: true, dereference: false, verbatimSymlinks: true,
          errorOnExist: true, force: false,
        });
        fs.rmSync(source, { recursive: true });
      }
      results.push({ instance: instance.instance, source, destination });
    }
  }
  return results;
}

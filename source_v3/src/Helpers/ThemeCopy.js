import fs from 'node:fs';
import path from 'node:path';

export function validateThemeName(value) {
  const name = typeof value === 'string' ? value.trim().normalize('NFC') : '';
  if (!name || name.length > 120 || /[<>:"/\\|?*\x00-\x1f]/.test(name) ||
      /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name) ||
      name.toLowerCase() === 'current settings') {
    throw new Error('Choose a valid theme name (not Current Settings or a path).');
  }
  return name;
}

// Reserve a new directory exclusively: neither existing themes nor symlinks
// may be overwritten. This deliberately does not modify the current game files.
export function saveThemeCopy(themesRoot, current, requestedName) {
  const name = validateThemeName(requestedName);
  fs.mkdirSync(themesRoot, { recursive: true });
  if (fs.readdirSync(themesRoot).some(entry =>
    entry.normalize('NFC').toLowerCase() === name.toLowerCase())) {
    throw new Error(`A theme named '${name}' already exists. Choose a different name.`);
  }
  const destination = path.join(themesRoot, name);
  const copy = JSON.parse(JSON.stringify(current));
  copy.name = name;
  copy.credits = { ...copy.credits, theme: name };
  copy.path = '';
  fs.mkdirSync(destination);
  try {
    fs.writeFileSync(path.join(destination, 'ThemeSettings.json'),
      JSON.stringify(copy, null, 4), { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    // Only remove our empty reservation, never recursively remove user data.
    try { fs.rmdirSync(destination); } catch {}
    throw error;
  }
  return true;
}

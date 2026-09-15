export const MAX_STRATEGY_BYTES = 2 * 1024 * 1024;

export const SUPPORTED_COMMANDS = new Set([
  'SpawnTower', 'UpgradeTower', 'UpgradeBottom', 'SellTower', 'ChangeTarget', 'ChangeTargets',
  'ChangeDJTrack', 'SetDJTrack', 'UseAbility', 'Move', 'CloneTower', 'Reposition',
  'BrawlerReposition', 'Click', 'Send', 'Sleep', 'ToggleAutoskip', 'AutoSkip'
]);

const ALLOWED_SECTIONS = new Set(['Info', 'Placement', 'Settings', 'DO NOT EDIT', 'Steps']);
const KNOWN_MODES = new Set(['easy', 'casual', 'intermediate', 'molten', 'fallen', 'frost', 'hidden wave', 'challenge trials', 'hardcore', 'voidcore', 'pizza party', 'badlands ii', 'polluted wasteland ii', 'sandbox', 'legacy molten', 'golden', 'legacy fallen', 'pvp', 'versus', 'pvp test', 'story mode', 'tutorial', 'arcade']);
const KNOWN_TOWERS = new Set([
  'accelerator', 'ace pilot', 'archer', 'assassin', 'biologist', 'boomerang', 'brawler', 'combatant', 'commander',
  'commando', 'cowboy', 'crook', 'crook boss', 'cryomancer', 'crystallizer', 'demoman', 'dj', 'dj booth', 'electroshocker',
  'elementalist', 'elf camp', 'enforcer', 'engineer', 'executioner', 'farm', 'firework technician', 'freezer', 'frost blaster',
  'gatling gun', 'gladiator', 'hacker', 'hallow punk', 'harvester', 'hunter', 'jester', 'juggernaut', 'kingpin', 'mecha base',
  'medic', 'mercenary base', 'militant', 'military base', 'mine', 'minigunner', 'moderator', 'mortar', 'necromancer',
  'nuclear monster', 'operator', 'paintballer', 'patrol', 'pulse trooper', 'pursuit', 'pyromancer', 'railgunner', 'ranger',
  'rocketeer', 'saboteur', 'scout', 'sentry', 'shotgunner', 'slasher', 'sledger', 'slime trooper', 'sniper', 'snowballer',
  'soldier', 'spotlight tech', 'swarmer', 'tesla', 'time dilator', 'toxic gunner', 'trapper', 'turret', 'twitgunner',
  'void miner', 'war machine', 'warden', 'warlock', 'golden cowboy', 'golden crook boss', 'golden demoman', 'golden minigunner',
  'golden pyromancer', 'golden scout', 'golden snowballer', 'golden soldier', 'xwm'
]);

function normalizeSection(value) {
  const clean = String(value).replace(/\s+/g, ' ').trim();
  return [...ALLOWED_SECTIONS].find((section) => section.toLowerCase() === clean.toLowerCase()) || clean;
}

function splitArgs(value) {
  const args = [];
  let current = '';
  let quote = '';
  for (const char of String(value)) {
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? '' : char;
      current += char;
    } else if (char === ',' && !quote) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  args.push(current.trim());
  return { args: args.length === 1 && args[0] === '' ? [] : args, malformed: Boolean(quote) };
}

function cleanToken(value) {
  const token = String(value ?? '').trim();
  return token.length >= 2 && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) ? token.slice(1, -1).trim() : token;
}

function isNumeric(value) { return /^-?\d+(?:\.\d+)?$/.test(String(value).trim()); }
function isPositiveInteger(value) { return /^\d+$/.test(String(value).trim()) && Number(value) > 0; }
function isSafeToken(value) { return /^[A-Za-z0-9][A-Za-z0-9_. -]{0,63}$/.test(cleanToken(value)); }
function isTowerId(value) { return isPositiveInteger(value) || /^[A-Za-z][A-Za-z0-9_. -]{0,63}$/.test(cleanToken(value)); }
function towerKey(value) { return cleanToken(value).toLowerCase(); }

function commandError(name, args, malformed) {
  if (malformed) return 'command arguments contain an unmatched quote.';
  const count = (min, max = min) => args.length < min || args.length > max;
  const numeric = (from, to = args.length) => args.slice(from, to).every(isNumeric);
  const tower = (index = 0) => isTowerId(args[index]);
  switch (name) {
    case 'SpawnTower':
      if (args.length !== 4) return 'SpawnTower needs x, y, slot and tower id.';
      if (!numeric(0, 3)) return 'SpawnTower coordinates and slot must be numeric.';
      return tower(3) ? '' : 'SpawnTower needs a safe tower id.';
    case 'UpgradeTower':
      if (count(1, 5) || !tower()) return 'UpgradeTower needs a tower id.';
      if (args[1] && !/^(?:true|false)$/i.test(cleanToken(args[1])) && !isNumeric(args[1])) return 'UpgradeTower options must be numeric or true/false.';
      return numeric(2) ? '' : 'UpgradeTower options must be numeric.';
    case 'UpgradeBottom':
      return count(1, 4) || !tower() || !numeric(1) ? 'UpgradeBottom needs a tower id followed by numeric options.' : '';
    case 'SellTower':
      return args.length !== 1 || !tower() ? 'SellTower needs a tower id.' : '';
    case 'ChangeTarget':
    case 'ChangeTargets':
      return args.length !== 2 || !tower() || !isSafeToken(args[1]) ? 'Target changes need a tower id and target name.' : '';
    case 'ChangeDJTrack':
    case 'SetDJTrack':
      return args.length !== 1 || !isSafeToken(args[0]) ? 'DJ track changes need a track name.' : '';
    case 'UseAbility':
      return count(1, 2) || args.some((arg) => !isSafeToken(arg)) ? 'UseAbility needs safe ability arguments.' : '';
    case 'Move':
      return count(2, 4) || !numeric(0) ? 'Move needs numeric coordinates.' : '';
    case 'Reposition':
    case 'BrawlerReposition':
      return args.length !== 3 || !tower() || !numeric(1) ? `${name} needs a tower id and numeric coordinates.` : '';
    case 'CloneTower':
      return count(3, 4) || !tower() || !numeric(1) ? 'CloneTower needs a tower id and numeric coordinates.' : '';
    case 'Click':
      return count(2, 3) || !numeric(0, 2) || (args[2] && !isSafeToken(args[2])) ? 'Click needs numeric coordinates and an optional mouse button.' : '';
    case 'Send':
      if (count(1, 2) || !isSafeToken(args[0])) return 'Send needs a safe key and optional hold duration.';
      return args[1] && !/^hold\s*:=\s*\d+(?:\.\d+)?$/i.test(args[1]) ? 'Send hold duration must be numeric.' : '';
    case 'Sleep':
      return args.length !== 1 || !/^\d+(?:\.\d+)?$/.test(args[0]) ? 'Sleep duration must be numeric.' : '';
    case 'ToggleAutoskip':
      return args.length !== 0 ? 'ToggleAutoskip does not take arguments.' : '';
    case 'AutoSkip':
      return count(0, 1) || (args[0] && !isNumeric(args[0])) ? 'AutoSkip takes no arguments or one numeric option.' : '';
    default:
      return 'unsupported strategy command.';
  }
}

export function parseStrategy(text) {
  const errors = [];
  const warnings = [];
  const sections = {};
  const commands = [];
  if (typeof text !== 'string' || !text.trim()) return { ok: false, errors: ['The strategy file is empty.'], warnings, sections, commands };
  if (Buffer.byteLength(text, 'utf8') > MAX_STRATEGY_BYTES) return { ok: false, errors: ['The strategy file is larger than 2 MB.'], warnings, sections, commands };
  if (/<script|javascript:|powershell|cmd\.exe|run\(|exec\(|fileappend|runwait|dllcall|#include/i.test(text)) errors.push('The file contains an unsupported executable or script payload.');

  let section = '';
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith(';') || line.startsWith('#') || line.startsWith('//') || /^-{3,}\s*(?:\([^)]*\))?$/.test(line)) return;
    const heading = line.match(/^\[([A-Za-z][A-Za-z0-9 _-]*)\]$/);
    if (heading) {
      section = normalizeSection(heading[1]);
      if (!ALLOWED_SECTIONS.has(section)) errors.push(`Line ${index + 1}: unsupported strategy section.`);
      else sections[section] ||= {};
      return;
    }
    if (['Info', 'Placement', 'Settings', 'DO NOT EDIT'].includes(section)) {
      const pair = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
      if (!pair) { errors.push(`Line ${index + 1}: expected a key=value entry.`); return; }
      sections[section][pair[1]] = pair[2].trim();
      return;
    }
    if (section === 'Steps') {
      if (/^[A-Za-z][A-Za-z0-9_]*\s*:=\s*(?:true|false|-?\d+(?:\.\d+)?|[A-Za-z0-9_. -]{1,64})$/i.test(line)) return;
      const call = line.match(/^([A-Za-z][A-Za-z0-9_]*)\((.*)\)$/);
      if (!call || !SUPPORTED_COMMANDS.has(call[1])) { errors.push(`Line ${index + 1}: unsupported strategy command.`); return; }
      const parsedArgs = splitArgs(call[2]);
      const args = parsedArgs.args;
      const issue = commandError(call[1], args, parsedArgs.malformed);
      if (issue) errors.push(`Line ${index + 1}: ${issue}`);
      commands.push({ name: call[1], args, line: index + 1 });
      return;
    }
    errors.push(`Line ${index + 1}: content must be inside [Info], [Placement], [Settings], [DO NOT EDIT] or [Steps].`);
  });

  const info = sections.Info || {};
  const settings = sections.Settings || {};
  const source = sections['DO NOT EDIT'] || {};
  if (!sections.Settings || !settings.map) errors.push('Missing [Settings] map.');
  if (settings.difficulty && !KNOWN_MODES.has(settings.difficulty.toLowerCase())) warnings.push(`Mode “${settings.difficulty}” is not in the current supported-mode list.`);
  if (!sections.Steps || commands.length === 0) errors.push('The strategy has no executable steps.');
  if (commands.length > 5000) errors.push('The strategy contains more than 5,000 steps.');

  const spawned = new Set();
  const towerRefs = [];
  const refCommands = new Set(['UpgradeTower', 'UpgradeBottom', 'SellTower', 'ChangeTarget', 'ChangeTargets', 'CloneTower', 'Reposition', 'BrawlerReposition']);
  for (const command of commands) {
    if (command.name === 'SpawnTower') {
      const towerId = command.args[3];
      if (!isTowerId(towerId) || (isSafeToken(towerId) && isPositiveInteger(towerId) === false && /^\d/.test(cleanToken(towerId)))) errors.push(`Line ${command.line}: SpawnTower needs a valid tower id.`);
      else spawned.add(towerKey(towerId));
    } else if (refCommands.has(command.name) && command.args.length && isTowerId(command.args[0])) {
      towerRefs.push({ id: towerKey(command.args[0]), display: cleanToken(command.args[0]), line: command.line });
    }
  }
  for (const ref of towerRefs) if (!spawned.has(ref.id)) errors.push(`Line ${ref.line}: action references tower ${ref.display} before it is created.`);
  if (!commands.some((command) => command.name === 'SpawnTower')) errors.push('The strategy never creates a tower.');

  const requiredTowers = (settings.requiredTowers || '').split(',').map((tower) => tower.trim()).filter(Boolean);
  const unknownTowers = requiredTowers.filter((tower) => !KNOWN_TOWERS.has(tower.toLowerCase()));
  if (unknownTowers.length) warnings.push(`Tower names not in the current registry: ${unknownTowers.join(', ')}. They will be reviewed before publishing.`);
  const towerStatus = requiredTowers.length ? (unknownTowers.length ? 'review' : 'recognized') : 'not_provided';
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    sections,
    commands,
    metadata: {
      title: info.title || '', author: info.author || '', description: info.desc || '', map: settings.map || '',
      mode: settings.difficulty || '', requiredTowers, towerStatus, unknownTowers, modifiers: settings.modifiers || '',
      timescale: settings.timescale || '', autoSkip: settings.autoSkip || '', width: source.width || '', height: source.height || ''
    }
  };
}

export function normalizeStrategyText(text) {
  return String(text).replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !line.startsWith(';') && !line.startsWith('#') && !line.startsWith('//')).map((line) => line.replace(/\s+/g, ' ').replace(/\s*([=(),])\s*/g, '$1')).join('\n').toLowerCase();
}

export function strategyFingerprint(parsed) {
  return parsed.commands.map((command) => `${command.name}(${command.args.join(',')})`).join('|');
}

export function similarity(left, right) {
  const a = new Set(String(left || '').split('|').filter(Boolean));
  const b = new Set(String(right || '').split('|').filter(Boolean));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / new Set([...a, ...b]).size;
}
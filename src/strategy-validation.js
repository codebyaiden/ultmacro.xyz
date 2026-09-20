(function (root) {
	'use strict';
	const MAX_BYTES = 2 * 1024 * 1024;
	const supportedCommands = new Set([
		'SpawnTower', 'UpgradeTower', 'UpgradeBottom', 'SellTower', 'ChangeTarget', 'ChangeTargets',
		'ChangeDJTrack', 'SetDJTrack', 'UseAbility', 'Move', 'CloneTower', 'Reposition',
		'BrawlerReposition', 'Click', 'Send', 'Sleep', 'ToggleAutoskip', 'AutoSkip'
	]);
	const allowedSections = new Set(['Info', 'Placement', 'Settings', 'DO NOT EDIT', 'Steps']);
	const fallbackModes = ['Easy', 'Casual', 'Intermediate', 'Molten', 'Fallen', 'Frost', 'Hidden Wave', 'Challenge Trials', 'Hardcore', 'Voidcore', 'Pizza Party', 'Badlands II', 'Polluted Wasteland II', 'Sandbox', 'Legacy Molten', 'Golden', 'Legacy Fallen', 'PvP', 'Versus', 'PvP Test', 'Story Mode', 'Tutorial', 'Arcade'];
	const catalogModes = root.TDS_STRATEGY_CATALOG?.modes?.length ? root.TDS_STRATEGY_CATALOG.modes : fallbackModes;
	const knownModes = new Set(catalogModes.map((mode) => mode.toLowerCase()));
	const knownTowers = new Set([
		'accelerator', 'ace pilot', 'archer', 'assassin', 'biologist', 'boomerang', 'brawler', 'combatant', 'commander',
		'commando', 'cowboy', 'crook', 'crook boss', 'cryomancer', 'crystallizer', 'demoman', 'dj', 'dj booth',
		'electroshocker', 'elementalist', 'elf camp', 'enforcer', 'engineer', 'executioner', 'farm', 'firework technician',
		'freezer', 'frost blaster', 'gatling gun', 'gladiator', 'hacker', 'hallow punk', 'harvester', 'hunter', 'jester',
		'juggernaut', 'kingpin', 'mecha base', 'medic', 'mercenary base', 'militant', 'military base', 'mine', 'minigunner',
		'moderator', 'mortar', 'necromancer', 'nuclear monster', 'operator', 'paintballer', 'patrol', 'pulse trooper',
		'pursuit', 'pyromancer', 'railgunner', 'ranger', 'rocketeer', 'saboteur', 'scout', 'sentry', 'shotgunner',
		'slasher', 'sledger', 'slime trooper', 'sniper', 'snowballer', 'soldier', 'spotlight tech', 'swarmer', 'tesla',
		'time dilator', 'toxic gunner', 'trapper', 'turret', 'twitgunner', 'void miner', 'war machine', 'warden', 'warlock',
		'golden cowboy', 'golden crook boss', 'golden demoman', 'golden minigunner', 'golden pyromancer', 'golden scout',
		'golden snowballer', 'golden soldier', 'xwm'
	]);

	function normalizeSection(value) {
		const clean = String(value).replace(/\s+/g, ' ').trim();
		return [...allowedSections].find((section) => section.toLowerCase() === clean.toLowerCase()) || clean;
	}
	function splitArgs(value) {
		const args = [];
		let current = '', quote = '';
		for (const char of String(value)) {
			if ((char === '"' || char === "'") && (!quote || quote === char)) { quote = quote ? '' : char; current += char; }
			else if (char === ',' && !quote) { args.push(current.trim()); current = ''; }
			else current += char;
		}
		args.push(current.trim());
		return { args: args.length === 1 && args[0] === '' ? [] : args, malformed: Boolean(quote) };
	}
	function cleanToken(value) {
		const token = String(value ?? '').trim();
		return token.length >= 2 && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) ? token.slice(1, -1).trim() : token;
	}
	function numeric(value) { return /^-?\d+(?:\.\d+)?$/.test(String(value).trim()); }
	function positiveInteger(value) { return /^\d+$/.test(String(value).trim()) && Number(value) > 0; }
	function safeToken(value) { return /^[A-Za-z0-9][A-Za-z0-9_. -]{0,63}$/.test(cleanToken(value)); }
	function towerId(value) { return positiveInteger(value) || /^[A-Za-z][A-Za-z0-9_. -]{0,63}$/.test(cleanToken(value)); }
	function towerKey(value) { return cleanToken(value).toLowerCase(); }
	function commandError(name, args, malformed) {
		if (malformed) return 'command arguments contain an unmatched quote.';
		const count = (min, max = min) => args.length < min || args.length > max;
		const numbers = (from, to = args.length) => args.slice(from, to).every(numeric);
		const tower = (index = 0) => towerId(args[index]);
		switch (name) {
			case 'SpawnTower':
				if (args.length !== 4) return 'SpawnTower needs x, y, slot and tower id.';
				if (!numbers(0, 3)) return 'SpawnTower coordinates and slot must be numeric.';
				return tower(3) ? '' : 'SpawnTower needs a safe tower id.';
			case 'UpgradeTower':
				if (count(1, 5) || !tower()) return 'UpgradeTower needs a tower id.';
				if (args[1] && !/^(?:true|false)$/i.test(cleanToken(args[1])) && !numeric(args[1])) return 'UpgradeTower options must be numeric or true/false.';
				return numbers(2) ? '' : 'UpgradeTower options must be numeric.';
			case 'UpgradeBottom': return count(1, 4) || !tower() || !numbers(1) ? 'UpgradeBottom needs a tower id followed by numeric options.' : '';
			case 'SellTower': return args.length !== 1 || !tower() ? 'SellTower needs a tower id.' : '';
			case 'ChangeTarget':
			case 'ChangeTargets': return args.length !== 2 || !tower() || !safeToken(args[1]) ? 'Target changes need a tower id and target name.' : '';
			case 'ChangeDJTrack':
			case 'SetDJTrack': return args.length !== 1 || !safeToken(args[0]) ? 'DJ track changes need a track name.' : '';
			case 'UseAbility': return count(1, 2) || args.some((arg) => !safeToken(arg)) ? 'UseAbility needs safe ability arguments.' : '';
			case 'Move': return count(2, 4) || !numbers(0) ? 'Move needs numeric coordinates.' : '';
			case 'Reposition':
			case 'BrawlerReposition': return args.length !== 3 || !tower() || !numbers(1) ? `${name} needs a tower id and numeric coordinates.` : '';
			case 'CloneTower': return count(3, 4) || !tower() || !numbers(1) ? 'CloneTower needs a tower id and numeric coordinates.' : '';
			case 'Click': return count(2, 3) || !numbers(0, 2) || (args[2] && !safeToken(args[2])) ? 'Click needs numeric coordinates and an optional mouse button.' : '';
			case 'Send':
				if (count(1, 2) || !safeToken(args[0])) return 'Send needs a safe key and optional hold duration.';
				return args[1] && !/^hold\s*:=\s*\d+(?:\.\d+)?$/i.test(args[1]) ? 'Send hold duration must be numeric.' : '';
			case 'Sleep': return args.length !== 1 || !/^\d+(?:\.\d+)?$/.test(args[0]) ? 'Sleep duration must be numeric.' : '';
			case 'ToggleAutoskip': return args.length !== 0 ? 'ToggleAutoskip does not take arguments.' : '';
			case 'AutoSkip': return count(0, 1) || (args[0] && !numeric(args[0])) ? 'AutoSkip takes no arguments or one numeric option.' : '';
			default: return 'unsupported strategy command.';
		}
	}

	function parseStrategy(text) {
		const errors = [], warnings = [], sections = {}, commands = [];
		if (typeof text !== 'string' || !text.trim()) return { ok: false, errors: ['The strategy file is empty.'], warnings, sections, commands };
		if (new TextEncoder().encode(text).byteLength > MAX_BYTES) return { ok: false, errors: ['The strategy file is larger than 2 MB.'], warnings, sections, commands };
		if (/<script|javascript:|powershell|cmd\.exe|run\(|exec\(|FileAppend|RunWait|DllCall|#Include/i.test(text)) errors.push('The file contains an unsupported executable or script payload.');
		let section = '';
		text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, index) => {
			const line = raw.trim();
			if (!line || line.startsWith(';') || line.startsWith('#') || line.startsWith('//') || /^-{3,}\s*(?:\([^)]*\))?$/.test(line)) return;
			const heading = line.match(/^\[([A-Za-z][A-Za-z0-9 _-]*)\]$/);
			if (heading) { section = normalizeSection(heading[1]); if (!allowedSections.has(section)) errors.push(`Line ${index + 1}: unsupported strategy section.`); else sections[section] ||= {}; return; }
			if (['Info', 'Placement', 'Settings', 'DO NOT EDIT'].includes(section)) {
				const pair = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
				if (!pair) { errors.push(`Line ${index + 1}: expected a key=value entry.`); return; }
				sections[section][pair[1]] = pair[2].trim(); return;
			}
			if (section === 'Steps') {
				if (/^[A-Za-z][A-Za-z0-9_]*\s*:=\s*(?:true|false|-?\d+(?:\.\d+)?|[A-Za-z0-9_. -]{1,64})$/i.test(line)) return;
				const call = line.match(/^([A-Za-z][A-Za-z0-9_]*)\((.*)\)$/);
				if (!call || !supportedCommands.has(call[1])) { errors.push(`Line ${index + 1}: unsupported strategy command.`); return; }
				const parsedArgs = splitArgs(call[2]);
				const args = parsedArgs.args;
				const issue = commandError(call[1], args, parsedArgs.malformed);
				if (issue) errors.push(`Line ${index + 1}: ${issue}`);
				commands.push({ name: call[1], args, line: index + 1 }); return;
			}
			errors.push(`Line ${index + 1}: content must be inside [Info], [Placement], [Settings], [DO NOT EDIT] or [Steps].`);
		});
		const info = sections.Info || {}, settings = sections.Settings || {}, source = sections['DO NOT EDIT'] || {};
		if (!sections.Settings || !settings.map) errors.push('Missing [Settings] map.');
		if (settings.difficulty && !knownModes.has(settings.difficulty.toLowerCase())) warnings.push(`Mode “${settings.difficulty}” is not in the current supported-mode list.`);
		if (!sections.Steps || commands.length === 0) errors.push('The strategy has no executable steps.');
		if (commands.length > 5000) errors.push('The strategy contains more than 5,000 steps.');
		const spawned = new Set(), towerRefs = [];
		const refCommands = new Set(['UpgradeTower', 'UpgradeBottom', 'SellTower', 'ChangeTarget', 'ChangeTargets', 'CloneTower', 'Reposition', 'BrawlerReposition']);
		commands.forEach((command) => {
			if (command.name === 'SpawnTower') {
				const id = command.args[3];
				if (!towerId(id) || (safeToken(id) && !positiveInteger(id) && /^\d/.test(cleanToken(id)))) errors.push(`Line ${command.line}: SpawnTower needs a valid tower id.`); else spawned.add(towerKey(id));
			} else if (refCommands.has(command.name) && command.args.length && towerId(command.args[0])) towerRefs.push({ id: towerKey(command.args[0]), display: cleanToken(command.args[0]), line: command.line });
		});
		towerRefs.forEach(({ id, display, line }) => { if (!spawned.has(id)) errors.push(`Line ${line}: action references tower ${display} before it is created.`); });
		if (!commands.some((command) => command.name === 'SpawnTower')) errors.push('The strategy never creates a tower.');
		const requiredTowers = (settings.requiredTowers || '').split(',').map((tower) => tower.trim()).filter(Boolean);
		const unknownTowers = requiredTowers.filter((tower) => !knownTowers.has(tower.toLowerCase()));
		if (unknownTowers.length) warnings.push(`Tower names not in the current registry: ${unknownTowers.join(', ')}. They will be reviewed before publishing.`);
		const towerStatus = requiredTowers.length ? (unknownTowers.length ? 'review' : 'recognized') : 'not_provided';
		return { ok: errors.length === 0, errors, warnings, sections, commands, metadata: { title: info.title || '', author: info.author || '', description: info.desc || '', map: settings.map || '', mode: settings.difficulty || '', requiredTowers, towerStatus, unknownTowers, modifiers: settings.modifiers || '', timescale: settings.timescale || '', autoSkip: settings.autoSkip || '', width: source.width || '', height: source.height || '' } };
	}
	root.StrategyValidation = { MAX_BYTES, supportedCommands: [...supportedCommands], parseStrategy };
})(window);

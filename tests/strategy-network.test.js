const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

global.window = global;
vm.runInThisContext(fs.readFileSync('src/strategy-validation.js', 'utf8'));

const valid = `[Info]\ntitle=Test farm\nauthor=tester\ndesc=Short test\n\n[Settings]\nmap=Dead Ahead\ndifficulty=Easy\nrequiredTowers=Farm, Soldier\n\n[Steps]\nSpawnTower(500, 400, 1, 1)\nUpgradeTower(1)`;
const desktopFormat = `[Settings]\nmap=Wretched Front\ndifficulty=Hardcore\nrequiredTowers=Crook Boss, Farm, Juggernaut\ntimescale=OFF\n\n[DO NOT EDIT]\nwidth=2560\nheight=1369\n\n[Steps]\nSpawnTower(764, 588, 2, Farm1)\nUpgradeTower(Farm1)\nChangeTargets(Farm1, Weakest)\nSetDJTrack("RED")\nSend("w", hold:=1000)`;

assert.equal(StrategyValidation.parseStrategy(valid).ok, true);
assert.equal(StrategyValidation.parseStrategy(valid).commands.length, 2);
assert.equal(StrategyValidation.parseStrategy(desktopFormat).ok, true);
assert.equal(StrategyValidation.parseStrategy(desktopFormat).metadata.towerStatus, 'recognized');
assert.equal(StrategyValidation.parseStrategy('').ok, false);
assert.equal(StrategyValidation.parseStrategy('[Info]\ntitle=Bad\n[Settings]\nmap=Dead Ahead\n[Steps]\nRunWait(1)').ok, false);
assert.equal(StrategyValidation.parseStrategy('[Info]\ntitle=Bad\n[Settings]\nmap=Dead Ahead\n[Steps]\nUpgradeTower(9)').ok, false);
assert.equal(StrategyValidation.parseStrategy('[Info]\ntitle=Bad\n[Settings]\nmap=Dead Ahead\n[Steps]\nSpawnTower(1, 2, 3, 1)\nRunWait(1)').errors.some((error) => error.includes('unsupported')), true);

console.log('strategy validation tests passed');
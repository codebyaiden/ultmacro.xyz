// Read-only topical guidance: reuse existing source-linked published documentation.
// This is NOT an automated claim that every candidate describes a real bug.
// Unreleased/conditional items stay gated until code or a reproducible test exists.

const specificGuides = [
  [/reinstall.*(?:strateg|profil)|(?:recording|strateg).*(?:missing|deleted|lost|backup)|(?:backup|back.?up).*(?:strateg|recording)/i, 'profiles'],
  [/record.*(?:tower placement|tower placements|top-path upgrade|bottom-path upgrade|first tower)|(?:record|recording).*(?:placement|upgrade)/i, 'record-strategy'],
  [/roblox.*(?:classic camera|ui navigation toggle|setting|font|fps|graphics)/i, 'roblox-settings'],
  [/upgrade.*(?:skipped|missed|fail|panel|wrong path|cash)|(?:verify|investigate|fix).*upgrade/i, 'upgrade-not-working'],
  [/tds.*(?:ui scale|screen shake|vertical upgrades|tower options|dialog)/i, 'tds-settings'],
  [/profile.*(?:import|overwrite)|(?:import|overwrite).*profile/i, 'profile-import'],
  [/updater.*(?:latest|asset|filename|cannot find|new release)|release zip.*(?:wrong|mismatch)/i, 'updater-filename-mismatch'],
  [/sha.?256|checksum|verify.*release.*zip|zip.*integrity/i, 'release-asset-integrity'],
  [/auto.?configure.*(?:restore|fail)|roblox settings.*(?:refus|restore)/i, 'auto-roblox-restore-refused'],
  [/auto.?configure.*(?:backup|location|file)/i, 'auto-roblox-settings-backup'],
  [/auto.?configure|roblox.*automatic.*setting/i, 'auto-roblox-settings-reference'],
  [/profile.*(?:format|contents|\.ump|metadata)/i, 'profile-export-ump-reference'],
  [/profile.*(?:select|include|group).*(?:export|backup)/i, 'profile-selective-groups'],
  [/strategy lab.*(?:map|sandbox|camera|capture|calibration)/i, 'strategy-lab-sandbox-camera'],
  [/strategy lab.*(?:range|footprint|visual|editing)/i, 'strategy-lab-visual-capabilities'],
  [/\.strat.*(?:format|info|metadata|author)/i, 'strategy-file-info-section'],
  [/recording.*(?:hotkey|shortcut).*default/i, 'recording-hotkeys-source'],

  [/settings (?:file|folder|path|save)|appdata|options directory|settings\.tds/i, 'where-settings-are-saved'],
  [/(?:recording|recorded strategy|\.strat).*(?:file|folder|save|path)|locate saved.*strat|strategy directory/i, 'where-recordings-are-saved'],
  [/profile.*(?:folder|path|backup location)/i, 'where-profiles-are-saved'],
  [/reset.*(?:setting|default)|restore.*default/i, 'what-reset-settings-changes'],
  [/recording.*(?:hotkey|shortcut)|shortcut.*record|delete.*recorded action/i, 'recording-hotkey-defaults'],
  [/swat van|enforcer.*ability/i, 'enforcer-van-hotkey'],
  [/hotkeys for upgrading|upgrade.*keybind|upgrade.*shortcut/i, 'upgrade-hotkeys-setting'],
  [/timescale.*(?:ticket|prompt|zero)|tickets.*(?:run|out)|time.?scale.*(?:1\.5|2)/i, 'timescale-when-tickets-run-out'],
  [/upgrade delay|upgrades.*(?:skip|fast|timing)|slow.*upgrade/i, 'upgrade-delay-milliseconds'],
  [/legacy mode|legacy submacro/i, 'legacy-mode-exact-limits'],
  [/export.*log|collect.*log|log.*export|debug.*log/i, 'export-debug-logs'],
  [/setting.*(?:save|persist|change)|saved.*setting/i, 'macro-settings-autosave'],
  [/restart|play again|between matches|result screen/i, 'restart-vs-play-again'],
  [/adaptive|1440p|720p|4k|16:9|display.*resol|monitor.*resol|screen scaling/i, 'resolution-mode-requirements'],
  [/auto.?equip|equip.*tower|loadout|required tower/i, 'auto-equip'],
  [/windows.*ocr|language pack|english.*ocr|ocr language/i, 'ocr-language-fix'],
  [/wrong.*wave|wave.*detect|cash.*detect|currency.*read|ocr.*wrong/i, 'ocr-errors'],
  [/dj.*(?:disc|track)|necromancer|brawler|record.*abilit/i, 'record-abilities'],
  [/tower.*(?:place|placement|click)|place.*tower|wrong.*click/i, 'wrong-clicks'],
  [/strategy lab|\.strat.*edit|edit.*strat|strategy editor/i, 'strategy-lab-start'],
  [/create.*webhook|discord.*webhook|webhook/i, 'discord-webhooks'],
  [/discord.*(?:remote|bot|command)|engineerbot|remote control/i, 'engineerbot-commands'],
  [/profile.*import|import.*profile/i, 'profile-import'],
  [/profile.*export|export.*profile|backup/i, 'profile-export'],
  [/strategy rotation|rotate strateg|swap strategies|rotation/i, 'strategy-rotation'],
  [/goal|currency target/i, 'currency-goals'],
  [/party host|host.*party|party.*invite/i, 'party-host'],
  [/party member|join.*party/i, 'party-member'],
  [/vip|private server/i, 'vip-server-link'],
  [/spin|wheel.*ticket/i, 'auto-spin'],
  [/consumable|open crate/i, 'auto-consumable'],
  [/call of arms|drop the beat/i, 'auto-call-of-arms'],
  [/map.*(?:mode|selection)|choose.*(?:map|mode)/i, 'tds-settings'],
  [/published strateg|community strateg|strategy network|search.*strateg|browse strateg/i, 'community-strategies'],
  [/public release|releases|version|changelog|prerelease|rollback|updater/i, 'public-release-reference'],
  [/crash|launch|auto.?hotkey|main\.ahk|zip|install/i, 'install'],
  [/bug report|support|issue|reproduc|error report/i, 'report-issue']
];

const stop = new Set(['the','for','and','how','when','from','that','with','your','after','before','what','which','this','into','using','about','macro','ultimate','tower','tds','check','does','there','are','why','you','run','use']);
function terms(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/)
    .filter(w => w.length >= 3 && !stop.has(w));
}
function rankedSections(topic, article) {
  const q = new Set(terms(topic.title));
  return article.sections.map((section, index) => {
    const title = terms(section.title);
    const content = terms([...(section.paragraphs || []), ...(section.steps || []),
      ...(section.checks || []), ...(section.rows || []).flat()].join(' '));
    const sectionWords = new Set(content);
    let score = title.filter(w => q.has(w)).length * 5;
    score += [...q].filter(w => sectionWords.has(w)).length;
    return { section, index, score };
  }).sort((a,b)=>b.score-a.score || a.index-b.index);
}

function bestArticle(topic, docs) {
  const proposed = [];
  const selected = new Set();
  const add = (slug, bonus = 0) => {
    const article = docs.get(slug);
    if (article && !selected.has(slug)) { selected.add(slug); proposed.push({article,bonus}); }
  };
  for (const [pattern, slug] of specificGuides) if (pattern.test(topic.title)) { add(slug,100);break; }
  if (topic.relatedGuide) add(topic.relatedGuide,40);
  const query = new Set(terms(topic.title));
  for (const a of docs.values()) {
    const words = new Set(terms([a.title,a.summary,...(a.keywords || [])].join(' ')));
    const overlap = [...query].filter(w=>words.has(w)).length;
    if (overlap >= 2) add(a.slug,overlap*6);
  }
  const scored = proposed.map(({article,bonus}) => {
    const sections = rankedSections(topic,article);
    const relevance = sections[0]?.score || 0;
    return {article,score:bonus+relevance,sections};
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored[0] || null;
}

export function resolveTopicGuidance(topic, docs) {
  const releaseDependent = /^verify 1\.4\b/i.test(topic.title) ||
    /(?:unreleased|future release).*?feature/i.test(topic.title);
  const chosen = bestArticle(topic,docs);
  if (releaseDependent) {
    return {
      kind:'requires-release',
      headline:'No published instructions for this release yet',
      note:'The v1.3.5 public source cannot establish the behavior of an unreleased or untested v1.4 feature. This topic needs its own release build, UI evidence and successful/failure-path tests.',
      guide:null,section:null
    };
  }
  if (!chosen) {
    return { kind:'unverified',headline:'Needs a reproducible test',
      note:'There is no matching published guide with a verified procedure. File an issue with the installed version, expected outcome, actual outcome and sanitized logs.',
      guide:null,section:null };
  }
  const section = chosen.sections[0]?.section || chosen.article.sections[0];
  const evidence = new Set(terms([
    chosen.article.title, chosen.article.summary, section.title,
    ...(section.paragraphs || []), ...(section.steps || []),
    ...(section.checks || []), ...(section.rows || []).flat()
  ].join(' ')));
  const queryTerms = [...new Set(terms(topic.title))];
  const overlap = queryTerms.filter(word => evidence.has(word)).length;
  const lossRisk = /reinstall|without losing|backup|back up|restore|recover|delet|remov|reset|overwrite|missing|lost|migrat|quarantin|credential|token/i.test(topic.title);
  if ((queryTerms.length >= 3 && overlap === 0) || (lossRisk && overlap < 2)) {
    return {
      kind:'unverified', headline:'No verified instructions for this exact topic',
      note:'The related guide does not establish a fix for this exact situation. Check it for general context, and request a version-specific procedure or reproducible test before changing files or settings.',
      guide:chosen.article, section:null
    };
  }
  return {
    kind:'related',
    headline:'Useful checks from published documentation',
    note:'These are relevant steps from a published guide, not proof that this exact topic is a confirmed bug or has a tested fix.',
    guide:chosen.article,
    section:chosen.sections[0]?.section || chosen.article.sections[0]
  };
}

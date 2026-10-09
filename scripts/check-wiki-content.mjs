import { readFile } from 'node:fs/promises';
import { articles, categories } from '../wiki/content.mjs';
import { proposedTopics, topicCategories } from '../wiki/catalog.mjs';

const errors = [];
const slugs = new Set();
const known = new Set(articles.map(article => article.slug));

for (const article of articles) {
  const { slug, category, title, summary, sections, source, keywords } = article;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push('Bad article slug: ' + slug);
  if (slugs.has(slug)) errors.push('Duplicate published article: ' + slug);
  slugs.add(slug);
  if (!categories.includes(category)) errors.push('Unknown article category: ' + slug);
  if (!title || !summary) errors.push('Empty article title/summary: ' + slug);
  if (!source?.startsWith('/') && !source?.startsWith('https://')) errors.push('Invalid article source: ' + slug);
  if (!Array.isArray(keywords)) errors.push('Keywords must be an array: ' + slug);
  if (!Array.isArray(sections) || !sections.length) errors.push('No sections: ' + slug);
  for (const section of sections || []) {
    if (!section.title) errors.push('Untitled section: ' + slug);
    if (!(section.paragraphs?.length || section.steps?.length || section.checks?.length || section.rows?.length)) {
      errors.push('Empty section: ' + slug + ' / ' + section.title);
    }
    for (const row of section.rows || []) if (!Array.isArray(row) || row.length !== 2) errors.push('Invalid setting row: ' + slug);
  }
}

const file = new URL('../wiki/roadmap/topics.json', import.meta.url);
const roadmap = JSON.parse(await readFile(file, 'utf8'));
const catalog = new Map();
for (const topic of proposedTopics) {
  if (!topic.title || !topic.slug || !topic.category) errors.push('Incomplete research topic');
  if (catalog.has(topic.slug)) errors.push('Duplicate research topic: ' + topic.slug);
  catalog.set(topic.slug, topic);
  if (!topicCategories.includes(topic.category)) errors.push('Bad research category: ' + topic.slug);
  if (!known.has(topic.relatedGuide)) errors.push('Dead related-guide link: ' + topic.slug + ' -> ' + topic.relatedGuide);
}
if (roadmap.totalPlanned !== proposedTopics.length) errors.push('Roadmap and public catalog have different counts');
if (roadmap.existingPublishedArticles !== articles.length) errors.push('Published guide count is stale');
if (roadmap.topics.length !== proposedTopics.length) errors.push('Roadmap topic list differs in length');
for (const topic of roadmap.topics) {
  if (!catalog.has(topic.slug)) errors.push('Topic not in public catalog: ' + topic.slug);
  if (topic.status !== 'planned-unverified') errors.push('Unverified research topic marked as published: ' + topic.slug);
}

if (errors.length) {
  for (const error of errors) console.error('✗ ' + error);
  process.exitCode = 1;
} else {
  console.log('✓ ' + articles.length + ' published source-linked guides');
  console.log('✓ ' + proposedTopics.length + ' separate research topics across ' + topicCategories.length + ' categories');
  console.log('✓ No duplicate or missing guide references');
}

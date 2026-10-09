// Platform examples shown verbatim in the developer documentation.
export const integrations = [
  {
    "id": "javascript",
    "label": "JavaScript",
    "eyebrow": "Node.js 20+ / web",
    "title": "Ask from JavaScript",
    "intro": "Use fetch from a Node service, web app or bot. No SDK or browser automation is required.",
    "install": "No packages needed. Node 20+ has fetch built in.",
    "steps": [
      "Paste the function into your application or use the maintained helper below.",
      "Call askWiki(question), then check status before displaying an answer.",
      "Include the citation URL. not_found is not a verified solution."
    ],
    "source": "../examples/ask-javascript.mjs",
    "sourceLabel": "Full JavaScript helper",
    "language": "javascript",
    "code": "async function askWiki(question, version) {\n  const response = await fetch('https://ultmacro.xyz/api/wiki/v1/ask', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      question,\n      ...(version ? { version } : {})\n    })\n  });\n  if (!response.ok) throw new Error('Wiki API HTTP ' + response.status);\n  return response.json();\n}\n\nconst result = await askWiki(\"Why won't my towers upgrade?\");\nif (result.status === 'answered') {\n  console.log(result.answer);\n  console.log('Source:', result.citations[0]?.url);\n} else {\n  console.log(result.message || 'No documented answer yet');\n}"
  },
  {
    "id": "python",
    "label": "Python",
    "eyebrow": "Python 3 / standard library",
    "title": "Ask from Python",
    "intro": "Make a direct HTTPS request with Python's built-in urllib. No pip packages required.",
    "install": "No dependencies: Python 3 and network access are enough.",
    "steps": [
      "Copy the function into your .py file or use the maintained helper below.",
      "Pass a question, optionally specifying a documented release.",
      "Check status and include the cited article URL when replying."
    ],
    "source": "../examples/ask.py",
    "sourceLabel": "Full Python helper",
    "language": "python",
    "code": "import json\nfrom urllib.request import Request, urlopen\n\ndef ask_wiki(question, version=None):\n    payload = {\"question\": question}\n    if version:\n        payload[\"version\"] = version\n    req = Request(\n        \"https://ultmacro.xyz/api/wiki/v1/ask\",\n        data=json.dumps(payload).encode(\"utf-8\"),\n        headers={\"Content-Type\": \"application/json\"},\n        method=\"POST\",\n    )\n    with urlopen(req, timeout=8) as response:\n        return json.load(response)\n\nresult = ask_wiki(\"How do I record a strategy?\")\nif result[\"status\"] == \"answered\":\n    print(result[\"answer\"])\n    print(\"Source:\", result[\"citations\"][0][\"url\"])\nelse:\n    print(result.get(\"message\", \"No documented answer yet\"))"
  },
  {
    "id": "discord",
    "label": "Discord.js",
    "eyebrow": "Discord.js v14 / slash command",
    "title": "Connect a /wiki command",
    "intro": "Your Discord bot can answer questions with sourced Wiki excerpts without opening a browser.",
    "install": "Run npm install discord.js in your existing bot project.",
    "steps": [
      "Run npm install discord.js and save the linked ask-javascript.mjs and discord-ask.mjs files together.",
      "Create or update only the /wiki slash command with REST POST. Avoid bulk overwrite because it removes unrelated commands.",
      "Connect handleWikiCommand to your existing bot's interactionCreate listener. Keep bot credentials on the server."
    ],
    "source": "../examples/discord-ask.mjs",
    "sourceLabel": "Complete Discord command adapter",
    "extraSource": "../examples/ask-javascript.mjs",
    "extraLabel": "Required JavaScript helper",
    "language": "javascript",
    "code": "// 1. npm install discord.js\n// 2. Save ask-javascript.mjs and discord-ask.mjs side by side.\nimport { REST, Routes, SlashCommandBuilder } from 'discord.js';\nimport { handleWikiCommand } from './discord-ask.mjs';\n\nconst wikiCommand = new SlashCommandBuilder()\n  .setName('wiki')\n  .setDescription('Ask the Ultimate Macro Wiki')\n  .addStringOption(option => option\n    .setName('question')\n    .setDescription('What do you need help with?')\n    .setRequired(true)\n    .setMaxLength(300));\n\n// Register ONCE in your bot setup script (server only):\nconst rest = new REST({ version: '10' })\n  .setToken(process.env.DISCORD_BOT_TOKEN);\nawait rest.post(\n  Routes.applicationCommands(process.env.DISCORD_APP_ID),\n  { body: wikiCommand.toJSON() }\n);\n\n// In your existing running Discord client:\nclient.on('interactionCreate', interaction => {\n  if (interaction.isChatInputCommand() &&\n      interaction.commandName === 'wiki') {\n    void handleWikiCommand(interaction);\n  }\n});\n\n// Never put DISCORD_BOT_TOKEN in browser code."
  },
  {
    "id": "agents",
    "label": "AI agents",
    "eyebrow": "Tool-calling assistants",
    "title": "Give your agent a Wiki tool",
    "intro": "Expose the Wiki as a tool call. Your agent calls it from server code and receives citations or an explicit no-answer result.",
    "install": "Use your existing AI SDK. No additional Wiki SDK is required.",
    "steps": [
      "Save ask-javascript.mjs and ai-tool.mjs in the same directory.",
      "Register wikiAskTool in your model provider's tool/function list.",
      "When the model calls it, pass its validated arguments to callWikiAskTool and return the result."
    ],
    "source": "../examples/ai-tool.mjs",
    "sourceLabel": "Provider-neutral AI tool adapter",
    "extraSource": "../examples/ask-javascript.mjs",
    "extraLabel": "Required JavaScript helper",
    "language": "javascript",
    "code": "import { wikiAskTool, callWikiAskTool } from './ai-tool.mjs';\n\n// Register wikiAskTool with your AI provider's tool-calling API.\nconst tools = [wikiAskTool];\n\n// Invoke this handler on your AI SDK's matching tool call:\nasync function onWikiToolCall(args) {\n  const result = await callWikiAskTool(args);\n  // Return result to your model, preserving status and sources.\n  return result;\n}\n\n// Tool name: ask_ultimate_macro_wiki\n// Arguments: { question: \"How do I record?\", version: \"v1.3.5\" }"
  },
  {
    "id": "curl",
    "label": "cURL",
    "eyebrow": "Terminal / HTTP testing",
    "title": "Try one HTTP request",
    "intro": "This is the exact POST sent by the other integrations. No special bot protocol required.",
    "install": "Use a terminal with curl installed.",
    "steps": [
      "Make the request once the public Ask API is live.",
      "Look for HTTP 200 and status: answered or not_found.",
      "Treat non-2xx HTTP responses as errors. Never invent an answer for not_found."
    ],
    "language": "bash",
    "code": "curl -sS -X POST \\\n  'https://ultmacro.xyz/api/wiki/v1/ask' \\\n  -H 'Content-Type: application/json' \\\n  --data '{\"question\":\"How do I record a strategy?\"}'\n\n# An answer includes citations[].url and answer_type.\n# A missing answer uses status: \"not_found\", answer: null."
  }
];
export const staticFallbackCode = "// Works even when the dynamic Ask API is offline.\n// Read the compact index, then fetch ONE relevant Markdown guide.\nconst index = await fetch(\n  'https://ultmacro.xyz/wiki/api/v1/index.json'\n).then(response => {\n  if (!response.ok) throw new Error('Index unavailable');\n  return response.json();\n});\n\nconst matches = index.articles.filter(article =>\n  article.title.toLowerCase().includes('ocr') ||\n  (article.keywords || []).some(word =>\n    word.toLowerCase().includes('ocr'))\n);\n\nif (matches.length) {\n  const guide = matches[0];\n  const response = await fetch(guide.markdown);\n  if (!response.ok) throw new Error('Guide unavailable');\n  console.log(await response.text());\n  console.log('Source:', guide.url);\n}\n\n// This retrieves documents, not synthesized answers.";

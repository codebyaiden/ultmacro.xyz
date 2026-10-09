// Discord.js v14 slash command adapter. Requires discord.js in the consumer app.
// Register /wiki with a required string option called "question" (max_length: 300).
import { askWiki } from './ask-javascript.mjs';

export async function handleWikiCommand(interaction) {
  if(interaction.commandName!=='wiki')return;
  await interaction.deferReply();
  try {
    const question=interaction.options.getString('question',true);
    const answer=await askWiki(question);
    if(answer.status!=='answered') {
      await interaction.editReply({
        content:answer.message+'\n'+
          (answer.related?.[0]?.url ? 'Related reading: '+answer.related[0].url : ''),
        allowedMentions:{parse:[]}
      });
      return;
    }
    const source=answer.citations[0];
    await interaction.editReply({
      embeds:[{
        title:'Ultimate Macro Wiki',
        description:answer.answer.slice(0,3500),
        color:0x3c82c9,
        fields:[{
          name:'Source',
          value:'['+source.title+']('+source.url+') · '+(source.version||'version not specified'),
        }],
        footer:{text:answer.answer_type==='ai_draft'
          ? 'AI summary: verify the cited Wiki guide'
          : 'Excerpt from published Wiki documentation'},
      }],
      allowedMentions:{parse:[]}
    });
  } catch {
    await interaction.editReply({
      content:'The Wiki API is unavailable. Try https://ultmacro.xyz/wiki/ directly.',
      allowedMentions:{parse:[]}
    });
  }
}

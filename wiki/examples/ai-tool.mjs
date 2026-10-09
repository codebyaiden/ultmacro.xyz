// Provider-neutral tool schema and handler. Tool-calling AI apps can reuse the
// same Wiki Ask backend; there is no second knowledge store or model required.
import { askWiki } from './ask-javascript.mjs';

export const wikiAskTool = {
  name:'ask_ultimate_macro_wiki',
  description:'Look up source-linked Ultimate Macro documentation. Return verified source excerpts or an explicit no-answer result. The tool does not know account data or unreleased features.',
  parameters:{
    type:'object',additionalProperties:false,required:['question'],
    properties:{
      question:{type:'string',description:'One question about Ultimate Macro',maxLength:300},
      version:{type:'string',description:'Optional release, such as v1.3.5'}
    }
  }
};

export async function callWikiAskTool({question,version}) {
  const result=await askWiki(question,{version,mode:'sourced'});
  return {
    status:result.status,
    answer:result.answer,
    message:result.message||null,
    sources:result.citations,
    related:result.related,
    note:result.note||null
  };
}

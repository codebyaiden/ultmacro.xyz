// Node 20+, modern browsers, Discord.js bots, and AI agent backends.
// Copy this file or its exported function into your own application.
export async function askWiki(question,{version,mode='sourced',baseUrl='https://ultmacro.xyz',timeoutMs=8000}={}) {
  const payload={question,mode};
  if(version)payload.version=version;
  const response=await fetch(new URL('/api/wiki/v1/ask',baseUrl),{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(timeoutMs),
  });
  if(!response.ok)throw new Error('Ultimate Macro Wiki API HTTP '+response.status);
  return response.json();
}

// Example:
// const result=await askWiki("Why won't my towers upgrade?",{version:"v1.3.5"});
// if (result.status === 'answered') console.log(result.answer,result.citations);
// else console.log(result.message);

"""Zero-dependency Python 3 client for Ultimate Macro Wiki Ask."""
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

def ask_wiki(question, version=None, mode="sourced", base_url="https://ultmacro.xyz"):
    payload = {"question": question, "mode": mode}
    if version is not None:
        payload["version"] = version
    request = Request(
        base_url.rstrip("/") + "/api/wiki/v1/ask",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "UltimateMacroWikiExample/1.0 (+https://ultmacro.xyz/wiki/api/)",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=8) as response:
            return json.load(response)
    except HTTPError as error:
        raise RuntimeError(f"Wiki API HTTP {error.code}") from error

# Example:
# result = ask_wiki("How do I record a strategy?", version="v1.3.5")
# print(result["answer"] if result["status"] == "answered" else result["message"])

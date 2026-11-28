# Runpod-MCP als Funktion: rufe(name, args) -> dict (erstes Textstück als JSON, sonst Text)
import json, urllib.request, os
_ID = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pod.id')
POD = os.environ.get('POD') or (open(_ID).read().strip() if os.path.exists(_ID) else '')
def rufe(name, args, zeit=120):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": name, "arguments": args}}).encode()
    req = urllib.request.Request("https://mcp.runpod.io/", data=body, headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream", "MCP-Protocol-Version": "2025-06-18"})
    t = urllib.request.urlopen(req, timeout=zeit).read().decode()
    if "data: " in t: t = [l[6:] for l in t.splitlines() if l.startswith("data: ")][-1]
    r = json.loads(t).get("result", {}); txt = "".join(c.get("text", "") for c in r.get("content", []))
    try: return json.loads(txt)
    except Exception: return {"text": txt}
def ex(cmd, zeit=25):
    return rufe("exec-pod", {"id": POD, "body": {"command": cmd if isinstance(cmd, list) else ["sh", "-c", cmd], "timeoutSeconds": zeit}})

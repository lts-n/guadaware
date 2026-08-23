from bottle import run as runapi
from bottle import route, response, hook
import subprocess
import html

TERMINAL_PAGE = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body {{ margin: 0; padding: 10px 12px; background: #000; color: #e8e8e8;
font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
user-select: text; cursor: text; word-break: break-word; white-space: pre-wrap; }}
.err {{ color: #ff6b60; }}
</style></head><body>{}</body></html>"""

@hook("after_request")
def allow_cors():
    response.headers["Access-Control-Allow-Origin"] = "*"

@route("/poweroff")
def poweroff():
    subprocess.run(["poweroff"])

@route("/sh/<cmd:path>")
def sh(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    out = html.escape(result.stdout)
    err = html.escape(result.stderr)
    body = out + (f'<span class="err">{err}</span>' if err else "")
    return TERMINAL_PAGE.format(body)

@route("/getStatusbarUser")
def get_statusbaruser():
    return "<DOCTYPE html><html><head><style>body { color: #000000; font-size: clamp(11px, 1.6vw, 14px); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); font-family: -apple-system, \"Helvetica Neue\", Helvetica, Arial, sans-serif; }</style></head><body>" + subprocess.run(["whoami"], shell=True, capture_output=True, text=True).stdout + "</body></html>"

@route("/setAirplanemode/<switch>")
def set_airplanemode(switch):
    if switch=="0":
        subprocess.run(["nmcli", "radio", "all", "on"])
    elif switch=="1":
        subprocess.run(["nmcli", "radio", "all", "off"])
    
runapi(host="localhost", port=8080, debug=True)

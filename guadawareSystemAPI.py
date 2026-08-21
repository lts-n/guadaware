from bottle import run as runapi
from bottle import route
import subprocess

@route("/poweroff")
def poweroff():
    subprocess.run(["poweroff"])

@route("/sh/<cmd>")
def sh(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout

runapi(host="localhost", port=8080, debug=True)

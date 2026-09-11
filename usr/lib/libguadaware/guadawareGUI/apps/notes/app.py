from bottle import Bottle, run, request, response, hook, template, redirect
from Note import Note
from pickle import load
import json
import os

app = Bottle()


@hook("after_request")
def allow_cors():
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"


def load_notes():
    try:
        with open("notes.pkl", "rb") as f:
            return load(f)
    except (FileNotFoundError, EOFError):
        return []


def save_notes(notes):
    import pickle
    with open("notes.pkl", "wb") as f:
        pickle.dump(notes, f)


@app.route("/", method=["GET"])
def list_view():
    notes = load_notes()
    data = json.dumps([{"title": n.title, "content": n.content} for n in notes])
    return template("index", notes_json=data)


@app.route("/get", method=["GET"])
def get_notes():
    notes = load_notes()
    return json.dumps([{"title": n.title, "content": n.content} for n in notes])


@app.route("/edit", method=["GET"])
def edit_view():
    title = request.query.get("title", "")
    content = request.query.get("content", "")
    return template("edit", title=title, content=content)


@app.route("/delete", method=["POST"])
def delete_note():
    data = request.json
    title = data.get("title", "")
    content = data.get("content", "")
    notes = load_notes()
    for note in notes:
        if note.title == title and note.content == content:
            notes.remove(note)
            save_notes(notes)
            return json.dumps({"ok": True})
    response.status = 404
    return json.dumps({"error": "not found"})


@app.route("/save", method=["POST"])
def save_note():
    data = request.json
    old_title = data.get("oldTitle", "")
    old_content = data.get("oldContent", "")
    new_title = data.get("title", "").strip()
    new_content = data.get("content", "").strip()

    if not new_title:
        response.status = 400
        return json.dumps({"error": "title required"})

    notes = load_notes()

    if old_title or old_content:
        for note in notes:
            if note.title == old_title and note.content == old_content:
                notes.remove(note)
                break

    note = Note(new_title, new_content)
    notes.insert(0, note)
    save_notes(notes)
    return json.dumps({"ok": True})


port = int(os.environ.get("GUADAWARE_NOTES_PORT", "8082"))
run(app, host="localhost", port=port, debug=True)

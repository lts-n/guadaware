<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="http://localhost:8000/guadawareUniversalFramework/style.css">
    <title>Notes</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; overflow: hidden; background: #f2f2f7; }
        body { display: flex; flex-direction: column; font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; }

        /* Override framework header styles */
        header {
            position: relative; top: auto; left: auto; right: auto;
            height: 44px; padding: 0 10px;
            background: rgba(249,249,249,0.94);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            backdrop-filter: blur(20px) saturate(180%);
            border-bottom: 0.5px solid #c8c8c8;
            display: flex; align-items: center; justify-content: space-between;
            flex-shrink: 0;
        }
        header h1 {
            position: static; left: auto; right: auto; bottom: auto;
            font-size: 17px; font-weight: 600; text-align: center;
            flex: 1;
        }
        header button {
            position: static; bottom: auto;
            display: inline-flex; align-items: center; justify-content: center;
            width: auto; min-width: 60px; padding: 0;
            background: none; border: none; border-radius: 0;
            color: #007aff; font-size: 17px; cursor: pointer;
        }
        header button:first-child { position: static; left: auto; }
        header button:first-child::before { display: none; }
        header button:last-child { position: static; right: auto; }
        header button:active { opacity: 0.4; filter: none; }

        #notes-list { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }

        .note-item {
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 16px; background: #fff;
            border-bottom: 0.5px solid rgba(0,0,0,0.08); cursor: pointer;
        }
        .note-item:active { background: #f2f2f7; }
        .note-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .note-title { font-size: 16px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .note-preview { font-size: 14px; color: #8e8e93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .note-chevron { color: #c7c7cc; margin-left: 8px; flex-shrink: 0; }
        .note-delete {
            width: 32px; height: 32px; border: none; border-radius: 50%;
            background: #ff3b30; color: #fff; font-size: 18px; font-weight: 600;
            display: none; align-items: center; justify-content: center;
            cursor: pointer; flex-shrink: 0; margin-left: 8px;
        }
        .note-delete.visible { display: flex; }
        .note-delete:active { background: #d32f2f; }

        #empty-state {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; height: 100%; gap: 12px; padding: 24px;
        }
        #empty-state.hidden { display: none; }
        #empty-state p { font-size: 16px; color: rgba(0,0,0,0.4); }

        #confirm-dialog {
            position: fixed; inset: 0; background: rgba(0,0,0,0.4);
            display: flex; align-items: center; justify-content: center; z-index: 50;
        }
        #confirm-dialog.hidden { display: none; }
        #confirm-box {
            background: #fff; border-radius: 14px; width: 270px; overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        #confirm-msg {
            padding: 20px 16px 16px; text-align: center; font-size: 17px; font-weight: 500;
            border-bottom: 0.5px solid rgba(0,0,0,0.1);
        }
        #confirm-actions { display: flex; }
        #confirm-actions button {
            flex: 1; padding: 14px; border: none; background: transparent;
            font-size: 17px; cursor: pointer;
        }
        #confirm-actions button:active { background: #f2f2f7; }
        #confirm-cancel { color: #0a84ff; border-right: 0.5px solid rgba(0,0,0,0.1); }
        #confirm-delete { color: #ff3b30; font-weight: 600; }
    </style>
</head>
<body>
    <header>
        <button id="btn-edit-toggle" aria-label="Edit">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
        </button>
        <h1 data-locale="notes.title">Notes</h1>
        <button id="btn-add" aria-label="New Note">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
        </button>
    </header>

    <main id="notes-list"></main>

    <div id="empty-state" class="hidden">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p data-locale="notes.empty">No notes yet</p>
    </div>

    <div id="confirm-dialog" class="hidden">
        <div id="confirm-box">
            <div id="confirm-msg" data-locale="notes.confirmdelete">Delete this note?</div>
            <div id="confirm-actions">
                <button id="confirm-cancel" data-locale="notes.cancel">Cancel</button>
                <button id="confirm-delete" data-locale="notes.delete">Delete</button>
            </div>
        </div>
    </div>

    <script id="notes-data" type="application/json" data-notes='{{notes_json}}'></script>
    <script src="http://localhost:8000/guadawareUniversalFramework/Locale.js"></script>
    <script>
    (function() {
        var API = "http://localhost:8082";
        var notesEl = document.getElementById("notes-data");
        var notes = JSON.parse(notesEl.getAttribute("data-notes"));
        var editMode = false;
        var deleteTarget = null;

        var notesList = document.getElementById("notes-list");
        var emptyState = document.getElementById("empty-state");
        var btnAdd = document.getElementById("btn-add");
        var btnEditToggle = document.getElementById("btn-edit-toggle");
        var confirmDialog = document.getElementById("confirm-dialog");
        var confirmCancel = document.getElementById("confirm-cancel");
        var confirmDelete = document.getElementById("confirm-delete");

        function escapeHtml(s) {
            var d = document.createElement("div");
            d.textContent = s;
            return d.innerHTML;
        }

        function render() {
            if (notes.length === 0) {
                notesList.innerHTML = "";
                emptyState.classList.remove("hidden");
                return;
            }
            emptyState.classList.add("hidden");
            var html = "";
            notes.forEach(function(n, i) {
                var preview = n.content ? escapeHtml(n.content.substring(0, 80)) : "";
                html += '<div class="note-item" data-index="' + i + '">' +
                    '<div class="note-text">' +
                        '<span class="note-title">' + escapeHtml(n.title) + '</span>' +
                        '<span class="note-preview">' + preview + '</span>' +
                    '</div>' +
                    '<button class="note-delete' + (editMode ? ' visible' : '') + '" data-index="' + i + '">−</button>' +
                    '<span class="note-chevron">›</span>' +
                '</div>';
            });
            notesList.innerHTML = html;

            notesList.querySelectorAll(".note-item").forEach(function(el) {
                el.addEventListener("click", function(e) {
                    if (e.target.classList.contains("note-delete")) return;
                    var idx = parseInt(el.dataset.index);
                    var n = notes[idx];
                    window.location.href = "/edit?title=" + encodeURIComponent(n.title) + "&content=" + encodeURIComponent(n.content);
                });
            });

            notesList.querySelectorAll(".note-delete").forEach(function(btn) {
                btn.addEventListener("click", function(e) {
                    e.stopPropagation();
                    var idx = parseInt(btn.dataset.index);
                    deleteTarget = notes[idx];
                    confirmDialog.classList.remove("hidden");
                });
            });
        }

        btnAdd.addEventListener("click", function() {
            window.location.href = "/edit";
        });

        btnEditToggle.addEventListener("click", function() {
            editMode = !editMode;
            render();
        });

        confirmCancel.addEventListener("click", function() {
            confirmDialog.classList.add("hidden");
            deleteTarget = null;
        });

        confirmDelete.addEventListener("click", function() {
            if (!deleteTarget) return;
            fetch(API + "/delete", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({title: deleteTarget.title, content: deleteTarget.content})
            }).then(function() {
                confirmDialog.classList.add("hidden");
                deleteTarget = null;
                window.location.reload();
            });
        });

        render();
    })();
    </script>
</body>
</html>

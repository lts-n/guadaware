<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="http://localhost:8000/guadawareUniversalFramework/style.css">
    <title>Edit Note</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; overflow: hidden; background: #fff; }
        body { display: flex; flex-direction: column; font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; }

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
        header button:last-child { position: static; right: auto; }
        header button:active { opacity: 0.4; filter: none; }

        #edit-fields { flex: 1; display: flex; flex-direction: column; padding: 0 16px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        #field-title {
            width: 100%; border: none; border-bottom: 0.5px solid rgba(0,0,0,0.1);
            padding: 16px 0; font-size: 22px; font-weight: 600; outline: none;
            background: transparent; color: #000;
        }
        #field-content {
            flex: 1; width: 100%; border: none; padding: 16px 0; font-size: 16px;
            line-height: 1.5; outline: none; resize: none; background: transparent;
            font-family: inherit; color: #000; min-height: 200px;
        }
    </style>
</head>
<body>
    <header>
        <button id="btn-back" aria-label="Back">
        </button>
        <h1 data-locale="notes.edit">Edit</h1>
        <button id="btn-save" data-locale="notes.save">Save</button>
    </header>

    <main id="edit-fields">
        <input type="text" id="field-title" data-locale-placeholder="notes.notetitle" placeholder="Title">
        <textarea id="field-content" data-locale-placeholder="notes.notecontent" placeholder="Write something..."></textarea>
    </main>

    <script src="http://localhost:8000/guadawareUniversalFramework/Locale.js"></script>
    <script>
    (function() {
        var API = "http://localhost:8082";
        var fieldTitle = document.getElementById("field-title");
        var fieldContent = document.getElementById("field-content");
        var btnBack = document.getElementById("btn-back");
        var btnSave = document.getElementById("btn-save");

        var params = new URLSearchParams(window.location.search);
        var oldTitle = params.get("title") || "";
        var oldContent = params.get("content") || "";

        fieldTitle.value = oldTitle;
        fieldContent.value = oldContent;

        btnBack.addEventListener("click", function() {
            window.location.href = "/";
        });

        btnSave.addEventListener("click", function() {
            var title = fieldTitle.value.trim();
            var content = fieldContent.value.trim();
            if (!title) return;

            fetch(API + "/save", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    oldTitle: oldTitle,
                    oldContent: oldContent,
                    title: title,
                    content: content
                })
            }).then(function() {
                window.location.href = "/";
            });
        });

        /* ── Cross-origin keyboard bridge ── */
        function notifyFocus(el) {
            var placeholder = el.getAttribute("placeholder") || el.getAttribute("data-locale-placeholder") || "";
            try { parent.postMessage({ type: "guadaware:input-focus", placeholder: placeholder }, "*"); } catch (e) {}
        }

        function notifyBlur() {
            try { parent.postMessage({ type: "guadaware:input-blur" }, "*"); } catch (e) {}
        }

        function insertIntoFocused(char) {
            var el = document.activeElement;
            if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
            var start = el.selectionStart;
            var end = el.selectionEnd;
            var val = el.value;
            el.value = val.substring(0, start) + char + val.substring(end);
            var newPos = start + char.length;
            el.setSelectionRange(newPos, newPos);
            el.dispatchEvent(new Event("input", { bubbles: true }));
        }

        function backspaceFocused() {
            var el = document.activeElement;
            if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
            var start = el.selectionStart;
            var end = el.selectionEnd;
            var val = el.value;
            if (start !== end) {
                el.value = val.substring(0, start) + val.substring(end);
                el.setSelectionRange(start, start);
            } else if (start > 0) {
                el.value = val.substring(0, start - 1) + val.substring(start);
                el.setSelectionRange(start - 1, start - 1);
            }
            el.dispatchEvent(new Event("input", { bubbles: true }));
        }

        function enterFocused() {
            var el = document.activeElement;
            if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
            el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
        }

        document.querySelectorAll("input, textarea").forEach(function(el) {
            el.addEventListener("focus", function() { notifyFocus(el); });
            el.addEventListener("blur", function() { notifyBlur(); });
        });

        window.addEventListener("message", function(e) {
            if (!e.data || typeof e.data.type !== "string") return;
            if (e.data.type === "guadaware:keyboard-input") {
                insertIntoFocused(e.data.char);
            } else if (e.data.type === "guadaware:keyboard-backspace") {
                backspaceFocused();
            } else if (e.data.type === "guadaware:keyboard-enter") {
                enterFocused();
            }
        });
    })();
    </script>
</body>
</html>

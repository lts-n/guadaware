const form = document.getElementById("command-form");
const input = document.getElementById("command-input");
const iframe = document.getElementById("terminal-iframe");
const backBtn = document.getElementById("back-btn");
const forwardBtn = document.getElementById("forward-btn");
const searchBtn = document.getElementById("search-btn");

const PROXY = "";

let history = [];
let index = -1;

function render() {
    input.value = history[index] || "";
    backBtn.disabled = index <= 0;
    forwardBtn.disabled = index >= history.length - 1;
}

function go(url) {
    if (!url) return;
    if (history[index] === url) {
        iframe.src = PROXY ? PROXY + encodeURIComponent(url) : url;
        return;
    }
    history = history.slice(0, index + 1);
    history.push(url);
    index = history.length - 1;
    iframe.src = PROXY ? PROXY + encodeURIComponent(url) : url;
    render();
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    go(input.value.trim());
});

searchBtn.addEventListener("click", () => {
    go(input.value.trim());
});

backBtn.addEventListener("click", () => {
    if (index <= 0) return;
    index--;
    iframe.src = PROXY ? PROXY + encodeURIComponent(history[index]) : history[index];
    render();
});

forwardBtn.addEventListener("click", () => {
    if (index >= history.length - 1) return;
    index++;
    iframe.src = PROXY ? PROXY + encodeURIComponent(history[index]) : history[index];
    render();
});

iframe.addEventListener("load", () => {
    try {
        const loc = iframe.contentWindow.location.href;
        if (!loc || loc === "about:blank") return;
        if (PROXY && loc.startsWith(PROXY)) {
            input.value = decodeURIComponent(loc.slice(PROXY.length));
        } else if (loc.startsWith("http://") || loc.startsWith("https://")) {
            input.value = loc;
        }
    } catch (e) {}
});

render();
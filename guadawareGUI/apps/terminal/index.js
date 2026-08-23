document.getElementById("command-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const cmd = document.getElementById("command-input");
    const iframe = document.getElementById("terminal-iframe");
    if (!cmd.value.trim()) return;
    iframe.src = `http://localhost:8080/sh/${encodeURIComponent(cmd.value)}`;
    cmd.value = "";
});

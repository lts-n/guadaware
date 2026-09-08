const API = "http://localhost:8080";
const locale = new Locale();
const t = (key) => locale.t(key);

const conversationsView = document.getElementById("conversations-view");
const chatView = document.getElementById("chat-view");
const newMessageView = document.getElementById("new-message-view");
const conversationsList = document.getElementById("conversations-list");
const emptyState = document.getElementById("empty-state");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const backBtn = document.getElementById("back-btn");
const newBtn = document.getElementById("new-btn");
const newNumberInput = document.getElementById("new-number-input");
const newMessageInput = document.getElementById("new-message-input");
const newSendBtn = document.getElementById("new-send-btn");
const notificationSound = document.getElementById("notification-sound");

let conversations = {};
let currentNumber = null;
let lastSmsCount = 0;
let pollInterval = null;

function showView(view) {
    conversationsView.style.display = "none";
    chatView.style.display = "none";
    newMessageView.style.display = "none";
    view.style.display = view === chatView ? "flex" : "block";
}

function formatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
        return t("messages.yesterday");
    } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "long" });
    } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
}

function groupMessages(messages) {
    const grouped = {};
    messages.forEach((sms) => {
        const number = sms.number || "unknown";
        if (!grouped[number]) {
            grouped[number] = [];
        }
        grouped[number].push(sms);
    });
    return grouped;
}

function renderConversations() {
    conversationsList.innerHTML = "";
    const numbers = Object.keys(conversations);

    if (numbers.length === 0) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";
    numbers.sort((a, b) => {
        const lastA = conversations[a][conversations[a].length - 1];
        const lastB = conversations[b][conversations[b].length - 1];
        return (lastB.timestamp || 0) - (lastA.timestamp || 0);
    });

    numbers.forEach((number) => {
        const msgs = conversations[number];
        const lastMsg = msgs[msgs.length - 1];
        const initial = number.charAt(0).toUpperCase();

        const item = document.createElement("div");
        item.className = "conversation-item";
        item.innerHTML = `
            <div class="conversation-avatar">${initial}</div>
            <div class="conversation-content">
                <div class="conversation-header">
                    <span class="conversation-number">${number}</span>
                    <span class="conversation-time">${formatTime(lastMsg.timestamp)}</span>
                </div>
                <div class="conversation-preview">${lastMsg.text || ""}</div>
            </div>
        `;
        item.addEventListener("click", () => openChat(number));
        conversationsList.appendChild(item);
    });
}

function openChat(number) {
    currentNumber = number;
    chatMessages.innerHTML = "";
    const msgs = conversations[number] || [];

    msgs.forEach((sms) => {
        const isSent = sms.state === "sent" || sms.state === "stored-sent";
        const bubble = document.createElement("div");
        bubble.className = `message-bubble ${isSent ? "message-sent" : "message-received"}`;
        bubble.textContent = sms.text || "";
        chatMessages.appendChild(bubble);
    });

    chatInput.value = "";
    showView(chatView);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage(number, text) {
    if (!text.trim()) return;

    fetch(`${API}/sendSMS/${encodeURIComponent(number)}/${encodeURIComponent(text)}`)
        .then((res) => res.text())
        .then((result) => {
            if (result === "ok") {
                if (!conversations[number]) {
                    conversations[number] = [];
                }
                conversations[number].push({
                    number: number,
                    text: text,
                    state: "sent",
                    timestamp: Math.floor(Date.now() / 1000)
                });
                localStorage.setItem("guadaware-sms", JSON.stringify(conversations));
                openChat(number);
                renderConversations();
            }
        })
        .catch(() => {});
}

function playNotification() {
    notificationSound.currentTime = 0;
    notificationSound.play().catch(() => {});
}

function checkNewMessages() {
    fetch(`${API}/getSMSList`)
        .then((res) => res.json())
        .then((messages) => {
            const received = messages.filter((m) => m.state === "received");
            if (lastSmsCount > 0 && received.length > lastSmsCount) {
                playNotification();
            }
            lastSmsCount = received.length;

            received.forEach((sms) => {
                const number = sms.number || "unknown";
                if (!conversations[number]) {
                    conversations[number] = [];
                }
                const exists = conversations[number].some(
                    (m) => m.text === sms.text && m.number === number
                );
                if (!exists) {
                    conversations[number].push({
                        number: number,
                        text: sms.text,
                        state: "received",
                        timestamp: Math.floor(Date.now() / 1000)
                    });
                    fetch(`${API}/deleteSMS/${sms.index}`).catch(() => {});
                }
            });

            localStorage.setItem("guadaware-sms", JSON.stringify(conversations));
            renderConversations();
        })
        .catch(() => {});
}

function loadSavedConversations() {
    try {
        const saved = localStorage.getItem("guadaware-sms");
        if (saved) {
            conversations = JSON.parse(saved);
        }
    } catch (e) {
        conversations = {};
    }
}

backBtn.addEventListener("click", () => {
    if (chatView.style.display === "flex") {
        currentNumber = null;
        showView(conversationsView);
        renderConversations();
    } else if (newMessageView.style.display === "block") {
        showView(conversationsView);
        renderConversations();
    }
});

newBtn.addEventListener("click", () => {
    newNumberInput.value = "";
    newMessageInput.value = "";
    showView(newMessageView);
});

sendBtn.addEventListener("click", () => {
    if (currentNumber) {
        sendMessage(currentNumber, chatInput.value);
        chatInput.value = "";
    }
});

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && currentNumber) {
        sendMessage(currentNumber, chatInput.value);
        chatInput.value = "";
    }
});

newSendBtn.addEventListener("click", () => {
    const number = newNumberInput.value.trim();
    const text = newMessageInput.value.trim();
    if (number && text) {
        sendMessage(number, text);
        showView(conversationsView);
    }
});

loadSavedConversations();
renderConversations();
checkNewMessages();
pollInterval = setInterval(checkNewMessages, 5000);
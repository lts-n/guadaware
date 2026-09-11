(function () {
  "use strict";

  const DB_NAME = "GuadawareContactsDB";
  const DB_VERSION = 1;
  const STORE_NAME = "contacts";
  const API = "http://localhost:8080";

  const contactsList = document.getElementById("contacts-list");
  const contactsEmpty = document.getElementById("contacts-empty");
  const contactForm = document.getElementById("contact-form");
  const contactDetail = document.getElementById("contact-detail");
  const searchInput = document.getElementById("search-input");

  const btnAdd = document.getElementById("btn-add");
  const btnCancel = document.getElementById("btn-cancel");
  const btnSave = document.getElementById("btn-save");
  const btnBackList = document.getElementById("btn-back-list");
  const btnDelete = document.getElementById("btn-delete");
  const btnCall = document.getElementById("btn-call");
  const btnSms = document.getElementById("btn-sms");
  const btnEdit = document.getElementById("btn-edit");

  const formTitle = document.getElementById("form-title");
  const fieldName = document.getElementById("field-name");
  const fieldPhone = document.getElementById("field-phone");
  const fieldEmail = document.getElementById("field-email");
  const fieldNotes = document.getElementById("field-notes");
  const avatarCircle = document.getElementById("avatar-circle");

  const detailAvatar = document.getElementById("detail-avatar");
  const detailName = document.getElementById("detail-name");
  const detailPhone = document.getElementById("detail-phone");
  const detailEmail = document.getElementById("detail-email");
  const detailNotes = document.getElementById("detail-notes");

  let db = null;
  let contacts = [];
  let editingId = null;
  let currentContact = null;
  let searchTerm = "";

  const AVATAR_COLORS = [
    "#0a84ff", "#30d158", "#ff9500", "#ff3b30",
    "#bf5af2", "#ff2d55", "#5856d6", "#00c7be"
  ];

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("uid", "uid", { unique: true });
        }
      };
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function getAllContacts() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function getContactByUid(uid) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("uid");
      const req = index.get(uid);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function saveContact(contact) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = contact.id ? store.put(contact) : store.add(contact);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function deleteContactFromDB(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function generateUID() {
    return "guadaware-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  function vCardToContact(vcard, uid) {
    const lines = vcard.split(/\r?\n/);
    const contact = { uid: uid };

    for (const line of lines) {
      if (line.startsWith("FN:")) {
        contact.name = line.substring(3);
      } else if (line.startsWith("TEL")) {
        const match = line.match(/:([^:]+)$/);
        if (match) contact.phone = match[1];
      } else if (line.startsWith("EMAIL")) {
        const match = line.match(/:([^:]+)$/);
        if (match) contact.email = match[1];
      } else if (line.startsWith("NOTE:")) {
        contact.notes = line.substring(5);
      }
    }

    return contact;
  }

  async function syncFromServer() {
    try {
      const res = await fetch(`${API}/getContactList`);
      const serverContacts = await res.json();

      for (const sc of serverContacts) {
        const contact = vCardToContact(sc.vcard, sc.uid);
        contact.name = contact.name || sc.name;

        const existing = contacts.find(c => c.uid === contact.uid);
        if (existing) {
          contact.id = existing.id;
        }
        await saveContact(contact);
      }
    } catch (err) {
      console.error("Sync from server error:", err);
    }
  }

  function contactToVCard(contact) {
    const uid = contact.uid || generateUID();
    let vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `UID:${uid}`,
      `FN:${contact.name}`,
      `N:${contact.name.split(" ").pop()};${contact.name.split(" ").slice(0, -1).join(" ")};;;`
    ];
    if (contact.phone) {
      vcard.push(`TEL;TYPE=CELL:${contact.phone}`);
    }
    if (contact.email) {
      vcard.push(`EMAIL:${contact.email}`);
    }
    if (contact.notes) {
      vcard.push(`NOTE:${contact.notes}`);
    }
    vcard.push("END:VCARD");
    return vcard.join("\r\n");
  }

  async function saveToServer(contact) {
    try {
      const vcard = contactToVCard(contact);
      const res = await fetch(`${API}/saveContact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: contact.uid, vcard: vcard })
      });
      const data = await res.json();
      return data.uid;
    } catch (err) {
      console.error("Save to server error:", err);
      return null;
    }
  }

  async function deleteFromServer(uid) {
    try {
      await fetch(`${API}/deleteContact/${encodeURIComponent(uid)}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Delete from server error:", err);
    }
  }

  function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function getInitials(name) {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }

  function renderList() {
    let filtered = contacts;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = contacts.filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    if (filtered.length === 0) {
      contactsList.innerHTML = "";
      contactsEmpty.classList.remove("hidden");
      return;
    }

    contactsEmpty.classList.add("hidden");

    let html = "";
    let lastLetter = "";

    filtered.forEach(contact => {
      const firstLetter = contact.name[0].toUpperCase();
      if (firstLetter !== lastLetter) {
        lastLetter = firstLetter;
        html += `<div class="letter-header">${firstLetter}</div>`;
      }
      const color = getAvatarColor(contact.name);
      const initials = getInitials(contact.name);
      html += `
        <div class="contact-item" data-id="${contact.id}">
          <div class="contact-avatar" style="background:${color}">${initials}</div>
          <div class="contact-info">
            <span class="contact-name">${escapeHtml(contact.name)}</span>
            <span class="contact-phone">${escapeHtml(contact.phone || "")}</span>
          </div>
        </div>`;
    });

    contactsList.innerHTML = html;

    contactsList.querySelectorAll(".contact-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = parseInt(item.dataset.id, 10);
        showDetail(id);
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showList() {
    contactForm.classList.add("hidden");
    contactDetail.classList.add("hidden");
    contactsList.parentElement.querySelector("#search-bar").classList.remove("hidden");
  }

  function showForm(contact) {
    editingId = contact ? contact.id : null;
    formTitle.textContent = contact ? "Edit Contact" : "New Contact";
    fieldName.value = contact ? contact.name : "";
    fieldPhone.value = contact ? contact.phone || "" : "";
    fieldEmail.value = contact ? contact.email || "" : "";
    fieldNotes.value = contact ? contact.notes || "" : "";

    const name = contact ? contact.name : "";
    const color = getAvatarColor(name || "N");
    const initials = getInitials(name || "N");
    avatarCircle.style.background = color;
    avatarCircle.textContent = initials;

    contactDetail.classList.add("hidden");
    contactForm.classList.remove("hidden");
  }

  function showDetail(id) {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    currentContact = contact;

    const color = getAvatarColor(contact.name);
    const initials = getInitials(contact.name);
    detailAvatar.style.background = color;
    detailAvatar.textContent = initials;
    detailName.textContent = contact.name;
    detailPhone.textContent = contact.phone || "—";
    detailEmail.textContent = contact.email || "—";
    detailNotes.textContent = contact.notes || "—";

    contactForm.classList.add("hidden");
    contactDetail.classList.remove("hidden");
  }

  async function handleSave() {
    const name = fieldName.value.trim();
    if (!name) return;

    const contact = {
      name: name,
      phone: fieldPhone.value.trim(),
      email: fieldEmail.value.trim(),
      notes: fieldNotes.value.trim()
    };

    if (editingId) {
      const existing = contacts.find(c => c.id === editingId);
      if (existing) {
        contact.id = existing.id;
        contact.uid = existing.uid;
      }
    } else {
      contact.uid = generateUID();
    }

    const serverUid = await saveToServer(contact);
    if (serverUid) {
      contact.uid = serverUid;
    }

    await saveContact(contact);
    contacts = await getAllContacts();
    showList();
    renderList();
  }

  async function handleDelete() {
    if (!currentContact) return;
    if (currentContact.uid) {
      await deleteFromServer(currentContact.uid);
    }
    await deleteContactFromDB(currentContact.id);
    contacts = await getAllContacts();
    showList();
    renderList();
  }

  function handleCall() {
    if (!currentContact || !currentContact.phone) return;
    window.location.href = `http://localhost:8080/makeCall/${encodeURIComponent(currentContact.phone)}`;
  }

  function handleSms() {
    if (!currentContact || !currentContact.phone) return;
    window.location.href = `../SMS/`;
  }

  function handleEdit() {
    if (!currentContact) return;
    showForm(currentContact);
  }

  btnAdd.addEventListener("click", () => showForm(null));
  btnCancel.addEventListener("click", showList);
  btnSave.addEventListener("click", handleSave);
  btnBackList.addEventListener("click", showList);
  btnDelete.addEventListener("click", handleDelete);
  btnCall.addEventListener("click", handleCall);
  btnSms.addEventListener("click", handleSms);
  btnEdit.addEventListener("click", handleEdit);

  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderList();
  });

  fieldName.addEventListener("input", () => {
    const name = fieldName.value || "N";
    const color = getAvatarColor(name);
    const initials = getInitials(name);
    avatarCircle.style.background = color;
    avatarCircle.textContent = initials;
  });

  async function init() {
    await openDB();
    await syncFromServer();
    contacts = await getAllContacts();
    renderList();
  }

  init();
})();

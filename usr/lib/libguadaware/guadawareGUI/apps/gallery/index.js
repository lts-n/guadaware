(function () {
  "use strict";

  const DB_NAME = "GuadawareCameraDB";
  const DB_VERSION = 1;
  const STORE_NAME = "photos";

  const grid = document.getElementById("gallery-grid");
  const emptyState = document.getElementById("gallery-empty");
  const lightbox = document.getElementById("lightbox");
  const lbImage = document.getElementById("lb-image");
  const lbCounter = document.getElementById("lb-counter");
  const lbClose = document.getElementById("lb-close");
  const lbDelete = document.getElementById("lb-delete");
  const lbPrev = document.getElementById("lb-prev");
  const lbNext = document.getElementById("lb-next");
  const btnBack = document.getElementById("btn-back");
  const btnSelect = document.getElementById("btn-select");
  const btnOpenCamera = document.getElementById("btn-open-camera");
  const toast = document.getElementById("gallery-toast");

  let db = null;
  let photos = [];
  let currentIndex = 0;
  let selectMode = false;
  let selectedIds = new Set();

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function getAllPhotos() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      const req = index.openCursor(null, "prev");
      const results = [];
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  function deletePhoto(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function getServerPhotos() {
    try {
      const res = await fetch("http://localhost:8080/getPhotoList");
      const data = await res.json();
      return data.map(item => ({
        id: `server_${item.filename}`,
        blob: null,
        url: `http://localhost:8080${item.url}`,
        type: item.is_video ? "video/webm" : "image/jpeg",
        timestamp: item.modified * 1000,
        isServer: true,
        filename: item.filename
      }));
    } catch (err) {
      console.error("Server photos error:", err);
      return [];
    }
  }

  async function deleteServerPhoto(filename) {
    try {
      await fetch(`http://localhost:8080/deletePhoto/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      return true;
    } catch (err) {
      console.error("Server delete error:", err);
      return false;
    }
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  }

  function groupByDate(photoList) {
    const groups = {};
    photoList.forEach(photo => {
      const key = formatDate(photo.timestamp);
      if (!groups[key]) groups[key] = [];
      groups[key].push(photo);
    });
    return groups;
  }

  async function renderGrid() {
    const dbPhotos = await getAllPhotos();
    const serverPhotos = await getServerPhotos();
    
    photos = [...dbPhotos, ...serverPhotos].sort((a, b) => b.timestamp - a.timestamp);

    if (photos.length === 0) {
      grid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const groups = groupByDate(photos);
    let html = "";

    for (const [date, items] of Object.entries(groups)) {
      html += `<div class="gallery-section">`;
      html += `<h2 class="section-date">${date}</h2>`;
      html += `<div class="section-grid">`;
      items.forEach((photo, idx) => {
        const globalIdx = photos.indexOf(photo);
        const selected = selectedIds.has(photo.id);
        const typeIcon = photo.type && photo.type.startsWith("video/")
          ? `<div class="video-icon">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                 <polygon points="5 3 19 12 5 21 5 3"/>
               </svg>
             </div>`
          : "";
        html += `
          <div class="gallery-item ${selected ? 'selected' : ''}" data-index="${globalIdx}" data-id="${photo.id}">
            <div class="item-thumb" style="background-image:url()"></div>
            ${typeIcon}
            ${selectMode ? `<div class="item-check">${selected ? '✓' : ''}</div>` : ''}
          </div>`;
      });
      html += `</div></div>`;
    }

    grid.innerHTML = html;

    photos.forEach((photo, idx) => {
      const el = grid.querySelector(`[data-index="${idx}"] .item-thumb`);
      if (el) {
        let url;
        if (photo.isServer) {
          url = photo.url;
        } else {
          url = URL.createObjectURL(photo.blob);
        }
        el.style.backgroundImage = `url(${url})`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
      }
    });

    grid.querySelectorAll(".gallery-item").forEach(item => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.dataset.index, 10);
        if (selectMode) {
          toggleSelect(photos[idx].id);
        } else {
          openLightbox(idx);
        }
      });
    });
  }

  function toggleSelect(id) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    const item = grid.querySelector(`[data-id="${id}"]`);
    if (item) {
      item.classList.toggle("selected", selectedIds.has(id));
      const check = item.querySelector(".item-check");
      if (check) check.textContent = selectedIds.has(id) ? "✓" : "";
    }
  }

  function openLightbox(index) {
    currentIndex = index;
    updateLightbox();
    lightbox.classList.remove("hidden");
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
  }

  function updateLightbox() {
    if (photos.length === 0) return;
    const photo = photos[currentIndex];
    
    let url;
    if (photo.isServer) {
      url = photo.url;
    } else {
      url = URL.createObjectURL(photo.blob);
    }

    if (photo.type && photo.type.startsWith("video/")) {
      lbImage.style.display = "none";
      let videoEl = document.getElementById("lb-video");
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.id = "lb-video";
        videoEl.controls = true;
        videoEl.autoplay = true;
        videoEl.style.maxWidth = "100%";
        videoEl.style.maxHeight = "100%";
        document.getElementById("lightbox-viewport").appendChild(videoEl);
      }
      videoEl.src = url;
      videoEl.style.display = "block";
    } else {
      let videoEl = document.getElementById("lb-video");
      if (videoEl) videoEl.style.display = "none";
      lbImage.style.display = "block";
      lbImage.src = url;
    }

    lbCounter.textContent = `${currentIndex + 1} / ${photos.length}`;
    lbPrev.style.display = currentIndex > 0 ? "flex" : "none";
    lbNext.style.display = currentIndex < photos.length - 1 ? "flex" : "none";
  }

  function navigateLightbox(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < photos.length) {
      currentIndex = newIndex;
      updateLightbox();
    }
  }

  async function deleteCurrentPhoto() {
    if (photos.length === 0) return;
    const photo = photos[currentIndex];

    try {
      if (photo.isServer) {
        await deleteServerPhoto(photo.filename);
      } else {
        await deletePhoto(photo.id);
      }
      photos.splice(currentIndex, 1);

      if (photos.length === 0) {
        closeLightbox();
        await renderGrid();
        return;
      }

      if (currentIndex >= photos.length) {
        currentIndex = photos.length - 1;
      }
      updateLightbox();
      showToast("Photo deleted");
    } catch (err) {
      showToast("Failed to delete");
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 2000);
  }

  function openCamera() {
    window.location.href = "../camera/";
  }

  function goBack() {
    window.location.href = "../homescreen/";
  }

  function toggleSelectMode() {
    selectMode = !selectMode;
    btnSelect.classList.toggle("active", selectMode);
    selectedIds.clear();
    renderGrid();
  }

  lbClose.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click", () => navigateLightbox(-1));
  lbNext.addEventListener("click", () => navigateLightbox(1));
  lbDelete.addEventListener("click", deleteCurrentPhoto);
  btnBack.addEventListener("click", goBack);
  btnSelect.addEventListener("click", toggleSelectMode);
  btnOpenCamera.addEventListener("click", openCamera);

  let touchStartX = 0;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });

  lightbox.addEventListener("touchend", (e) => {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) navigateLightbox(-1);
      else navigateLightbox(1);
    }
  });

  async function init() {
    await openDB();
    await renderGrid();
  }

  init();
})();

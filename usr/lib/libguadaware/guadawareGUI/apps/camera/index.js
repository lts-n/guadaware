(function () {
  "use strict";

  const DB_NAME = "GuadawareCameraDB";
  const DB_VERSION = 1;
  const STORE_NAME = "photos";

  const video = document.getElementById("camera-stream");
  const captureBtn = document.getElementById("btn-capture");
  const flipBtn = document.getElementById("btn-flip");
  const switchCamBtn = document.getElementById("btn-switch-cam");
  const galleryBtn = document.getElementById("btn-gallery");
  const lastPhotoThumb = document.getElementById("last-photo-thumb");
  const flash = document.getElementById("camera-flash");
  const toast = document.getElementById("camera-toast");
  const modeButtons = document.querySelectorAll(".mode-btn");
  const captureRing = document.getElementById("capture-ring");
  const captureInner = document.getElementById("capture-inner");

  let currentStream = null;
  let facingMode = "environment";
  let db = null;
  let isRecording = false;
  let mediaRecorder = null;
  let recordedChunks = [];

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

  function savePhotoToDB(blob) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const record = {
        blob: blob,
        type: blob.type,
        timestamp: Date.now()
      };
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function savePhotoToServer(blob, filename) {
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = async () => {
          const base64 = reader.result;
          try {
            const res = await fetch("http://localhost:8080/savePhoto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: base64, filename: filename })
            });
            const data = await res.json();
            resolve(data);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Server save error:", err);
      return null;
    }
  }

  async function savePhoto(blob) {
    await savePhotoToDB(blob);
    const timestamp = Date.now();
    const ext = blob.type.includes("video") ? ".webm" : ".jpg";
    const filename = `photo_${timestamp}${ext}`;
    await savePhotoToServer(blob, filename);
  }

  function getLatestPhoto() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      const req = index.openCursor(null, "prev");
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          resolve(cursor.value);
        } else {
          resolve(null);
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

  function getAllPhotos() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function startCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStream = stream;
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      console.error("Camera error:", err);
      showToast("Camera not available");
    }
  }

  async function switchCamera() {
    facingMode = facingMode === "environment" ? "user" : "environment";
    await startCamera();
  }

  function flashEffect() {
    flash.classList.add("active");
    setTimeout(() => flash.classList.remove("active"), 150);
  }

  async function capturePhoto() {
    if (!currentStream) return;

    flashEffect();

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          await savePhoto(blob);
          updateLastPhotoThumb();
          showToast("Photo saved");
        } catch (err) {
          console.error("Save error:", err);
          showToast("Failed to save photo");
        }
      }
    }, "image/jpeg", 0.92);
  }

  function startRecording() {
    if (!currentStream) return;

    recordedChunks = [];
    const options = { mimeType: "video/webm;codecs=vp8,opus" };

    try {
      mediaRecorder = new MediaRecorder(currentStream, options);
    } catch (err) {
      try {
        mediaRecorder = new MediaRecorder(currentStream, { mimeType: "video/webm" });
      } catch (e) {
        showToast("Recording not supported");
        return;
      }
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      try {
        await savePhoto(blob);
        updateLastPhotoThumb();
        showToast("Video saved");
      } catch (err) {
        showToast("Failed to save video");
      }
      recordedChunks = [];
    };

    mediaRecorder.start(100);
    isRecording = true;
    captureRing.classList.add("recording");
    captureInner.classList.add("recording");
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    isRecording = false;
    captureRing.classList.remove("recording");
    captureInner.classList.remove("recording");
  }

  function handleCapture() {
    const activeMode = document.querySelector(".mode-btn.active");
    const mode = activeMode ? activeMode.dataset.mode : "photo";

    if (mode === "video") {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      capturePhoto();
    }
  }

  function setMode(mode) {
    modeButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    if (isRecording) {
      stopRecording();
    }

    if (mode === "video") {
      captureInner.classList.add("video-mode");
    } else {
      captureInner.classList.remove("video-mode");
    }
  }

  async function updateLastPhotoThumb() {
    try {
      const photo = await getLatestPhoto();
      if (photo) {
        const url = URL.createObjectURL(photo.blob);
        lastPhotoThumb.style.backgroundImage = `url(${url})`;
        lastPhotoThumb.style.backgroundSize = "cover";
        lastPhotoThumb.style.backgroundPosition = "center";
      }
    } catch (err) {
      console.error("Thumb error:", err);
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 2000);
  }

  function openGallery() {
    window.location.href = "../gallery/";
  }

  function handleFocus(e) {
    const rect = video.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ring = document.getElementById("camera-focus-ring");
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    ring.classList.add("active");

    setTimeout(() => ring.classList.remove("active"), 800);
  }

  captureBtn.addEventListener("click", handleCapture);

  flipBtn.addEventListener("click", () => {
    facingMode = facingMode === "environment" ? "user" : "environment";
    startCamera();
  });

  switchCamBtn.addEventListener("click", switchCamera);

  galleryBtn.addEventListener("click", openGallery);

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  video.addEventListener("click", handleFocus);

  async function init() {
    await openDB();
    await startCamera();
    await updateLastPhotoThumb();
  }

  init();
})();

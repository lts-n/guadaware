const API = "http://localhost:8080";
const locale = new Locale();
const t = (key) => locale.t(key);
const $ = (id) => document.getElementById(id);

const screen = $("screen");
const tabbar = $("tabbar");
const audio = $("audio");

const PALETTES = [
  ["#f94144", "#f3722c"],
  ["#f9c74f", "#f8961e"],
  ["#90be6d", "#43aa8b"],
  ["#43aa8b", "#4d908e"],
  ["#577590", "#277da1"],
  ["#277da1", "#5e60ce"],
  ["#7209b7", "#560bad"],
  ["#f72585", "#b5179e"],
  ["#ef476f", "#ff6b6b"],
  ["#06d6a0", "#118ab2"],
  ["#ffd166", "#ef476f"],
  ["#9b5de5", "#f15bb5"],
];

const state = {
  library: [],
  albums: [],
  artists: [],
  tab: "library",
  detail: null,
  queue: [],
  qindex: -1,
  playing: null,
  shuffle: false,
  repeat: "off",
  songsFilter: "",
  volume: 0.8,
};

let currentDomList = [];

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hash(seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function paletteFor(seed) {
  return PALETTES[hash(seed) % PALETTES.length];
}

function artwork(seed, letter) {
  const p = paletteFor(seed);
  return `<div class="artwork" style="background:linear-gradient(135deg, ${p[0]}, ${p[1]})">${esc(letter || "♪")}</div>`;
}

function letterOf(text) {
  const clean = String(text || "").trim();
  return clean ? clean[0].toUpperCase() : "?";
}

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function loadLibrary() {
  try {
    const res = await fetch(`${API}/getMusicLibrary`);
    const raw = await res.json();
    state.library = (Array.isArray(raw) ? raw : []).map((s) => ({
      ...s,
      title: s.title || t("music.unknowntrack"),
      artist: s.artist || t("music.unknownartist"),
      album: s.album || t("music.unknownalbum"),
      fullUrl: API + s.url,
    }));
  } catch (e) {
    state.library = [];
  }
  buildIndex();
}

function buildIndex() {
  const albumMap = new Map();
  const artistMap = new Map();
  const list = state.library;

  for (const song of list) {
    const akey = `${song.artist}\u0000${song.album}`;
    if (!albumMap.has(akey)) {
      albumMap.set(akey, { key: akey, name: song.album, artist: song.artist, songs: [], added: 0 });
    }
    albumMap.get(akey).songs.push(song);
    albumMap.get(akey).added = Math.max(albumMap.get(akey).added, song.added || 0);

    const arkey = `${song.artist}\u0000`;
    if (!artistMap.has(arkey)) {
      artistMap.set(arkey, { key: arkey, name: song.artist, songs: [] });
    }
    artistMap.get(arkey).songs.push(song);
  }

  state.albums = Array.from(albumMap.values());
  state.albums.sort((a, b) => {
    const c = a.artist.toLowerCase().localeCompare(b.artist.toLowerCase());
    return c || a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
  state.artists = Array.from(artistMap.values());
  state.artists.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

function countLabel(n) {
  const label = n === 1 ? t("music.song") : t("music.songs");
  return `${n} ${label}`;
}

/* ---------- Render views ---------- */

function render() {
  state.detail = null;
  state.songsFilter = "";
  renderTab(state.tab);
}

function renderTab(tab) {
  state.tab = tab;
  currentDomList = [];
  screen.classList.remove("detail");
  tabbar.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.dataset.view === tab));
  if (tab === "library") renderLibrary();
  else if (tab === "songs") renderSongs();
  else if (tab === "albums") renderAlbums();
  else if (tab === "artists") renderArtists();
  screen.scrollTop = 0;
}

function filterSongs() {
  const q = state.songsFilter.toLowerCase().trim();
  return q
    ? state.library.filter((s) => (s.title + " " + s.artist + " " + s.album).toLowerCase().includes(q))
    : state.library;
}

function renderLibrary() {
  const total = state.library.length;
  if (!total) {
    screen.innerHTML =
      `<div class="empty"><h2>${esc(t("music.library"))}</h2>` +
      `<p>${esc(t("music.empty"))}</p></div>`;
    return;
  }

  const recent = state.albums.slice().sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 10);
  const hero =
    `<div class="section-head"><h2>${esc(t("music.recentlyadded"))}</h2></div>` +
    `<div class="hero-scroll">${recent
      .map(
        (a) =>
          `<div class="album-card" data-open-album="${state.albums.indexOf(a)}">` +
          artwork(a.key, letterOf(a.name)) +
          `<p>${esc(a.name)}</p><small>${esc(a.artist)}</small></div>`
      )
      .join("")}</div>`;

  const rows =
    `<div class="section-head"><h2>${esc(t("music.library"))}</h2></div>` +
    `<section class="library-list">` +
    `<li><a data-path="songs"><span>${esc(t("music.songs"))}</span><strong>${total}</strong></a></li>` +
    `<li><a data-path="albums"><span>${esc(t("music.albums"))}</span><strong>${state.albums.length}</strong></a></li>` +
    `<li><a data-path="artists"><span>${esc(t("music.artists"))}</span><strong>${state.artists.length}</strong></a></li>` +
    `<li><a data-path="songs"><span>${esc(t("music.playlists"))}</span><strong>0</strong></a></li>` +
    `</section>`;

  screen.innerHTML = `<div class="lt-title">${esc(t("music.library"))}</div>${hero}${rows}`;
}

function searchBox(value) {
  return (
    `<div class="search-box">` +
    `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>` +
    `<input type="search" id="songs-search" placeholder="${esc(t("music.search"))}" value="${esc(value)}">` +
    `</div>`
  );
}

function renderSongRows(list, detailArtist) {
  currentDomList = list;
  return (
    `<section class="song-list">` +
    list
      .map((song, i) => {
        const isPlaying = state.playing === song;
        const sub = detailArtist && detailArtist !== song.artist
          ? `${song.artist}`
          : song.album && song.artist
            ? `${song.artist} · ${song.album}`
            : song.album || song.artist;
        return (
          `<li class="${isPlaying ? "playing" : ""}" data-play="${i}">` +
          artwork(`${song.artist}\u0000${song.album}`, letterOf(song.title)) +
          `<div class="song-meta"><p>${esc(song.title)}</p><small>${esc(sub)}</small></div>` +
          `<span class="eq ${isPlaying && !audio.paused ? "active" : ""}"><i></i><i></i><i></i></span>` +
          `</li>`
        );
      })
      .join("") +
    `</section>`
  );
}

function renderSongs() {
  const filtered = filterSongs();
  currentDomList = filtered;
  screen.innerHTML =
    `<div class="lt-title">${esc(t("music.songs"))}</div>` +
    searchBox(state.songsFilter) +
    `<div id="song-list-container">${renderSongRows(filtered)}</div>`;
  const input = $("songs-search");
  if (input) {
    input.addEventListener("input", () => {
      state.songsFilter = input.value;
      currentDomList = filterSongs();
      $("song-list-container").innerHTML = renderSongRows(currentDomList);
    });
  }
}

function renderAlbums() {
  if (!state.albums.length) {
    screen.innerHTML = `<div class="empty"><h2>${esc(t("music.albums"))}</h2><p>${esc(t("music.empty"))}</p></div>`;
    return;
  }
  screen.innerHTML =
    `<div class="lt-title">${esc(t("music.albums"))}</div>` +
    `<div class="album-grid">` +
    state.albums
      .map(
        (a, i) =>
          `<div class="album-card" data-open-album="${i}">` +
          artwork(a.key, letterOf(a.name)) +
          `<p>${esc(a.name)}</p><small>${esc(a.artist)}</small></div>`
      )
      .join("") +
    `</div>`;
}

function renderArtists() {
  if (!state.artists.length) {
    screen.innerHTML = `<div class="empty"><h2>${esc(t("music.artists"))}</h2><p>${esc(t("music.empty"))}</p></div>`;
    return;
  }
  screen.innerHTML =
    `<div class="lt-title">${esc(t("music.artists"))}</div>` +
    `<section class="song-list artist-list">` +
    state.artists
      .map((a, i) => {
        const p = paletteFor(a.key);
        return (
          `<li class="artist-row" data-open-artist="${i}">` +
          `<div class="avatar" style="background:linear-gradient(135deg, ${p[0]}, ${p[1]})">${esc(letterOf(a.name))}</div>` +
          `<div class="artist-meta"><p>${esc(a.name)}</p><small>${esc(countLabel(a.songs.length))}</small></div>` +
          `</li>`
        );
      })
      .join("") +
    `</section>`;
}

function renderAlbumDetail(key) {
  const album = state.albums.find((a) => a.key === key);
  if (!album) return renderAlbums();
  state.detail = { kind: "album", key };
  const songs = album.songs;
  currentDomList = songs;
  screen.classList.add("detail");
  screen.innerHTML =
    `<button class="detail-back">${esc(t("music.back"))}</button>` +
    `<div class="detail-hero">` +
    artwork(album.key, letterOf(album.name)) +
    `<h2>${esc(album.name)}</h2><p>${esc(album.artist)} · ${esc(countLabel(songs.length))}</p>` +
    `<button class="play-btn" data-play-all><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>` +
    `</div>` +
    renderSongRows(songs, album.artist);
  screen.scrollTop = 0;
}

function renderArtistDetail(key) {
  const artist = state.artists.find((a) => a.key === key);
  if (!artist) return renderArtists();
  state.detail = { kind: "artist", key };
  const songs = artist.songs;
  currentDomList = songs;
  const p = paletteFor(artist.key);
  screen.classList.add("detail");
  screen.innerHTML =
    `<button class="detail-back">${esc(t("music.back"))}</button>` +
    `<div class="detail-hero">` +
    `<div class="artwork" style="border-radius:50%;background:linear-gradient(135deg, ${p[0]}, ${p[1]})">${esc(letterOf(artist.name))}</div>` +
    `<h2>${esc(artist.name)}</h2><p>${esc(countLabel(songs.length))}</p>` +
    `<button class="play-btn" data-play-all><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>` +
    `</div>` +
    renderSongRows(songs, null);
  screen.scrollTop = 0;
}

function closeDetail() {
  screen.classList.remove("detail");
  renderTab(state.tab);
}

/* ---------- Playback ---------- */

function playList(list, index) {
  if (!list || !list.length) return;
  state.queue = list.slice();
  state.qindex = ((index % list.length) + list.length) % list.length;
  const song = state.queue[state.qindex];
  state.playing = song;
  audio.src = song.fullUrl;
  audio.play();
  updatePlayingUI();
}

function togglePlay() {
  if (!state.playing) {
    if (state.queue.length && state.queue[state.qindex]) {
      audio.src = state.queue[state.qindex].fullUrl;
      audio.play();
    }
    return;
  }
  if (audio.paused) audio.play();
  else audio.pause();
}

function nextSong() {
  if (!state.queue.length) return;
  if (state.repeat === "one") {
    audio.currentTime = 0;
    audio.play();
    return;
  }
  let i = state.qindex + 1;
  const last = state.queue.length - 1;
  if (i > last) {
    if (state.shuffle || state.repeat === "all") i = 0;
    else {
      audio.pause();
      audio.currentTime = 0;
      updatePlayingUI();
      return;
    }
  }
  state.qindex = i;
  state.playing = state.queue[i];
  audio.src = state.playing.fullUrl;
  audio.play();
  updatePlayingUI();
}

function prevSong() {
  if (!state.queue.length) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  if (state.shuffle && state.queue.length > 1) {
    let i;
    do {
      i = Math.floor(Math.random() * state.queue.length);
    } while (i === state.qindex);
    state.qindex = i;
  } else {
    state.qindex = state.qindex > 0 ? state.qindex - 1 : 0;
  }
  state.playing = state.queue[state.qindex];
  audio.src = state.playing.fullUrl;
  audio.play();
  updatePlayingUI();
}

function cycleRepeat() {
  state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  const btn = $("np-repeat");
  const one = btn.querySelector(".one");
  if (one) one.style.display = state.repeat === "one" ? "block" : "none";
  btn.dataset.active = String(state.repeat !== "off");
}

/* ---------- UI updates ---------- */

const PLAY_ICON = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

function updatePlayingUI() {
  const song = state.playing;
  const mini = $("mini-player");
  if (song) {
    mini.classList.remove("hidden");
    $("mini-title").textContent = song.title;
    $("mini-artist").textContent = song.artist;
    const p = paletteFor(`${song.artist}\u0000${song.album}`);
    $("mini-art").style.background = `linear-gradient(135deg, ${p[0]}, ${p[1]})`;
    $("mini-art").textContent = letterOf(song.album);
    $("np-title").textContent = song.title;
    $("np-artist").textContent = `${song.artist} · ${song.album}`;
    const np = $("np-art");
    np.style.background = `linear-gradient(135deg, ${p[0]}, ${p[1]})`;
    np.textContent = letterOf(song.album);
  } else {
    mini.classList.add("hidden");
  }
  updatePlayIcon();
}

function updatePlayIcon() {
  const playing = !audio.paused && state.playing;
  const icon = playing ? PAUSE_ICON : PLAY_ICON;
  $("mini-play").innerHTML = icon;
  $("np-play").innerHTML = icon;
  document.querySelectorAll(".eq").forEach((eq) => {
    eq.classList.toggle("active", playing && eq.closest(".playing"));
  });
}

function updateProgress() {
  const dur = audio.duration;
  const cur = audio.currentTime;
  const pct = (isFinite(dur) && dur > 0) ? Math.round((cur / dur) * 100) : 0;
  $("np-progress").value = pct * 10;
  $("np-progress").style.setProperty("--np-fill", `${pct}%`);
  $("np-current").textContent = fmtTime(cur);
  $("np-duration").textContent = fmtTime(dur);
}

function openPlayer() {
  if (!state.playing) return;
  $("now-playing").hidden = false;
}

/* ---------- Events ---------- */

function bindEvents() {
  tabbar.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-view]");
    if (!link) return;
    e.preventDefault();
    screen.classList.remove("detail");
    renderTab(link.dataset.view);
  });

  screen.addEventListener("click", (e) => {
    const back = e.target.closest(".detail-back");
    if (back) return closeDetail();

    const playAll = e.target.closest("[data-play-all]");
    if (playAll) return playList(currentDomList, 0);

    const playRow = e.target.closest("[data-play]");
    if (playRow && currentDomList.length) {
      const i = parseInt(playRow.dataset.play, 10);
      if (i >= 0 && i < currentDomList.length) playList(currentDomList, i);
      return;
    }
    const albumCard = e.target.closest("[data-open-album]");
    if (albumCard) {
      const idx = parseInt(albumCard.dataset.openAlbum, 10);
      const album = state.albums[idx];
      if (album) {
        screen.classList.add("detail");
        renderAlbumDetail(album.key);
      }
      return;
    }
    const artistCard = e.target.closest("[data-open-artist]");
    if (artistCard) {
      const idx = parseInt(artistCard.dataset.openArtist, 10);
      const artist = state.artists[idx];
      if (artist) {
        screen.classList.add("detail");
        renderArtistDetail(artist.key);
      }
      return;
    }
    const path = e.target.closest("[data-path]");
    if (path) renderTab(path.dataset.path);
  });

  $("mini-player").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn && btn.dataset && btn.id === "mini-play") {
      e.stopPropagation();
      togglePlay();
      return;
    }
    if (btn && btn.id === "mini-next") {
      e.stopPropagation();
      nextSong();
      return;
    }
    openPlayer();
  });

  $("mini-art").addEventListener("click", openPlayer);

  $("np-close").addEventListener("click", () => {
    $("now-playing").hidden = true;
  });

  $("np-play").addEventListener("click", togglePlay);
  $("np-prev").addEventListener("click", prevSong);
  $("np-next").addEventListener("click", nextSong);
  $("np-shuffle").addEventListener("click", () => {
    state.shuffle = !state.shuffle;
    $("np-shuffle").dataset.active = String(state.shuffle);
  });
  $("np-repeat").addEventListener("click", cycleRepeat);

  $("np-progress").addEventListener("input", (e) => {
    const v = parseInt(e.target.value, 10);
    $("np-progress").style.setProperty("--np-fill", `${Math.round((v / 1000) * 100)}%`);
    if (isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (v / 1000) * audio.duration;
    }
  });

  $("np-volume-slider").addEventListener("input", (e) => {
    const v = parseInt(e.target.value, 10);
    $("np-volume-slider").style.setProperty("--np-fill", `${v}%`);
    const vol = v / 100;
    audio.volume = vol;
    try {
      localStorage.setItem("guadaware-music-volume", String(vol));
    } catch (err) {}
  });

  audio.addEventListener("play", updatePlayIcon);
  audio.addEventListener("pause", updatePlayIcon);
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("ended", nextSong);
}

/* ---------- Init ---------- */

async function init() {
  await locale.load();
  try {
    const v = parseFloat(localStorage.getItem("guadaware-music-volume"));
    if (!isNaN(v)) state.volume = Math.min(1, Math.max(0, v));
  } catch (err) {}
  audio.volume = state.volume;
  $("np-volume-slider").value = Math.round(state.volume * 100);
  $("np-volume-slider").style.setProperty("--np-fill", `${Math.round(state.volume * 100)}%`);
  await loadLibrary();
  render();
  bindEvents();
}

init();
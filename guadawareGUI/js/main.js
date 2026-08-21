function makeIcon(color, emoji) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>` +
    `<rect width='120' height='120' rx='27' fill='${color}'/>` +
    `<text x='60' y='82' font-size='58' text-anchor='middle'>${emoji}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

new DockApp(makeIcon("#4cd964", "📞"), "https://web.whatsapp.com", "Phone");
new DockApp(makeIcon("#007aff", "👤"), "https://contacts.google.com", "Contacts");
new DockApp(makeIcon("#34c759", "💬"), "https://messages.google.com", "Messages");
new DockApp(makeIcon("#007aff", "🧭"), "https://www.wikipedia.org", "Browser");

new App(makeIcon("#ff2d55", "🎵"), "https://music.youtube.com", "Music");
new App(makeIcon("#ffffff", "🌸"), "https://photos.google.com", "Photos");
new App(makeIcon("#8e8e93", "📷"), "https://www.instagram.com", "Camera");
new App(makeIcon("#ff9500", "🗺️"), "https://www.openstreetmap.org", "Maps");
new App(makeIcon("#1c1c1e", "⏰"), "https://time.is", "Clock");
new App(makeIcon("#5856d6", "⚙️"), "https://www.apple.com/ios/ios-7/", "Settings");
new App(makeIcon("#ffcc00", "📝"), "https://keep.google.com", "Notes");
new App(makeIcon("#5ac8fa", "☀️"), "https://weather.com", "Weather");
new App(makeIcon("#ff3b30", "📅"), "https://calendar.google.com", "Calendar");
new App(makeIcon("#007aff", "✉️"), "https://mail.google.com", "Mail");

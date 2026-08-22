function makeIcon(color, emoji) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>` +
    `<rect width='120' height='120' rx='27' fill='${color}'/>` +
    `<text x='60' y='82' font-size='58' text-anchor='middle'>${emoji}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

new DockApp({
  icon: "icons/terminal.png",
  name: "Terminal",
  url: "http://localhost:8000/apps/terminal/index.html"
});
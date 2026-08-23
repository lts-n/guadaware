function svgIcon(bg, body) {
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/>${body}</svg>`
  );
}

const APPS = [
  new App(
    "icons/settings-icon.png",
    "../settings/",
    "Settings"
  ),
  new App(
    "icons/terminal-icon.png",
    "../terminal/",
    "Terminal"
  ),
  new App(
    "icons/safari-icon.webp",
    "../safari/",
    "Safari",
  ),
  new App(
    "icons/calculator-icon.webp",
    "../calculator/",
    "Calculator"
  )
];

const grid = document.getElementById("grid");
APPS.forEach((app) => app.addTo(grid));

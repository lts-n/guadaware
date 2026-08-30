function svgIcon(bg, body) {
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/>${body}</svg>`
  );
}

const APPS = [
  [ "icons/settings-icon.png", "../settings/", "app.settings" ],
  [ "icons/terminal-icon.png", "../terminal/", "app.terminal" ],
  [ "icons/safari-icon.webp",   "../safari/",    "app.safari" ],
  [ "icons/calculator-icon.png","../calculator/","app.calculator" ],
  [ "icons/safari-icon.webp",   "../safari no proxy/", "app.safari.noproxy" ]
];

const grid = document.getElementById("grid");

function render() {
  grid.innerHTML = "";
  APPS.forEach(([icon, url, key]) => grid.appendChild(
    new App(icon, url, locale.t(key)).render()
  ));
}

const locale = new Locale();
locale.load().then(render);

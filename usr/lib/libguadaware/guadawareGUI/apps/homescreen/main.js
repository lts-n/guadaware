function svgIcon(bg, body) {
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/>${body}</svg>`
  );
}

const grid = document.getElementById("grid");
const manifest = new URL("../../apps.json", window.location.href);
const manifestBase = new URL(".", manifest.href);

function resolveFromManifest(path) {
  return new URL(path, manifestBase).href;
}

async function render() {
  grid.innerHTML = "";
  const res = await fetch(manifest);
  const apps = await res.json();
  apps.forEach((app) => grid.appendChild(
    new App(
      resolveFromManifest(app.icon),
      resolveFromManifest(app.url),
      locale.t(app.name)
    ).render()
  ));
}

const locale = new Locale();
locale.load().then(render);

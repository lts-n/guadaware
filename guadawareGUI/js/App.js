class App {
  constructor(icon, url, name = "") {
    this.icon = icon;
    this.url = url;
    this.name = name || App.nameFromIcon(icon);
    this.render();
  }

  get container() {
    return document.getElementById("homescreen");
  }

  static nameFromIcon(icon) {
    const file = icon.split("/").pop().split(".")[0];
    return file.includes("/") ? "" : file.replace(/[-_]/g, " ");
  }

  render() {
    const a = document.createElement("a");
    a.className = "app";
    a.href = this.url;
    a.target = "_blank";
    a.rel = "noopener";

    const img = document.createElement("img");
    img.src = this.icon;
    img.alt = this.name;

    if (this.name) {
      const span = document.createElement("span");
      span.textContent = this.name;
      a.append(img, span);
    } else {
      a.append(img);
    }

    this.container.appendChild(a);
  }
}

class DockApp extends App {
  get container() {
    return document.getElementById("dock");
  }
}

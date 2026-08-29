class App {
  constructor(icon, url, name) {
    this.icon = icon;
    this.url = url;
    this.name = name;
  }

  render() {
    const link = document.createElement("a");
    link.className = "app";
    link.href = this.url;

    const img = document.createElement("img");
    img.src = this.icon;
    img.alt = this.name;
    img.draggable = false;

    const label = document.createElement("span");
    label.textContent = this.name;

    link.appendChild(img);
    link.appendChild(label);
    return link;
  }

  addTo(container) {
    container.appendChild(this.render());
  }
}

class Locale {
  static STORAGE_KEY = "guadaware-locale";
  static DEFAULT = "en";

  // Codes used before the switch to ISO 639-1, so localStorage values written
  // by an older install keep resolving to the right column.
  static LEGACY = { eng: "en", esp: "es", cat: "ca", chi: "zh" };

  constructor(locale) {
    this.locale = Locale.normalize(locale || this.saved()) || Locale.DEFAULT;
    this.db = {};
    this.load().then(() => this.apply());
  }

  static normalize(code) {
    if (!code) return null;
    return Locale.LEGACY[code] || code;
  }

  saved() {
    try {
      return Locale.normalize(localStorage.getItem(Locale.STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  set(locale) {
    this.locale = Locale.normalize(locale) || Locale.DEFAULT;
    try {
      localStorage.setItem(Locale.STORAGE_KEY, this.locale);
    } catch (e) {}
    this.apply();
  }

  async load(csvUrl) {
    const url = csvUrl || this.locateCSV();
    const res = await fetch(url);
    const texto = await res.text();
    this.parse(texto);
    return this;
  }

  parse(texto) {
    const filas = texto.trim().split("\n");
    const cabecera = filas[0].split(",");
    let idx = cabecera.indexOf(this.locale);

    if (idx < 0) {
      idx = cabecera.indexOf(Locale.DEFAULT);
      if (idx >= 0) this.locale = Locale.DEFAULT;
    }

    for (let i = 1; i < filas.length; i++) {
      const cols = filas[i].split(",");
      this.db[cols[0]] = cols[idx] || "";
    }
  }

  locateCSV() {
    const scripts = document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.indexOf("Locale.js") !== -1) {
        return src.replace(/Locale\.js[^/]*$/, "locales.csv");
      }
    }
    return "locales.csv";
  }

  t(clave) {
    return this.db[clave] || clave;
  }

  apply() {
    if (document.documentElement) {
      document.documentElement.lang = this.locale;
    }

    document.querySelectorAll("[data-locale]").forEach((el) => {
      el.textContent = this.t(el.getAttribute("data-locale"));
    });

    document.querySelectorAll("[data-locale-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", this.t(el.getAttribute("data-locale-placeholder")));
    });

    document.querySelectorAll("[data-locale-aria]").forEach((el) => {
      el.setAttribute("aria-label", this.t(el.getAttribute("data-locale-aria")));
    });
  }
}

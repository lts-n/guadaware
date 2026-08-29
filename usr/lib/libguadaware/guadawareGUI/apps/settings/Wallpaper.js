class Wallpaper {
    constructor(number, name) {
        this.number = number;
        this.name = name;
        document.getElementById("wallpaperpicker").insertAdjacentHTML("beforeend", "<li id='" + number + "'>" + name + "</li>");
        document.getElementById(number).addEventListener("click", () => {
            this.set();
        });
    }
    set() {
        fetch('http://localhost:8080/setWallpaper/'+this.number);
    }
}
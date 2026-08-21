function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  document.getElementById("lock-time").textContent = time;
  document.getElementById("status-time").textContent = time;
  document.getElementById("lock-date").textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

updateClock();
setInterval(updateClock, 1000);

const lockscreen = document.getElementById("lockscreen");
const slider = document.getElementById("slider");
const knob = document.getElementById("knob");

let dragging = false;
let startX = 0;
let offset = 0;

function unlock() {
  lockscreen.classList.add("unlocked");
  lockscreen.addEventListener("transitionend", () => lockscreen.remove(), { once: true });
}

knob.addEventListener("pointerdown", (e) => {
  dragging = true;
  startX = e.clientX - offset;
  knob.setPointerCapture(e.pointerId);
});

knob.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const max = slider.clientWidth - knob.clientWidth - 8;
  offset = Math.max(0, Math.min(e.clientX - startX, max));
  knob.style.transform = `translateY(-50%) translateX(${offset}px)`;
});

knob.addEventListener("pointerup", () => {
  dragging = false;
  const max = slider.clientWidth - knob.clientWidth - 8;
  if (offset >= max * 0.6) {
    unlock();
  } else {
    knob.style.transform = "translateY(-50%)";
  }
  offset = 0;
});

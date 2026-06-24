/** Avoid Material Symbols ligature text flashing before the icon font loads. */
export function initFonts() {
  const root = document.documentElement;
  root.classList.add("fonts-loading");

  const markReady = () => {
    root.classList.remove("fonts-loading");
    root.classList.add("fonts-ready");
  };

  if (document.fonts?.ready) {
    void document.fonts.ready.then(markReady).catch(markReady);
  } else {
    window.setTimeout(markReady, 120);
  }
}

export function removeAppBootShell() {
  document.getElementById("app-boot")?.remove();
}

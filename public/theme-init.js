(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {
    /* storage unavailable — fall back to the default light theme */
  }
})();

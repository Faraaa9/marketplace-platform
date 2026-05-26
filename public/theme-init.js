(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
    if (localStorage.getItem("uzklausos-density") === "compact") {
      document.documentElement.setAttribute("data-density", "compact");
    }
  } catch (e) {
    /* storage unavailable — fall back to defaults */
  }
})();

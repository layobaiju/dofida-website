// Runs before the page paints, so the saved theme applies without a flash.
(function () {
  var themes = ['paper', 'midnight', 'sage'];
  var saved = null;
  try { saved = localStorage.getItem('dofida-theme'); } catch (e) { /* storage blocked */ }
  // First visit: the dark Midnight theme. Visitors can switch with the theme button.
  if (themes.indexOf(saved) === -1) saved = 'midnight';
  if (saved !== 'paper') document.documentElement.setAttribute('data-theme', saved);
})();

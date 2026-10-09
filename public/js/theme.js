// Runs before the page paints, so the saved theme applies without a flash.
(function () {
  var themes = ['paper', 'midnight', 'sage'];
  var saved = null;
  try { saved = localStorage.getItem('dofida-theme'); } catch (e) { /* storage blocked */ }
  if (themes.indexOf(saved) === -1) {
    saved = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'midnight' : 'paper';
  }
  if (saved !== 'paper') document.documentElement.setAttribute('data-theme', saved);
})();

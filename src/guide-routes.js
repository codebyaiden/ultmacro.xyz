(function () {
  'use strict';

  var section = document.body && document.body.dataset.guideSection;
  if (!section) return;
  var target = document.getElementById(section);
  if (!target) return;

  window.setTimeout(function () {
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, 80);
})();

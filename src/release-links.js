(function () {
  'use strict';

  var host = document.querySelector('[data-history]');
  if (!host) return;

  function addLinks() {
    host.querySelectorAll('.vrow').forEach(function (row) {
      if (row.querySelector('.vrow-open-link')) return;
      var tag = row.dataset.tag;
      var target = row.querySelector('.vrow-right');
      if (!tag || !target) return;
      var link = document.createElement('a');
      link.className = 'vrow-open-link';
      link.href = './' + encodeURIComponent(tag) + '/';
      link.textContent = 'Open release';
      link.addEventListener('click', function (event) { event.stopPropagation(); });
      target.insertBefore(link, target.firstChild);
    });
  }

  addLinks();
  new MutationObserver(addLinks).observe(host, { childList: true, subtree: true });
})();

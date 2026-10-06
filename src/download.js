(function () {
  'use strict';
  var page = document.querySelector('.download-page');
  if (!page) return;
  var status = document.querySelector('[data-download-status]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelector('[data-year]').textContent = String(new Date().getFullYear());

  document.querySelectorAll('[data-download]').forEach(function (link) {
    var label = link.querySelector('[data-download-label]');
    var original = label.textContent;
    var timer;
    link.addEventListener('click', function (event) {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Keep the anchor's default action: feedback never delays the download.
      clearTimeout(timer);
      label.textContent = 'Starting download…';
      status.textContent = 'Starting download for ' + link.getAttribute('aria-label').replace(/^Download /, '') + '.';
      timer = setTimeout(function () { label.textContent = original; }, 1200);
    });
  });
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    var original = button.getAttribute('aria-label');
    var timer;
    button.addEventListener('click', async function () {
      var code = button.parentElement.querySelector('[data-checksum]');
      try {
        await navigator.clipboard.writeText(code.textContent);
        clearTimeout(timer);
        button.textContent = 'Copied';
        button.setAttribute('aria-label', original.replace(/^Copy /, 'Copied '));
        status.textContent = 'SHA-256 copied.';
        timer = setTimeout(function () { button.textContent = 'Copy'; button.setAttribute('aria-label', original); }, 1400);
      } catch (error) {
        var range = document.createRange();
        range.selectNodeContents(code);
        var selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        status.textContent = 'Copy unavailable. The SHA-256 is selected; copy it manually.';
      }
    });
  });
  document.querySelectorAll('[data-changelog]').forEach(function (details) {
    var summary = details.querySelector('summary');
    var content = details.querySelector('.changelog-content');
    var animation, closing = false;
    summary.addEventListener('click', function (event) {
      if (reduced.matches || !content.animate) return;
      event.preventDefault();
      var currentHeight = content.getBoundingClientRect().height;
      var currentOpacity = getComputedStyle(content).opacity;
      var opening = !details.open || closing;
      if (animation) animation.cancel();
      closing = !opening;
      details.open = true;
      content.inert = !opening;
      animation = content.animate([
        { height: currentHeight + 'px', opacity: currentHeight ? currentOpacity : 0, transform: 'translateY(' + (currentHeight ? 0 : -3) + 'px)' },
        { height: opening ? content.scrollHeight + 'px' : '0px', opacity: opening ? 1 : 0, transform: opening ? 'translateY(0)' : 'translateY(-3px)' }
      ], { duration: 210, easing: 'ease-out' });
      animation.onfinish = function () { details.open = opening; content.inert = false; animation = null; closing = false; };
    });
    reduced.addEventListener('change', function (event) {
      if (event.matches && animation) { animation.finish(); }
    });
  });
})();

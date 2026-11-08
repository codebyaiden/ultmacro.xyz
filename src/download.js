(function () {
  'use strict';
  var page = document.querySelector('.download-page');
  if (!page) return;
  var status = document.querySelector('[data-download-status]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelector('[data-year]').textContent = String(new Date().getFullYear());
  var versionPicker = document.querySelector('.version-picker');
  if (versionPicker) {
    var pickerSummary = versionPicker.querySelector('summary');
    var pickerMenu = versionPicker.querySelector('.version-picker-panel');
    versionPicker.addEventListener('toggle', function () {
      if (versionPicker.open) requestAnimationFrame(function () { pickerMenu.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' }); });
    });
    document.addEventListener('pointerdown', function (event) {
      if (versionPicker.open && !versionPicker.contains(event.target)) versionPicker.open = false;
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && versionPicker.open) {
        versionPicker.open = false;
        pickerSummary.focus();
      }
    });
  }
  var header = document.querySelector('.download-header');
  var updateHeader = function () { if (header) header.classList.toggle('is-scrolled', window.scrollY > 12); };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  document.querySelectorAll('[data-download]').forEach(function (link) {
    var label = link.querySelector('[data-download-label]');
    var original = label.textContent;
    var timer, settle;
    link.addEventListener('click', function (event) {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Keep the anchor's default action: feedback never delays the download.
      clearTimeout(timer);
      clearTimeout(settle);
      label.textContent = 'Starting…';
      link.classList.add('is-starting');
      status.textContent = 'Starting download for ' + link.getAttribute('aria-label').replace(/^Download /, '') + '.';
      settle = setTimeout(function () { label.textContent = 'Started'; }, 180);
      timer = setTimeout(function () {
        label.textContent = original;
        link.classList.remove('is-starting');
      }, 480);
    });
  });
  var reveals = document.querySelectorAll('[data-reveal]');
  var revealAnimations = new Set();
  if ('IntersectionObserver' in window && !reduced.matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (reduced.matches || !entry.target.animate) return;
        // Content stays visible until it intersects; failed JS never hides a section.
        var animation = entry.target.animate([
          { opacity: .35, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 240, easing: 'ease-out' });
        revealAnimations.add(animation);
        animation.onfinish = function () { revealAnimations.delete(animation); };
      });
    }, { threshold: .06 });
    reveals.forEach(function (section) { observer.observe(section); });
    reduced.addEventListener('change', function (event) {
      if (event.matches) {
        observer.disconnect();
        revealAnimations.forEach(function (animation) { animation.finish(); });
        revealAnimations.clear();
      }
    });
  }
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
      details.classList.toggle('is-closing', closing);
      details.open = true;
      content.inert = !opening;
      animation = content.animate([
        { height: currentHeight + 'px', opacity: currentHeight ? currentOpacity : 0, transform: 'translateY(' + (currentHeight ? 0 : -3) + 'px)' },
        { height: opening ? content.scrollHeight + 'px' : '0px', opacity: opening ? 1 : 0, transform: opening ? 'translateY(0)' : 'translateY(-3px)' }
      ], { duration: 210, easing: 'ease-out' });
      animation.onfinish = function () { details.open = opening; content.inert = false; animation = null; closing = false; details.classList.remove('is-closing'); };
    });
    reduced.addEventListener('change', function (event) {
      if (event.matches && animation) { animation.finish(); }
    });
  });
})();
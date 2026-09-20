(function () {
	'use strict';

	var qs = UM.qs;
	var qsa = UM.qsa;
	var on = UM.on;

	UM.initChrome();

	var links = qsa('.toc a');
	var sections = links
		.map(function (a) {
			var href = a.getAttribute('href') || '';
			var id = a.dataset.section || (href.charAt(0) === '#' ? href.slice(1) : '');
			return id ? document.getElementById(id) : null;
		})
		.filter(Boolean);

	var jump = qs('[data-jump]');
	if (jump) {
		jump.innerHTML =
			'<option value="">Jump to a section…</option>' +
			sections
				.map(function (s) {
					return '<option value="' + s.id + '">' + (s.dataset.tocLabel || s.id) + '</option>';
				})
				.join('');
		on(jump, 'change', function () {
			var link = links.find(function (a) { return (a.dataset.section || (a.getAttribute('href') || '').slice(1)) === jump.value; });
			if (link && (link.getAttribute('href') || '').charAt(0) !== '#') {
				location.href = link.href;
				return;
			}
			var target = document.getElementById(jump.value);
			if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}

	if (sections.length && 'IntersectionObserver' in window) {
		var visible = {};
		var io = new IntersectionObserver(
			function (entries) {
				entries.forEach(function (entry) {
					visible[entry.target.id] = entry.isIntersecting;
				});
				var active =
					sections.find(function (s) {
						return visible[s.id];
					}) || sections[0];
				links.forEach(function (a) {
					var href = a.getAttribute('href') || '';
					var id = a.dataset.section || (href.charAt(0) === '#' ? href.slice(1) : '');
					a.classList.toggle('current', id === active.id);
				});
				if (jump && jump.value !== active.id) jump.value = active.id;
			},
			{ rootMargin: '-15% 0px -70% 0px' }
		);
		sections.forEach(function (s) {
			io.observe(s);
		});
	}
})();

(function () {
	'use strict';

	var qs = UM.qs;
	var qsa = UM.qsa;
	var on = UM.on;

	UM.initChrome();

	function initVideo() {
		var host = qs('[data-yt]');
		if (!host) return;

		var ids = (host.dataset.yt || '').split(',').filter(Boolean);
		if (!ids.length) return;
		var id = ids[Math.floor(Math.random() * ids.length)];

		host.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + id + '/hqdefault.jpg)';

		on(host, 'click', function (event) {
			event.preventDefault();
			if (qs('iframe', host)) return;
			var frame = document.createElement('iframe');
			frame.src =
				'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&autoplay=1';
			frame.title = 'Ultimate Macro on YouTube';
			frame.allow =
				'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			frame.allowFullscreen = true;
			host.append(frame);
		});
	}

	function initPhaseLists() {
		var lists = qsa('.phase-list');
		if (!lists.length || !window.matchMedia) return;

		var mq = window.matchMedia('(max-width: 700px)');

		function apply(compact) {
			lists.forEach(function (el) {
				el.open = !compact;
			});
		}

		apply(mq.matches);

		function onChange(e) {
			apply(e.matches);
		}
		if (mq.addEventListener) mq.addEventListener('change', onChange);
		else if (mq.addListener) mq.addListener(onChange);
	}

	initVideo();
	initPhaseLists();
})();
(function () {
	'use strict';

	var screenshots = {
		'v1.3.5': [
			{ file: 'main-strategy-browser.png', label: 'Main strategy browser and controls' },
			{ file: 'strategy-lab.png', label: 'Create and edit strategies with Strategy Lab' },
			{ file: 'discord-strategy-menu.png', label: 'Discord Components V2 strategy menu' }
		]
	};

	function render(release) {
		var shots = screenshots[release.tag];
		if (!shots) return '';
		return (
			'<section class="release-gallery" aria-label="' + UM.esc(release.tag) + ' screenshots">' +
			'<div class="release-gallery-head"><p class="kicker">Inside the update</p>' +
			'<span>New macro UI, Strategy Lab, and Discord controls</span></div>' +
			'<div class="release-gallery-grid">' +
			shots.map(function (shot) {
				var src = '/assets/releases/' + release.tag + '/' + shot.file;
				return '<figure class="release-shot"><a href="' + src + '">' +
					'<img src="' + src + '" alt="' + UM.esc(shot.label) + '" loading="lazy"></a>' +
					'<figcaption>' + UM.esc(shot.label) + '</figcaption></figure>';
			}).join('') +
			'</div></section>'
		);
	}

	window.UMReleaseGallery = { render: render };
})();

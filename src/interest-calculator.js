(function () {
	'use strict';

	var balanceInput = document.getElementById('startingBalance');
	var buttons = Array.prototype.slice.call(document.querySelectorAll('.duration-btn'));
	var selectedDays = 30;
	var format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
	var outputs = {
		starting: document.getElementById('resultStarting'),
		daily: document.getElementById('resultDaily'),
		earned: document.getElementById('resultEarned'),
		final: document.getElementById('resultFinal'),
		days: document.getElementById('resultDays'),
		finalDays: document.getElementById('resultFinalDays')
	};

	function validBalance() {
		var parsed = Number(balanceInput.value);
		if (!Number.isFinite(parsed) || parsed < 0) return 0;
		return Math.floor(parsed);
	}

	function update() {
		var startingBalance = validBalance();
		var dailyPayout = Math.min(Math.floor(startingBalance * 0.0025), 75);
		var totalEarned = dailyPayout * selectedDays;
		var finalTotal = startingBalance + totalEarned;

		outputs.starting.textContent = format.format(startingBalance);
		outputs.daily.textContent = format.format(dailyPayout);
		outputs.earned.textContent = format.format(totalEarned);
		outputs.final.textContent = format.format(finalTotal);
		outputs.days.textContent = format.format(selectedDays);
		outputs.finalDays.textContent = format.format(selectedDays);
	}

	buttons.forEach(function (button) {
		button.addEventListener('click', function () {
			selectedDays = Number(button.getAttribute('data-days'));
			buttons.forEach(function (item) {
				var active = item === button;
				item.classList.toggle('active', active);
				item.setAttribute('aria-pressed', String(active));
			});
			update();
		});
	});

	balanceInput.addEventListener('input', update);
	balanceInput.addEventListener('blur', function () {
		balanceInput.value = String(validBalance());
		update();
	});
	update();
})();
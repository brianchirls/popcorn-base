// PLUGIN: style

(function (Popcorn) {

	"use strict";

	var originalVolume, instancesRunning = 0;

	Popcorn.basePlugin('loudness', function (options, base) {
		var popcorn = base.popcorn;
		base.animate('volume', function (val) {
			if (!instancesRunning) {
				originalVolume = popcorn.volume();
			}
			if (!popcorn.muted()) {
				popcorn.volume(val * originalVolume);
			}
		});

		return {
			start: function() {
				if (!instancesRunning) {
					originalVolume = popcorn.volume();
				}
				instancesRunning++;
			},
			end: function() {
				instancesRunning--;
				if (!instancesRunning) {
					popcorn.volume(originalVolume);
				}
			}
		};
	}, {
		about: {
			name: 'Popcorn Loudness Plugin',
			version: '0.1',
			author: 'Brian Chirls, @bchirls',
			website: 'http://github.com/brianchirls'
		}
	});
}(Popcorn));

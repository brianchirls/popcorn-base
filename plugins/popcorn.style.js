// PLUGIN: style

(function (Popcorn) {

	"use strict";

	Popcorn.basePlugin('style', function (options, base) {
		if (!base.target) {
			base.target = this.media;
		}

		base.target.style.cssText = options.style || '';

		base.animate(base.target);

		if (options.classes) {
			base.addClass(base.target, options.classes);
		}
	}, {
		about: {
			name: 'Popcorn Style Plugin',
			version: '0.1',
			author: 'Brian Chirls, @bchirls',
			website: 'http://github.com/brianchirls'
		}
	});
}(Popcorn));

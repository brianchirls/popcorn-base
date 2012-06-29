// PLUGIN: style

(function (Popcorn) {

	"use strict";

	var styleSheet;

	Popcorn.basePlugin('iframe', function (options, base) {
		var iframe, loadStarted = false;

		function loadFrame() {
			if (options.html) {
				iframe.contentDocument.write(options.html);
			} else {
				iframe.src = options.src;
			}
			loadStarted = true;
		}

		if (!styleSheet) {
			styleSheet = document.createElement('style');
			styleSheet.setAttribute('type', 'text/css');
			styleSheet.appendChild(
				document.createTextNode(
					'.popcorn-iframe { display: none; }\n' +
					'.popcorn-iframe.active { display: block; }\n'
			));
			document.head.appendChild(styleSheet);
		}

		iframe = base.makeContainer('iframe');

		if (!options.width) {
			iframe.width = '100%';
		} else if (!isNaN(options.width)) {
			iframe.width = options.width;
		}
		if (!options.height) {
			iframe.height = '100%';
		} else if (!isNaN(options.height)) {
			iframe.height = options.height;
		}

		if (options.id && typeof options.id === 'string') {
			iframe.id = options.id;
		}

		if (!options.defer) {
			loadFrame();
		}

		base.animate('width', function(val) {
			if (isNaN(val)) {
				iframe.style.width = val;
			} else {
				iframe.width = val;
			}
		});

		base.animate('height', function(val) {
			if (isNaN(val)) {
				iframe.style.height = val;
			} else {
				iframe.height = val;
			}
		});

		base.animate(base.container);
		base.animate('scroll', function(val) {
			var scrollHeight;
			if (base.popcorn.paused()) {
				return;
			}
			try {
				scrollHeight = iframe.contentDocument.documentElement.scrollHeight ||
					iframe.contentDocument.body.scrollHeight;
				iframe.contentWindow.scrollTo(0, val * scrollHeight);
			} catch (e) {
			}
		});

		return {
			start: function (event, options) {
				base.addClass(iframe, 'active');
				if (!loadStarted) {
					loadFrame();
				}
			},
			end: function (event, options) {
				base.removeClass(iframe, 'active');
			}
		};
	}, {
		about: {
			name: 'Popcorn iframe Plugin',
			version: '0.1',
			author: 'Brian Chirls, @bchirls',
			website: 'http://github.com/brianchirls'
		}
	});

}(Popcorn));

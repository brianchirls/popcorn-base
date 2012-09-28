// PLUGIN: image

(function (Popcorn) {

	"use strict";

	var styleSheet,
		document = window.document;

	Popcorn.basePlugin( 'image' , function(options, base) {
		var popcorn,
			video,
			classes,
			container,
			img;

		if (!base.target || !options.url) {
			return;
		}

		popcorn = this;
		video = popcorn.media;

		//todo: add stylesheet with basePlugin
		if (!styleSheet) {
			styleSheet = document.createElement('style');
			styleSheet.setAttribute('type', 'text/css');
			styleSheet.appendChild(
				document.createTextNode(
					'.popcorn-image { display: none; }\n' +
					'.popcorn-image > img { max-width: 100%; max-height: 100%; }\n' +
					'.popcorn-image.active { display: inline-block; }\n'
			));
			document.head.appendChild(styleSheet);
		}

		container = base.makeContainer();
		options.container = container;

		container.style.cssText = options.style || '';

		base.animate(base.container);
		
		if (options.classes) {
			base.addClass(container, options.classes);
		}
		
		if (options.link) {
			//todo: fill this out
			//pause video when link is clicked
			container.addEventListener('click', function() {
				video.pause();
			}, false);
		}

		img = document.createElement('img');
		img.src = options.url;
		container.appendChild(img);
		img.addEventListener('load', function() {
			if (typeof options.onLoad === 'function') {
				options.onLoad(options);
			}
		});
		
		return {
			start: function( event, options ) {
				base.addClass(base.container, 'active');
			},
			end: function( event, options ) {
				base.removeClass(base.container, 'active');
			}
		};
	});
}( Popcorn ));


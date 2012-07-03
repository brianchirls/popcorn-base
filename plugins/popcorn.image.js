// PLUGIN: words

(function (Popcorn) {

"use strict";

	var styleSheet;

	Popcorn.basePlugin( 'image' , function(options, base) {
		var popcorn,
			media,
			classes,
			element,
			img;
		
		if (!base.target || !options.src) {
			return;
		}

		popcorn = this;
		media = popcorn.media;

		//todo: add stylesheet with basePlugin
		if (!styleSheet) {
			styleSheet = document.createElement('style');
			styleSheet.setAttribute('type', 'text/css');
			styleSheet.appendChild(
				document.createTextNode(
					'.popcorn-image { display: none; }\n' +
					'.popcorn-image.active { display: block; }\n'
			));
			document.head.appendChild(styleSheet);
		}

		if (options.link) {
			element = base.makeContainer('a');
			img = document.createElement('img');
			element.appendChild(img);
			element.setAttribute('href', options.link);
			if (options.linkTarget) {
				element.setAttribute('target', options.linkTarget);
			} else {
				element.setAttribute('target', '_new');
			}

			//pause video when link is clicked
			element.addEventListener('click', function() {
				media.pause();
			}, false);
		} else {
			img = base.makeContainer('img');
			element = img;
		}
		img.src = options.src;
		options.img = img;

		base.animate(element);
		
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

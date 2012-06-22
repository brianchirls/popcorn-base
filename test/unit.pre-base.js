 (function (window, Popcorn) {

	var p, popcornProperties = 0;
	
	for (p in Popcorn) {
		popcornProperties++;
	}
	
	window.popcornProperties = popcornProperties;
	window.QUnit.config.autostart = false;

}(window, Popcorn));

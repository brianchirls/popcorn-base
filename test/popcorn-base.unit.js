//not gonna be annoying
window.addEventListener('DOMContentLoaded', function() {
	var video = document.getElementById('video');
	video.muted = true;
	video.addEventListener('loadedmetadata', function() {
		QUnit.start();
	}, false);
}, false);

module('Core');
test('Core', function() {
	var p, props = 0;
	
	expect(3);

	ok(Popcorn.basePlugin, 'Popcorn.basePlugin exists');
	
	equal(typeof Popcorn.basePlugin, 'function', 'Popcorn.basePlugin is a function');
	
	for (p in Popcorn) {
		props++;
	}
	
	equal(props - window.popcornProperties, 1, 'Only 1 property added to Popcorn');
});

module('Callbacks');
test('Callbacks - Global function by Name', function() {
	var cbNames = ['Setup', 'Start', 'Frame', 'End', 'Teardown'],
		callbacks = [],
		popcorn,
		i, c, cbName,
		event, eventId;

	expect(cbNames.length);
	
	Popcorn.basePlugin('test', function(options, base) {
	});
	
	event = {
		start: 0,
		end: 1
	};
	
	for (i = 0; i < cbNames.length; i++) {
		c = cbNames[i];
		cbName = 'on' + c + 'Callback';
		event['on' + c] = cbName;
		callbacks.push(c);
		window[cbName] = (function(cb) {
			return function() {
				var i = callbacks.indexOf(cb);
				if (i >= 0) {
					callbacks.splice(i, 1);
					ok(true, 'on' + cb + ' successfully runs');
				}
				
			};
		}(c));
	}
	
	popcorn = Popcorn('#video', {
		frameAnimation: true
	});
	popcorn.currentTime(0);
	popcorn.test(event);
	eventId = popcorn.getLastTrackEventId();
	popcorn.removeTrackEvent(eventId);
	popcorn.destroy();
	for (i = 0; i < cbNames.length; i++) {
		delete window['on' + cbNames[i] + 'Callback'];
	}
	Popcorn.removePlugin('test');
});

test('Callbacks Run in Order', function() {
	var runOrder = [
			'_setup',
			'onSetup',
			'start',
			'onStart',
			'frame',
			'onFrame',
			'onEnd',
			'end',
			'onTeardown',
			'_teardown'
		],
		popcorn,
		frameRun = false,
		event, eventId;

	expect(runOrder.length);
	
	function runCheck(name) {
		var i;
		
		i = runOrder.indexOf(name);
		ok(i === 0, name + ' runs in the right order');
		
		if (i >= 0) {
			runOrder.splice(i, 1);
		}

	}
	
	Popcorn.basePlugin('test', function(options, base) {
		return {
			_setup: function() {
				runCheck('_setup');
			},
			start: function() {
				runCheck('start');
			},
			frame: function() {
				if (!frameRun) {
					runCheck('frame');
				}
			},
			end: function() {
				runCheck('end');
			},
			_teardown: function() {
				runCheck('_teardown');
			}
		};
	});
	
	event = {
		start: 0,
		end: 1,
		onSetup: function() {
			runCheck('onSetup');
		},
		onStart: function() {
			runCheck('onStart');
		},
		onFrame: function() {
			if (!frameRun) {
				runCheck('onFrame');
				frameRun = true;
			}
		},
		onEnd: function() {
			runCheck('onEnd');
		},
		onTeardown: function() {
			runCheck('onTeardown');
		}
	};
	
	popcorn = Popcorn('#video', {
		frameAnimation: true
	});
	popcorn.currentTime(0);
	popcorn.test(event);
	eventId = popcorn.getLastTrackEventId();
	popcorn.removeTrackEvent(eventId);
	popcorn.destroy();
	Popcorn.removePlugin('test');

});

module('Elements');

test('target', function() {
	var popcorn;
	
	expect(3);
	
	Popcorn.basePlugin('test', function(options, base) {
		if (options.which === 'element') {
			ok(base.target instanceof window.HTMLElement, 'target set to element');
			return;
		}

		if (options.which === 'string') {
			ok(base.target instanceof window.HTMLElement, 'target set to element found by name');
			return;
		}

		if (options.which === 'missing') {
			equal(typeof base.target, 'undefined', 'target undefined if missing');
			return;
		}
	});

	popcorn = Popcorn('#video');
	popcorn.test({
		which: 'element',
		target: document.getElementById('container')
	});
	popcorn.test({
		which: 'string',
		target: 'container'
	});
	popcorn.test({
		which: 'missing',
		target: 'do-not-find-anything'
	});
	popcorn.destroy();
	Popcorn.removePlugin('test');
});

test('makeContainer', function() {
	var popcorn,
		container,
		childNodes = [], i,
		eventIds = [];
	
	expect(9);
	
	Popcorn.basePlugin('test', function(options, base) {
		base.makeContainer(options.tag, options.insert);
		if (base.container && options.id) {
			base.container.id = options.id;
		}
		
		return {
			_teardown: function(options) {
				console.log('teardown!');
			}
		};
		
	});

	container = document.getElementById('container');
	popcorn = Popcorn('#video');

	popcorn.test({
		start: 1,
		end: 2,
		target: 'container',
		id: 'order-3'
	});
	eventIds.push(popcorn.getLastTrackEventId());

	popcorn.test({
		start: 0,
		end: 1,
		target: 'container',
		id: 'order-0'
	});
	eventIds.push(popcorn.getLastTrackEventId());

	popcorn.test({
		start: 0,
		end: 3,
		target: 'container',
		id: 'order-2'
	});
	eventIds.push(popcorn.getLastTrackEventId());

	popcorn.test({
		start: 0,
		end: 2,
		target: 'container',
		id: 'order-1'
	});
	eventIds.push(popcorn.getLastTrackEventId());

	equal(container.firstChild.getAttribute('class'), 'popcorn-test',
		'container class name set to "popcorn-" + pluginName');
	
	for (i = 0; i < container.childNodes.length; i++) {
		childNodes.push(container.childNodes[i]);
	}

	for (i = 0; i < childNodes.length; i++) {
		equal(childNodes[i].id, 'order-' + i, 'container #' + i + ' in the right order');
	}

	popcorn.test({
		target: 'container',
		id: 'tag-name',
		tag: 'span'
	});
	eventIds.push(popcorn.getLastTrackEventId());

	equal(document.getElementById('tag-name').tagName, 'SPAN', 'container tag name set');

	popcorn.test({
		target: 'container',
		insert: false,
		onSetup: function(options) {
			ok(!this.container.parentNode, 'Container created but not inserted if insert set to false');
		}
	});
	eventIds.push(popcorn.getLastTrackEventId());

	popcorn.test({
		onSetup: function(options) {
			ok(!this.container.parentNode, 'Container created but not inserted if no target specified');
		}
	});
	eventIds.push(popcorn.getLastTrackEventId());

	while (eventIds.length) {
		popcorn.removeTrackEvent(eventIds.shift());
	}

	equal(container.childNodes.length, 0, 'containers automatically removed on teardown');

	//clean up
	popcorn.destroy();
	container.innerHTML = '';
	Popcorn.removePlugin('test');
});

module('Animation');
test('animate', function() {

	var popcorn, eventId, exp = 3;

	Popcorn.basePlugin('test', function(options, base) {
		var ret = base.animate('prop');
		ok(ret, 'base.animate returns true when successful');
		return {
			start: function(event, options) {
				equal(this.options.prop, '1px', 'Animated property has correct value at start');
			},
			frame: function(event, options, t) {
				exp++;
				expect(exp); //can't predict how many times frame will run
				equal(this.options.prop, '1.25px', 'Animated property has correct value at frame');
			},
			end: function(event, options) {
				equal(this.options.prop, '2px', 'Animated property has correct value at end');
			}
		};
	});

	popcorn = Popcorn('#video', {
		frameAnimation: true
	});
	popcorn.currentTime(0.25);
	popcorn.test({
		start: 0,
		end: 1,
		prop: {
			from: '1px', to: '2px'
		}
	});

	eventId = popcorn.getLastTrackEventId();
	popcorn.removeTrackEvent(eventId);

	popcorn.destroy();
	Popcorn.removePlugin('test');
});

test('animated property with non-animated value', function() {

	var popcorn, exp = 2, eventId;


	Popcorn.basePlugin('test', function(options, base) {
		base.animate('prop');
		return {
			start: function(event, options) {
				equal(this.options.prop, 10, 'Animated property has correct value at start');
			},
			frame: function(event, options, t) {
				equal(this.options.prop, 10, 'Animated property has correct value at frame');
				exp++;
				expect(exp); //can't predict how many times frame will run
			},
			end: function(event, options) {
				equal(this.options.prop, 10, 'Animated property has correct value at end');
			}
		};
	});

	popcorn = Popcorn('#video', {
		frameAnimation: true
	});
	popcorn.currentTime(0.25);
	popcorn.test({
		start: 0,
		end: 1,
		prop: 10
	});

	eventId = popcorn.getLastTrackEventId();
	popcorn.removeTrackEvent(eventId);

	popcorn.destroy();
	Popcorn.removePlugin('test');
});

asyncTest('animated property with multiple keyframes', function() {

	var popcorn, exp = 2, eventId;


	Popcorn.basePlugin('test', function(options, base) {
		var times = [
			0.5, 0.75, 1
		];
		base.animate('prop');
		return {
			start: function(event, options) {
				equal(this.options.prop, 0, 'Animated property has correct value at start');
			},
			frame: function(event, options, t) {
				var expected;
				if (t < 0.5) {
					expected = 2 * t * 10;
				} else {
					expected = 10 - (t - 0.5) * 2;
				}
				equal(this.options.prop, expected, 'Animated property has correct value at frame ' + t);
				exp++;
				expect(exp); //can't predict how many times frame will run

				if (times.length && t < times[0]) {
					popcorn.currentTime(times.shift());
				}
			},
			end: function(event, options) {
				equal(this.options.prop, 9, 'Animated property has correct value at end');
				setTimeout(function() {
					eventId = popcorn.getLastTrackEventId();
					popcorn.removeTrackEvent(eventId);

					popcorn.destroy();
					Popcorn.removePlugin('test');
					start();
				}, 0);
			}
		};
	});

	popcorn = Popcorn('#video', {
		frameAnimation: true
	});
	popcorn.currentTime(0.25);
	popcorn.test({
		start: 0,
		end: 1,
		prop: {
			0: 0,
			0.5: 10,
			1: 9
		}
	});

});

test('animate color', function() {

	var popcorn, exp = 8, eventId;
	//note: all rgb/rgba values will have collapsed spaces due to rounding

	Popcorn.basePlugin('test', function(options, base) {
		base.animate('rgb');
		base.animate('rgba');
		base.animate('hex');
		base.animate('hexAlpha');
		return {
			start: function(event, options) {
				equal(this.options.rgb, 'rgb(200,128,0)', 'Animated rgb color has correct value at start');
				equal(this.options.rgba, 'rgba(200,128,0,1)', 'Animated rgba color has correct value at start');
				equal(this.options.hex, 'rgb(200,128,0)', 'Animated hex color has correct value at start');
				equal(this.options.hexAlpha, 'rgba(200,128,0,1)', 'Animated hex color with alpha has correct value at start');
			},
			frame: function(event, options, t) {
				exp+=4;
				expect(exp); //can't predict how many times frame will run
				equal(this.options.rgb, 'rgb(100,128,100)', 'Animated rgb color has correct value at frame');
				equal(this.options.rgba, 'rgba(100,128,100,0.5)', 'Animated rgb color has correct value at frame');
				equal(this.options.hex, 'rgb(100,128,100)', 'Animated hex color has correct value at frame');
				equal(this.options.hexAlpha, 'rgba(100,128,100,0.5)', 'Animated hex color with alpha has correct value at frame');
			},
			end: function(event, options) {
				equal(this.options.rgb, 'rgb(0,128,200)', 'Animated rgb color has correct value at end');
				equal(this.options.rgba, 'rgba(0,128,200,0)', 'Animated rgb color has correct value at end');
				equal(this.options.hex, 'rgb(0,128,200)', 'Animated hex color has correct value at end');
				equal(this.options.hexAlpha, 'rgba(0,128,200,0)', 'Animated hex color with alpha has correct value at end');
			}
		};
	});

	popcorn = Popcorn('#video', {
		frameAnimation: true
	});
	popcorn.currentTime(0.5);
	popcorn.test({
		start: 0,
		end: 1,
		rgb: {
			from: 'rgb(200,128,0)', to: 'rgb(0,128,200)'
		},
		rgba: {
			from: 'rgba(200,128,0,1)', to: 'rgba(0,128,200,0)'
		},
		hex: {
			from: '#C88000', to: '#0080C8'
		},
		hexAlpha: {
			from: '#C88000FF', to: '#0080C800'
		}
	});

	eventId = popcorn.getLastTrackEventId();
	popcorn.removeTrackEvent(eventId);

	popcorn.destroy();
	Popcorn.removePlugin('test');
});

test('animate with callback', function() {

	var popcorn, exp = 2, eventId;

	Popcorn.basePlugin('test', function(options, base) {
		var value;
		base.animate('prop', function(val) {
			value = val;
		});
		return {
			start: function(event, options) {
				equal(value, '2px', 'Animated value has correct value at start');
			},
			frame: function(event, options, t) {
				equal(value, '1.75px', 'Animated value has correct value at frame');
				exp++;
				expect(exp); //can't predict how many times frame will run
			},
			end: function(event, options) {
				equal(value, '1px', 'Animated value has correct value at end');
			}
		};
	});

	popcorn = Popcorn('#video', {
		frameAnimation: true
	});
	popcorn.currentTime(0.25);
	popcorn.test({
		start: 0,
		end: 1,
		prop: {
			from: '2px', to: '1%'
		}
	});

	eventId = popcorn.getLastTrackEventId();
	popcorn.removeTrackEvent(eventId);

	popcorn.destroy();
	Popcorn.removePlugin('test');
});

test('timing functions', function() {

	var timingSamples, samples, times, inc, i, timing,
		target, actual;

	timingSamples = {
		"linear": [
			0,
			0.2,
			0.4,
			0.6,
			0.8,
			1
		],
		"ease-in-quad": [
			0,
			0.04,
			0.16,
			0.36,
			0.64,
			1
		],
		"ease-out-quad": [
			0,
			0.36,
			0.64,
			0.84,
			0.96,
			1
		],
		"ease-in-out-quad": [
			0,
			0.08,
			0.32,
			0.68,
			0.92,
			1
		],
		"ease-in-cubic": [
			0,
			0.008,
			0.064,
			0.216,
			0.512,
			1
		],
		"ease-out-cubic": [
			0,
			0.488,
			0.784,
			0.936,
			0.992,
			1
		],
		"ease-in-out-cubic": [
			0,
			0.032,
			0.256,
			0.744,
			0.968,
			1
		],
		"ease-in-quart": [
			0,
			0.0016,
			0.0256,
			0.1296,
			0.4096,
			1
		],
		"ease-out-quart": [
			0,
			0.5904,
			0.8704,
			0.9744,
			0.9984,
			1
		],
		"ease-in-out-quart": [
			0,
			0.0128,
			0.2048,
			0.7952,
			0.9872,
			1
		],
		"ease-in-quint": [
			0,
			0.00032,
			0.01024,
			0.07776,
			0.32768,
			1
		],
		"ease-out-quint": [
			0,
			0.67232,
			0.92224,
			0.98976,
			0.99968,
			1
		],
		"ease-in-out-quint": [
			0,
			0.00512,
			0.16384,
			0.83616,
			0.99488,
			1
		],
		"ease-in-sine": [
			0,
			0.04894348370484647,
			0.19098300562505255,
			0.412214747707527,
			0.6909830056250525,
			0.9999999999999999
		],
		"ease-out-sine": [
			0,
			0.3090169943749474,
			0.5877852522924731,
			0.8090169943749475,
			0.9510565162951535,
			1
		],
		"ease-in-out-sine": [
			0,
			0.09549150281252627,
			0.3454915028125263,
			0.6545084971874737,
			0.9045084971874737,
			1
		],
		"ease-in-exp": [
			0,
			0.00390625,
			0.015625,
			0.0625,
			0.25,
			1
		],
		"ease-out-exp": [
			0,
			0.75,
			0.9375,
			0.984375,
			0.99609375,
			1
		],
		"ease-in-out-exp": [
			0,
			0.0078125,
			0.125,
			0.875,
			0.9921875,
			1
		],
		"ease-in-circ": [
			0,
			0.020204102886728803,
			0.08348486100883201,
			0.2,
			0.4,
			1
		],
		"ease-out-circ": [
			0,
			0.6,
			0.8,
			0.9165151389911681,
			0.9797958971132712,
			1
		],
		"ease-in-out-circ": [
			0,
			0.041742430504416006,
			0.2,
			0.8,
			0.958257569495584,
			1
		]
	};

	inc = 1 / (timingSamples.linear.length - 1);
	times = timingSamples.linear;

	for (timing in timingSamples) {
		fn = Popcorn.basePlugin.timing[timing]();
		samples = timingSamples[timing];
		for (i = 0; i < samples.length; i++) {
			target = samples[i];
			actual = fn(inc * i);
			ok(Math.abs(target - actual) < 1e-4, timing + ' matches at ' + (inc * i) + ' (' + actual + ' ~= ' + target + ')');
		}
	}

	/*
	todo: tests for
		step-start
		step-end
		cubic-bezier
		ease
		ease-in
		ease-in-out
		ease-out
		ease-in-power
		ease-in-out-power
		ease-out-power
		bounce
		and custom
	*/
});

module('Utilities');
test('toArray', function() {
	var popcorn,
		array = [1, 2, 3],
		jsonArray = '[1, 2, 3]',
		jsonObject = '{ "a": 1 }',
		splitString = '1,2:3 4';
	
	expect(6);
	
	Popcorn.basePlugin('test', function(options, base) {
	});

	popcorn = Popcorn('#video');
	popcorn.test({
		onSetup: function() {
			ok(array === this.toArray(array), 'Array passes straight through');
		}
	});

	popcorn.test({
		onSetup: function() {
			var a = this.toArray('hi there');
			ok(a instanceof Array && a.length === 1 &&
				a[0] === 'hi there', 'string value placed in array');
		}
	});

	popcorn.test({
		onSetup: function() {
			var a = this.toArray(jsonArray);
			ok(a instanceof Array && a.length === 3 &&
				a.join(',') === '1,2,3', 'JSON array converted to array');
		}
	});

	popcorn.test({
		onSetup: function() {
			var a = this.toArray(jsonObject);
			ok(typeof a === 'object' && a.length === 1 &&
				a[0].a === 1, 'JSON object placed in array');
		}
	});

	popcorn.test({
		onSetup: function() {
			var a = this.toArray(splitString, /[,: ]/);
			ok(a instanceof Array && a.length === 4,
				'string split to array');
		}
	});

	popcorn.test({
		onSetup: function() {
			var a = this.toArray();
			ok(a instanceof Array && a.length === 0,
				'undefined converted to empty array');
		}
	});

	popcorn.destroy();
	Popcorn.removePlugin('test');
});

test('toObject', function() {
	var popcorn,
		obj = { "a": 1 },
		jsonObject = '{ "a": 1 }';
	
	expect(2);
	
	Popcorn.basePlugin('test', function(options, base) {
	});

	popcorn = Popcorn('#video');
	popcorn.test({
		onSetup: function() {
			ok(obj === this.toObject(obj), 'Object passes straight through');
		}
	});

	popcorn.test({
		onSetup: function() {
			var a = this.toObject(jsonObject);
			ok(typeof a === 'object' && a.a === 1,
				'JSON object parsed');
		}
	});

	popcorn.destroy();
	Popcorn.removePlugin('test');
});

test('addClass', function() {
	var popcorn;
	
	expect(2);
	
	Popcorn.basePlugin('test', function(options, base) {
	});

	popcorn = Popcorn('#video');

	popcorn.test({
		onSetup: function() {
			var div = document.createElement('div');
			div.setAttribute('class', 'one');
			this.addClass(div, ['two', 'three']);
			equal(div.getAttribute('class'), 'one two three', 'Set array of classes');
		}
	});

	popcorn.test({
		onSetup: function() {
			var div = document.createElement('div');
			this.addClass(div, 'one two\n three');
			equal(div.getAttribute('class'), 'one two three', 'Set classes by delimited string');
		}
	});

	popcorn.destroy();
	Popcorn.removePlugin('test');
});

test('removeClass', function() {
	var popcorn;
	
	expect(3);
	
	Popcorn.basePlugin('test', function(options, base) {
	});

	popcorn = Popcorn('#video');

	popcorn.test({
		onSetup: function() {
			var div = document.createElement('div');
			div.setAttribute('class', 'one two three');
			this.removeClass(div, ['one', 'three']);
			equal(div.getAttribute('class'), 'two', 'Remove array of classes');
		}
	});

	popcorn.test({
		onSetup: function() {
			var div = document.createElement('div');
			div.setAttribute('class', 'one two three');
			this.removeClass(div, 'one\n three');
			equal(div.getAttribute('class'), 'two', 'Remove classes by delimited string');
		}
	});

	popcorn.test({
		onSetup: function() {
			var div = document.createElement('div');
			div.setAttribute('class', 'one two three');
			this.removeClass(div, 'one four');
			equal(div.getAttribute('class'), 'two three', 'Ignore missing classes');
		}
	});

	popcorn.destroy();
	Popcorn.removePlugin('test');
});

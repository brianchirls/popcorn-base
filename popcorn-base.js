/*
 * Popcorn.js Base Plugin
 * https://github.com/brianchirls/popcorn-base
 *
 * Copyright 2012, Brian Chirls
 * Licensed under the MIT license
 */

(function (window, Popcorn) {
	"use strict";

	var document = window.document,
		console = window.console,
		popcornInstances = {},
		BasePopcorn,
		PopcornBasePlugin,
		PopcornBaseEvent,
		allTargets = [],
		timing,
		numRegex = /[\-+]?[0-9]*\.?[0-9]+/g,
		styleHyphenRegex = /\-([a-z])/g,
		stylePrefixRegex = /^\-\*\-([a-z\-]+)/,
		browserPrefixes = ['', '-moz-', '-webkit-', '-o-', '-ms-'],
		colorRegex = /#(([0-9a-fA-F]{3,8}))/g,
		rgbaRegex = /(rgba?)\(\s*([0-9]*\.?[0-9]+)\s*,\s*([0-9]*\.?[0-9]+)\s*,\s*([0-9]*\.?[0-9]+)\s*(,([0-9]*\.?[0-9]+))?\)/gi,
		timingRegex = /^([A-Za-z\-]+)(\((([\-+]?[0-9]*\.?[0-9]+)(,\s*([\-+]?[0-9]*\.?[0-9]+))*)\))?$/;

	function logError(err) {
		if (err) {
			console.log(err.stack || err.stacktrace || err.message || err);
		}
	}

	BasePopcorn = function(popcorn) {
		var base;
		if (window === this || !(this instanceof BasePopcorn) ) {
			base = BasePopcorn.find(popcorn);
			if (!base) {
				base = new BasePopcorn(popcorn);
			}
			return base;
		}

		this.popcorn = popcorn;
		this.id = Popcorn.guid();
		popcornInstances[this.id] = this;
	};
	
	BasePopcorn.find = function(instance) {
		var id, bp;
		
		for (id in popcornInstances) {
			bp = popcornInstances[id];
			if (bp && bp.popcorn === instance) {
				return bp;
			}
		}
	};
	
	BasePopcorn.plugins = {};
	BasePopcorn.register = function(pluginName, basePlugin) {
		BasePopcorn.plugins[pluginName] = basePlugin;
	};
	
	PopcornBasePlugin = function(pluginName, plugin, manifest) {
		var definition,
			me = this;

		this.name = pluginName;
		this.pluginFn = plugin;
		this.events = {};

		definition = function(options) {
			var popcorn = this,
				event = new PopcornBaseEvent(popcorn, me, options),
				all, evt, i,
				id;

			return event.definition();
		};
		
		//copy any properties. this is rare
		Popcorn.forEach(plugin, function(val, key) {
			definition[key] = val;
		});

		Popcorn.plugin(pluginName, definition, manifest);

		//register plugin with our own list
		BasePopcorn.register(pluginName, this);
	};
	
	PopcornBaseEvent = function(popcorn, basePlugin, options) {
		
		var current = false, // currentTime is between start and end
			started = false, // start has been run, but end has not
			setupFn, updateFn, startFn, frameFn, endFn, teardownFn,
			me = this, instanceId, allEvents,
			allEventsByTarget,
			basePopcorn = BasePopcorn(popcorn),
			animatedProperties = {},
			setStyles = [],
			animations = {},
			definition, i;
		
		function getCallbackFunction(fn) {
			if (fn && typeof fn === 'string') {
				fn = window[fn];
			}
			
			if (fn && typeof fn === 'function') {
				return fn;
			}
		}

		function updateAnimations(fraction) {
			function findPreviousKeyframe(keyframes, t) {
				//todo: binary search
				var i;
				if (!keyframes.length) {
					return;
				}
				if (keyframes[0].t > t) {
					return -1;
				}

				for (i = 1; i < keyframes.length; i++) {
					if (keyframes[i].t >= t) {
						return i - 1;
					}
				}

				return i - 1;
			}

			function join(vals, str) {
				var i, out = [];
				for (i = 0; i < vals.length; i++) {
					out.push(str[i]);
					out.push(vals[i]);
				}
				out.push(str[i]);
				return out.join('');
			}

			function rgbaRound(match, rgba, r, g, b, x, a) {
				var params = [r,g,b], i;
				for (i = 0; i < 3; i++) {
					params[i] = Math.round(parseFloat(params[i]));
				}

				if (x) {
					params.push(a);
				}

				return rgba + '(' + params.join(',') + ')';
			}

			var i, j, f, prop, val, from, to, delta, current, timingFn;

			for (i in animatedProperties) {
				prop = animatedProperties[i];

				from = findPreviousKeyframe(prop.keyframes, fraction);
				to = prop.keyframes[from + 1];
				from = prop.keyframes[from];
				if (!from) {
					from = to;
				}

				if (!to || from === to) {
					val = prop.str ? join(from.val, prop.str) : from.val[0];
				} else {
					delta = to.t - from.t;
					timingFn = from.timing || prop.timing;
					f = timingFn((fraction - from.t) / delta);
					
					from = from.val;
					to = to.val;
					current = [];
					for (j = 0; j < from.length; j++) {
						current.push(from[j] + (to[j] - from[j]) * f);
					}
					if (prop.str) {
						val = join(current, prop.str);
						val = val.replace(rgbaRegex, rgbaRound);
					} else {
						val = current[0];
					}
				}

				me.options[i] = val;
				if (prop.callback) {
					prop.callback.call(me, val);
				}
			}
		}

		function insertContainer() {
			var i, evt, nextElement = null;
			if (allEventsByTarget) {
				for (i = allEventsByTarget.length - 1; i >= 0; i--) {
					evt = allEventsByTarget[i];
					if (evt === me || evt.options.start < me.options.start ||
						(evt.options.start === me.options.start && evt.options.end < me.options.end)) {

						break;
					}
					if (evt.container && evt.container.parentNode === me.target) {
						nextElement = evt.container;
					}
				}
			}

			me.target.insertBefore(me.container, nextElement);
		}

		function insertInPlace(target) {
			var evt, i, t;

			//remove from old position
			//todo: use binary search insted of indexOf
			if (allEvents) {
				//update
				i = allEvents.indexOf(me);
				if (i >= 0) {
					allEvents.splice(i, 1);
				}
			} else {
				allEvents = basePlugin.events[instanceId];
			}

			//todo: use binary search instead
			for (i = allEvents.length - 1; i >= 0; i--) {
				evt = allEvents[i].options;
				if (evt.start <= options.start ||
					(evt.start === options.start && evt.end <= options.end)) {

					break;
				}
			}
			allEvents.splice(i + 1, 0, me);
			me.allEvents = allEvents;

			if (target !== undefined) {
				if (!(target instanceof window.Element)) {
					target = null;
				}

				if (allEventsByTarget) {
					i = allEventsByTarget.indexOf(me);
					if (i >= 0) {
						allEventsByTarget.splice(i);
					}
				}

				if (!target) {
					delete me.target;
					return;
				}

				if (target !== me.target) {
					me.target = target;

					for (i = 0; i < allTargets.length; i++) {
						t = allTargets[i];
						if (t.target === me.target) {
							allEventsByTarget = t.events;
							break;
						}
					}
					if (!allEventsByTarget) {
						allEventsByTarget = [me];
						allTargets.push({
							target: me.target,
							events: allEventsByTarget
						});
						return;
					}
				}
			}

			if (!allEventsByTarget) {
				return;
			}

			//sort
			for (i = allEventsByTarget.length - 1; i >= 0; i--) {
				evt = allEventsByTarget[i].options;
				if (evt.start < options.start ||
					(evt.start === options.start && evt.end <= options.end)) {

					break;
				}
			}
			allEventsByTarget.splice(i + 1, 0, me);
		}

		//just being helpful...
		this.popcorn = popcorn;
		this.pluginName = basePlugin.name;

		//clean up start/end values and make them numbers
		if (typeof options.start === 'string') {
			options.start = Popcorn.util.toSeconds(options.start, popcorn.options.framerate);
		}
		if (!options.start && options.start !== 0) {
			options.start = options['in'] || 0;
		}

		if (typeof options.end === 'string') {
			options.end = Popcorn.util.toSeconds(options.end, popcorn.options.framerate);
		}
		if (!options.end && options.end !== 0) {
			options.end = options['out'] || popcorn.duration() || Number.MAX_VALUE;
		}

		//keep a separate copy of options
		this.options = {};
		for (i in options) {
			if (options.hasOwnProperty(i)) {
				this.options[i] = options[i];
			}
		}

		//add to Plugin's queue of events
		instanceId = basePopcorn.id;
		if (!basePlugin.events[instanceId]) {
			basePlugin.events[instanceId] = [];
		}

		insertInPlace(typeof options.target === 'string' ?
			document.getElementById(options.target) :
			options.target);

		//events
		this.onSetup = getCallbackFunction(options.onSetup);
		this.onUpdate = getCallbackFunction(options.onUpdate);
		this.onStart = getCallbackFunction(options.onStart);
		this.onFrame = getCallbackFunction(options.onFrame);
		this.onEnd = getCallbackFunction(options.onEnd);
		this.onTeardown = getCallbackFunction(options.onTeardown);
		
		this.definition = function() {
			return definition;
		};

		this.makeContainer = function(tag, insert) {
			if (insert === undefined) {
				insert = true;
			}

			if (!tag) {
				tag = 'div';
			}

			this.container = document.createElement(tag);
			this.addClass(this.container, 'popcorn-' + this.pluginName);

			if (insert && this.target) {
				//insert in order
				insertContainer();
			}
			
			return this.container;
		};

		/*
		animate method will animate any given properties of the `options` object
		if `callback` option is provided, will call that on every frame
		*/
		this.animate = function(name, opts) {
			var callback, animated = false, i, styles = {};

			function animateOption(name, callback) {
				function fixColors(str) {
					var matches, colors = {}, i, match;

					function makeRGBA(hex) {
						var nums, reg, n, i;

						n = hex.length;
						if (n === 4 || n === 5) {
							nums = hex.match(/[0-9A-Fa-f]/g);
							for (i = 0; i < nums.length; i++) {
								nums[i] = parseInt(nums[i] + nums[i], 16);
							}
						} else if (n === 7 || n === 9) {
							nums = hex.match(/[0-9A-Fa-f]{2}/g);
							for (i = 0; i < nums.length; i++) {
								nums[i] = parseInt(nums[i], 16);
							}
						}
						if (nums.length > 3) {
							nums[3] /= 255;
							return 'rgba(' + nums.join(',') + ')';
						}
						return 'rgb(' + nums.join(',') + ')';
					}

					if (typeof str !== 'string') {
						return str;
					}

					return str.replace(colorRegex, makeRGBA, 'g');
				}

				function kfSort(a, b) {
					return a.t - b.t;
				}

				function makeTimingFunction(fn) {
					var parsed, args = [], i, x;

					if (!fn) {
						return timing.linear();
					}

					if (typeof fn === 'function') {
						return fn;
					}

					parsed = timingRegex.exec(fn);
					if (!parsed) {
						return timing.linear();
					}
					fn = timing[parsed[1]];
					if (!fn) {
						return timing.linear();
					}

					if (parsed[3]) {
						args = parsed[3].split(',');
					}
					for (i = 0; i < args.length; i++) {
						args[i] = parseFloat(args[i]);
					}
					x = fn.apply(null, args);
					if (typeof x === 'function') {
						return x;
					}

					return fn;
				}

				var prop,
					opt,
					i, j, val, vals, str, count = 1,
					timingFn,
					keyframe,
					keyframes = [];

				if (!name) {
					return false;
				}

				if (animations[name]) {
					//clear old animations
					delete animatedProperties[name];
				}

				animations[name] = opts;

				if (!options[name]) {
					return false;
				}

				opt = options[name];

				if (typeof opt !== 'object') {
					me.options[name] = opt;
					return false;
				}

				prop = {
					name: name,
					keyframes: keyframes,
					timing: makeTimingFunction(opt.timing)
				};

				for (i in opt) {
					val = opt[i];
					if (i === 'from' && opt[0] === undefined) {
						i = 0;
					} else if (i === 'to' && opt[1] === undefined) {
						i = 1;
					} else {
						i = parseFloat(i);
					}

					if (typeof val === 'object') {
						timingFn = val[1] || val.timing;
						val = val[0] === undefined ? val.val : val[0];
						if (timingFn === opt.timing) {
							timingFn = prop.timingFn;
						} else {
							timingFn = makeTimingFunction(timingFn);
						}
					} else {
						timingFn = false;
					}

					//convert hex colors to rgb/rgba
					if (typeof val === 'string') {
						val = fixColors(val);
						vals = val.match(numRegex);
					} else if (typeof val === 'number') {
						vals = [val];
					}
					if (vals && !isNaN(i)) {
						if (!str && typeof val === 'string') {
							str = val.split(numRegex);
							count = vals.length;
							if (str.length < count) {
								str.push('');
							}
						}
						if (vals.length === count) {
							for (j = 0; j < vals.length; j++) {
								vals[j] = parseFloat(vals[j], 10);
							}

							keyframe = {
								t: i,
								val: vals
							};
							if (timingFn && timingFn !== prop.timing) {
								keyframe.timing = timingFn;
							}
							keyframes.push(keyframe);
						}
					}
				}

				if (!keyframes.length) {
					me.options[name] = opt;
					return false;
				}

				if (keyframes.length === 1) {
					me.options[name] = keyframes[0].val;
					return false;
				}

				prop.str = str;

				keyframes.sort(kfSort);

				if (typeof callback === 'function') {
					prop.callback = callback;
				}

				animatedProperties[name] = prop;
				return true;
			}

			function animateStyle(name, element) {
				function isStyle(element, name) {
					function replaceStyleHyphen(str, letter) {
						return letter.toUpperCase();
					}
					var style, lower;

					if (name === 'src') {
						//weirdness in chrome
						return false;
					}

					//webkit
					if (element.style.hasOwnProperty(name)) {
						return name;
					}

					//firefox
					if (window.getComputedStyle) {
						style = window.getComputedStyle(element);
						lower = name.toLowerCase();
						if (style.hasOwnProperty(name) || style[name] !== undefined || style.getPropertyValue(name)) {
							return name.replace(styleHyphenRegex, replaceStyleHyphen) || false;
						} else if (style.hasOwnProperty(lower) || style[lower] !== undefined || style.getPropertyValue(lower)) {
							return lower;
						}

					}
				}

				var callback, animated = false, backup, jsName, prefixed, prefixedName, i;
				prefixed = stylePrefixRegex.exec(name);

				if (prefixed) {
					prefixed = prefixed[1];
					for (i = 0; i < browserPrefixes.length && !jsName; i++) {
						prefixedName = browserPrefixes[i] + prefixed;
						jsName = isStyle(element, prefixedName);

						//don't set if this is specified elsewhere in options
						//todo: don't set if it's already been set automagically
						if (styles[jsName] || jsName && prefixedName !== name &&
							options[prefixedName]) {

							return false;
						}
					}
				} else {
					jsName = isStyle(element, name);
				}

				if (!jsName) {
					return false;
				}

				if (name === 'top' || name === 'left' || name === 'right' || name === 'bottom') {
					element.style.position = 'absolute';
				}

				callback = function(val) {
					element.style[jsName] = val;
				};

				styles[jsName] = true;

				backup = {
					e: element,
					name: jsName
				};

				animated = animateOption(name, callback);
				if (!animated) {
					backup.val = options[name];
				}
				setStyles.push(backup);

				return animated;
			}

			if (!name) {
				if (this.container) {
					name = this.container;
				}
			}

			if (name instanceof window.HTMLElement) {
				for (i in options) {
					animated = animateStyle(i, name) || animated;
				}
				return animated;
			}

			if (opts instanceof window.HTMLElement) { //todo: or element could be member of opts
				return animateStyle(name, opts);
			}

			if (typeof opts === 'function') {
				callback = opts;
			} else if (typeof opts === 'object') {
				callback = opts;
			}

			return animateOption(name, callback);
		};

		//run plugin function to get setup, etc.
		//todo: validate that 'plugin' is a function
		//todo: try/catch all event functions
		definition = basePlugin.pluginFn.call(popcorn, options, this);
		if (!definition) {
			definition = {};
		}
/*
		if (!definition.start) {
			definition.start = this.nop;
		}
*/
		setupFn = definition._setup;
		definition._setup = function(options) {
			if (typeof setupFn === 'function') {
				setupFn.call(me, options);
			}
			if (typeof me.onSetup === 'function') {
				try {
					me.onSetup.call(me, options);
				} catch (e) {
					logError(e);
				}
			}
		};

		startFn = definition.start;
		definition.start = function(event, options) {
			var i, s;
			for (i = 0; i < setStyles.length; i++) {
				s = setStyles[i];
				s.backup = s.e.style[s.name];
				s.e.style[s.name] = s.val;
			}

			current = true;
			started = true;
			updateAnimations.call(me, 0);
			if (typeof startFn === 'function') {
				startFn.call(me, event, options);
			}
			if (typeof me.onStart === 'function') {
				try {
					me.onStart.call(me, options);
				} catch (e) {
					logError(e);
				}
			}

			//run frame once in case Popcorn doesn't
			definition.frame(event, options, popcorn.currentTime());
		};

		frameFn = definition.frame;
		definition.frame = function(event, options, time) {
			if (started) {
				updateAnimations.call(me, (time - me.options.start) / (me.options.end - me.options.start));
				if (typeof frameFn === 'function') {
					frameFn.call(me, event, options, time);
				}
				if (typeof me.onFrame === 'function') {
					try {
						me.onFrame.call(me, options, time);
					} catch (e) {
						logError(e);
					}
				}
			}
		};
		
		updateFn = definition._update;
		if (updateFn) {
			definition._update = function(trackEvent, changes) {
				var i, target, evt, nextContainer = null, reSort = false;
				//clean up start/end values and make them numbers
				if (changes.start === undefined) {
					changes.start = options.start;
				} else {
					changes.start = Popcorn.util.toSeconds(changes.start, popcorn.options.framerate);
				}
				if (changes.end === undefined) {
					changes.end = options.end;
				} else {
					changes.end = Popcorn.util.toSeconds(changes.end, popcorn.options.framerate);
				}

				if (changes.start !== options.start || changes.end !== options.end) {
					//if start/end changed, re-sort events
					reSort = true;
					options.start = changes.start;
					options.end = changes.end;
					me.options.start = options.start;
					me.options.end = options.end;
				}

				//changed target?
				if ('target' in changes) {
					target = changes.target;
					if (target && typeof target === 'string') {
						target = document.getElementById(target);
					}
					if (target !== me.target) {
						reSort = true;
					}
				}
				if (reSort) {
					insertInPlace(target);
					if (me.container) {
						insertContainer();
					}
				}

				//update copy of options
				if (changes.onUpdate !== undefined) {
					me.onUpdate = getCallbackFunction(changes.onUpdate);
				}
				if (changes.onStart !== undefined) {
					me.onStart = getCallbackFunction(changes.onStart);
				}
				if (changes.onFrame !== undefined) {
					me.onFrame = getCallbackFunction(changes.onFrame);
				}
				if (changes.onEnd !== undefined) {
					me.onEnd = getCallbackFunction(changes.onEnd);
				}
				if (changes.onTeardown !== undefined) {
					me.onTeardown = getCallbackFunction(changes.onTeardown);
				}

				if (typeof updateFn === 'function') {
					updateFn.call(me, options, changes);
				}

				for (i in changes) {
					me.options[i] = changes[i];
				}

				for (i in animations) {
					if (changes[i] !== undefined) {
						options[i] = changes[i];
						me.animate(i, animations[i]);
					}
				}

				if (typeof me.onUpdate === 'function') {
					try {
						me.onUpdate.call(me, options, changes);
					} catch (e) {
						logError(e);
					}
				}
			};
		}

		endFn = definition.end;
		definition.end = function(event, options) {
			if (started) {
				var i, s;

				updateAnimations.call(me, 1);

				for (i = 0; i < setStyles.length; i++) {
					s = setStyles[i];
					s.e.style[s.name] = s.backup;
				}

				if (typeof me.onEnd === 'function') {
					try {
						me.onEnd.call(me, options);
					} catch (e) {
						logError(e);
					}
				}
				if (typeof endFn === 'function') {
					endFn.call(me, event, options);
				}
				started = false;
			}
			current = false;
		};

		teardownFn = definition._teardown;
		definition._teardown = function(options) {
			var parent, i;
			if (typeof me.onTeardown === 'function') {
				try {
					me.onTeardown.call(me, options);
				} catch (e) {
					logError(e);
				}
			}
			if (typeof teardownFn === 'function') {
				teardownFn.call(me, options);
			}
			if (me.container) {
				parent = me.container.parentNode;
				if (parent) {
					parent.removeChild(me.container);
				}
				delete me.container;
			}
			i = allEvents.indexOf(me);
			if (i <= 0) {
				allEvents.splice(i, 1);
			}
		};
	};


	//'static' utility functions
	PopcornBaseEvent.prototype.toArray = function(data, delimiters) {
		var out;
		
		if (data === undefined) {
			return [];
		}

		if (Object.prototype.toString.call(data) === '[object Array]') {
			return data;
		}
		
		try {
			out = JSON.parse(data);
			if (Object.prototype.toString.call(out) !== '[object Array]') {
				out = [out];
			}
		} catch (e) {
			out = data;
		}
		
		if (delimiters && typeof out === 'string') {
			try {
				out = out.split(delimiters);
			} catch (er) {
			}
		}

		if (out !== undefined && out !== null &&
			Object.prototype.toString.call(out) !== '[object Array]') {
			return [out];
		}
		
		return out;
	};

	PopcornBaseEvent.prototype.toObject = function(data) {
		if (typeof data === 'object') {
			return data;
		}
		
		try {
			return JSON.parse(data);
		} catch (e) {
			return data;
		}
	};

	if (typeof document !== 'undefined' &&
		!(document.createElement('a')).classList ) {
			
		PopcornBaseEvent.prototype.addClass = function(element, classes) {
			var curClasses, i;
			if (!classes || !element || !element.getAttribute) {
				return;
			}

			classes = PopcornBaseEvent.prototype.toArray(classes, /[\s\t\r\n ]+/);
			curClasses = element.getAttribute('class') || '';
			curClasses = curClasses.split(/[\s\t\r\n ]+/);
			
			for (i = 0; i < classes.length; i++) {
				if (curClasses.indexOf(classes[i]) < 0) {
					curClasses.push(classes[i]);
				}
			}

			element.setAttribute('class', curClasses.join(' '));
		};

		PopcornBaseEvent.prototype.removeClass = function(element, classes) {
			var curClasses, i, index;

			if (!classes || !element || !element.getAttribute) {
				return;
			}

			classes = PopcornBaseEvent.prototype.toArray(classes, /[\s\t\r\n ]+/);
			curClasses = element.getAttribute('class') || '';
			curClasses = curClasses.split(/[\s\t\r\n ]+/);

			for (i = 0; i < classes.length; i++) {
				index = curClasses.indexOf(classes[i]);
				if (index >= 0) {
					curClasses.splice(index, 1);
				}
			}
			
			element.setAttribute('class', curClasses.join(' '));
		};
	} else {
		PopcornBaseEvent.prototype.addClass = function(element, classes) {
			var c, i;

			if (!element || !element.classList) {
				return;
			}

			c = PopcornBaseEvent.prototype.toArray(classes, /[\s\t\r\n ]+/);

			for (i = 0; i < c.length; i++) {
				try {
					element.classList.add(c[i]);
				} catch (e) {}
			}
		};

		PopcornBaseEvent.prototype.removeClass = function(element, classes) {
			var c, i;

			if (!element || !element.classList) {
				return;
			}

			c = PopcornBaseEvent.prototype.toArray(classes, /[\s\t\r\n ]+/);

			for (i = 0; i < c.length; i++) {
				try {
					element.classList.remove(c[i]);
				} catch (e) {}
			}
		};
	}

	PopcornBaseEvent.prototype.nop = function() {
	};

	// non-static methods

	//export to global Popcorn object
	Popcorn.basePlugin = function(name, plugin, manifest) {
		var bp = new PopcornBasePlugin(name, plugin, manifest);
		//return bp;
	};

	//export utility functions
	Popcorn.basePlugin.toArray = PopcornBaseEvent.prototype.toArray;
	Popcorn.basePlugin.toObject = PopcornBaseEvent.prototype.toObject;
	Popcorn.basePlugin.addClass = PopcornBaseEvent.prototype.addClass;
	Popcorn.basePlugin.removeClass = PopcornBaseEvent.prototype.removeClass;

	timing = {
		'step-start': function(n) {
			function f(t) {
				return Math.floor(t * n) / n;
			}

			if (n < 1) {
				return timing.linear();
			}

			return f;
		},
		'step-end': function(n) {
			function f(t) {
				return Math.ceil(t * n) / n;
			}

			if (n < 1) {
				return timing.linear();
			}

			return f;
		},
		'linear': function() {
			function f(t) {
				return t;
			}

			return f;
		},
		'cubic-bezier': function(p1, p2, p3, p4) {
			//http://en.wikipedia.org/wiki/B%C3%A9zier_curve#Cubic_B.C3.A9zier_curves
			//inspired by: http://st-on-it.blogspot.com/2011/05/calculating-cubic-bezier-function.html
			var cx, bx, ax, cy, by, ay;

			function bezierX(t) {
				return t * (cx + t * (bx + t * ax));
			}

			function bezierY(t) {
				return t * (cy + t * (by + t * ay));
			}

			function bezierXDeriv(t) {
				return cx + t * (2 * bx + 3 * ax + t);
			}

			function findX(t) {
				//Newton's method, up to 10 iterations
				var x = t, i = 0, z;
				while (i < 10) {
					z = bezierX(x) - t;
					if (Math.abs(z) < 1e-4) {
						break;
					}

					x = x - z / bezierXDeriv(x);
					i++;
				}
				return x;
			}

			if (isNaN(p1)) {
				p1 = 0.25;
			}

			if (isNaN(p2)) {
				p2 = 0.1;
			}

			if (isNaN(p3)) {
				p3 = 0.25;
			}

			if (isNaN(p4)) {
				p4 = 1;
			}

			/*
			if (p2 < 0 || p2 || 1 || p4 < 0 || p4 > 1) {
				return timing.linear();
			}
			*/
			p2 = Math.min(Math.max(p2, 0), 1);
			p4 = Math.min(Math.max(p4, 0), 1);

			cx = 3 * p1;
			bx = 3 * (p3 - p1) - cx;
			ax = 1 - cx - bx;
			cy = 3 * p2;
			by = 3 * (p4 - p2) - cy;
			ay = 1 - cy - by;

			return function(t) {
				return bezierY(findX(t));
			};
		},
		'ease': function() {
			return timing['cubic-bezier'](0.25, 0.1, 0.25, 1.0);
		},
		'ease-in': function() {
			return timing['cubic-bezier'](0.42, 0.0, 1.0, 1.0);
		},
		'ease-in-out': function() {
			return timing['cubic-bezier'](0.42, 0.0, 0.58, 1.0);
		},
		'ease-out': function() {
			return timing['cubic-bezier'](0.0, 0.0, 0.58, 1.0);
		},
		'ease-in-power': function(power) {
			function f(t) {
				return Math.pow(t, power);
			}

			if (isNaN(power) || power < 0) {
				return timing.linear(); //same as power = 1
			}

			return f;
		},
		'ease-in-out-power': function(power) {
			function f(t) {
				if (t < 0.5) {
					return 0.5 * Math.pow(t * 2, power);
				}

				return -0.5 * (Math.pow(Math.abs(t * 2 - 2), power) - 2);
			}

			if (isNaN(power) || power < 0) {
				return timing.linear(); //same as power = 1
			}

			return f;
		},
		'ease-out-power': function(power) {
			function f(t) {
				return 1 - Math.pow(Math.abs(t - 1), power);
			}

			if (isNaN(power) || power < 0) {
				return timing.linear(); //same as power = 1
			}

			return f;
		},
		'ease-in-quad': function() {
			return timing['ease-in-power'](2);
		},
		'ease-in-out-quad': function() {
			return timing['ease-in-out-power'](2);
		},
		'ease-out-quad': function() {
			return timing['ease-out-power'](2);
		},
		'ease-in-cubic': function() {
			return timing['ease-in-power'](3);
		},
		'ease-in-out-cubic': function() {
			return timing['ease-in-out-power'](3);
		},
		'ease-out-cubic': function() {
			return timing['ease-out-power'](3);
		},
		'ease-in-quart': function() {
			return timing['ease-in-power'](4);
		},
		'ease-in-out-quart': function() {
			return timing['ease-in-out-power'](4);
		},
		'ease-out-quart': function() {
			return timing['ease-out-power'](4);
		},
		'ease-in-quint': function() {
			return timing['ease-in-power'](5);
		},
		'ease-in-out-quint': function() {
			return timing['ease-in-out-power'](5);
		},
		'ease-out-quint': function() {
			return timing['ease-out-power'](5);
		},
		'ease-in-sine': function() {
			function f(t) {
				return -Math.cos(t * Math.PI / 2) + 1;
			}

			return f;
		},
		'ease-in-out-sine': function() {
			function f(t) {
				return -0.5 * (Math.cos(Math.PI * t) - 1);
			}

			return f;
		},
		'ease-out-sine': function() {
			function f(t) {
				return Math.sin(t * Math.PI / 2) ;
			}

			return f;
		},
		'ease-in-exp': function() {
			function f(t) {
				return !t ? 0 : Math.pow(2, 10 * (t - 1));
			}

			return f;
		},
		'ease-in-out-exp': function() {
			function f(t) {
				if (!t) {
					return 0;
				}
				if (t === 1) {
					return 1;
				}
				if (t < 0.5) {
					return 0.5 * Math.pow(2, 10 * (t * 2 - 1));
				}
				return 0.5 * (-Math.pow(2, -10 * (t * 2 - 1)) + 2);
			}

			return f;
		},
		'ease-out-exp': function() {
			function f(t) {
				return t === 1 ? 1 : -Math.pow(2, -10 * t) + 1;
			}

			return f;
		},
		'ease-in-circ': function() {
			function f(t) {
				return 1 - Math.sqrt(1 - (t * t));
			}

			return f;
		},
		'ease-out-circ': function() {
			function f(t) {
				return Math.sqrt(1 - Math.pow(t - 1, 2));
			}

			return f;
		},
		'ease-in-out-circ': function() {
			function f(t) {
				if(t < 0.5) {
					return -0.5 * (Math.sqrt(1 - Math.pow(t * 2, 2)) - 1);
				}

				return 0.5 * (Math.sqrt(1 - Math.pow(t * 2 - 2, 2)) + 1);
			}

			return f;
		},

		/*
		todo: elastic, back, swing
		*/
		'bounce': function(gravity, bounce) {
			//http://www.sosmath.com/calculus/geoser/bounce/bounce.html
			var bounces, i, b, diff;

			if (!gravity || gravity <= 0) {
				gravity = 9.8 * 4;
			}

			if (isNaN(bounce) || bounce < 0) {
				bounce = 0.5625;
			}

			bounces = [{
				t0: 0,
				h: 1,
				t: Math.sqrt(2 / gravity),
				x0: 0
			}];

			b = bounces[0];
			for (i = 1, diff = 1; i < 15 && diff > 0.005; i++) {
				b = {
					t0: b.t,
					h: b.h * bounce,
					t: b.t + 2 * Math.sqrt(2 * bounce * b.h / gravity)
				};
				diff = b.t - b.t0;
				b.x0 = (b.t + b.t0)/2;
				bounces.push(b);
			}

			return function(t) {
				var i, b, x, diff;

				//todo: support bounce >= 1

				//t[n] = 2 * sqrt(2 * h / g) + t[n-1]
				for (i = 0; i < bounces.length; i++) {
					b = bounces[i];
					if (t < b.t) {
						break;
					}
				}
				if (t > b.t) {
					return 1;
				}
				x = t - b.x0;
				return 0.5 * gravity * x * x - b.h + 1;
			};
		}
	};
	timing.step = timing['step-start'];
	/*
	ease-in-sine, ease-out-sine, ease-in-out-sine,
	ease-in-exp, ease-out-exp, ease-in-out-exp,
	ease-in-circ, ease-out-circ, ease-in-out-circ
	*/

	Popcorn.basePlugin.timing = timing;
	
}( window, Popcorn ));

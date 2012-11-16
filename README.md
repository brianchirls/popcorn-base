# Popcorn.js Base Plugin

Popcorn.js Base Plugin is a wrapper for creating Popcorn plugins that
conform to the [Best Practices](https://docs.google.com/document/pub?id=17f6iSpXM_pZ8Wj6rirHpLnt2fpCtTnpQxzvVoibOJio&pli=1)
guide. The goals of the Best Practices are to provide the best user
experience, to empower authors who may or may not have advanced
programming skills and to make plugins general and reusable.

Base Plugin is opinionated, assuming and enforcing standards for certain
argument names and behaviors.

## Features

- Event callbacks added to `_setup`, `start`, `end`, `frame`, `_update` and `_teardown`
- Discover target element
- Clean up plugin definition, filling in a "nop" for missing events
- Create container element, maintaining time order in DOM
- Easily animate parameters in `frame` method, with keyframes and multiple tweening functions
- Provide access to normalized data for certain arguments
- Automatically clean up container element on `_teardown`
- Enable any CSS parameter names to be mapped directly to style of container element
- Utility: parse out array/object arguments from JSON or delimited strings
- Utility: cross-browser addClass/removeClass shim (no external libraries required)
- Supports Popcorn 1.4 "_update" feature

### Roadmap:
- Display/hide container elements using CSS classes rather than element style
- Convert animations to CSS when available and appropriate
- Handle localization
- Add `load` event method for retrieving remote resources when needed

## Plugins

Popcorn Base is packaged with a number of Popcorn plugins. Feel free to use these in your compositions or as templates on which to build your own.

- [iframe](https://github.com/brianchirls/popcorn-base/blob/master/plugins/popcorn.iframe.js) - load an external web page in an iframe with `src` parameter or your own html source in the `html` parameter. Animate any styles and `scroll` parameter for vertical scrolling.
- [loudness](https://github.com/brianchirls/popcorn-base/blob/master/plugins/popcorn.loudness.js) - Sets the volume of the conductor media with the `volume` parameter.
- [style](https://github.com/brianchirls/popcorn-base/blob/master/plugins/popcorn.style.js) - set and animate any CSS attribute as a parameter to this plugin. `target` (string or DOM element) points to the element on which styles will be set. Leave `target` out to set styles on the main media.
- [typist](https://github.com/brianchirls/popcorn-base/blob/master/plugins/popcorn.typist.js) - Animate typing any `text` or `html`. Set or animate `progress` parameter to determine how much of the text to type.
- [words](https://github.com/brianchirls/popcorn-base/blob/master/plugins/popcorn.words.js) Very simple: generate text. Set `link` parameter to a url to make it a link.

To use any of the above plugins, make sure that both popcorn.js and popcorn-base.js are loaded into the web page before the plugin.

## Examples

View the [Demo](http://brianchirls.github.com/popcorn-base/examples/) to see Popcorn Base in action or see individual plugin examples:

- [Bounce](http://brianchirls.github.com/popcorn-base/examples/bounce.html)
- [Typist](http://brianchirls.github.com/popcorn-base/examples/typist.html)

## Usage

### Basic

	Popcorn.basePlugin('myplugin', function(options, base) {
		/*
		 * Closure variables and functions go here
		 * `base` is BasePlugin object for access to utilities
		 * `options` remains unchanged
		 */
		 
		if (!base.target) {
			/*
			 * This particular plugin requires a target element.
			 * If not target is specified (e.g. a new event in Popcorn
			 * Maker), return without doing anything.
			 *
			 * Base Plugin will handle creating empty `start` and `end`
			 * native methods so you don't have to worry about it.
			 */
			return;
		}

		return {
			_setup: function( event, options ) {
				/* optional. setup can be performed in parent function */
			},
			start: function( event, options ) {
			},
			frame: function( event, options ) {
			},
			end: function( event, options ) {
			},
			_teardown: function( options ) {
			}
		};
	});

### Callbacks

Authors using a plugin may specify callback functions to be called at
various points in the lifecycle of a track event: `onSetup`, `onStart`,
`onFrame`, `onEnd` and `onTeardown`.  The `onEnd` and `onTeardown`
callbacks are run before the plugin's respective native method, if any;
others are run after the native method. Callbacks are run even if no
native method exists.

Inside a callback function, `this` represents the `PopcornBaseEvent`
object. The first and only argument is the event's `options` object,
except for `onFrame`, which takes the current time in seconds as the
second argument.

Base Plugin will wrap callbacks in `try...catch` so a crashing callback
will not break the plugin, but a stack trace, where available, will be
logged to the error console.

Callbacks are specified by assigning a function to an event's `options`
object:

	popcorn.myplugin({
		start: 0,
		end: 1,
		onStart: function(options) {
			console.log('Event started at ' + options.start + ' seconds');
		},
		onFrame: function(options, time) {
		}
	});

Callbacks can alternatively be specified with a string representing the
name of a global function. This may be useful if Popcorn event data is
passing through a channel that does not allow functions, such as a JSON
blob or through a `window.postMessage`.

	window.handleEventStart = function(options) {
		console.log('Event started at ' + options.start + ' seconds');
	};
	popcorn.myplugin({
		start: 0,
		end: 1,
		onStart: 'handleEventStart'
	});

### BasePluginEvent Object

The second arugment passed to the definition function is an instance of
`BasePluginEvent`, which provides access to useful data and utility
methods.

#### Properties

##### options

The original `options` object passed to event creation. This object
remains unchanged.

##### target

An `HTMLElement` representing the target element in which to place
the event's container. If the original `options.target` is a string,
Base Plugin will search for an event with that id attribute. If no
element is found, `.target` will be undefined.

##### container

Element created by `makeContainer`, if any.

##### pluginName

The name with which the plugin is registered on the global Popcorn object.

##### onSetup, onStart, onFrame, onEnd, onTeardown

A reference to the function representing the respective callback. If the
original was a string, this is the resolved function. If no function was
found or the original is of the wrong type, this is undefined.

#### Methods

##### makeContainer (tag, insert)

Creates a container element, which is set as the `container` property of 
the `BasePluginEvent` and returned by this method. The container element
is inserted as a child of the `target` element, if it exists.

Containers are inserted in ascending time order, first by `start`, then
by `end`. Regardless of the order in which events are created, consistent
order in the DOM is guaranteed (except for events with the same `start`
and `end` time).

The first argument `tag` specifies the tag name with which to create the
element. If this is missing or evaluates to false, the default is `'div'`.
The second argument `insert`, if false (but not undefined), will
prevent the insertion of the container element into the DOM.

	Popcorn.basePlugin('myplugin', function(options, base) {
		if (!base.target) {
			return;
		}
		 
		base.makeContainer();
		base.container.appendChild(
			document.createTextNode(options.text || '')
		);
		
		/* etc.... */
	});

##### animate (param, options)

Specifies a given options parameter as one that can be animated.

Authors can specify start end, and keyframe values by setting the parameter as an object where each property is a keyframe with the property key representing the time.

Values must be a number or string, and any numbers found within will be interpolated. Mixed strings are not allowed, so any keyframes that don't match the first one listed will be ignored. Hexidecimal colors will be translated to `rgb` or `rgba` values for interpolation. If the parameter is not an object, it is set but not animated.

Note: parameters cannot be animated unless Popcorn is given the `frameAnimation` option.

Plugins are provided animated values as follows:

	var popcorn = Popcorn('#video', {
		frameAnimation: true //don't forget this
	});
	popcorn.myplugin({
		start: 0,
		end: 1,
		top: {
			from: '10px',
			to: '50px'
		}
	})

Multiple keyframes can be provided by specifying times as keys on the object. 'from' and 'to' can be used as aliases for 0 and 1, respectively. Keyframe times range from 0 to 1, and the times are scaled to the full length of the event. Anything outside that range is ignored.

	var popcorn = Popcorn('#video', {
		frameAnimation: true //don't forget this
	});
	popcorn.style({
		start: 0,
		end: 10,
		bottom: {
			0: '0px',
			0.2: '100px', // at 2 seconds (0.2 * 10 = 2)
			1: '0px' // at 10 seconds (1 * 10 = 10)
		}
	})

By default, values are interpolated linearly, but it is possible to specify a timing function, similarly to the kind applied to [CSS animation](https://developer.mozilla.org/en/CSS/timing-function). A timing function is set for a block of keyframes by setting the `timing` property to a string, which represents the name of the timing function (see documentation below for a list) and optional parameters.

	popcorn.style({
		start: 0,
		end: 10,
		bottom: {
			0: '0px',
			0.2: '100px', // at 2 seconds (0.2 * 10 = 2)
			1: '0px' // at 10 seconds (1 * 10 = 10),
			timing: 'cubic-bezier(0.1, 0.7, 1.0, 0.1)'
		}
	})

Each key frame can be given its own timing function:

	popcorn.style({
		start: 0,
		end: 10,
		timing: 'linear',
		bottom: { //fly up to the top and then bounce to the bottom
			0: '0px', //will use 'linear, the default'
			0.2: {
				val: '100px',
				timing: 'bounce(100)' //first parameter is how much gravity
			},
			1: '0px' // at 10 seconds (1 * 10 = 10) 
		}
	})

To animate a parameter, call `base.animate` in the plugin definition with the first parameter
as the name of the option. All options will be provided in `base.options` with the correct values
at any given time.

	Popcorn.basePlugin('myplugin', function(options, base) {
		base.animate('top');
		
		/* etc.... */

		return {
			/* etc.... */
			frame: function(event, options, time) {
				this.container.style.top = this.options.top;
			}
		}
	});

Optionally, `animate` can take a second argument specifying options. Currently, the only option
available is `callback`, which specifies a function to be called with the current value whenever
it is animated.

	Popcorn.basePlugin('myplugin', function(options, base) {
		base.makeContainer();
		base.animate('top', {
			callback: function(val) {
				this.container.style.top = val;
			}
		});

		/* etc.... */
	});

As an alternate syntax, it is possible to simply pass the callback function in place of an object.

	Popcorn.basePlugin('myplugin', function(options, base) {
		base.makeContainer();
		base.animate('top', function(val) {
			this.container.style.top = val;
		});
		
		/* etc.... */
	});

If a DOM Element is supplied in place of the callback function, `animate` will instead apply the animated property to the style of that element.

	Popcorn.basePlugin('myplugin', function(options, base) {
		base.makeContainer();
		base.animate('top', this.container); //animate the 'top' CSS property
		
		/* etc.... */
	});

If no property name is supplied, and the only parameter is a DOM Element, *all* styles specified in the event's options will be animated. When `base.animate()` is called with no parameter, all styles are animated on the container element, if it exists.

	Popcorn.basePlugin('myplugin', function(options, base) {
		base.makeContainer();
		base.animate(this.container); //Animate all styles!
	});

When setting style properties that require experimental vendor prefixes, it is possible to substitute `-*-` for the vendor prefix. Popcorn Base will first try to set the non-prefixed style and then try each of the major browser vendor prefixes. If the same property is set with a full browser prefix, it will not be over-written.

	popcorn.style({
		start: 0,
		end: 2,
		'-*-transform': { //spin clockwise
			from: 'rotate(0deg)',
			to: 'rotate(360deg)'
		},
		'-moz-transform': { //...unless it's firefox; rotate counter-clockwise
			from: 'rotate(360deg)',
			to: 'rotate(0deg)'
		}
	})

##### toArray (data, delimiters) [static]

A static utility method for retrieving an array from an input of
undetermined type. First argument `data` may be an array, a JSON string,
a single value or object, or a string to be split. Returned value is
guaranteed to be an array. If `data` is a single value or object,
`toArray` will return an array with that value as the only element.

If `data` is a string and the second argument `delimiters` is specified,
it will be used to split the string into an array. This should be a
string or RegExp, as per Javascript's [String.split](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/split).

##### toObject (data) [static]

A static utility method for retriving an object. If `data` argument is
a JSON string, it will be parsed and the result will be returned.
Otherwise, `data` will be returned unchanged.

##### addClass (element, classes) [static]

A utility for adding one or more classes to a DOM element. This method wraps (or polyfills) [`classList.add`](https://developer.mozilla.org/en/DOM/element.classList).
Unlike `classList.add`, `classes` can be an array or a string delimited
by spaces, returns, newlines or commas. Duplicates will be removed.

Though most desktop browsers that support HTML5 video also support
`classList` natively, it is still [missing](http://caniuse.com/#search=classlist) from Internet Explorer
and iOS before v5.0, so a polyfill is provided.

##### removeClass (element, classes) [static]

Similar to `addClass`, but removes any classes specified in the second
argument.

#### Animation Timing Functions

A range of timing functions are provided for use in keyframing. Some functions replicate the  [CSS Animation timing functions](https://developer.mozilla.org/en/CSS/timing-function), but additional, more complex functions are provided as well.

All functions are accessible in the `Popcorn.basePlugin.timing` object. These may be useful within the plugin itself or for visualizing the path of the timing function on a canvas. Each function in the `timing` object is a "function factory" that will accept the configuration parameters and return the actual timing function.

	var cubicBezier;
	//list all the timing functions
	for (i in Popcorn.basePlugin.timing) {
		console.log('i'); //put these in a <select> element when building your editor
	}
	cubicBezier = Popcorn.basePlugin.timing['cubic-bezier'](0.1, 0.7, 1.0, 0.1);
	cubicBezier(0); // 0
	cubicBezier(1); // 1
	cubicBezier(0.25); // 0.44075538703700035

##### linear

The default timing function, linear progresses the animation from start to finish at constant speed.

##### cubic-bezier(x1, y1, x2, y2)

A [cubic Bézier curve](http://en.wikipedia.org/wiki/B%C3%A9zier_curve#Cubic_B.C3.A9zier_curves) which replicates the [cubic-bezier](https://developer.mozilla.org/en/CSS/timing-function#The_cubic-bezier%28%29_class_of_timing-functions) timing in CSS Animation. This is extremely flexible but can be difficult to use by hand.

###### Parameters
x1, y1, x2, y2 are numbers representing the coordinates of P1 and P2 of the curve. x1 and x2 must be between 0 and 1 (inclusive). Defaults are: 0.25, 0.1, 0.25, 1.0; the same as `ease`.

##### step-start(n) (or step(n))

Timing proceeds in `n` equidistant steps, as in a staricase function. At each step, the animation jumps to the end state and stays in that position until the next step or keyframe.

Replicates [CSS step-start](https://developer.mozilla.org/en/CSS/timing-function#step-start).

###### Parameters

`n` - the number of steps, must be greater than zero.

##### step-end(n)

Timing proceeds in `n` equidistant steps, as in a staricase function. At each step, the animation stays at the initial state and jumps to the final position at the end of the step.

Replicates [CSS step-end](https://developer.mozilla.org/en/CSS/timing-function#step-end).

###### Parameters

`n` - the number of steps, must be greater than zero.

##### ease-in

Begins slowly, accelerates and stops abruptly. Identical to `cubic-bezier(0.42, 0.0, 1.0, 1.0)`.

Replicates [CSS ease-in](https://developer.mozilla.org/en/CSS/timing-function#ease-in).

##### ease-in-out

Begins slowly, accelerates and slows down. Identical to `cubic-bezier(0.42, 0.0, 0.58, 1.0)`.

Replicates [CSS ease-in-out](https://developer.mozilla.org/en/CSS/timing-function#ease-in-out).

##### ease-out

Starts quickly and slows down. Identical to `cubic-bezier(0.0, 0.0, 0.58, 1.0)`.

Replicates [CSS ease-out](https://developer.mozilla.org/en/CSS/timing-function#ease-out).

##### ease

Similar to `ease-in-out`, but accelerates faster at the beinning and slows down more gradually. Identical to `cubic-bezier(0.25, 0.1, 0.25, 1.0)`.

Replicates [CSS ease](https://developer.mozilla.org/en/CSS/timing-function#ease).

##### ease-in-quad, ease-in-out-quad, ease-out-quad

Similar to standard CSS easing functions, but eases on a square (a.k.a. "quadratic") curve, like a parabola.

##### ease-in-cubic, ease-in-out-cubic, ease-out-cubic

Like quad functions, but progresses on a [cubic function](http://en.wikipedia.org/wiki/Cubic_function) (i.e. "t^3") rather than square function. Acceleration and deceleration are steeper than quad.

##### ease-in-quart, ease-in-out-quart, ease-out-quart

Like quad and cubic, but uses a [quartic function](http://en.wikipedia.org/wiki/Quartic_function) (i.e. "t^4"). Steeper than cubic.

##### ease-in-quint, ease-in-out-quint, ease-out-quint

Ease on a [quintic function](http://en.wikipedia.org/wiki/Quinttic_function) (i.e. "t^5"). Steeper than quartic.

##### ease-in-quint(power), ease-in-out-quint(power), ease-out-quint(power)

Like quad, cubic, quart and quint functions, but will operate on any arbitrary power for finer control.

###### Parameters

`power` - the power to which to raise the time. Must be a number greater than or equal to zero. Default is 1 (same as linear).

###### Examples

- `ease-in-power(3)` is the same as `ease-in-cubic'
- `ease-in-power(1)` is the same as `linear' (but not as efficient)
- `ease-in-power(8)` is very steep acceleration and deceleration
- `ease-in-power(2.5)` steeper than quadratic, but not as steep as cubic

##### ease-in-sine, ease-in-out-sine, ease-out-sine

Ease along the first part of a sine curve. More subtle than quadratic.

##### ease-in-exp, ease-in-out-exp, ease-out-exp

Ease along an exponential curve 2^(10*(t-1)). Very gradual at the ends and quick in the middle.

##### ease-in-circ, ease-in-out-circ, ease-out-circ

Circular easing along an arc, as on the curve of a quarter-circle.

##### bounce(gravity, bounce)

Animation accelerates towards and end bounces against it multiple times like a ball falling to the ground. Each successive bounce is diminished until it settles at the end point.

###### Parameters

`gravity` - Rate of acceleration towards the end point. Since the animation scales to the duration of the Popcorn event, you will probably need to play around with this value until you find the setting that looks good. Must be a number greater than zero. A `gravity` value of 2.0 will make the first "drop" from 0 to 1 take the entire time of the animation.

`bounce` - A number from 0 to 1 that represents the "height" of each bounce. When set to 0, the animation will accelerate to the end and then stop. At 1, the animation will bounce without diminishing until the end of the event (and stop abruptly).

## License
Popcorn Base Plugin is made available under the [MIT License](http://www.opensource.org/licenses/mit-license.php).

# Popcorn.js Base Plugin

Popcorn.js Base Plugin is a wrapper for creating Popcorn plugins that
conform to the [Best Practices](https://docs.google.com/document/pub?id=17f6iSpXM_pZ8Wj6rirHpLnt2fpCtTnpQxzvVoibOJio&pli=1)
guide. The goals of the Best Practices are to provide the best user
experience, to empower authors who may or may not have advanced
programming skills and to make plugins general and reusable.

Base Plugin is opinionated, assuming and enforcing standards for certain
argument names and behaviors.

## Features

- Event callbacks added to `_setup`, `start`, `end`, `frame` and `_teardown`
- Discover target element
- Clean up plugin definition, filling in a "nop" for missing events
- Create container element, maintaining time order in DOM
- Provide access to normalized data for certain arguments
- Automatically clean up container element on `_teardown`
- Utility: parse out array/object arguments from JSON or delimited strings
- Utility: cross-browser addClass/removeClass shim (no external libraries required)

### Roadmap:
- Display/hide container elements using CSS classes rather than element style
- Handle localization
- Add `load` event method for retrieving remote resources when needed
- Apply absolute positioning to container element (`top`, `left`, `bottom`, `right`)

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
The second argument `insert`, if is false (but not undefined), will
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
`classList` natively, it is still (missing)[http://caniuse.com/#search=classlist] from Internet Explorer
and iOS before v5.0, so a polyfill is provided.

##### removeClass (element, classes) [static]

Similar to `addClass`, but removes any classes specified in the second
argument.

## License
Popcorn Base Plugin is made available under the [MIT License](http://www.opensource.org/licenses/mit-license.php).

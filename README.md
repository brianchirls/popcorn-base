# Popcorn.js Base Plugin

Popcorn.js Base Plugin is a wrapper for creating Popcorn plugins that
conform to the [Best Practices](http://popcornjs.org/API/best-practices)
guide. The goals of the Best Practices are to provide the best user
experience, to empower authors who may or may not have advanced
programming skills and to make plugins general and reusable.

Base Plugin is opinionated, assuming and enforcing standards for certain
argument names and behaviors.

## Features

- Event callbacks added to `_setup`, `start`, `end`, `frame` and `_teardown`
- Discover target element (required)
- Create container element, maintaining time order in DOM
- Clean up plugin definition, filling in a "nop" for missing events
- Provide access to normalized data for certain arguments
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
		 */

		return {
			_setup: function( event, options ) {
				/* optional. setup can be performed in parent function */
			},
			start: function( event, options ) {
			},
			end: function( event, options ) {
			},
			_teardown: function( options ) {
			}
		};
	});

### Callbacks


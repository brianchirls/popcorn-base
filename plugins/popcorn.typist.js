// PLUGIN: style

(function (Popcorn) {

	"use strict";

	function buildTree(dom, tree) {
		var remove = [],
			length = 0;

		tree.children = [];

		Popcorn.forEach(dom.childNodes, function (child) {
			var n = {
				node: child,
				start: tree.start + length
			};

			if (child.nodeType === 1) { //element
				if (child.childNodes && child.childNodes.length) {
					length += buildTree(child, n);
				} else {
					length += 1;
					n.end = n.start + 1;
				}
				tree.children.push(n);
			} else if (child.nodeType === 3) { //text
				if (child.nodeValue) {
					n.length = child.nodeValue.length;
					n.end = n.start + n.length;
					length += n.length;
					tree.children.push(n);
				} else {
					remove.push(child);
				}
			} else if (child.nodeType === 8) { //comment
				//remove this element
				remove.push(child);
			}
		});

		Popcorn.forEach(remove, function (node) {
			if (node.parentNode) {
				node.parentNode.removeChild(node);
			}
		});

		tree.length = length;
		tree.end = tree.start + length;
		return length;
	}

	function renderTree(target, tree, end) {
		var i, n, child;

		if (tree.node) {
			if (tree.node.nodeType === 1) { //childless element
				child = tree.node.cloneNode(false);
				target.appendChild(child);
				target = child;
			} else if (tree.node.nodeType === 3) { //text
				if (tree.node.end <= end) {
					child = tree.node.cloneNode(false);
				} else {
					child = document.createTextNode(tree.node.nodeValue.substring(0, end - tree.start));
				}
				target.appendChild(child);
			}
		}

		if (!tree.children) {
			return;
		}

		for (i = 0; i < tree.children.length; i++) {
			n = tree.children[i];
			if (n.end > end) {
				break;
			}
			if (!tree.node) {
				target.appendChild(n.node);
			} else {
				target.appendChild(n.node.cloneNode(true));
			}
			n = false;
		}

		if (!n || n.start >= end) {
			return;
		}

		renderTree(target, n, end);
	}

	var styleSheet;

	Popcorn.basePlugin('typist', function (options, base) {
		var container,
			dummy,
			tree, animated,
			previousEnd = 0;

		if (!base.target) {
			return;
		}

		tree = {
			start: 0
		};

		if (options.html instanceof window.Element) {
			dummy = options.html;
			tree.node = dummy;
		} else if (typeof options.html === 'string') {
			dummy = document.createElement('div');
			dummy.innerHTML = options.html;
		} else if (options.text) {
			dummy = document.createElement('div');
			dummy.appendChild(document.createTextNode(options.text));
		} else {
			return;
		}

		buildTree(dummy, tree);

		if (!styleSheet) {
			styleSheet = document.createElement('style');
			styleSheet.setAttribute('type', 'text/css');
			styleSheet.appendChild(
				document.createTextNode(
					'.popcorn-typist { display: none; }\n' +
					'.popcorn-typist.active { display: block; }\n'
			));
			document.head.appendChild(styleSheet);
		}


		container = base.makeContainer();

		if (options.classes) {
			base.addClass(container, options.classes);
		}

		base.animate(container);

		if (!options.progress && isNaN(options.progress)) {
			options.progress = 1;
		}

		animated = base.animate('progress', function (val) {
			var n = Math.round(val * tree.end);
			//todo: support forward progress
			if (n !== previousEnd) {
				container.innerHTML = '';
				renderTree(container, tree, n);
				previousEnd = n;
			}
		});

		if (!animated) {
			renderTree(container, tree, tree.end);
		}

		return {
			start: function() {
				base.addClass(container, 'active');
			},
			end: function() {
				base.removeClass(container, 'active');
			}
		};

	}, {
		about: {
			name: 'Popcorn Style Plugin',
			version: '0.1',
			author: 'Brian Chirls, @bchirls',
			website: 'http://github.com/brianchirls'
		}
	});
}(Popcorn));

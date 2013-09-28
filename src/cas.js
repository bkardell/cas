/* globals global, exports */
/* jshint -W054 */
(function (root) {
	/* Ordered collection of precompiled rules { selector: string, specificty: number, command: compiledFn } */
	var ordered = [];
	/**
	* Helper functions for Selector specificity
	* @type {Object}
	*/
	var specificity = {
		expressions: function(){
			var regExs = {
				pre: /\([^\)]+\)/,
				ids: /#[\d\w\-_]+/g,
				cls: /[\.:\[][^\.:\[+>]+/g,
				tag: /(^|[\s\+>])\w+/g
			};
			regExs.chop = [regExs.ids, regExs.cls, regExs.tag];
			return regExs;
		},
		/**
		 * Calculates the specificity of a Selector
		 * @return {Number} An hexadecimal value
		 */
		calculate: function (selector) {
			var expressions = specificity.expressions();
			var s = selector.replace(expressions.pre,"");
			return parseInt(expressions.chop.map(function(p){
				var m = s.match(p);
				return m ? m.length.toString(16) : 0;
			}).join(''), 16);
		}
	};

	var qsa = "cas._querySelectorAll = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };";
	var applyMutations = "cas._applyMutations = function (el, hash) { for (var name in hash) { el.setAttribute( name, hash[name]); }};";
	var applyCasProp = "cas._applyCasProp = function (selector,hash) { cas._querySelectorAll(selector).forEach(function (el) { cas._applyMutations(el, hash) }); };";
	var applyCasListener = "cas._applyCasListener = function (selector,state,evtName) { cas._querySelectorAll(selector).forEach(function (el) { el.addEventListener(state, window[evtName], false); } ); };";

	var types = {
		applyItem: "cas._applyCasProp(\"<selector>\", <hash>, \"<el>\");", 
		applyListener: "cas._applyCasListener(\"<selector>\", \"<state>\", <hash>.attach, \"<el>\");"
	};
	var outBuff = [];

	var re = { 
		pseudoclass: /:(.*)/, 
		listener: /^on/ 
	};


	var cas = {
		ordered: [], 
		reset: function () {
			outBuff = [
					qsa,
					applyMutations,
					applyCasProp,
					applyCasListener
			];
			cas.ordered = [];
		},
		init: function (program) {
			var fn = new Function([], program);
			fn();
			root.cas.observe();
		},
		compile: function () {
			ordered.forEach(function (item) {
				outBuff.push(item.command);
			});
			ordered.sort(function (a, b) {
				return a.specificity > b.specificity ? 1 : (a.specificity < b.specificity) ? -1 : 0;
			});
			outBuff.push(";window.cas.ordered = " + JSON.stringify(ordered));
			return outBuff.join("\n");
		},
		precompile: function (str) {
			var ast = root.css.parse(str);
			ast.stylesheet.rules.forEach(function(rule){
				if (rule.type === "rule") {
					rule.selectors.forEach(function (selector) {
						var temp, whichType;
						var pseudo = selector.match(re.pseudoclass); 
						var hash = {};
						rule.declarations.forEach(function (declaration) {
							hash[declaration.property] = declaration.value;
						});
						whichType = ( pseudo && re.listener.test(pseudo[1]) ) ? "applyListener" : "applyItem";
						if ( whichType === "applyItem" ) {
							delete hash.attach;
						}
						temp = types[whichType].replace("<selector>", selector.replace(/:.*$/,"")).replace("<hash>", JSON.stringify(hash));
						if ( whichType === "applyListener" ){
							temp = temp.replace("<state>", pseudo[1].replace(re.listener,""));
						} 
						ordered.push({selector: selector, specificity: specificity.calculate(selector), command: temp });
					});
				}
			});
		}
	};
	cas.reset();
	if (typeof exports !== "undefined") {
		exports.cas = cas;
	} 
	// meh
	root.cas = cas;
}((typeof global==="undefined") ? window : global ));
var css = require('css')
  , fs = require('fs')
  , read = fs.readFileSync
  , str = read('test.css', 'utf8');

var ast = css.parse(str);

  /**
   * Helper functions for Selector specificity
   * @type {Object}
   */
var specificity = {
	expressions: function(){
	    var regExs = {
	      isQuote: /\'/,
	      isNumeric: /\d/,
	      isSemi: /\;/,
	      isOpenParen: /\(/,
	      isCloseParen: /\)/,
	      isOpenBrace: /\{/,
	      isComma: /\,/,
	      isColon: /\:/,
	      isAtSymbol: /\@/,
	      whiteSpace: /\s/,
	      behavior: /^\-be\-([^\-]*)|^([a-z]*[A-z]*)/,
	      pseudo: /\:/,
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
	calculate: function(selector){
	  var expressions = specificity.expressions();
	  var s = selector.replace(expressions.pre,"");
	  return parseInt(expressions.chop.map(function(p){
	    var m = s.match(p);
	    return m ? m.length.toString(16) : 0;
	  }).join(''), 16);
	},


};

var qsa = "var querySelectorAll = function (selector) { console.log(selector); return Array.prototype.slice.call(document.querySelectorAll(selector)); };";
var applyMutations = "var applyMutations = function (el, hash) { for (var name in hash) { el.setAttribute( name, hash[name]); }};";
var applyCasProp = "var applyCasProp = function (selector,hash) { querySelectorAll(selector).forEach(function (el) { applyMutations(el, hash) }); };"
var applyCasListener = "var applyCasListener = function (selector,state,evtName) { querySelectorAll(selector).forEach(function (el) { el.addEventListener(state, window[evtName], false); } ); };"

var types = {
	applyItem: "applyCasProp(\"<selector>\", <hash>);", 
	applyListener: "applyCasListener(\"<selector>\", <state>, <hash>.attach);"
};

console.log(JSON.stringify(ast, null, 2));

// 
var outBuff = [
	"document.addEventListener(\"DOMContentLoaded\", function () {",
		qsa,
		applyMutations,
		applyCasProp,
		applyCasListener
];
var re = { 
	pseudoclass: /:(.*)/, 
	listener: /^on/ 
};
var ordered = [];
ast.stylesheet.rules.forEach(function(rule){
	 console.log(rule);
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
	 		ordered.push({specificity: specificity.calculate(selector), command: temp });
		});
	}
});
ordered.sort(function (a, b) {
	return a.specificity > b.specificity ? 1 : (a.specificity < b.specificity) ? -1 : 0;
});
ordered.forEach(function (item) {
	outBuff.push(item.command);
});

outBuff.push("}, false);");
console.log(outBuff.join("\n"));

fs.writeFileSync("castest.js", outBuff.join("\n"));
// console.log(css.stringify(ast));

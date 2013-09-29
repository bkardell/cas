/* globals global */
/* jshint -W054 */
(function (root) {
	// Not for server side compiling... 
	var ParseMutationObserver = (root.Hitch) ? root.Hitch.ParseMutationObserver : root.ParseMutationObserver;
	var linkParseObserver = new ParseMutationObserver('link[type="text/x-cas"]');
	var promiseAndPrecompile = function (url) {
		return ParseMutationObserver.promiseUrl(url).then(function(text) {
			root.cas.precompile(text);
		});
	};
	linkParseObserver.on("notify", function (els) {
		var promises = [];
		for (var i=0;i<els.length;i++) {
			promises.push(promiseAndPrecompile(els[i].href));
		}
		return new ParseMutationObserver.Promise.all(promises);
	});
	linkParseObserver.on("done", function () {
		var elements = document.querySelectorAll('script[type="text/x-cas"]');
		for (var i=0;i<elements.length;i++) {
			root.cas.precompile(elements[i].innerHTML);
		}
		var program = root.cas.compile();
		root.cas.init(program);
	});
}((typeof global==="undefined") ? window : global ));
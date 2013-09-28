/* globals global */
/* jshint -W054 */
(function (root) {

	var fetchTextAndPromise = function(url) {
		var promise = new root.Promise(function(resolve, reject){
		var client = new XMLHttpRequest();
		var handler = function handler() {
		if (this.readyState === this.DONE) {
			if (this.status === 200) { resolve(this.response); }
			else { reject(this); }
			}
		};
		client.open("GET", url);
		client.onreadystatechange = handler;
		client.responseType = "text";
		client.setRequestHeader("Accept", "text");
		client.send();
		});

		return promise;
	};
	// Not for server side compiling... 
	var linkParseObserver = new root.ParseMutationObserver('link[type="text/x-cas"]', 'setImmediate');
	var promiseAndPrecompile = function (url) {
		return fetchTextAndPromise(url).then(function(text) {
			root.cas.precompile(text);
		});
	};
	linkParseObserver.on("notify", function (els) {
		var promises = [];
		for (var i=0;i<els.length;i++) {
			promises.push(promiseAndPrecompile(els[i].href));
		}
		return new root.Promise.all(promises);
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
/*! cas - v0.1.0 - 2013-09-29
* Copyright (c) 2013 ; Licensed  */

var css = {
  parse: function(css, options){
    options = options || {};

    /**
     * Positional.
     */

    var lineno = 1;
    var column = 1;

    /**
     * Update lineno and column based on `str`.
     */

    function updatePosition(str) {
      var lines = str.match(/\n/g);
      if (lines) lineno += lines.length;
      var i = str.lastIndexOf('\n');
      column = ~i ? str.length - i : column + str.length;
    }

    /**
     * Mark position and patch `node.position`.
     */

    function position() {
      var start = { line: lineno, column: column };
      if (!options.position) return positionNoop;

      return function(node){
        node.position = {
          start: start,
          end: { line: lineno, column: column }
        };

        whitespace();
        return node;
      }
    }

    /**
     * Return `node`.
     */

    function positionNoop(node) {
      whitespace();
      return node;
    }

    /**
     * Error `msg`.
     */

    function error(msg) {
      var err = new Error(msg + ' near line ' + lineno + ':' + column);
      err.line = lineno;
      err.column = column;
      err.source = css;
      throw err;
    }

    /**
     * Parse stylesheet.
     */

    function stylesheet() {
      return {
        type: 'stylesheet',
        stylesheet: {
          rules: rules()
        }
      };
    }

    /**
     * Opening brace.
     */

    function open() {
      return match(/^{\s*/);
    }

    /**
     * Closing brace.
     */

    function close() {
      return match(/^}/);
    }

    /**
     * Parse ruleset.
     */

    function rules() {
      var node;
      var rules = [];
      whitespace();
      comments(rules);
      while (css.charAt(0) != '}' && (node = atrule() || rule())) {
        rules.push(node);
        comments(rules);
      }
      return rules;
    }

    /**
     * Match `re` and return captures.
     */

    function match(re) {
      var m = re.exec(css);
      if (!m) return;
      var str = m[0];
      updatePosition(str);
      css = css.slice(str.length);
      return m;
    }

    /**
     * Parse whitespace.
     */

    function whitespace() {
      match(/^\s*/);
    }

    /**
     * Parse comments;
     */

    function comments(rules) {
      var c;
      rules = rules || [];
      while (c = comment()) rules.push(c);
      return rules;
    }

    /**
     * Parse comment.
     */

    function comment() {
      var pos = position();
      if ('/' != css.charAt(0) || '*' != css.charAt(1)) return;

      var i = 2;
      while (null != css.charAt(i) && ('*' != css.charAt(i) || '/' != css.charAt(i + 1))) ++i;
      i += 2;

      var str = css.slice(2, i - 2);
      column += 2;
      updatePosition(str);
      css = css.slice(i);
      column += 2;

      return pos({
        type: 'comment',
        comment: str
      });
    }

    /**
     * Parse selector.
     */

    function selector() {
      var m = match(/^([^{]+)/);
      if (!m) return;
      return trim(m[0]).split(/\s*,\s*/);
    }

    /**
     * Parse declaration.
     */

    function declaration() {
      var pos = position();

      // prop
      var prop = match(/^(\*?[-\/\*\w]+(\[[0-9a-z_-]+\])?)\s*/);
      if (!prop) return;
      prop = trim(prop[0]);

      // :
      if (!match(/^:\s*/)) return error("property missing ':'");

      // val
      var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);
      if (!val) return error('property missing value');

      var ret = pos({
        type: 'declaration',
        property: prop,
        value: trim(val[0])
      });

      // ;
      match(/^[;\s]*/);

      return ret;
    }

    /**
     * Parse declarations.
     */

    function declarations() {
      var decls = [];

      if (!open()) return error("missing '{'");
      comments(decls);

      // declarations
      var decl;
      while (decl = declaration()) {
        decls.push(decl);
        comments(decls);
      }

      if (!close()) return error("missing '}'");
      return decls;
    }

    /**
     * Parse keyframe.
     */

    function keyframe() {
      var m;
      var vals = [];
      var pos = position();

      while (m = match(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/)) {
        vals.push(m[1]);
        match(/^,\s*/);
      }

      if (!vals.length) return;

      return pos({
        type: 'keyframe',
        values: vals,
        declarations: declarations()
      });
    }

    /**
     * Parse keyframes.
     */

    function atkeyframes() {
      var pos = position();
      var m = match(/^@([-\w]+)?keyframes */);

      if (!m) return;
      var vendor = m[1];

      // identifier
      var m = match(/^([-\w]+)\s*/);
      if (!m) return error("@keyframes missing name");
      var name = m[1];

      if (!open()) return error("@keyframes missing '{'");

      var frame;
      var frames = comments();
      while (frame = keyframe()) {
        frames.push(frame);
        frames = frames.concat(comments());
      }

      if (!close()) return error("@keyframes missing '}'");

      return pos({
        type: 'keyframes',
        name: name,
        vendor: vendor,
        keyframes: frames
      });
    }

    /**
     * Parse supports.
     */

    function atsupports() {
      var pos = position();
      var m = match(/^@supports *([^{]+)/);

      if (!m) return;
      var supports = trim(m[1]);

      if (!open()) return error("@supports missing '{'");

      var style = comments().concat(rules());

      if (!close()) return error("@supports missing '}'");

      return pos({
        type: 'supports',
        supports: supports,
        rules: style
      });
    }

    /**
     * Parse media.
     */

    function atmedia() {
      var pos = position();
      var m = match(/^@media *([^{]+)/);

      if (!m) return;
      var media = trim(m[1]);

      if (!open()) return error("@media missing '{'");

      var style = comments().concat(rules());

      if (!close()) return error("@media missing '}'");

      return pos({
        type: 'media',
        media: media,
        rules: style
      });
    }

    /**
     * Parse paged media.
     */

    function atpage() {
      var pos = position();
      var m = match(/^@page */);
      if (!m) return;

      var sel = selector() || [];

      if (!open()) return error("@page missing '{'");
      var decls = comments();

      // declarations
      var decl;
      while (decl = declaration()) {
        decls.push(decl);
        decls = decls.concat(comments());
      }

      if (!close()) return error("@page missing '}'");

      return pos({
        type: 'page',
        selectors: sel,
        declarations: decls
      });
    }

    /**
     * Parse document.
     */

    function atdocument() {
      var pos = position();
      var m = match(/^@([-\w]+)?document *([^{]+)/);
      if (!m) return;

      var vendor = trim(m[1]);
      var doc = trim(m[2]);

      if (!open()) return error("@document missing '{'");

      var style = comments().concat(rules());

      if (!close()) return error("@document missing '}'");

      return pos({
        type: 'document',
        document: doc,
        vendor: vendor,
        rules: style
      });
    }

    /**
     * Parse import
     */

    function atimport() {
      return _atrule('import');
    }

    /**
     * Parse charset
     */

    function atcharset() {
      return _atrule('charset');
    }

    /**
     * Parse namespace
     */

    function atnamespace() {
      return _atrule('namespace')
    }

    /**
     * Parse non-block at-rules
     */

    function _atrule(name) {
      var pos = position();
      var m = match(new RegExp('^@' + name + ' *([^;\\n]+);'));
      if (!m) return;
      var ret = { type: name };
      ret[name] = trim(m[1]);
      return pos(ret);
    }

    /**
     * Parse at rule.
     */

    function atrule() {
      return atkeyframes()
        || atmedia()
        || atsupports()
        || atimport()
        || atcharset()
        || atnamespace()
        || atdocument()
        || atpage();
    }

    /**
     * Parse rule.
     */

    function rule() {
      var pos = position();
      var sel = selector();

      if (!sel) return;
      comments();

      return pos({
        type: 'rule',
        selectors: sel,
        declarations: declarations()
      });
    }

    return stylesheet();
  }
};

if (typeof exports !== "undefined") {
  exports.css = css;
  global.css = css;
}

/**
 * Trim `str`.
 */

function trim(str) {
  return (str || '').replace(/^\s+|\s+$/g, '');
}


/*! parse-mutation-observer - v0.1.0 - 2013-09-29
* Copyright (c) 2013 ; Licensed  */
(function(globals) {
var define, requireModule;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requireModule = function(name) {
    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    var mod = registry[name];
    if (!mod) {
      throw new Error("Module '" + name + "' not found.");
    }

    var deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(deps[i]));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;
  };
})();

define("rsvp/all",
  ["rsvp/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;
    /* global toString */


    function all(promises) {
      if (Object.prototype.toString.call(promises) !== "[object Array]") {
        throw new TypeError('You must pass an array to all.');
      }

      return new Promise(function(resolve, reject) {
        var results = [], remaining = promises.length,
        promise;

        if (remaining === 0) {
          resolve([]);
        }

        function resolver(index) {
          return function(value) {
            resolveAll(index, value);
          };
        }

        function resolveAll(index, value) {
          results[index] = value;
          if (--remaining === 0) {
            resolve(results);
          }
        }

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && typeof promise.then === 'function') {
            promise.then(resolver(i), reject);
          } else {
            resolveAll(i, promise);
          }
        }
      });
    }


    __exports__.all = all;
  });
define("rsvp/async",
  ["exports"],
  function(__exports__) {
    "use strict";
    var browserGlobal = (typeof window !== 'undefined') ? window : {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var async;
    var local = (typeof global !== 'undefined') ? global : this;

    // old node
    function useNextTick() {
      return function(callback, arg) {
        process.nextTick(function() {
          callback(arg);
        });
      };
    }

    // node >= 0.10.x
    function useSetImmediate() {
      return function(callback, arg) {
        /* global  setImmediate */
        setImmediate(function(){
          callback(arg);
        });
      };
    }

    function useMutationObserver() {
      var queue = [];

      var observer = new BrowserMutationObserver(function() {
        var toProcess = queue.slice();
        queue = [];

        toProcess.forEach(function(tuple) {
          var callback = tuple[0], arg= tuple[1];
          callback(arg);
        });
      });

      var element = document.createElement('div');
      observer.observe(element, { attributes: true });

      // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
      window.addEventListener('unload', function(){
        observer.disconnect();
        observer = null;
      }, false);

      return function(callback, arg) {
        queue.push([callback, arg]);
        element.setAttribute('drainQueue', 'drainQueue');
      };
    }

    function useSetTimeout() {
      return function(callback, arg) {
        local.setTimeout(function() {
          callback(arg);
        }, 1);
      };
    }

    if (typeof setImmediate === 'function') {
      async = useSetImmediate();
    } else if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      async = useNextTick();
    } else if (BrowserMutationObserver) {
      async = useMutationObserver();
    } else {
      async = useSetTimeout();
    }


    __exports__.async = async;
  });
define("rsvp/config",
  ["rsvp/async","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var async = __dependency1__.async;

    var config = {};
    config.async = async;


    __exports__.config = config;
  });
define("rsvp/defer",
  ["rsvp/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;

    function defer() {
      var deferred = {
        // pre-allocate shape
        resolve: undefined,
        reject:  undefined,
        promise: undefined
      };

      deferred.promise = new Promise(function(resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
      });

      return deferred;
    }


    __exports__.defer = defer;
  });
define("rsvp/events",
  ["exports"],
  function(__exports__) {
    "use strict";
    var Event = function(type, options) {
      this.type = type;

      for (var option in options) {
        if (!options.hasOwnProperty(option)) { continue; }

        this[option] = options[option];
      }
    };

    var indexOf = function(callbacks, callback) {
      for (var i=0, l=callbacks.length; i<l; i++) {
        if (callbacks[i][0] === callback) { return i; }
      }

      return -1;
    };

    var callbacksFor = function(object) {
      var callbacks = object._promiseCallbacks;

      if (!callbacks) {
        callbacks = object._promiseCallbacks = {};
      }

      return callbacks;
    };

    var EventTarget = {
      mixin: function(object) {
        object.on = this.on;
        object.off = this.off;
        object.trigger = this.trigger;
        return object;
      },

      on: function(eventNames, callback, binding) {
        var allCallbacks = callbacksFor(this), callbacks, eventName;
        eventNames = eventNames.split(/\s+/);
        binding = binding || this;

        while (eventName = eventNames.shift()) {
          callbacks = allCallbacks[eventName];

          if (!callbacks) {
            callbacks = allCallbacks[eventName] = [];
          }

          if (indexOf(callbacks, callback) === -1) {
            callbacks.push([callback, binding]);
          }
        }
      },

      off: function(eventNames, callback) {
        var allCallbacks = callbacksFor(this), callbacks, eventName, index;
        eventNames = eventNames.split(/\s+/);

        while (eventName = eventNames.shift()) {
          if (!callback) {
            allCallbacks[eventName] = [];
            continue;
          }

          callbacks = allCallbacks[eventName];

          index = indexOf(callbacks, callback);

          if (index !== -1) { callbacks.splice(index, 1); }
        }
      },

      trigger: function(eventName, options) {
        var allCallbacks = callbacksFor(this),
            callbacks, callbackTuple, callback, binding, event;

        if (callbacks = allCallbacks[eventName]) {
          // Don't cache the callbacks.length since it may grow
          for (var i=0; i<callbacks.length; i++) {
            callbackTuple = callbacks[i];
            callback = callbackTuple[0];
            binding = callbackTuple[1];

            if (typeof options !== 'object') {
              options = { detail: options };
            }

            event = new Event(eventName, options);
            callback.call(binding, event);
          }
        }
      }
    };


    __exports__.EventTarget = EventTarget;
  });
define("rsvp/hash",
  ["rsvp/defer","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var defer = __dependency1__.defer;

    function size(object) {
      var s = 0;

      for (var prop in object) {
        s++;
      }

      return s;
    }

    function hash(promises) {
      var results = {}, deferred = defer(), remaining = size(promises);

      if (remaining === 0) {
        deferred.resolve({});
      }

      var resolver = function(prop) {
        return function(value) {
          resolveAll(prop, value);
        };
      };

      var resolveAll = function(prop, value) {
        results[prop] = value;
        if (--remaining === 0) {
          deferred.resolve(results);
        }
      };

      var rejectAll = function(error) {
        deferred.reject(error);
      };

      for (var prop in promises) {
        if (promises[prop] && typeof promises[prop].then === 'function') {
          promises[prop].then(resolver(prop), rejectAll);
        } else {
          resolveAll(prop, promises[prop]);
        }
      }

      return deferred.promise;
    }


    __exports__.hash = hash;
  });
define("rsvp/node",
  ["rsvp/promise","rsvp/all","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;
    var all = __dependency2__.all;

    function makeNodeCallbackFor(resolve, reject) {
      return function (error, value) {
        if (error) {
          reject(error);
        } else if (arguments.length > 2) {
          resolve(Array.prototype.slice.call(arguments, 1));
        } else {
          resolve(value);
        }
      };
    }

    function denodeify(nodeFunc) {
      return function()  {
        var nodeArgs = Array.prototype.slice.call(arguments), resolve, reject;
        var thisArg = this;

        var promise = new Promise(function(nodeResolve, nodeReject) {
          resolve = nodeResolve;
          reject = nodeReject;
        });

        all(nodeArgs).then(function(nodeArgs) {
          nodeArgs.push(makeNodeCallbackFor(resolve, reject));

          try {
            nodeFunc.apply(thisArg, nodeArgs);
          } catch(e) {
            reject(e);
          }
        });

        return promise;
      };
    }


    __exports__.denodeify = denodeify;
  });
define("rsvp/promise",
  ["rsvp/config","rsvp/events","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var EventTarget = __dependency2__.EventTarget;

    function objectOrFunction(x) {
      return isFunction(x) || (typeof x === "object" && x !== null);
    }

    function isFunction(x){
      return typeof x === "function";
    }

    var Promise = function(resolver) {
      var promise = this,
      resolved = false;

      if (typeof resolver !== 'function') {
        throw new TypeError('You must pass a resolver function as the sole argument to the promise constructor');
      }

      if (!(promise instanceof Promise)) {
        return new Promise(resolver);
      }

      var resolvePromise = function(value) {
        if (resolved) { return; }
        resolved = true;
        resolve(promise, value);
      };

      var rejectPromise = function(value) {
        if (resolved) { return; }
        resolved = true;
        reject(promise, value);
      };

      this.on('promise:failed', function(event) {
        this.trigger('error', { detail: event.detail });
      }, this);

      this.on('error', onerror);

      try {
        resolver(resolvePromise, rejectPromise);
      } catch(e) {
        rejectPromise(e);
      }
    };

    function onerror(event) {
      if (config.onerror) {
        config.onerror(event.detail);
      }
    }

    var invokeCallback = function(type, promise, callback, event) {
      var hasCallback = isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        try {
          value = callback(event.detail);
          succeeded = true;
        } catch(e) {
          failed = true;
          error = e;
        }
      } else {
        value = event.detail;
        succeeded = true;
      }

      if (handleThenable(promise, value)) {
        return;
      } else if (hasCallback && succeeded) {
        resolve(promise, value);
      } else if (failed) {
        reject(promise, error);
      } else if (type === 'resolve') {
        resolve(promise, value);
      } else if (type === 'reject') {
        reject(promise, value);
      }
    };

    Promise.prototype = {
      constructor: Promise,

      isRejected: undefined,
      isFulfilled: undefined,
      rejectedReason: undefined,
      fulfillmentValue: undefined,

      then: function(done, fail) {
        this.off('error', onerror);

        var thenPromise = new this.constructor(function() {});

        if (this.isFulfilled) {
          config.async(function(promise) {
            invokeCallback('resolve', thenPromise, done, { detail: promise.fulfillmentValue });
          }, this);
        }

        if (this.isRejected) {
          config.async(function(promise) {
            invokeCallback('reject', thenPromise, fail, { detail: promise.rejectedReason });
          }, this);
        }

        this.on('promise:resolved', function(event) {
          invokeCallback('resolve', thenPromise, done, event);
        });

        this.on('promise:failed', function(event) {
          invokeCallback('reject', thenPromise, fail, event);
        });

        return thenPromise;
      },

      fail: function(fail) {
        return this.then(null, fail);
      }
    };

    EventTarget.mixin(Promise.prototype);

    function resolve(promise, value) {
      if (promise === value) {
        fulfill(promise, value);
      } else if (!handleThenable(promise, value)) {
        fulfill(promise, value);
      }
    }

    function handleThenable(promise, value) {
      var then = null,
      resolved;

      try {
        if (promise === value) {
          throw new TypeError("A promises callback cannot return that same promise.");
        }

        if (objectOrFunction(value)) {
          then = value.then;

          if (isFunction(then)) {
            then.call(value, function(val) {
              if (resolved) { return true; }
              resolved = true;

              if (value !== val) {
                resolve(promise, val);
              } else {
                fulfill(promise, val);
              }
            }, function(val) {
              if (resolved) { return true; }
              resolved = true;

              reject(promise, val);
            });

            return true;
          }
        }
      } catch (error) {
        reject(promise, error);
        return true;
      }

      return false;
    }

    function fulfill(promise, value) {
      config.async(function() {
        promise.trigger('promise:resolved', { detail: value });
        promise.isFulfilled = true;
        promise.fulfillmentValue = value;
      });
    }

    function reject(promise, value) {
      config.async(function() {
        promise.trigger('promise:failed', { detail: value });
        promise.isRejected = true;
        promise.rejectedReason = value;
      });
    }


    __exports__.Promise = Promise;
  });
define("rsvp/reject",
  ["rsvp/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;

    function reject(reason) {
      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }


    __exports__.reject = reject;
  });
define("rsvp/resolve",
  ["rsvp/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;

    function resolve(thenable) {
      return new Promise(function(resolve, reject) {
        resolve(thenable);
      });
    }


    __exports__.resolve = resolve;
  });
define("rsvp/rethrow",
  ["exports"],
  function(__exports__) {
    "use strict";
    var local = (typeof global === "undefined") ? this : global;

    function rethrow(reason) {
      local.setTimeout(function() {
        throw reason;
      });
      throw reason;
    }


    __exports__.rethrow = rethrow;
  });
define("rsvp",
  ["rsvp/events","rsvp/promise","rsvp/node","rsvp/all","rsvp/hash","rsvp/rethrow","rsvp/defer","rsvp/config","rsvp/resolve","rsvp/reject","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __exports__) {
    "use strict";
    var EventTarget = __dependency1__.EventTarget;
    var Promise = __dependency2__.Promise;
    var denodeify = __dependency3__.denodeify;
    var all = __dependency4__.all;
    var hash = __dependency5__.hash;
    var rethrow = __dependency6__.rethrow;
    var defer = __dependency7__.defer;
    var config = __dependency8__.config;
    var resolve = __dependency9__.resolve;
    var reject = __dependency10__.reject;

    function configure(name, value) {
      config[name] = value;
    }


    __exports__.Promise = Promise;
    __exports__.EventTarget = EventTarget;
    __exports__.all = all;
    __exports__.hash = hash;
    __exports__.rethrow = rethrow;
    __exports__.defer = defer;
    __exports__.denodeify = denodeify;
    __exports__.configure = configure;
    __exports__.resolve = resolve;
    __exports__.reject = reject;
  });
window.RSVP = requireModule("rsvp");
})(window);
if (!window.Hitch) {
	window.Hitch = {};
}
window.ProllyfillRoot = window.Hitch;
(function (attachTo) {
    "use strict";
    attachTo.ParseMutationObserver = function (filterQuery) {
        var connected,
            eventCallbacks = {},
            self = this,
            promises = [],
            docEl = document.documentElement,
            matches = docEl.matches || docEl.webkitMatchesSelector || docEl.mozMatchesSelector || docEl.msMatchesSelector || docEl.oMatchesSelector,
            test = function(element) {
                return element.nodeType === 1 && matches.call(element, filterQuery);
            },
            observer = new MutationObserver(function(mutations) {
                var mutation, buff = [];
                for (var x = 0;x<mutations.length;x++) {
                    mutation = mutations[x];
                    for (var i=0;i<mutation.addedNodes.length;i++) {
                        if (test(mutation.addedNodes[i])) {
                            buff.push(mutation.addedNodes[i]);
                        }
                    }
                }
                if (buff.length > 0 ) {
                    notify("notify", buff);
                }
            }),
            getLazyCall = function(cb, arr) {
                return function () {
                    var promise = cb.call(self,arr);
                    if (promise) {
                        promises.push(promise);
                    }
                };
            },
            notify = function (eventName, arr) {
                var cbs = eventCallbacks[eventName];
                var max = (cbs||[]).length;
                for (var i=0;i<max;i++) {
                    getLazyCall(cbs[i], arr)();
                }
            };

        // find elements already in the doc
        var alreadyParsed = docEl.querySelectorAll(filterQuery);
        var alreadyParsedBuff = [];
        for (var i=0;i<alreadyParsed.length;i++) {
          if (test(alreadyParsed[i])) {
            alreadyParsedBuff.push(alreadyParsed[i]);
          }
        }

        // Wire it up please...
        observer.observe(docEl,
            { attributes: false, subtree: true, childList: true }
        );

        this.on = function (n, cb) {
            eventCallbacks[n] = eventCallbacks[n] || [];
            eventCallbacks[n].push(cb);
            if (!connected) {
                connected = true;
                //check();
            }
            notify("notify", alreadyParsedBuff);
        };
        this.disconnect = function () {
            observer.disconnect();
        };
        document.addEventListener("DOMContentLoaded", function () {
            window.__domContentLoadedTime = Date.now();
            if (connected) {
               self.disconnect(true);
            }
            attachTo.ParseMutationObserver.Promise.all(promises).then(function(){
                var cbs = eventCallbacks.done;
                var max = (cbs||[]).length;
                for (var i=0;i<max;i++) {
                    eventCallbacks.done[i]();
                }
            });
        });
    };
    attachTo.ParseMutationObserver.version = "0.1.0";
    attachTo.ParseMutationObserver.Promise = RSVP.Promise;
    attachTo.ParseMutationObserver.Promise.all = RSVP.all;
    attachTo.ParseMutationObserver.promiseUrl = function(url) {
        var promise = new attachTo.ParseMutationObserver.Promise(function(resolve, reject){
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
}(window.ProllyfillRoot || window));
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
/* jshint -W054 */
(function (cas) {
    /* Observer frag... */
    var docEl = document.documentElement;
    var matches = docEl.matches || docEl.webkitMatchesSelector || docEl.mozMatchesSelector || docEl.msMatchesSelector || docEl.oMatchesSelector;
    var test = function(element, selector) {
        return element.nodeType === 1 && matches.call(element, selector);
    };
    /* hash { selector: callback } */
    cas.observe = function () {
        var observer = new MutationObserver(function(mutations) {
            var mutation;
            for (var x = 0;x<mutations.length;x++) {
                mutation = mutations[x];
                /* 
                    for each element, we check match on each selector in specificity order, 
                    if it matches, apply the command...
                 */
                for (var i=0;i<mutation.addedNodes.length;i++) {
                    for (var n=0;n<cas.ordered.length;n++) {
                        if (test(mutation.addedNodes[i]), cas.ordered[n].selector) {
                            if (!cas.ordered[n].compiled) {
                              cas.ordered[n].compiled = new Function(["el"],cas.ordered[n].command.replace("\"<el>\"", "el"));  
                            }
                            cas.ordered[n].compiled(mutation.addedNodes[i]);
                        }    
                    }
                }
            }
        });
        // Wire it up please...
        observer.observe(document,
            { attributes: false, subtree: true, childList: true }
        );
    };

}((typeof global==="undefined") ? window.cas : global.cas ));

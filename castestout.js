document.addEventListener('DOMContentLoaded', function(){ cas.init(cas._querySelectorAll = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };
cas._applyMutations = function (el, hash) { for (var name in hash) { el.setAttribute( name, hash[name]); }};
cas._applyCasProp = function (selector,hash) { cas._querySelectorAll(selector).forEach(function (el) { cas._applyMutations(el, hash) }); };
cas._applyCasListener = function (selector,state,evtName) { cas._querySelectorAll(selector).forEach(function (el) { el.addEventListener(state, window[evtName], false); } ); };
cas._applyCasProp("p", {"foo":"bar","is":"awesome"}, "<el>");
;window.cas.ordered = [{"selector":"p","specificity":1,"command":"cas._applyCasProp(\"p\", {\"foo\":\"bar\",\"is\":\"awesome\"}, \"<el>\");"}]);},false);
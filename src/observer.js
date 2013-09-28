/* globals global */
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

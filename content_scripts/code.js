function testUrl(url, options) {
    var numUrls = options.length;
    for (var i=0; i<numUrls; i++) {
	var urlMatcher = urlToTest(options[i]);
	if (urlMatcher(url))
	    return options[i];
    }
}

function urlToTest(input){
    var patched = input.replace(/\*/g, 'WILDCARD');

    var parts = URL.parse(patched);

    function makeTest(str){
        if (str === 'WILDCARD') return function(){ return true; };
        var pattern = escapeRegExp(str).replace(/WILDCARD/g,'.*');
        var regex = new RegExp('^' + pattern + '$', 'g');
        return function(target){ return regex.test(target); };
    }

    var tests = {
        scheme: makeTest(parts.scheme.text),
        host: makeTest(parts.host.text),
        pathname: makeTest(parts.pathname.text),
        search: makeTest(parts.search.text)
    };

    if (/^\/WILDCARD$/g.test(parts.pathname.text))
	tests.search = function(t) { return true; };

    return function(url2) {
	var parsed2 = URL.parse(url2);
        return (
            tests.scheme(parsed2.scheme.text) &&
		tests.host(parsed2.host.text) &&
		tests.pathname(parsed2.pathname.text) &&
		tests.search(parsed2.search.text)
        );
    };
}

function deleteElements(selector) {
    // in case the content script was injected before the page is partially loaded
    if (!selector) return;
    doDelete(document.querySelectorAll(selector));

    var mo = new MutationObserver(process);
    mo.observe(document, {subtree:true, childList:true});
    document.addEventListener('DOMContentLoaded', function() { mo.disconnect(); });

    function process(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var nodes = mutations[i].addedNodes;
            for (var j = 0; j < nodes.length; j++) {
                var n = nodes[j];
                if (n.nodeType != 1) // only process Node.ELEMENT_NODE
                    continue;
                doDelete(n.matches(selector) ? [n] : n.querySelectorAll(selector));
            }
        }
    }
    function doDelete(nodes) {
        [].forEach.call(nodes, function(node) { node.remove(); });
    }
}

function escapeRegExp(string){
    return string.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

chrome.storage.sync.get(null, function(options) {
    if (Object.keys(options).length>0)
    {
	// TODO: fix this section to check both classes and ids
	var classUrls = options.classOptions;
	var matchedClassUrl = testUrl(document.URL, classUrls);
	if (matchedClassUrl)
	{
	    deleteElements(options.classOptions[matchedClassUrl]);
	}

	if (options.idOptions[matchedClassUrl])
	{
	    deleteElements(options.idOptions[matchedClassUrl]);
	}
	else
	{
	    var idUrls = Object.keys(options.idOptions);
	    var matchedIdUrl = testUrl(document.URL, idUrls);
	    if (matchedIdUrl)
		deleteElements(options.idOptions[matchedIdUrl]);
	}
    }
});

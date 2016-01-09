document.addEventListener("DOMNodeInserted", rewriteHandler, false);

function rewriteHandler(event) {
  //chrome.extension.sendRequest({'action' : 'getHTTPS'}, rewriteHTTPS);
  // Why bother getting the preference, let's always do it on https:
  if (document.URL.match(/https:/)) { rewriteHTTPS(event.target); }
}

function rewriteHTTPS(node) {
  if (!node.getElementsByTagName) { return; }
  var nodes = node.getElementsByTagName("a");

  if (node.href) {
    node.href = node.href.replace(/^http:/, "https:");
  }
  for (var i in nodes) {
    if (nodes[i].href) {
      nodes[i].href = nodes[i].href.replace(/^http:/, "https:");
    }
  }
}

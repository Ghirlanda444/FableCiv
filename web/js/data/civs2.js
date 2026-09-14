// Additional civilizations (the second batch of 20). Same format as civs.js; pushed into AU.CIVS.
(function (AU) {
  function L(id, name, title, abName, abDesc, fx, ai) { return { id: id, name: name, title: title, ability: { name: abName, desc: abDesc, fx: fx }, ai: ai }; }
  var MORE = [
  ];
  MORE.forEach(function (c) { AU.CIVS.push(c); });
  AU.indexCivs();
})(globalThis.AU = globalThis.AU || {});

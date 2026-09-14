// Palace rules: when pieces are offered, what they give, and the AI's choices.
(function (AU) {
  var G = AU.G;
  var P = AU.Palace = {};
  P.state = function (civ) { if (!civ.palace) civ.palace = { pieces: {}, pending: 0, lastOffer: 0, era: 0 }; return civ.palace; };
  P.count = function (civ) { return civ.palace ? Object.keys(civ.palace.pieces).length : 0; };
  P.available = function (civ) { // pieces that can be built now (prerequisites done, not built yet)
    var st = P.state(civ);
    return AU.PALACE_PIECES.filter(function (pc) { return !st.pieces[pc.id] && pc.needs.every(function (n) { return !!st.pieces[n]; }); });
  };
  P.styles = function (g, civ) { // your own architecture plus three others, rotating with the number of pieces
    var own = AU.cultureOf(civ) || 'mediterranean', all = Object.keys(AU.PALACE_STYLES).filter(function (s) { return s !== own; }), n = P.count(civ);
    var out = [own]; for (var k = 0; k < 3; k++) out.push(all[(n * 3 + k) % all.length]);
    return out;
  };
  P.offer = function (g, civ, why) {
    var st = P.state(civ); if (!P.available(civ).length) return;
    st.pending++; st.lastOffer = g.turn;
    if (civ.isPlayer) G.notify(g, civ, { kind: 'palace', text: why + ' Your people offer to add a piece to your palace.', panel: 'palace' });
  };
  P.build = function (g, civ, pieceId, style) {
    var st = P.state(civ), pc = AU.PALACE_PIECE_BY_ID[pieceId];
    if (!pc || st.pending <= 0 || st.pieces[pieceId] || !AU.PALACE_STYLES[style]) return false;
    if (!pc.needs.every(function (n) { return !!st.pieces[n]; })) return false;
    st.pieces[pieceId] = style; st.pending--;
    civ._fx = null; g.fxGen = (g.fxGen || 0) + 1;
    if (civ.isPlayer) G.log(g, 'The ' + pc.name + ' of the palace was completed in the ' + AU.PALACE_STYLES[style].name + ' style.', civ.idx);
    return true;
  };
  // Bonuses: +1 Culture in the capital per piece, +1 Happiness empire-wide per 4 pieces, tourism per piece.
  P.fx = function (civ) { var n = P.count(civ); return { capitalCulture: n, happiness: Math.floor(n / 4), tourism: n }; };
  // Called once per turn per civilization (from G.processCiv).
  P.turn = function (g, civ) {
    if (civ.minor || !civ.alive || !civ.capital) return;
    var st = P.state(civ);
    if (civ.era > st.era) { st.era = civ.era; if (g.turn > 1) P.offer(g, civ, 'A new era dawns.'); }
    if (g.turn - st.lastOffer >= 20 && g.turn % 20 === 0) { var y = G.civYields(g, civ); if ((y.happiness || 0) >= 0) P.offer(g, civ, 'Your people are content.'); }
    if (!civ.isPlayer && st.pending > 0) { // the AI picks the first available piece in its own style, sometimes a neighbour's
      var av = P.available(civ); if (!av.length) { st.pending = 0; return; }
      var styles = P.styles(g, civ); P.build(g, civ, av[0].id, styles[G.rng(g) < 0.8 ? 0 : 1 + Math.floor(G.rng(g) * 3)]);
    }
  };
  P.onWonder = function (g, civ) { P.offer(g, civ, 'A wonder was completed.'); };
})(globalThis.AU = globalThis.AU || {});

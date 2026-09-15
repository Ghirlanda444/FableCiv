// Leader screens: portrait, emissary header, what the leader says, a list of options.
// Used for first contact, proposals from the AI, denouncements and the "Talk" button of the diplomacy panel.
(function (AU) {
  var G = AU.G, D = AU.Diplo, CS = AU.CityStates;
  var UI = AU.DiploUI = {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  UI.open = function (app, civIdx, ctx) {
    var g = app.g, civ = g.civs[civIdx]; if (!g || !civ) return;
    ctx = ctx || { kind: 'talk' };
    UI.state = { app: app, civ: civIdx, ctx: ctx, reply: null };
    UI.render();
    var box = $('leader'); box.hidden = false;
    $('leader-close').onclick = function () { UI.close(); };
  };
  UI.close = function () { var app = UI.state && UI.state.app; $('leader').hidden = true; UI.state = null; if (app) { app.refreshHud(); if (app.panel === 'diplomacy') app.refreshPanel(); app.invalidate(); setTimeout(function () { app.showDiploQueue(); }, 150); } };
  UI.say = function (text) { if (UI.state) { UI.state.reply = text; UI.render(); } };

  UI.render = function () {
    var st = UI.state, app = st.app, g = app.g, p = G.player(g), civ = g.civs[st.civ], d = G.civData(civ), ctx = st.ctx;
    var art = $('leader-art'), box = document.querySelector('#leader .leader-box'), cul = AU.cultureOf(civ);
    var portraitKind = civ.minor ? 'civs' : 'leaders', portraitId = civ.minor ? civ.civId : civ.leaderId;
    art.hidden = true; art.removeAttribute('src');
    art.src = AU.Assets.url(portraitKind, portraitId); art.hidden = false; art.onerror = function () { art.hidden = true; };
    var throne = cul && AU.Assets.get('thrones', cul) ? AU.Assets.url('thrones', cul) : null;
    box.style.backgroundImage = throne ? 'linear-gradient(180deg, rgba(14,18,28,.78), rgba(10,12,18,.92)), url(' + throne + ')' : '';
    box.style.backgroundSize = 'cover';
    var actions = [], say = '', kicker = '', sub = '', info = '';
    if (civ.minor) {
      var T = AU.CITY_STATE_TYPES[civ.stateType], mine = CS.tiesOf(g, p, civ), tier = CS.tierOf(mine), pat = CS.patron(g, civ), war = G.atWar(g, p.idx, civ.idx), q = D.questOf(g, civ), us = CS.unionState(g, p, civ);
      kicker = (war ? 'Hostile ' : tier >= 3 && pat === p.idx ? 'Grateful ' : tier >= 1 ? 'Friendly ' : '') + 'council of ' + d.name;
      $('leader-name').textContent = T.icon + ' ' + d.name; sub = T.name + ' free city · ' + (civ.alive ? 'Patron: ' + (pat < 0 ? 'none' : pat === p.idx ? 'you' : G.civData(g.civs[pat]).name) : 'gone');
      if (ctx.kind === 'meetCS') say = 'Welcome, traveller, to ' + d.name + '. We are a free city and mean to stay one. ' + (ctx.first ? 'You are the first great power to find us; we will remember it. ' : '') + 'Send your caravans, guard our borders, honour our quest, and our ' + T.desc + ' will flow to you. Stay long enough as our kin and we may even join you.';
      else if (war) say = 'You bring soldiers instead of caravans. ' + d.name + ' will not kneel.';
      else say = tier >= 3 && pat === p.idx ? 'Our council remembers everything you have done for ' + d.name + '. What does its patron ask today?' : tier >= 1 ? 'The council of ' + d.name + ' knows your name. Caravans and gifts open many doors.' : 'Strangers are welcome in ' + d.name + ', but friends are trusted.';
      info = '<div><b>' + esc(d.ability.name) + ':</b> ' + esc(d.ability.desc) + ' <span class="stat">(for the Patron)</span></div><div>Ties: <b>' + mine + '</b>/100 · ' + CS.tierName(mine) + (pat === p.idx ? ' · you are the Patron' : '') + '</div>' +
        '<div>📜 <b>Quest:</b> ' + esc(q.text) + (civ.questDone && civ.questDone[p.idx] ? ' <span class="op-plus">(done)</span>' : ' → +' + CS.QUEST_TIES + ' Ties') + '</div>' + (tier >= 4 && pat === p.idx ? '<div>🤝 <b>Union:</b> ' + (us.ok ? 'possible now' : esc(us.why)) + '</div>' : '');
      if (civ.alive) {
        if (!war) actions.push({ label: 'Gift ' + D.giftCost(g, p.idx, civ) + ' Gold (+' + CS.GIFT_TIES + ' Ties)', on: D.canGiftCS(g, p.idx, civ), fn: function () { UI.say(D.giftCS(g, p.idx, civ).text); } });
        if (!war && us.ok) actions.push({ label: 'Propose a Union', on: true, fn: function () { if (CS.union(g, p, civ)) UI.say(d.name + ' joins your empire!'); } });
        if (war) actions.push({ label: 'Make peace', on: true, fn: function () { if (AU.AI.respondToPeaceProposal(g, civ, p.idx)) { G.makePeace(g, p.idx, civ.idx); UI.say(d.name + ' accepts peace.'); } else UI.say(d.name + ' refuses peace for now.'); } });
        else actions.push({ label: 'Declare war', danger: true, on: D.canDeclareWar(g, p.idx, civ.idx), fn: function () { app.confirm('Declare war on ' + d.name + '? Its Suzerain may join.', function () { G.declareWar(g, p.idx, civ.idx); UI.say('War! ' + d.name + ' calls for help.'); }); } });
      }
    } else {
      var l = G.leaderData(civ), r = D.rel(g, civ.idx, p.idx), mine2 = D.rel(g, p.idx, civ.idx), att = r ? r.attitude : 0, mood = D.mood(att), ag = D.agenda(civ);
      var war2 = G.atWar(g, p.idx, civ.idx), friend = D.isFriend(g, p.idx, civ.idx), ally = D.isAlly(g, p.idx, civ.idx);
      kicker = (war2 ? 'Hostile' : mood) + ' ' + d.adj + ' emissary';
      $('leader-name').textContent = l.name; sub = (l.title.indexOf(' of ') >= 0 ? l.title : l.title + ' of ' + d.name) + (civ.alive ? ' · ' + (war2 ? 'At war' : ally ? 'Allied' : friend ? 'Friends' : 'Peace') + ' · ' + G.civSettlements(g, civ.idx).length + ' settlements · military ' + Math.round(G.militaryStrength(g, civ.idx)) : ' · destroyed');
      var ops = D.opinion(g, civ, p);
      info = '<div>🎯 <b>' + esc(ag.name) + ':</b> ' + esc(ag.desc) + '</div><div>Opinion of you: <b>' + mood + '</b> (' + Math.round(att) + ')' + (ops.length ? ' · ' + ops.map(function (o) { return '<span class="' + (o[1] >= 0 ? 'op-plus' : 'op-minus') + '">' + esc(o[0]) + '</span>'; }).join(', ') : '') + '</div>';
      if (r && r.log && r.log.length) info += '<div>' + r.log.slice(-4).reverse().map(function (e) { return '<span class="' + (e.d >= 0 ? 'op-plus' : 'op-minus') + '">T' + e.t + ' ' + esc(e.text) + (e.d ? ' (' + (e.d > 0 ? '+' : '') + e.d + ')' : '') + '</span>'; }).join(' · ') + '</div>';
      if (mine2 && (friend || ally || mine2.bordersUntil > g.turn || mine2.peaceUntil > g.turn)) info += '<div>' + [ally ? 'Alliance until turn ' + mine2.allyUntil : friend ? 'Friendship until turn ' + mine2.friendUntil : '', mine2.bordersUntil > g.turn ? 'Open borders until turn ' + mine2.bordersUntil : '', mine2.peaceUntil > g.turn ? 'Peace treaty until turn ' + mine2.peaceUntil : ''].filter(Boolean).join(' · ') + '</div>';
      switch (ctx.kind) {
        case 'meet': say = D.greeting(g, civ, p); break;
        case 'proposeFriendship': say = '"' + (att > 30 ? 'Our peoples have much in common. ' : '') + 'Let us declare our friendship before the world, and swear never to raise arms against each other."'; break;
        case 'proposeAlliance': say = '"Friends we are; allies we should be. Stand with ' + d.name + ' and we shall stand with you, in peace and in war."'; break;
        case 'denounced': say = '"Hear this, all nations: ' + G.civData(p).name + ' cannot be trusted. ' + d.name + ' denounces you!"'; break;
        default: say = war2 ? '"You come to talk while our armies fight? Speak, then."' : att > 30 ? '"Always a pleasure, my friend. What can ' + d.name + ' do for you?"' : att > 10 ? '"Welcome. What brings you to my court?"' : att > -10 ? '"Say what you came to say."' : '"Speak quickly. My patience with you is short."';
      }
      if (civ.alive) {
        if (ctx.kind === 'proposeFriendship') { actions.push({ label: 'Accept the friendship', on: true, fn: function () { UI.say(D.declareFriendship(g, civ.idx, p.idx).text); } }); actions.push({ label: 'Decline politely', on: true, fn: function () { D.log(g, civ.idx, p.idx, 'Declined their friendship', -3); UI.close(); } }); }
        else if (ctx.kind === 'proposeAlliance') { actions.push({ label: 'Accept the alliance', on: true, fn: function () { UI.say(D.formAlliance(g, civ.idx, p.idx).text); } }); actions.push({ label: 'Not now', on: true, fn: function () { D.log(g, civ.idx, p.idx, 'Declined their alliance', -3); UI.close(); } }); }
        else if (ctx.kind === 'denounced') { actions.push({ label: '"We will remember this."', on: true, fn: function () { UI.close(); } }); actions.push({ label: 'Denounce them in return', danger: true, on: true, fn: function () { UI.say(D.denounce(g, p.idx, civ.idx).text); } }); }
        else {
          if (ctx.kind === 'meet') actions.push({ label: '"The pleasure is ours." (warm greeting)', on: true, fn: function () { D.log(g, civ.idx, p.idx, 'A warm first greeting', 2); UI.say('"' + (ag.id === 'warlord' ? 'Words are cheap. We shall see.' : 'Well said. May our peoples prosper side by side.') + '"'); st.ctx = { kind: 'talk' }; } });
          if (!war2) {
            actions.push({ label: 'Send a delegation (30 Gold, +6)', on: D.canDelegation(g, p.idx, civ.idx), fn: function () { UI.say(D.sendDelegation(g, p.idx, civ.idx).text); } });
            actions.push({ label: 'Gift 100 Gold (+8)', on: D.canGift(g, p.idx, civ.idx), fn: function () { UI.say(D.gift(g, p.idx, civ.idx).text); } });
            actions.push({ label: friend ? 'Renew friendship' : 'Declare friendship', on: !ally && (!friend || mine2.friendUntil - g.turn < 10), hint: D.wantsFriendship(g, civ, p.idx) ? 'They are willing' : 'They are not ready', fn: function () { UI.say(D.declareFriendship(g, p.idx, civ.idx).text); } });
            actions.push({ label: ally ? 'Alliance active' : 'Form an alliance', on: friend && !ally, hint: D.wantsAlliance(g, civ, p.idx) ? 'They are willing' : 'Needs 8 turns of friendship and a high opinion', fn: function () { UI.say(D.formAlliance(g, p.idx, civ.idx).text); } });
            actions.push({ label: 'Open borders (30 turns)', on: !(mine2.bordersUntil > g.turn) && !ally, hint: D.wantsOpenBorders(g, civ, p.idx) ? 'They are willing' : 'They do not trust you', fn: function () { UI.say(D.openBorders(g, p.idx, civ.idx).text); } });
            var give = D.spareLuxuries(g, p.idx, civ.idx), get = D.spareLuxuries(g, civ.idx, p.idx);
            if (give.length || get.length) actions.push({ label: 'Trade luxuries…', on: true, fn: function () { UI.tradeMenu(give, get); } });
            actions.push({ label: 'Denounce', danger: true, on: !friend && !ally, fn: function () { UI.say(D.denounce(g, p.idx, civ.idx).text); } });
            actions.push({ label: 'Declare war', danger: true, on: D.canDeclareWar(g, p.idx, civ.idx), hint: friend || ally ? 'Not while friends or allied' : (mine2.peaceUntil > g.turn ? 'Peace treaty until turn ' + mine2.peaceUntil : ''), fn: function () { app.confirm('Declare war on ' + d.name + '? Other leaders will remember this.', function () { G.declareWar(g, p.idx, civ.idx); UI.say('"So be it. ' + d.name + ' will answer steel with steel."'); }); } });
          } else {
            var offer = civ.peaceOffer && g.turn - civ.peaceOffer < 5;
            actions.push({ label: offer ? 'Accept their peace offer' : 'Propose peace', on: true, fn: function () { if (offer || AU.AI.respondToPeaceProposal(g, civ, p.idx)) { G.makePeace(g, p.idx, civ.idx); civ.peaceOffer = null; UI.say('"Enough blood has been spilled. Let there be peace."'); } else { r.attitude += 1; UI.say('"Peace? Not while your armies stand where they stand."'); } } });
          }
        }
      }
    }
    $('leader-kicker').textContent = kicker; $('leader-sub').textContent = sub;
    $('leader-say').textContent = st.reply || say;
    $('leader-info').innerHTML = info;
    var ac = $('leader-actions'); ac.innerHTML = '';
    actions.forEach(function (a) {
      var b = document.createElement('button'); b.className = 'small ' + (a.danger ? 'danger' : 'primary'); b.textContent = a.label; b.disabled = !a.on; if (a.hint) b.title = a.hint;
      b.onclick = function () { a.fn(); if (UI.state) UI.render(); };
      ac.appendChild(b);
    });
    if (actions.some(function (a) { return a.hint; })) { var h = document.createElement('div'); h.className = 'stat'; h.style.flex = '1 1 100%'; h.textContent = actions.filter(function (a) { return a.hint && !a.on; }).map(function (a) { return a.label + ': ' + a.hint; }).join(' · '); ac.appendChild(h); }
  };
  UI.tradeMenu = function (give, get) {
    var st = UI.state, app = st.app, g = app.g, p = G.player(g), civ = g.civs[st.civ], ac = $('leader-actions');
    ac.innerHTML = ''; $('leader-say').textContent = '"Let us talk trade. What do you have in mind?"';
    function name(r) { return AU.RESOURCES[r].icon + ' ' + AU.RESOURCES[r].name; }
    var sel1 = document.createElement('select'), sel2 = document.createElement('select');
    sel1.innerHTML = '<option value="">(nothing from you)</option>' + give.map(function (r) { return '<option value="' + r + '">Give ' + name(r) + '</option>'; }).join('');
    sel2.innerHTML = '<option value="">(nothing from them)</option>' + get.map(function (r) { return '<option value="' + r + '">Get ' + name(r) + '</option>'; }).join('');
    ac.appendChild(sel1); ac.appendChild(sel2);
    function btn(label, fn) { var b = document.createElement('button'); b.className = 'small primary'; b.textContent = label; b.onclick = fn; ac.appendChild(b); }
    btn('Swap (30 turns)', function () { if (!sel1.value || !sel2.value) return UI.say('Pick one luxury on each side to swap.'); UI.say(D.swapLuxuries(g, p.idx, civ.idx, sel1.value, sel2.value).text); });
    btn('Sell yours for 90 Gold', function () { if (!sel1.value) return UI.say('Pick a luxury of yours to sell.'); UI.say(D.sellLuxury(g, p.idx, civ.idx, sel1.value).text); });
    btn('Buy theirs for 110 Gold', function () { if (!sel2.value) return UI.say('Pick a luxury of theirs to buy.'); UI.say(D.buyLuxury(g, p.idx, civ.idx, sel2.value).text); });
    btn('Back', function () { UI.render(); });
  };
})(globalThis.AU = globalThis.AU || {});

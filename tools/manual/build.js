// The printed instruction manual: a retro A5 booklet (cover, how to play, every rule, the peoples of the world, a quick
// reference card) generated from the game's own data, so it never drifts from the rules.
//   node tools/manual/shots.js tools/manual/out/shots     (screenshots, optional)
//   node tools/manual/build.js tools/manual/out            (needs python3 with pypdfium2 or pypdf for the page numbers of the contents)
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const AU = require('../../tests/load.js'); const G = AU.G;
const WEB = path.join(__dirname, '..', '..', 'web');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'out')); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = path.join(OUT, 'shots');
const manifest = JSON.parse(fs.readFileSync(path.join(WEB, 'assets', 'manifest.json'), 'utf8'));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const url = f => 'file://' + f;
const dataCache = {};
// pictures go in as data URIs: a file:// picture taints the canvas that shrinks it
const pic = f => dataCache[f] || (dataCache[f] = 'data:' + (/\.jpe?g$/i.test(f) ? 'image/jpeg' : 'image/png') + ';base64,' + fs.readFileSync(f).toString('base64'));
function art(kind, id) { const e = manifest.find(m => m.kind === kind && m.id === id); return e && fs.existsSync(path.join(WEB, 'assets', e.file)) ? pic(path.join(WEB, 'assets', e.file)) : null; }
function shot(name) { const f = path.join(SHOTS, name + '.png'); return fs.existsSync(f) ? pic(f) : null; }
const civs = Object.values(AU.CIV_BY_ID).filter(c => c.leaders && c.leaders.length).sort((a, b) => a.name.localeCompare(b.name));
const V = AU.VICTORIES, ERAS = AU.V2.ERAS, LANES = AU.V2.LANES;
const U = id => (AU.UNITS[id] || {}).name || id;

// ---------- building blocks ----------
let figN = 0;
const chapters = [];
function chapter(num, title, kicker, body) { chapters.push({ num, title }); return `<section class="chapter" data-toc="${esc(title)}"><div class="opener"><div class="cnum"><small>CHAPTER</small>${num}</div><div><h2>${esc(title)}</h2><p class="kicker">${kicker}</p></div></div>${body}</section>`; }
const tip = (t, label) => `<aside class="hint"><b class="tab">${label || "ADVISOR'S TIP"}</b>${t}</aside>`;
const warn = t => `<aside class="hint warn"><b class="tab">WATCH OUT!</b>${t}</aside>`;
function fig(src, caption, opts) {
  if (!src) return ''; opts = opts || {}; figN++;
  const crop = opts.crop ? ` data-crop="${opts.crop.join(',')}"` : '';
  const marks = (opts.marks || []).map((m, i) => `<i class="mark" style="left:${m[0]}%;top:${m[1]}%">${i + 1}</i>`).join('');
  const legend = opts.marks ? `<ol class="legend">${opts.marks.map(m => `<li>${m[2]}</li>`).join('')}</ol>` : '';
  return `<figure class="${opts.cls || ''}"><div class="shotwrap"><img class="shot" src="${src}" data-w="${opts.w || 900}"${crop}>${marks}</div><figcaption><b>Fig. ${figN}</b> ${caption}</figcaption>${legend}</figure>`;
}
const table = (head, rows, cls) => `<table class="tbl ${cls || ''}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

// ---------- the chapters ----------
const body = [];
body.push(chapter(1, 'Welcome, Ruler', 'One camp, one people, one very long story.', `
<p class="lead">Tiny Empires is a turn-based strategy game. You lead one people from a single camp in the Pebble Age to the screens of the Pixel Age. Your empire never resets: the people you choose on the first turn are the people you finish with, and everything you learn stays learned.</p>
<p>There is no research tree to click through. Your empire learns by <b>doing</b>: every discovery, called a <b>Spark</b>, lights up by itself when your people do what its card describes. Work the river and the river lore sparks; lose a boat and your shipwrights learn. You steer your people, and their history writes the tree.</p>
<p>Around you, up to eleven other empires grow the same way, each led by a historical ruler with a personality, an agenda and a long memory. Free cities trade and bargain, wild Inchibil bands raid the unclaimed land, spirits watch over every settlement, and the climate itself answers the smoke of your furnaces.</p>
${tip('Read Chapter 4 before your first game. It walks you through the first ten turns; everything else can wait until the game asks for it. Every rule in this book is also in the <b>Chibipedia</b> (📖 on the top bar).')}
<h3>What is in the box</h3>
<ul class="check"><li>40 peoples and 96 leaders, each with abilities of their own (Chapter 13)</li><li>Seven ages, 362 Sparks and 42 great decisions called Insights</li><li>Spirits, faiths, free cities, Great People and three kinds of Wonder</li><li>Maps from tiny islands to enormous continents, six difficulty levels and four game speeds</li><li>Nine languages, and a 2D map or a 3D map (switch in Settings)</li></ul>
`));

body.push(chapter(2, 'Starting a Game', 'Choose a people, a ruler and a world.', `
<p>From the title screen press <b>New game</b>. Pick a <b>people</b>, then one of its <b>leaders</b>: every leader rules only their own people, and each has an ability of their own on top of the people's. The card also tells you which victory the leader leans towards.</p>
${table(['Option', 'Choices', 'What it changes'], [
  ['Map size', 'Tiny, Small, Standard, Large, Huge, Enormous', 'How many empires and free cities fit'],
  ['Map type', 'Continents, Pangaea, Fractal, Archipelago, Islands, Donut, Inland Sea, Terra', 'The shape of the land and the seas'],
  ['Difficulty', 'Settler, Chieftain, Prince, King, Emperor, Deity', 'Bonuses of the computer leaders; Prince is fair'],
  ['Speed', 'Quick, Standard, Epic, Marathon', 'Costs and the length of the game'],
  ['Seed', 'Any number', 'The same seed gives the same world']
])}
<h3>Saving</h3><p>The game saves itself at the start of every turn. <b>Continue</b> on the title screen resumes the last game; the menu (☰) also saves and loads named games and exports a save to a file.</p>
${tip('New to strategy games? Settler difficulty on a Small Continents map is gentle, and the tutorial (title screen) plays the first turns with you.', 'FOR BEGINNERS')}
`));

body.push(chapter(3, 'The Screen', 'Everything you need is one tap away.', `
${fig(shot('map'), 'The map in the Turret Age. Roads link the Roman settlements; the thick lines are borders.', { marks: [
  [5.5, 7, 'Menu, Chibipedia and Rankings.'], [16, 7, '💰 Gold in the treasury and per turn.'], [27, 7, '🔬 Knowledge per turn · Sparks lit this age (of 32) · 📚 Knowledge saved for studying.'],
  [40, 7, '🎭 Heritage per turn · Insights decided · Heritage saved for Reforms.'], [51.5, 7, '🕊️ Devotion, and your faith.'], [59.5, 7, '🎖️ Command: orders left this turn.'],
  [66, 7, '🎯 Influence, to claim land.'], [72.5, 7, 'The mood of your people.'], [96, 8, 'Turn and age.'],
  [25, 85, 'The selected settlement or unit: its card and its actions.'], [91, 85, 'Next unit, production and the end-of-turn button.'], [18, 47, 'A road; where it crosses a river it is a bridge.']
] })}
<p>Tap any number on the top bar to open its panel. Tap a settlement to see its card; press <b>Manage</b> for its tiles, buildings and queue. The button at the bottom right always shows what still needs you this turn: a unit waiting for orders, a settlement with nothing to build, a choice to make. When nothing is left it becomes <b>End turn</b>.</p>
<h3>Controls</h3>
${table(['', 'Touch', 'Mouse and keyboard'], [
  ['Select', 'Tap', 'Left click (cycles the units on a tile)'],
  ['Move or attack', 'Tap a highlighted tile', 'Right click, or hold right to see the route'],
  ['Pan and zoom', 'Drag, pinch', 'Drag, mouse wheel'],
  ['End turn', 'The bottom-right button', 'Enter'],
  ['Next unit · Fortify · Skip', '', 'N · F · Space']
])}
<h3>Who's who: the people you command</h3>
<div class="gallery">${['settler', 'warrior', 'scout', 'commander', 'migrant', 'scarecrow', 'missionary', 'caravan'].map(id => { const d = AU.UNITS[id] || {}; const a = art('units', id); const nick = AU.V2.UNITS && AU.V2.UNITS[id] && AU.V2.UNITS[id].joke; return `<div class="gcard">${a ? `<img src="${a}" data-w="160" data-png="1">` : `<span class="gicon">${esc(d.icon || '★')}</span>`}<b>${esc(d.name || id)}${nick ? ` <i>“${esc(nick)}”</i>` : ''}</b><p>${esc(d.descV2 || d.desc || ({ warrior: 'The first soldier of every people: cheap, sturdy and eager.', scout: 'Moves fast, sees far and finds the peoples, free cities and wonders that light your first Sparks.' })[id] || '')}</p></div>`; }).join('')}</div>
`));

body.push(chapter(4, 'Your First Ten Turns', 'A short walk from a campfire to a kingdom.', `
<ol class="steps">
<li><b>Found your capital.</b> You start with ${U('settler')}, a ${U('warrior')} and a ${U('scout')}. Press <b>Found</b> with the ${U('settler')} on its first turn: rivers, coasts and hills are all good sites, and the spot you start on is always fair.</li>
<li><b>Explore.</b> Send the ${U('scout')} away from home. Meeting other peoples, free cities and natural wonders lights your first Sparks, and seeing the land tells you where to settle next.</li>
<li><b>Grow.</b> Every time a settlement grows, a citizen claims a new tile around it and improves it without builders. The first three claims are free; after that each claim costs Influence and needs a Boundary Marker.</li>
<li><b>Build.</b> Your capital is a <b>City</b> with a production queue: a Monument, a Boundary Marker, more ${U('settler')} and a few soldiers are a classic start.</li>
<li><b>Watch the Sparks.</b> Open the Mastery Web (🔬). Each card says what lights it; the ones closest to lighting are listed first.</li>
<li><b>Expand.</b> Found a second and third settlement. New settlements are <b>Towns</b>: they grow by themselves and turn their Production into Gold. Upgrade the important ones into Cities later.</li>
<li><b>Decide.</b> When an Insight appears, choose one of its two doors. It becomes a permanent trait of your people.</li>
</ol>
${tip('Command is your order budget. Early on you have plenty; later, orders to units far from home cost more. Leave idle soldiers fortified: a fortified unit costs nothing.')}
`));

const tiers = AU.Society.TIERS.map(t => [t.icon + ' ' + t.name, t.min === -Infinity ? 'below -4' : (t.min >= 0 ? '+' : '') + t.min + ' or more', '×' + t.mult, '×' + t.growth]).reverse();
const specs = Object.values(AU.SPECIALIZATIONS || {}).map(s => ['<b>' + esc(s.name) + '</b>', esc(s.descV2 || s.desc)]);
body.push(chapter(5, 'Settlements', 'Towns feed the empire; Cities make it.', `
<h3>Towns and Cities</h3>
<p>Your capital is a City. Every other settlement starts as a <b>Town</b>. A Town has no production queue: its Production becomes Gold, and you <b>buy</b> its buildings and units with Gold. Pay to <b>upgrade</b> a Town into a City whenever you want another production hub. From 5 population a Town can take a trade:</p>
${table(['Town trade', 'Effect'], specs)}
<h3>Claims and Influence 🎯</h3>
<p>A settlement starts with its centre and one worked tile and claims one more tile each time it grows. The first three claims are free. After that each claim costs Influence and needs a <b>Boundary Marker</b> in the settlement. You earn Influence every turn (2, +1 per settlement, +1 for every 8 Heritage a turn), and a Growth Hall lets growth wait in a queue instead of idling.</p>
${tip('A port claims the sea cheaply: with a <b>Lighthouse</b> a water tile costs half the Influence, with a <b>Harbor</b> it is free. Coastal cities that build them early grow on the water when the land runs out.', 'HARBOUR MASTER')}
${tip('A settlement on a <b>river</b> starts easy: its river tiles are claimed without Influence or Boundary Marker, it grows 20% cheaper until 8 population, and the river soaks up 1 Smoke.')}
<h3>Moods</h3>
<p>The Happiness of a settlement sets its mood, and the mood scales its yields and growth. Luxuries, Shrines, Festivals and many abilities raise Happiness; crowding, Smoke, unrest and angry spirits lower it.</p>
${table(['Mood', 'Happiness', 'Yields', 'Growth'], tiers)}
<p>Every ten turns families leave Miserable empires for Joyful neighbours: that is <b>Migration Pull</b>. ${U('migrant')} carry a citizen from one of your settlements to another on purpose.</p>
<h3>Smoke 🏭 and climate</h3>
<p>Industry makes Smoke: Workshops, Ironworks, Factories, Power Plants, railways, worked mines and, from the Puffstack Age, crowds. Woods and civic works (Aqueduct, Hospital, Sewer, National Park) soak it up. Every 3 net Smoke costs 1 Happiness, and at 6 a settlement is <i>heavy</i>: farms and pastures lose Food and visitors stay away. The world warms and cools with the ages and, later, with the world's Smoke. A shift is announced five turns ahead and changes a few tiles at the edges of the biomes: tundra thaws, deserts spread, low shores drown.</p>
`));

body.push(chapter(6, 'The Land', 'Rivers, roads and what lies under the soil.', `
<p>Grassland and plains feed, hills and forests build, deserts and tundra are poor until someone learns their secret. Mountains block every army but the few who know the passes. Natural wonders give yields and light Sparks when you find them.</p>
<h3>Rivers</h3>
<p>Rivers are the best land in the game and a barrier in war. Entering an unbridged <b>navigable river</b> from off the river ends a unit's move; a minor river costs 1 more movement; walking along the same river valley is free. A unit attacking out of a navigable river fights at -25%.</p>
<h3>Roads and bridges</h3>
<p>Your people lay their own roads. Each turn every link of your road network gains one tile (two from the Turret Age): the capital joins its nearest settlement, every other settlement joins the nearest one already connected, on the same continent and up to 10 tiles apart. Roads never cross another empire's land. Moving from road to road costs half a movement, and a road over a river is a <b>bridge</b> that takes away the river's penalty.</p>
${tip('Roads matter beyond movement: a faith pushes twice as hard between two settlements joined by a finished road, and some peoples (Rome, the Inca) give orders along their roads for 1 Command wherever the unit stands, and the Inca lay theirs straight through the mountains.')}
<h3>Railways</h3>
<p>From the Puffstack Age (the Iron Rail Spark) and with a Railway Station at one end, <b>you</b> decide which settlements to connect by rail. A line is a real investment: Gold for every tile, paid up front (50 on flat land, 75 on hills, woods and marsh, +50 for a river bridge); 2 turns of work per tile (3 on rough ground, +1 for a bridge); 20% less Production at both ends while the crews work; 1 Iron held for good by every line; 1 Coal for every 3 lines to run the trains; 2 Gold a turn of upkeep. It pays back: each end earns Gold from the trade with the other, +15% Production, and armies ride the line across the empire in a turn. Lines share track, so the network grows line by line.</p>
${tip('Start with the line between your two biggest settlements: the trade Gold grows with the population at the other end. Keep an eye on Coal: a line without Coal is only an expensive monument.', 'RAILWAY BARON')}
<h3>Airports ✈️</h3>
<p>From the Glowbit Age (the Long Flat Dirt Spark) an <b>Airport</b> is an ordinary building. Once you own two, your Airports fly routes between each other on their own, across seas too, the biggest hubs first and then the biggest settlements. Every Airport level gives <b>3 gates</b>, and a route takes a gate at both ends: a level-3 hub serves 9 routes while each small Airport it serves still has only its own 3. Each route pays its Airport Gold (2, +1 per 4 population at the other end), Knowledge (1, +1 per 6) and visitors (Fame), but every extra route counts for less: the 2nd half, the 3rd a third, and so on. A hub keeps gaining, ever more slowly.</p>
<p>Enlarging an Airport costs 300 Gold for every level it already has and 6 turns plus 2 per level; from level 3 the new jets need <b>Aluminum</b>. There is no top level. Each level costs 1 Gold a turn. A land unit that has not moved this turn can board and fly to any Airport linked to its own (one flight per level from each Airport every turn).</p>
${tip('Pick one big settlement as your hub and enlarge it first: every small Airport you add later flies to the hub before anything else, and the hub fills its gates while the others keep theirs for each other.', 'AIR TRAFFIC CONTROL')}
<h3>Highways 🛣️</h3>
<p>Cars need no plan: a <b>Highway Interchange</b> (Paved Everywhere Spark, Glowbit Age) paves the land of its settlement, 3 tiles out, one tile a turn (the tiles your people work first, then the roads), and lays an interstate toward every other Interchange within 10 tiles on the same continent, one tile a turn from each end. It gives <b>suburbs</b> (+15% growth), <b>trucks</b> (+1 Gold for every worked tile on a highway) and +2 Production and +1 Gold for every other Interchange joined to it by highway (at most 4). Units drive a highway for 0.2 movement. Each Interchange costs 2 Gold a turn and adds 1 Smoke.</p>
<h3>Fuel ⛽</h3>
<p>Planes and cars burn Oil. Every Oil you own fuels 6 points: each Airport level needs 1, each Interchange 2. Anything beyond runs on imported fuel for 2 Gold a point every turn. Trains burn Coal, and railways keep all their benefits in every age: airports and highways add to them, they never replace them.</p>
<h3>Seafaring</h3>
<p>From the Marble Age any land unit can <b>embark</b>: it walks onto a Coast or Lake tile and floats on, one movement a tile; landing ends its move. From the Easel Age boats can cross the open Ocean. Norway and Polynesia embark from the start; Polynesia and Portugal cross the Ocean from the start. Pioneers use this to settle other shores: sea-born peoples prefer ports and, when their home shore is full, sail for new land.</p>
<h3>Resources</h3>
<p>Resource tiles are Poor, Normal or Rich. Luxuries give Happiness; strategic resources (Horses, Copper, Iron, Niter, Coal, Oil, Rubber, Aluminum, Uranium) let you build certain units, and a strategic tile supports one to three of them. Each strategic resource is revealed when your people reach its age. From the Glowbit Age a City with a Research Lab can <b>synthesise</b> a strategic resource with Knowledge.</p>
`));

const eraRows = ERAS.map((e, i) => [String(i + 1), '<b>' + esc(e.name) + '</b>', '<i>' + esc(e.joke) + '</i>']);
const laneRows = LANES.order.map(k => [LANES.icon[k] + ' ' + k, esc(LANES.rewards[k][0].name) + ' · ' + esc(LANES.rewards[k][6].name)]);
body.push(chapter(7, 'Sparks, Insights and Ages', 'Nothing to research: your people learn by living.', `
${fig(shot('web'), 'The Mastery Web: five lanes of foundation Sparks, their progress and the price to study them.', { crop: [322, 0, 636, 800], w: 700, cls: 'half' })}
<h3>Sparks 💡</h3>
<p>Every age has 32 <b>foundation Sparks</b> and 18 <b>branch Sparks</b>. A Spark lights up by itself when your empire does what its card says: reach a population, work a resource, win a fight, meet a people. When a Spark lights, its card opens and tells you what it gives and what it unlocks. Some branch Sparks come in <b>pairs</b>: lighting one closes its twin for good.</p>
<h3>Studying 📚</h3>
<p>Knowledge can <b>study</b> any Spark of the current age instead of waiting for it. Studying accelerates, it never replaces doing things: each study in the same age makes the next one 15% dearer.</p>
<h3>Lanes</h3>
<p>The 32 foundation Sparks sit in five lanes, one per way of life. Light every Spark of a lane in its age and the lane is <b>mastered</b>: a permanent reward of its own, different in every age.</p>
${table(['Lane', 'First and last reward'], laneRows)}
<h3>Ages</h3>
<p>20 foundation Sparks (24 from the second age) open a <b>Turning Point</b> into the next age. An age lasts at least 70 turns; every foundation Spark beyond the threshold cuts 4 turns and every lane mastered 5, down to 45 (at Standard speed; Quick is shorter, Epic and Marathon longer).</p>
${table(['', 'Age', ''], eraRows)}
<h3>Insights 🔮 and Reforms</h3>
<p>Insights replace civics and governments: a decision between two doors that becomes a permanent trait. Heritage 🎭 builds up, and once per age it pays for a <b>Reform</b> that reopens one decided Insight and takes its other door.</p>
`));

const cmdRows = Object.entries(G.COMMAND_BUILDINGS).map(([b, n]) => [esc((AU.BUILDINGS[b] || AU.NATIONAL[b] || { name: b }).name), '+' + n]);
body.push(chapter(8, 'Command and War', 'Every order counts; every war costs.', `
<h3>Command 🎖️</h3>
<p>Each turn you can give a limited number of orders: ${G.COMMAND_BASE}, +1 per settlement, plus command buildings, minus 1 per settlement in unrest and, beyond eight settlements, 1 for every 3 more (bureaucracy). A unit's first move or attack of the turn costs 1 Command, 2 when it stands more than 5 tiles from your settlements, 3 beyond 10. An undone move gives the order back. Out of Command, units can only fortify, skip or sleep.</p>
${table(['Command building', 'Orders'], cmdRows, 'narrow')}
<h3>Warbands</h3>
<p>Up to three fighters and a <b>${U('commander')}</b> share a tile and fight as one: the first strikes at 100%, the second at 60%, the third at 40%, and damage lands on the weakest first. Next to an enemy, units must stop (zone of control).</p>
<h3>Ships and shores</h3><p>A melee ship may strike units and settlements on the shore beside it, along any coast and up navigable rivers. It can batter walls down to 1 HP but never captures: only soldiers walk in.</p>
<h3>Scarecrow Crews</h3><p>A ${U('scarecrow')} looks like a full Warband to every other empire. Whoever attacks it loses the rest of the turn and fights weaker for 10 to 20 turns.</p>
<h3>Conquest and its price</h3>
<p>A melee unit captures a settlement whose defense falls to 0. A captured settlement suffers 10 or more turns of <b>unrest</b> (half yields, -3 Happiness), and an unhappy conquest far from its new capital may rise up and return to its old owner. Every capture adds war weariness. A people defending its own land against a wider empire fights harder: +2 Strength per settlement the attacker holds beyond the defender's, up to +8 (the <b>hearth guard</b>).</p>
${warn('A truce holds 25 turns, 40 after a war that took settlements. Leaders remember who broke the last one.')}
`));

const spiritRows = AU.SPIRIT_ORDER.map(k => { const s = AU.SPIRITS[k]; return [s.icon + ' <b>' + esc(s.name) + '</b>', esc(s.site), esc(s.likes), esc(s.hates), Object.keys(s.gift).map(y => '+' + s.gift[y] + ' ' + ({ food: 'Food', gold: 'Gold', production: 'Prod.', culture: 'Heritage', happiness: 'Happy' })[y]).join(', ')]; });
const tenetRows = AU.TENETS.map(T => [esc(T.name), T.options.map(o => '<b>' + esc(o.name) + '</b>: ' + esc(o.desc)).join('<br>')]);
body.push(chapter(9, 'Spirits and Faith', 'The land is alive, and it has opinions.', `
<h3>The spirits of the land</h3>
<p>Every settlement is watched over by the spirit of its site. Give the spirit what it likes and it is <b>pleased</b>: it gives its gift and +1 Devotion 🕊️. Wrong it and it turns <b>angry</b>: -2 Happiness and -1 Devotion. Every spirit also hates Smoke of 4 or more, and a settlement of 8 or more needs a Shrine or Temple to keep its spirit pleased.</p>
${table(['Spirit', 'Site', 'Likes', 'Hates', 'Gift'], spiritRows, 'small')}
<h3>Revelation</h3>
<p>When your empire has earned 100 Devotion (50% more for every faith already in the world) and has a pleased spirit, a <b>Revelation</b> founds your own faith in your most devout settlement, its <b>Holy City</b>. The faith is named after that spirit: a river people might found <i>The River Way</i>, a desert people <i>Sun Hearth</i>. A people that already follows another faith receives no Revelation of its own.</p>
<h3>Tenets</h3><p>The founder shapes the faith three times: at the Revelation, then at 250 and 600 Devotion earned.</p>
${table(['Question', 'The two answers'], tenetRows)}
${fig(shot('religion'), 'The Religion panel: every spirit, its mood and what it wants.', { crop: [322, 0, 636, 800], w: 700, cls: 'half' })}
<h3>State faith, spread and Pilgrims</h3>
<p>Each empire has one <b>state faith</b>: its own, or one it adopts once that faith is followed in its settlements. Settlements of the state faith get +1 Happiness, and leaders who share a faith like each other. Faith spreads from every settlement that follows it to those within 8 tiles, twice as hard along roads and half again between river settlements. It also travels with Caravans, Bonds and migrating families. <b>Pilgrims</b> (70 Devotion) tell its story in another settlement, but leaders of another faith resent Pilgrims in their lands for 20 turns.</p>
<h3>Rites and the Holy City</h3>
<p>An <b>Offering</b> (25 Devotion) keeps a spirit pleased for 20 turns whatever it hates. A <b>Festival</b> gives +2 Happiness everywhere for 8 turns. Whoever holds a Holy City collects its <b>tithe</b>: 1 Gold for every settlement of the faith anywhere in the world. Holy Cities are worth conquering. A Great Prophet makes a settlement a <b>Sacred Site</b> or converts a settlement to your faith.</p>
`));

const pers = Object.values(AU.Society.PERSUASION).map(p => [p.icon + ' ' + p.name, esc(p.desc)]);
body.push(chapter(10, 'Neighbours', 'Friends, rivals, free cities and the wild.', `
${fig(shot('diplomacy'), 'The Diplomacy panel: every leader you know, their mood and why.', { crop: [322, 0, 636, 800], w: 700, cls: 'half' })}
<h3>Leaders</h3><p>Every computer leader has an <b>agenda</b> (a warlord respects armies, a scholar admires Sparks, a devout leader cares about faith) and remembers what you did. Their <b>opinion</b> of you drifts towards a resting level set by your deeds and Insights; the reasons are listed in the Diplomacy panel. A leader who likes you rarely declares war; one who loathes you does so readily. You can gift Gold, declare friendship, form alliances, open borders, denounce and, of course, declare war and make peace.</p>
<h3>Free cities and Kinfolk</h3><p>Free cities are independent single-city powers. Your <b>Ties</b> with one grow from Caravans parked in its land, gifts, its quests, a shared faith and soldiers guarding it. Each free city listens to one persuasion that counts double:</p>
${table(['Persuasion', 'Counts double'], pers)}
<p>With enough Ties and Influence you can form a <b>Bond</b>: the free city stays itself but shares part of its yields with you, for an Influence upkeep every turn.</p>
<h3>The Inchibils</h3><p>The wild people of the map belong to no empire. Their camps (🏕️) send raiders into unclaimed land; move a soldier onto a camp to disperse it for Gold.</p>
`));

const gpRows = AU.GREAT_ORDER.map(k => [AU.GREAT_TYPES[k].icon + ' <b>' + esc(AU.GREAT_TYPES[k].name) + '</b>', esc(AU.GREAT_TYPES[k].descV2 || AU.GREAT_TYPES[k].desc)]);
body.push(chapter(11, 'Great People and Wonders', 'Names the world will remember.', `
<h3>Great People</h3><p>Buildings, Wonders and some abilities earn points towards seven kinds of Great Person. When enough points gather, a named Great Person joins you. Spare Devotion or Gold can recruit one early.</p>
${table(['Great Person', 'Power'], gpRows, 'small')}
<h3>Three kinds of Wonder</h3>
${table(['Kind', 'Rule'], [
  ['🏛️ <b>Wonders</b>', 'One in the world; any City can raise it.'],
  ['👑 <b>Great Wonders</b>', 'One in the world; only the capital (at 150% cost) or a Town of the matching trade can raise it.'],
  ['🏯 <b>National Wonders</b>', 'Once per empire, each in a Town of its trade.']
])}
<p>A Town raising a Great Wonder builds it with its Production instead of turning it into Gold, one great work at a time.</p>
`));

const vRows = ['domination', 'science', 'culture', 'religion', 'score'].map(k => [V[k].icon + ' <b>' + esc(V[k].name) + '</b>', esc(k === 'science' ? 'In the Pixel Age, build a Spaceport and complete the three space projects: an Earth Satellite, the Moon Landing and a Colony Ship. The ship lands 15 turns after launch; if its launch city falls on the way, it is lost and must be built again.' : k === 'domination' ? 'Hold every original capital to win at once, or hold half of them (at least 4, your own counts) for 10 turns in a row; on Epic speed both countdowns are longer, on Quick the Conquest hold is shorter. Everyone sees the countdown, and retaking a single capital stops it.' : k === 'culture' ? 'From the Glowbit Age, your foreign visitors outnumber the domestic tourists of every rival.' : V[k].desc)]);
body.push(chapter(12, 'Winning', 'Five roads to the Hall of Fame.', `
${table(['Victory', 'How'], vRows)}
<p>Every game ends in the <b>Hall of Fame</b>, win or lose, with your score, your people and the turn. The <b>Rankings</b> panel (🏆) shows how close every known empire is to each victory.</p>
${tip('The computer leaders each lean towards one victory (see Chapter 13). Watch the leaning of a rival and you will know what to fear.')}
${tip('A Conquest leader goes on campaign from the Easel Age: it marches on one rival capital and will not sign a peace until it takes it or starts losing. A Colony Ship in flight makes its launcher every conqueror\'s first target, so garrison mission control.', 'THE RACE TO THE END')}
`));

// ---------- the peoples of the world ----------
function uniqueItem(kind, u) {
  if (!u) return '';
  const lab = { uu: 'Unique unit', ub: 'Unique building', ui: 'Unique improvement', ut: 'Unique Town' }[kind];
  const pic = kind === 'uu' ? art('units', u.id) : kind === 'ub' ? (art('buildings', u.id) || art('buildings', u.replaces)) : null;
  const rep = u.replaces ? ' <span class="rep">replaces ' + esc((AU.UNITS[u.replaces] || AU.BUILDINGS[u.replaces] || (AU.IMPROVEMENTS || {})[u.replaces] || { name: u.replaces }).name) + '</span>' : '';
  return `<div class="uniq">${pic ? `<img class="upic" src="${pic}" data-w="140" data-png="1">` : `<span class="uicon">${esc(u.icon || '★')}</span>`}<div><small>${lab}</small><b>${esc(u.name)}</b>${rep}<p>${esc(u.descV2 || u.desc || '')}</p></div></div>`;
}
const peoples = civs.map(c => {
  const leaders = c.leaders.map(l => { const L = AU.LEADER_BY_ID[l.id]; const pic = art('leaders', l.id); return `<div class="leader">${pic ? `<img class="lpic" src="${pic}" data-w="230">` : ''}<div><b>${esc(L.name)}</b> <small>${esc(L.title || '')}</small><p><i>${esc(L.ability.name)}.</i> ${esc(G.abilityDesc(L.ability))}</p><small class="lean">Leans to: ${esc(AU.leaningText ? AU.leaningText(L) : '')}</small></div></div>`; }).join('');
  const emb = art('civs', c.id);
  return `<article class="people"><header>${emb ? `<img class="emb" src="${emb}" data-w="180" data-png="1">` : ''}<div><h3>${esc(c.name)}</h3><small>${esc(c.adj || '')} · ${esc(c.difficulty || '')} to play</small></div></header>
  <div class="ability"><b>${esc(c.ability.name)}.</b> ${esc(G.abilityDesc(c.ability))}</div>
  <div class="uniqs">${['uu', 'ub', 'ui', 'ut'].map(k => uniqueItem(k, c[k])).join('')}</div>
  <div class="leaders">${leaders}</div>
  <footer>${c.bias && c.bias.length ? '<b>Favoured land:</b> ' + esc(c.bias.join(', ')) + '. ' : ''}${c.cities ? '<b>Settlements:</b> ' + esc(c.cities.slice(0, 8).join(', ')) + '…' : ''}</footer></article>`;
}).join('');
body.push(chapter(13, 'The Peoples of the World', 'Forty peoples, ninety-six rulers, no two alike.', `
<p>Every people has an ability, unique units, buildings, improvements or Towns, and two to four leaders. A leader adds an ability of their own and leans towards one victory. Every ability has at least one effect no other ability has.</p>
${tip('Read the leader\'s leaning when a rival appears: a Star Voyage leader will out-study you, a Conquest leader will come for your capital.', 'KNOW YOUR RIVALS')}
${peoples}`));

// ---------- quick reference ----------
const yields = [['🌾', 'Food', 'Growth'], ['⚙️', 'Production', 'Buildings and units (Towns: Gold)'], ['💰', 'Gold', 'Buying, upgrades, upkeep'], ['🔬 📚', 'Knowledge', 'Studying Sparks, Synthesis'], ['🎭', 'Heritage', 'Influence, Reforms, Renown'], ['🕊️', 'Devotion', 'Revelation, Offerings, Festivals, Pilgrims'], ['🎯', 'Influence', 'Claims, Bonds'], ['🎖️', 'Command', 'Orders each turn'], ['😊', 'Happiness', 'Mood: yields and growth'], ['🧳', 'Fame', 'Visitors (Renown victory)'], ['🏭', 'Smoke', 'Unhappiness, heavy land, climate']];
const glossary = [['Age', 'One of seven eras, from Pebble to Pixel.'], ['Bandleader', 'Leads a Warband of up to three fighters.'], ['Bond', 'A lasting pact with a free city, paid in Influence.'], ['Claim', 'A tile a settlement takes as it grows.'], ['Command', 'Orders you can give in a turn.'], ['Holy City', 'Where a faith was revealed; its holder collects the tithe.'], ['Inchibils', 'The wild people of the map.'], ['Insight', 'A permanent decision between two doors.'], ['Lane', 'A way of life in the Mastery Web; master it for a reward.'], ['Reform', 'Reopen one Insight, once per age.'], ['Spark', 'A discovery that lights when your people do something.'], ['Spirit', 'The spirit of a settlement\'s land; pleased or angry.'], ['State faith', 'The faith your empire holds.'], ['Town', 'A settlement without a queue; its Production becomes Gold.'], ['Turning Point', 'The door into the next age.'], ['Warband', 'Up to three fighters that attack as one.']];
body.push(`<section class="chapter refcard" data-toc="Quick Reference Card"><div class="opener"><div class="cnum"><small>CARD</small>★</div><div><h2>Quick Reference Card</h2><p class="kicker">Cut along the dotted line and keep it by the keyboard.</p></div></div>
<div class="cut">${table(['', 'Yield', 'Used for'], yields.map(r => [r[0], '<b>' + r[1] + '</b>', r[2]]), 'small')}
${table(['Key', 'Action'], [['Enter', 'End turn'], ['N', 'Next unit'], ['F', 'Fortify'], ['Space', 'Skip unit'], ['Right click', 'Move or attack'], ['Wheel', 'Zoom']], 'small narrow')}</div>
<h3>Glossary</h3><dl class="gloss">${glossary.map(g => `<dt>${g[0]}</dt><dd>${g[1]}</dd>`).join('')}</dl>${chapters.push({ num: '★', title: 'Quick Reference Card' }) && ''}</section>`);

// ---------- covers ----------
const cover = `<section class="cover"><img class="coverart" src="${pic(path.join(WEB, 'assets', 'keyart', 'title_portrait.jpg'))}" data-w="1100">
<div class="coverband"><img class="logo" src="${pic(path.join(WEB, 'assets', 'logo', 'tiny_empires.png'))}" data-png="1" data-w="700"><div class="edition">DIVERGENCE EDITION</div></div>
<div class="coverfoot"><div class="manual">INSTRUCTION MANUAL</div><div class="plat">Web · Android · Windows &nbsp;·&nbsp; 1 player &nbsp;·&nbsp; 9 languages</div></div></section>`;
const inside = `<section class="inside"><h2>A word before you play</h2>
<p>Thank you for choosing <b>Tiny Empires</b>. Please read this manual before you begin, so that your people may prosper and your enemies may wonder how you did it.</p>
<div class="warnbox"><b>⚠ HEALTH WARNING</b><p>This game contains the words "one more turn". Players have reported looking up from the screen to find that the sun has risen, the coffee has gone cold and the Pebble Age has become the Pixel Age. Take a break every ten turns. Stretch. Drink water. Your empire will wait for you: it saves itself every turn.</p></div>
<h3>Contents</h3><div id="toc">@@TOC@@</div></section>`;
const back = `<section class="back"><img class="backart" src="${pic(path.join(WEB, 'assets', 'keyart', 'title_landscape.jpg'))}" data-w="1100">
<div class="backtext"><h2>From a campfire to the stars.</h2><p>Lead one of forty peoples through seven ages. Nothing to research: your empire learns by what it does. Master the ways of life, please the spirits of the land, found a faith, bargain with free cities and outlast rulers who remember every slight.</p>
<ul><li>96 historical leaders, every one with abilities of their own</li><li>362 Sparks, 42 Insights, 5 lanes of mastery in every age</li><li>Rivers, roads and bridges that shape your wars</li><li>Spirits, Revelations and faiths born from your own land</li><li>Five ways to win, one Hall of Fame</li></ul>
<div class="rating"><b>ONE</b><small>MORE TURN</small></div></div></section>`;

const CSS = `
@page { size: A5; margin: 15mm 12mm 16mm 12mm; background: #f1e6cb;
  @top-left { content: "TINY EMPIRES"; font: 800 6.5pt 'Baloo 2'; letter-spacing: .3em; color: #9c8a66; }
  @top-right { content: "INSTRUCTION MANUAL"; font: 800 6.5pt 'Baloo 2'; letter-spacing: .3em; color: #9c8a66; }
  @bottom-center { content: "— " counter(page) " —"; font: 800 9pt 'Baloo 2'; color: #a8321f; } }
@page full { margin: 0; @top-left { content: none } @top-right { content: none } @bottom-center { content: none } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 8.9pt/1.4 'Bitstream Charter', 'DejaVu Serif', serif; color: #231c14; hyphens: auto; text-align: justify; }
h2, h3, .cnum, th, .tab, small, .edition, .manual { font-family: 'Baloo 2', sans-serif; }
h3 { font-size: 11pt; margin: 3.5mm 0 1.2mm; color: #231c14; border-bottom: 1.2pt solid #a8321f; padding-bottom: .3mm; break-after: avoid; text-transform: uppercase; letter-spacing: .06em; }
p { margin: 0 0 2mm; } ul, ol { margin: 0 0 2mm; padding-left: 5mm; } li { margin-bottom: .8mm; }
.lead { font-size: 10pt; font-style: italic; }
.chapter { break-before: page; }
.opener { display: flex; align-items: center; gap: 4mm; background: #231c14; color: #f1e6cb; margin: 0 0 4mm; padding: 3mm 4mm; border-radius: 1.5mm; box-shadow: 1.6mm 1.6mm 0 #a8321f; }
.cnum { font-size: 26pt; font-weight: 800; line-height: .9; text-align: center; min-width: 14mm; color: #e7b43f; }
.cnum small { display: block; font-size: 5.5pt; letter-spacing: .25em; color: #f1e6cb; }
.opener h2 { margin: 0; font-size: 17pt; line-height: 1.05; }
.kicker { margin: .6mm 0 0; font-style: italic; font-size: 8.5pt; color: #d9c9a3; text-align: left; }
.hint { position: relative; border: 1.3pt solid #231c14; background: #fbf5e3; box-shadow: 1.2mm 1.2mm 0 #231c14; padding: 3.2mm 3mm 2mm; margin: 4mm 1.5mm 4mm 0; font-size: 8.3pt; break-inside: avoid; }
.hint .tab { position: absolute; top: -2.2mm; left: 3mm; background: #1f4f7a; color: #fff; font-size: 6.2pt; letter-spacing: .15em; padding: .2mm 2mm; }
.hint.warn .tab { background: #a8321f; }
.tbl { width: 100%; border-collapse: collapse; margin: 1.5mm 0 3mm; font-size: 7.9pt; text-align: left; break-inside: avoid; }
.tbl th { background: #231c14; color: #f1e6cb; font-size: 7pt; letter-spacing: .08em; padding: .8mm 1.5mm; text-transform: uppercase; }
.tbl td { border-bottom: .5pt solid #b8a47c; padding: .9mm 1.5mm; vertical-align: top; }
.tbl tr:nth-child(even) td { background: #eadcb8; }
.tbl.small { font-size: 7.1pt; } .tbl.narrow { width: 70%; }
figure { margin: 2mm 0 4mm; break-inside: avoid; }
figure.half { float: right; width: 44%; margin: 0 0 2mm 3mm; }
.shotwrap { position: relative; border: 1.3pt solid #231c14; box-shadow: 1.2mm 1.2mm 0 #231c14; background: #231c14; line-height: 0; }
.shot { width: 100%; display: block; }
.mark { position: absolute; transform: translate(-50%, -50%); width: 4.2mm; height: 4.2mm; border-radius: 50%; background: #a8321f; color: #fff; border: .8pt solid #fff; font: 800 6.5pt/4mm 'Baloo 2'; text-align: center; font-style: normal; }
figcaption { font-size: 7.3pt; font-style: italic; margin-top: 1.8mm; text-align: left; } figcaption b { font-style: normal; color: #a8321f; }
.legend { columns: 2; column-gap: 5mm; font-size: 7.2pt; margin-top: 1.5mm; padding-left: 5mm; text-align: left; } .legend li::marker { font-weight: 800; color: #a8321f; }
.steps li { margin-bottom: 1.8mm; } .check { list-style: '✔ '; }
/* peoples */
.people { break-before: page; }
.people header { display: flex; align-items: center; gap: 3mm; border-bottom: 2pt solid #231c14; padding-bottom: 1.5mm; margin-bottom: 2mm; }
.emb { width: 20mm; height: 20mm; object-fit: contain; }
.people h3 { border: 0; margin: 0; font-size: 16pt; letter-spacing: .02em; padding: 0; }
.people header small { color: #7a6a4c; font-size: 7pt; text-transform: uppercase; letter-spacing: .12em; }
.ability { background: #231c14; color: #f1e6cb; padding: 2.5mm 3mm; margin-bottom: 3mm; font-size: 8.8pt; border-radius: 1mm; } .ability b { color: #e7b43f; }
.uniqs { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 3mm; margin-bottom: 3.5mm; }
.uniq { display: flex; gap: 2mm; font-size: 7.8pt; align-items: flex-start; text-align: left; } .uniq p { margin: .3mm 0 0; }
.uniq small { display: block; font-size: 5.8pt; letter-spacing: .15em; text-transform: uppercase; color: #a8321f; }
.upic { width: 14mm; height: 14mm; object-fit: contain; border: .8pt solid #231c14; background: #e6d7b0; border-radius: 1mm; flex: none; }
.uicon { width: 14mm; height: 14mm; flex: none; display: grid; place-items: center; font-size: 13pt; border: .8pt solid #231c14; background: #e6d7b0; border-radius: 1mm; }
.rep { font-size: 6.4pt; color: #7a6a4c; font-style: italic; }
.leader { display: flex; gap: 3mm; margin-bottom: 3mm; break-inside: avoid; font-size: 8.5pt; } .leader > div > b { font-family: 'Baloo 2'; font-size: 10pt; }
.leader p { margin: .4mm 0; } .leader small { color: #7a6a4c; font-size: 6.6pt; } .leader .lean { font-style: italic; }
.lpic { width: 20mm; height: 26.5mm; object-fit: cover; object-position: top; border: 1pt solid #231c14; box-shadow: .8mm .8mm 0 #231c14; flex: none; filter: sepia(.15); }

.gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 3mm; }
.gcard { display: grid; grid-template-columns: 12mm 1fr; column-gap: 2mm; font-size: 7.2pt; text-align: left; break-inside: avoid; }
.gicon { grid-row: span 2; width: 12mm; height: 12mm; display: grid; place-items: center; font-size: 14pt; border: .8pt solid #231c14; background: #e6d7b0; border-radius: 1mm; }
.gcard i { font-weight: 400; font-size: 7pt; color: #7a6a4c; }
.gcard img { grid-row: span 2; width: 12mm; height: 12mm; object-fit: contain; border: .8pt solid #231c14; background: #e6d7b0; border-radius: 1mm; }
.gcard b { font-family: 'Baloo 2'; font-size: 8pt; } .gcard p { margin: 0; }
.people { font-size: 9pt; } .people footer { border-top: 1pt solid #231c14; margin-top: 3mm; padding-top: 1.5mm; font-size: 7.4pt; color: #5a4c34; text-align: left; } .people footer b { font-family: 'Baloo 2'; color: #231c14; }
/* covers */
.cover, .back, .inside { page: full; }
.cover { height: 210mm; position: relative; overflow: hidden; background: #111; break-after: page; }
.coverart { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.coverband { position: absolute; top: 9mm; left: 0; right: 0; text-align: center; }
.logo { width: 108mm; filter: drop-shadow(0 1.5mm 1.5mm rgba(0,0,0,.6)); }
.edition { display: inline-block; margin-top: 1mm; background: #a8321f; color: #fff; font-weight: 800; letter-spacing: .35em; font-size: 8pt; padding: .8mm 4mm; border: 1pt solid #fff; }
.coverfoot { position: absolute; bottom: 0; left: 0; right: 0; background: #231c14; color: #f1e6cb; text-align: center; padding: 3mm 0 3.5mm; border-top: 1.6mm solid #e7b43f; }
.manual { font-size: 17pt; font-weight: 800; letter-spacing: .3em; }
.plat { font: 7pt 'Baloo 2'; letter-spacing: .2em; color: #d9c9a3; }
.inside { height: 210mm; padding: 16mm 14mm; background: #f1e6cb; break-after: page; }
.inside h2 { font-size: 16pt; margin: 0 0 3mm; }
.warnbox { border: 1.5pt solid #231c14; padding: 2.5mm 3mm; margin: 3mm 0 5mm; font-size: 7.8pt; } .warnbox b { font-family: 'Baloo 2'; letter-spacing: .15em; color: #a8321f; }
#toc .row { display: flex; align-items: baseline; gap: 1.5mm; font-size: 9pt; margin-bottom: 1.2mm; }
#toc .n { font: 800 9pt 'Baloo 2'; color: #a8321f; min-width: 6mm; } #toc .dots { flex: 1; border-bottom: 1pt dotted #9c8a66; } #toc .pg { font: 800 9pt 'Baloo 2'; }
.back { height: 210mm; position: relative; background: #231c14; color: #f1e6cb; break-before: page; }
.backart { width: 100%; height: 88mm; object-fit: cover; display: block; border-bottom: 1.6mm solid #e7b43f; }
.backtext { padding: 6mm 12mm; } .backtext h2 { font-size: 17pt; margin: 0 0 2mm; color: #e7b43f; } .backtext li { margin-bottom: 1mm; }
.rating { position: absolute; right: 10mm; bottom: 10mm; width: 22mm; border: 1.5pt solid #f1e6cb; text-align: center; padding: 1.5mm 0; font-family: 'Baloo 2'; }
.rating b { display: block; font-size: 14pt; line-height: 1; } .rating small { font-size: 5.5pt; letter-spacing: .15em; }
.refcard .cut { border: 1.2pt dashed #231c14; padding: 2.5mm; margin-bottom: 3mm; }
.gloss { display: grid; grid-template-columns: auto 1fr; gap: .8mm 3mm; font-size: 7.8pt; margin: 0; } .gloss dt { font: 800 7.8pt 'Baloo 2'; } .gloss dd { margin: 0; }
`;
function html(toc) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="${url(path.join(WEB, 'fonts', 'fonts.css'))}"><style>${CSS}</style></head><body>
${cover}${inside.replace('@@TOC@@', toc)}${body.join('\n')}${back}
<script>
// shrink every picture to print size (keeps the file small); crop screenshots to the panel
window.__ready = (async () => {
  const imgs = [...document.images]; await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  for (const i of imgs) { if (!i.naturalWidth) continue; const c = (i.dataset.crop || '').split(',').map(Number); const sx = c.length === 4 ? c[0] : 0, sy = c.length === 4 ? c[1] : 0, sw = c.length === 4 ? c[2] : i.naturalWidth, sh = c.length === 4 ? c[3] : i.naturalHeight;
    const w = Math.min(+i.dataset.w || 600, sw), h = Math.round(sh * w / sw), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'); ctx.drawImage(i, sx, sy, sw, sh, 0, 0, w, h);
    const png = !!i.dataset.png; await new Promise(r => { i.onload = r; i.src = cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.82); }); }
  await document.fonts.ready; return true; })();
</script></body></html>`;
}
function tocHtml(pages) { return chapters.map(c => `<div class="row"><span class="n">${c.num}</span><span>${esc(c.title)}</span><span class="dots"></span><span class="pg">${pages[c.title] || ''}</span></div>`).join(''); }

(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  const file = path.join(OUT, 'manual.html'), pdf = path.join(OUT, 'Tiny-Empires-Manual.pdf');
  async function render(toc) { fs.writeFileSync(file, html(toc)); await page.goto(url(file)); await page.evaluate(() => window.__ready); await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true }); }
  await render(tocHtml({}));
  // pass 2: find the page of every chapter title and write the contents
  let pages = {};
  try {
    const py = `import json,sys\ntry:\n  import pypdfium2 as P\n  d=P.PdfDocument(sys.argv[1]);texts=[d[i].get_textpage().get_text_range() for i in range(len(d))]\nexcept ImportError:\n  from pypdf import PdfReader\n  texts=[p.extract_text() or '' for p in PdfReader(sys.argv[1]).pages]\nt=json.loads(sys.argv[2]);out={}\nfor i,x in enumerate(texts):\n  x=''.join(x.split())\n  for k in t:\n    if k not in out and ('CHAPTER' in x or 'CARD' in x) and ''.join(k.split()) in x and i>1: out[k]=i+1\nprint(json.dumps(out))`;
    pages = JSON.parse(cp.execFileSync('python3', ['-c', py, pdf, JSON.stringify(chapters.map(c => c.title))]).toString());
  } catch (e) { console.warn('contents without page numbers:', e.message.split('\n')[0]); }
  await render(tocHtml(pages));
  await browser.close();
  console.log('manual:', pdf, (fs.statSync(pdf).size / 1e6).toFixed(1) + ' MB', Object.keys(pages).length + '/' + chapters.length + ' chapters located');
})();

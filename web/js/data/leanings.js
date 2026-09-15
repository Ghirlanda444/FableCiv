// Victory types with their own names, and the victory each leader leans towards (shown on the pick screen, used by the AI).
(function (AU) {
  AU.VICTORIES = {
    domination: { name: 'Conquest', icon: '⚔️', desc: 'Hold every rival\'s original capital.' },
    science: { name: 'Star Voyage', icon: '🚀', desc: 'Research Space Travel, build a Spaceport and complete the three space projects in your capital.' },
    culture: { name: 'Renown', icon: '🎭', desc: 'From the Modern era on, your foreign visitors outnumber the domestic tourists of every rival.' },
    religion: { name: 'Devotion', icon: '🕊️', desc: 'From the Industrial era on, your religion is the majority in at least half of every empire\'s settlements and in 60% of all settlements.' },
    score: { name: 'Legacy', icon: '🏆', desc: 'The highest score when the turn limit is reached.' }
  };
  // Explicit leanings for well-known leaders; everyone else is read from their personality traits.
  AU.LEANINGS = {
    pericles: 'culture', meiji: 'science', augustus: 'culture', alexander: 'domination', shaka: 'domination', genghis: 'domination', kublai: 'domination',
    darius: 'score', ramses: 'culture', harun: 'science', louis: 'culture', pakal: 'science', frederick: 'science', peter: 'science', catherine: 'culture', philip: 'religion',
    hannibal: 'domination', dido: 'score', ashoka: 'religion', wu: 'culture', qin: 'domination', taizong: 'science', franklin: 'science', gitarja: 'score', vercingetorix: 'domination',
    cornstalk: 'score', mansa: 'score', suleiman: 'domination', sejong: 'science', menelik: 'religion', theodora: 'religion', justinian: 'religion', trung: 'domination', cleopatra: 'culture'
  };
  AU.leaningOf = function (leader) {
    if (!leader) return 'score';
    if (AU.LEANINGS[leader.id]) return AU.LEANINGS[leader.id];
    var t = leader.ai || {}, best = 'score', bv = 0.66;
    if ((t.aggression || 0) > bv) { best = 'domination'; bv = t.aggression; }
    if ((t.science || 0) > bv) { best = 'science'; bv = t.science; }
    if ((t.culture || 0) > bv) { best = 'culture'; bv = t.culture; }
    if ((t.religion || 0) > bv) { best = 'religion'; bv = t.religion; }
    return best;
  };
  AU.leaningText = function (leader) { var v = AU.VICTORIES[AU.leaningOf(leader)]; return v.icon + ' ' + v.name; };
})(globalThis.AU = globalThis.AU || {});

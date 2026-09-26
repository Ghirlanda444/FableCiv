// Lane Mastery: the 32 foundation Sparks of an age sit in five lanes (ways of life). Light every Spark of a lane in its age and the
// empire keeps a permanent reward. Each age has its own set, so the same lane means something different in every age.
// Effects use the empire effect keys the rules already read (growthMult, cityDefense, influencePerTurn ...).
(function (AU) {
  AU.V2 = AU.V2 || {};
  var LANES = {
    order: ['Sustenance', 'Shelter', 'Kinship', 'Craft', 'Wayfinding'],
    icon: { Sustenance: '🌾', Shelter: '🏠', Kinship: '🤝', Craft: '🔨', Wayfinding: '🧭' },
    // one reward per age, index = era
    rewards: {
      Sustenance: [
        { name: 'Full Bellies', joke: 'Nobody Is Hungry (For Now)', fx: { growthMult: 1.1 } },
        { name: 'Granary Rows', joke: 'We Keep The Grain In A Line Now', fx: { housingBonus: 2 } },
        { name: 'Field Law', joke: 'That Field Is Ours, It Says So', fx: { freeClaims: 1 } },
        { name: 'Kitchen Gardens', joke: 'Herbs Right Outside The Door', fx: { growthMult: 1.1 } },
        { name: 'Canned Everything', joke: 'It Keeps. Somehow It Keeps.', fx: { happinessBonus: 1 } },
        { name: 'Fridge Age', joke: 'The Cold Box Changed Dinner', fx: { cityGrowthMult: 1.15 } },
        { name: 'Vertical Farms', joke: 'Lettuce, But Stacked', fx: { growthMult: 1.15 } }
      ],
      Shelter: [
        { name: 'Stone Doors', joke: 'A Door That Is Also A Rock', fx: { cityDefense: 2 } },
        { name: 'Tile Roofs', joke: 'Fire-Proof, Rain-Proof, Cat-Proof', fx: { housingBonus: 2 } },
        { name: 'Thick Walls', joke: 'Thicker Than Last Time', fx: { homeDefenseBonus: 3 } },
        { name: 'Master Masons', joke: 'They Measure Twice Now', fx: { buildingCostMult: 0.9 } },
        { name: 'Chimneys That Work', joke: 'The Smoke Goes Up, Not In', fx: { smokeSink: 1 } },
        { name: 'Apartment Blocks', joke: 'Everyone Lives On Top Of Everyone', fx: { housingBonus: 4 } },
        { name: 'Printed Houses', joke: 'The House Came Out Of A Nozzle', fx: { buildingCostMult: 0.85 } }
      ],
      Kinship: [
        { name: 'Everyone Knows Everyone', joke: 'No Secrets In This Valley', fx: { influencePerTurn: 1 } },
        { name: 'Festival Days', joke: 'A Day Off, On Purpose', fx: { happinessBonus: 1 } },
        { name: 'Council Fires', joke: 'We Sit In A Circle And Decide', fx: { insightInfluence: 5 } },
        { name: 'Salon Culture', joke: 'Arguing, But With Tea', fx: { reformsPerAge: 1 } },
        { name: 'Telegraph Gossip', joke: 'The Rumour Beat The Train', fx: { influencePerTurn: 2 } },
        { name: 'Everyone On The Radio', joke: 'One Voice, Every Kitchen', fx: { happinessBonus: 2 } },
        { name: 'Group Chat', joke: 'Nobody Leaves The Group Chat', fx: { tourismMult: 1.15 } }
      ],
      Craft: [
        { name: 'Sharper Everything', joke: 'We Sharpened The Sharpeners', fx: { pctUnitProduction: 10 } },
        { name: 'Workshop Capital', joke: 'The Loud Street Makes The Good Stuff', fx: { capitalYields: { production: 2 } } },
        { name: 'Standard Parts', joke: 'Every Peg Fits Every Hole', fx: { unitCostMult: 0.9 } },
        { name: 'Guild Secrets', joke: 'Ask The Guild. The Guild Says No.', fx: { wonderCostMult: 0.9 } },
        { name: 'Assembly Rows', joke: 'Each Person Does One Thing, Forever', fx: { yieldMult: { production: 1.05 } } },
        { name: 'Lab Coats', joke: 'The Coat Makes It Science', fx: { synthCostMult: 0.85 } },
        { name: 'Robot Arms', joke: 'The Arm Does Not Get Tired', fx: { yieldMult: { production: 1.1 } } }
      ],
      Wayfinding: [
        { name: 'Lookout Rocks', joke: 'Somebody Sits On The Tall Rock', fx: { settlementSight: 1 } },
        { name: 'Marked Roads', joke: 'The Stones Point The Way', fx: { caravanRange: 3 } },
        { name: 'Star Charts', joke: 'The Sky Is A Map If You Squint', fx: { navalMoves: 1 } },
        { name: 'Post Riders', joke: 'The Letter Arrives Before The Horse', fx: { farOrderDiscount: 1 } },
        { name: 'Rail Timetables', joke: 'Late Is Now A Number', fx: { caravanRange: 3, goldPerSettlement: 1 } },
        { name: 'Radar Towers', joke: 'We See Things Before They See Us', fx: { reconSight: 1, settlementSight: 1 } },
        { name: 'Satellites', joke: 'A Rock We Threw That Never Came Down', fx: { commandBonus: 1 } }
      ]
    }
  };
  LANES.reward = function (era, cat) { var r = LANES.rewards[cat]; return r ? r[Math.min(era, r.length - 1)] : null; };
  AU.V2.LANES = LANES;
})(globalThis.AU = globalThis.AU || {});

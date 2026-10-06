// What people say on Yantis when nobody is shooting yet, and what they shout when someone is (convoy/banter.js).
// Conversations: two speakers, 0 and 1, taking turns as written. World flavour only: the island, the occupation, the
// Resistance, home. Militia are the rebels; soldiers are the Invader's conscripts and regulars, far from home.

/** [speaker, line] pairs. */
export const MILITIA = [
  [
    [0, 'I grew up here, you know. Around Agios Mynerios. My dad had an olive farm north of this forest.'],
    [1, 'What happened?'],
    [0, 'He refused to sell olives to the occupier, so they shot him and burned our farm. I fled and joined the Resistance that night.'],
  ],
  [
    [0, 'Do you still hear from your sister in Kastro?'],
    [1, 'A letter, once. Folded inside a loaf of bread. She says the bakers are with us.'],
    [0, 'Then I will never complain about bread again.'],
  ],
  [
    [0, 'My grandmother says the Venetians built that tower. Then the Turks took it. Then the Germans.'],
    [1, 'And now them.'],
    [0, 'She says towers outlast everyone who sits in them.'],
  ],
  [
    [0, 'What will you do, after?'],
    [1, 'Fish. Sleep until noon. Marry Eleni from the bakery, if she will have a man who smells of gun oil.'],
    [0, 'She will have you. She cannot stand the smell of fish either.'],
  ],
  [
    [0, 'Was it you who left the radio on the Athens station all night?'],
    [1, 'The football was on. Panathinaikos won.'],
    [0, 'They could have triangulated us for a football match.'],
    [1, 'Worth it.'],
  ],
  [
    [0, 'Before all this I taught mathematics at the school in Pelekas.'],
    [1, 'Then tell me: how many of them, how many of us?'],
    [0, 'Never do the sums out loud. It is bad for morale.'],
  ],
  [
    [0, 'They put up posters in Myrtia. Ten thousand drachmas for the names of Resistance fighters.'],
    [1, 'Only ten thousand? I am insulted.'],
    [0, 'That was for all of us together.'],
  ],
  [
    [0, 'Smell that? Thyme. The whole hillside.'],
    [1, 'All I smell is your boots.'],
    [0, 'Philistine.'],
  ],
  [
    [0, 'Father Stavros hid six of us in the bell tower at Vrisi, the week of the raids.'],
    [1, 'With the bells?'],
    [0, 'He rang them for vespers every evening. I am still deaf in one ear.'],
  ],
  [
    [0, 'My cousin works the docks at Lithia. He says their ships come in heavier than they go out.'],
    [1, 'Heavier with what?'],
    [0, 'He does not ask. He just counts. One day the count will matter.'],
  ],
  [
    [0, 'The old men in the kafeneio still play tavli as if nothing happened.'],
    [1, 'Old Manolis passes notes under the board. Who checks a backgammon board?'],
    [0, 'Nobody. That is why he wins so often.'],
  ],
  [
    [0, 'They took the church bells from Agia Marina. Melted them for shell casings.'],
    [1, 'So now the casings ring when they fall.'],
    [0, 'Then let them ring for every one of them we stop.'],
  ],
  [
    [0, 'When I was small we came up here for the panigyri. Lamb on the spit, dancing until morning.'],
    [1, 'We will dance here again.'],
    [0, 'You dance like a goat with a broken leg.'],
    [1, 'A free goat.'],
  ],
  [
    [0, 'My mother makes me promise, every time: come home with all your fingers.'],
    [1, 'And?'],
    [0, 'So far I keep the promise. She never said anything about toes.'],
  ],
  [
    [0, 'Do you think they believe in what they are doing here?'],
    [1, 'Some do. Most of them are farm boys like us, sent too far from their farms.'],
    [0, 'That does not make the bullet any softer.'],
    [1, 'No. But I try to remember it.'],
  ],
  [
    [0, 'Oros camp had meat last night. Real meat.'],
    [1, 'Whose goat was it?'],
    [0, 'It was a donation. The goat did not consent, but the farmer did.'],
  ],
  [
    [0, 'Quiet. Hear that?'],
    [1, 'Cicadas.'],
    [0, 'Good. When the cicadas stop, something is coming.'],
  ],
  [
    [0, 'I counted the stars last night on watch. Gave up at four hundred.'],
    [1, 'You were supposed to be counting trucks.'],
    [0, 'There were no trucks. There were a great many stars.'],
  ],
];

export const SOLDIERS = [
  [
    [0, 'Three more months and I rotate home.'],
    [1, 'They said that last year.'],
    [0, 'This time I have it in writing.'],
    [1, 'So did I.'],
  ],
  [
    [0, 'The locals smile at you in the market. Then the tyres are slashed by morning.'],
    [1, 'Stop going to the market.'],
    [0, 'And eat what? The rations are worse than the slashed tyres.'],
  ],
  [
    [0, 'You ever wonder what this island was like before us?'],
    [1, 'Quieter.'],
    [0, 'That is not what I meant.'],
    [1, 'I know what you meant. Keep your eyes on the treeline.'],
  ],
  [
    [0, 'Sergeant says the rebels are just a few farmers with hunting rifles.'],
    [1, 'Then who shot up the fuel convoy at Korfos?'],
    [0, 'Very angry farmers.'],
  ],
  [
    [0, 'My wife sent a photo of the baby. Look. Six months now.'],
    [1, 'He has your ears.'],
    [0, 'She. And she has my ears, yes. Poor thing.'],
  ],
  [
    [0, 'Why do we always drive this road? Same road, same time, every week.'],
    [1, 'Because Command likes schedules.'],
    [0, 'And who else likes schedules?'],
    [1, '...Drive faster.'],
  ],
  [
    [0, 'An old woman spat at my boots in Kastro today.'],
    [1, 'What did you do?'],
    [0, 'Nothing. I said sorry. I do not know why I said sorry.'],
  ],
  [
    [0, 'Hot again. Is it ever not hot here?'],
    [1, 'In winter it rains sideways. You will miss the heat.'],
    [0, 'I will miss nothing about this rock.'],
  ],
  [
    [0, 'Did you hear about Fort Orion? Someone painted RESISTANCE on the water tower. In letters two metres tall.'],
    [1, 'With the sentries right there?'],
    [0, 'The sentries were asleep. Now the sentries are on latrine duty until the end of time.'],
  ],
  [
    [0, 'The radio operator says there is chatter in the hills every night. Numbers. Just numbers.'],
    [1, 'Codes.'],
    [0, 'Or somebody counting goats.'],
    [1, 'Nobody counts goats in code.'],
  ],
  [
    [0, 'The olives here are good, you know. Better than at home.'],
    [1, 'Do not let the lieutenant hear you say that.'],
    [0, 'He eats them too. I have seen him.'],
  ],
  [
    [0, 'They make us confiscate fishing boats now. Fishing boats.'],
    [1, 'Smugglers use fishing boats.'],
    [0, 'Fishermen use fishing boats. Now the village eats nothing and hates us more.'],
    [1, 'Careful. That kind of talk gets written down.'],
  ],
  [
    [0, 'Corporal, what is the name of this place again?'],
    [1, 'Something with a saint in it. They all have a saint in it.'],
    [0, 'Not much of a saint, letting us in.'],
  ],
  [
    [0, 'My father fought in the last war. He never talked about it.'],
    [1, 'Now you understand why.'],
    [0, 'Not yet. I hope I never do.'],
  ],
  [
    [0, 'Cards tonight?'],
    [1, 'Not with you. You cheat.'],
    [0, 'I count. Counting is not cheating.'],
    [1, 'It is when you count the cards up your sleeve.'],
  ],
  [
    [0, 'I hate the cicadas. All day, all night. Like a radio between stations.'],
    [1, 'When they stop, worry.'],
    [0, 'Why?'],
    [1, 'Because something made them stop.'],
  ],
];

/** Combat barks, by what just happened. The player character stays silent; the rest of the squad and the army talk. */
export const BARKS = {
  militia: {
    kill: ['Got him!', 'One down!', 'He is down!', 'That is one for Agia Marina!', 'Stay down!', 'Next!'],
    hurt: ["I'm hit!", 'Agh, my arm!', 'Just a scratch, keep firing!', 'They winged me!', 'I am bleeding, but I am here!'],
    reload: ['Changing mags!', 'Reloading, cover me!', 'Magazine!', 'Loading!'],
    low: ['Last magazine!', 'I am nearly dry!', 'Running low on rounds!', 'Need ammunition!'],
    dry: ['I am out! No rounds!', 'Empty! Somebody throw me a magazine!'],
    mateDown: ['{name} is down!', 'No! {name}!', 'They got {name}!'],
    pinned: ['Keep your head down!', 'They have us pinned!', 'I cannot move!', 'Too much fire!'],
    contact: ['There, by the trucks!', 'Movement!', 'Here they come!', 'Eyes front!'],
  },
  army: {
    kill: ['Got one!', 'Rebel down!', 'Target neutralised!'],
    hurt: ['Medic!', "I'm hit! I'm hit!", 'Agh! My leg!', 'Hit! Still in it!'],
    mateDown: ['Man down!', 'Medic! Man down!', 'They got {name}!', '{name} is down!', 'Man down, man down!'],
    pinned: ['Heavy fire!', 'Get down!', 'They are everywhere!', 'Where is it coming from?!'],
    taunt: ['Give it up, farmers!', 'Come out, we know you are there!', 'You cannot win this!', 'Surrender and live!'],
  },
};

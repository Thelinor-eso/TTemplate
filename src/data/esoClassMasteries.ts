import { withBasePath } from '@/lib/staticAssets';

export const ESO_CLASS_MASTERY_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'Bastion of Light': "Light consecrates the ground on which you tread. Sacred Ground is now applied while you are in your own Nova and Spear Shards, and while Radial Sweep and Solar Barrage are active. While Sacred Ground is active, you heal for 1280 Health every 1 second. If you are at full Health after being healed from this effect while in combat, you also gain 2 Ultimate.",
  'Devout Guardian': 'Radiant is the shield that pushes back the dark. While Sacred Ground is active, you gain a damage shield for 6 seconds, up to once every 6 seconds. The shield absorbs up to 3200 damage and provides 300 Health, Magicka, and Stamina Recovery while active. If the shield breaks, you gain 10 Ultimate.',
  'Bright Harbinger': "Light's banner instills hope. You are its bearer. Upgrades rank 2 of Illuminate to also grant Bright Harbinger for the duration, which grants 300 Weapon and Spell Damage to allies and doubles for you.",
  "Judgment's Brand": 'Judgement follows in the wake of your radiance. When rank 2 of Burning Light deals damage, your Templar abilities gain 1600 damage done for 3.1 seconds. This bonus is halved against players.',
  'Steadfast Candescence': 'Your conviction is unwavering. Light gives no quarter. Sacred Ground now activates and refreshes itself while Bracing. Increases the amount of damage you can block by 20% while stationary.',

  'Conservation of Energy': 'Spellcasting is second nature to you. A skill honed by tireless study. Upgrades rank 2 of Blood Magic to work with all abilities with a cost, excluding cost per tick abilities, and restores 180 Magicka and 207 Stamina when it activates. This effect scales off your Max Magicka and Stamina.',
  'Font of Power': 'Within you is a wellspring of near unlimited power. Upgrades rank 2 of Exploitation to work with any Sorcerer ability and increases your Weapon and Spell Damage by 7% for 10 seconds. The Weapon and Spell Damage increases by 1% for every 1750 Max Magicka or Stamina you have, whichever is higher.',
  'Static Reverberation': 'The battlefield crackles with untapped potential. Make use of it. When you deal damage with a Sorcerer ability, you have a 20% chance to deal 315 Shock Damage, up to once every 0.1 seconds. The chance increases by 1% for every 1% missing Health the target has. The total chance is divided by 1 plus every permanent pet you have active.',
  'Calculated Defense': 'Success is a certainty when nothing is left to chance. While beginning to use a Sorcerer ability or an ability with a cast time, you gain a damage shield for 0.5 seconds that can absorb 5280 damage. This effect is based off your Max Health. If the shield does not break, you and nearby group members gain 6% Weapon and Spell Damage for 20 seconds.',
  'Sphere of Influence': "Magicka extends your reach, a benefit to those who fight beside you. Casting a damage shield on yourself or an ally grants an additional shield that absorbs up to 2400 damage for 4 seconds and 225 Health, Magicka, and Stamina Recovery for 12 seconds. The shield scales off the higher of your Max Health or Max Magicka, and is capped at 25% of the target's Max Health.",

  'Nocturnal Inspiration': 'The Night Mistress rewards those who strike without reservation. Upgrades rank 2 of Hemorrhage to have a chance to generate 2 Ultimate while in combat. This effect can occur once every 0.3 seconds and the chance is equal to your Weapon Critical chance.',
  'An Eye for Exploitation': "Every strike, every stab, is a step towards execution. Increases your Weapon and Spell Damage by up to 2000, based on your target's missing Health. Reduces your damage taken by up to 20%, based on your attacker's missing Health. Both effects are halved against targets with Battle Spirit.",
  'Above and Beyond': 'An assassin is only as good as their reputation. Increases your Critical Damage and Healing by 25%. This effect is reduced to 5% against targets with Battle Spirit. Increases your maximum Critical Damage and Healing by 30%.',
  "Cutthroat's Focus": "This duel will be their last. For you, it's just another dance. Activating a Nightblade ability while bracing causes you to dodge attacks for 0.3 seconds. Whenever you dodge an attack, your attacker's psyche suffers, increasing their damage taken by 5% for 5 seconds, increasing to 20 seconds against monsters.",
  'Share the Spoils': 'Secrets and coin are tools as sharp as the daggers you wield. Upgrades rank 2 of Transfer to grant group members 250 Magicka and Stamina, 2 Ultimate, and doubles the Ultimate you gain when it activates.',

  'Inexorable Descent': 'Be as the landslide. Let nothing stop you. Improves your Landslide passive to increase the potency of your damage done, healing done, and damage shield strength by 1% per stack.',
  'Booming Voice': 'Let your voice echo across the peaks. Activating rank 2 of The Storm Voice now also grants 5 Health, Magicka, and Stamina Recovery for every Ultimate spent for 10 seconds after a delay of 15 seconds.',
  'Wildfire Embers': 'Fire forged within can never be extinguished. Fan the flames. When your Dragonknight damage over time effects end, you apply a stack of Wildfire Embers to the target, dealing 1568 Flame Damage over 12 seconds. This effect stacks up to 12 times and increases in damage 25% per stack.',
  'Resolute Defense': 'You are as unyielding as a mountain. Each second you remain Bracing, you increase the amount of damage you block by 6%, up to 5 times. Blocking damage has a 20% chance to restore 500 Stamina. This effect can occur once every block cost.',
  'Lead from the Front': 'Let others be swept along in the wake of your flame. Activating rank 2 of The Storm Voice grants you and group members within 28 meters of you Major Berserk and Protection for 1 second per 15 Ultimate spent, increasing damage done and reducing damage taken by 10%.',

  "Tundra's Maw": 'Expose your enemies to unrelenting cold. Upgrades Chilled to also apply Major Brittle for 2.1 seconds, increasing their Critical Damage taken by 20%.',
  'Wild Adaptation': 'The battlefield is your grove. Tend to it. Gain 333 Weapon and Spell Damage for each status effect on your target, up to a maximum of 1665.',
  'Glacial Obstinance': "Tap into the wellspring of permafrost's resolve. Upgrades Bond with Nature to also activate when casting Winter's Embrace abilities and to grant 15% Weapon and Spell Damage for 10 seconds if you are at full Health after the heal.",
  "Green-Keeper's Hide": 'The twisting of seasons has tempered your will. Reduce your damage taken by 3% for every status effect active on your attacker, up to a maximum of 15%.',
  'Bountiful Harvest': "Share in the spoils of nature's abundance. Upgrades rank 2 of Nature's Gift to grant you and your group members Major Heroism for 3 seconds and an additional 125 Magicka and Stamina, up to once every 2 seconds.",

  'Nothing Wasted': 'As an abattoir of death, no remnants of life are wasted. Upgrades rank 2 of Corpse Consumption to also grant a stack of Nothing Wasted for 12 seconds, which increases your Max Health by 2% and Weapon and Spell Damage by 2% per stack, up to 10 times. Stacks decay two at a time instead of all at once.',
  'Malevolent Promise': "Death's knell is a familiar song. Share it with your enemies. Upgrades rank 2 of Corpse Consumption to mark the closest non-player enemy to you with death's touch for 6 seconds, allowing you to use a corpse consuming ability on them. Consuming or replacing this effect forcibly triggers rank 1 of Corpse Consumption's Ultimate generation and triggers rank 2 of Death Gleaning. This effect can occur once every 2 seconds.",
  'Cycle Unending': 'The cycle of life and death continues: you will live, others will die. Upgrades rank 2 of Reusable Parts to grant Cycle Unending for 25 seconds, increasing the potency of your damage done by 1% for every 1% Health you have more than your target. The damage bonus caps at 25%, or 10% against players.',
  'Pound of Flesh': "Knock upon death's door and demand your due. When you take damage you have a 10% chance to heal 1600 Health and restore 5% of your missing Stamina, up to once per second. This chance increases by 1% for every missing Health percent you have and the healing is based off your Max Health.",
  "Veil's Forfeit": "Call souls back from an early grave. Only you may grant them release. While you are in combat, directly healing a target below 66% Health relinquishes them from death's clutches and allows you to use a corpse consuming ability against them within 10 seconds, up to once every second. Extends the duration of Major Vulnerability you apply by 50%.",

  'Abyssal Emergence': 'Dive deep into the abyss where power is yours to claim. Activating an Arcanist Ultimate immediately generates maximum Crux and grants you 666 Weapon and Spell Damage for 15 seconds.',
  'Fate Realigned': 'Be the hand that guides the weave of fate. Upgrades rank 2 of Implacable Outcome to generate maximum Crux, up to once every 15 seconds. After this effect triggers you gain 300 Weapon and Spell Damage for 25 seconds.',
  'Unbound Potential': 'Surpass your limits in the fieldwork of battle. Upgrades rank 2 of Fated Fortune to also increase your damage done by 30%, halving against players, for the duration.',
  "Erudite's Rigor": 'Master the archaic and forge new runes of conflict. Upgrades Fatewoven Armor to inflict Minor Cowardice on your attacker while granting Major Vitality to you and your group for 4 seconds. You gain 1 Ultimate for every Crux you have. These effects can occur once every 2 seconds.',
  "Ink-Scribe's Verve": 'Illuminate body and mind with glimmering ink. While in combat, when you heal or overheal a total of 100000 Health, you generate a Crux and grant you and your group members Major Force for 10 seconds, increasing Critical Damage by 20%.',
};

export function getESOClassMasteryDescription(masteryName: string): string {
  return ESO_CLASS_MASTERY_DESCRIPTIONS[masteryName] ?? '';
}

export const ESO_CLASS_MASTERY_IMAGE_MAP: Readonly<Record<string, string>> = {
  'Bastion of Light': '/class-masteries/ability_templar_025.png',
  'Devout Guardian': '/class-masteries/ability_templar_018.png',
  'Bright Harbinger': '/class-masteries/ability_templar_005.png',
  "Judgment's Brand": '/class-masteries/ability_templar_004.png',
  'Steadfast Candescence': '/class-masteries/ability_templar_027.png',

  'Conservation of Energy': '/class-masteries/ability_sorcerer_044.png',
  'Font of Power': '/class-masteries/ability_sorcerer_063.png',
  'Static Reverberation': '/class-masteries/ability_sorcerer_023.png',
  'Calculated Defense': '/class-masteries/ability_sorcerer_037.png',
  'Sphere of Influence': '/class-masteries/ability_sorcerer_047.png',

  'Nocturnal Inspiration': '/class-masteries/passive_sorcerer_017.png',
  'An Eye for Exploitation': '/class-masteries/passive_weapon_026.png',
  'Above and Beyond': '/class-masteries/passive_armor_008.png',
  "Cutthroat's Focus": '/class-masteries/passive_sorcerer_025.png',
  'Share the Spoils': '/class-masteries/passive_sorcerer_002.png',

  'Inexorable Descent': '/class-masteries/ability_weapon_005_u49_new.png',
  'Booming Voice': '/class-masteries/ability_dragonknight_031_u49_new.png',
  'Wildfire Embers': '/class-masteries/ability_dragonknight_028_u49_new.png',
  'Resolute Defense': '/class-masteries/passive_dragonknight_015_u49_new.png',
  'Lead from the Front': '/class-masteries/passive_dragonknight_009_u49_new.png',

  "Tundra's Maw": '/class-masteries/passive_warden_001.png',
  'Wild Adaptation': '/class-masteries/passive_warden_005.png',
  'Glacial Obstinance': '/class-masteries/passive_warden_004.png',
  "Green-Keeper's Hide": '/class-masteries/passive_warden_012.png',
  'Bountiful Harvest': '/class-masteries/passive_warden_006.png',

  'Nothing Wasted': '/class-masteries/passive_necromancer_011.png',
  'Malevolent Promise': '/class-masteries/passive_armor_003.png',
  'Cycle Unending': '/class-masteries/passive_armor_001.png',
  'Pound of Flesh': '/class-masteries/passive_necromancer_010.png',
  "Veil's Forfeit": '/class-masteries/passive_necromancer_009.png',

  'Abyssal Emergence': '/class-masteries/passive_arcanist_09.png',
  'Fate Realigned': '/class-masteries/passive_arcanist_08.png',
  'Unbound Potential': '/class-masteries/passive_arcanist_03.png',
  "Erudite's Rigor": '/class-masteries/passive_arcanist_07.png',
  "Ink-Scribe's Verve": '/class-masteries/passive_arcanist_04.png',
};

export function getESOClassMasteryImage(masteryName: string): string | null {
  const imagePath = ESO_CLASS_MASTERY_IMAGE_MAP[masteryName];
  return imagePath ? withBasePath(imagePath) : null;
}

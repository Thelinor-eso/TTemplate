import { ClassName, ClassSkillLine } from '@/features/template/raidTemplate';

export const ESO_CLASS_SKILL_LINES: Readonly<Record<ClassName, readonly ClassSkillLine[]>> = {
  [ClassName.Templar]: [ClassSkillLine.AedricSpear, ClassSkillLine.DawnsWrath, ClassSkillLine.RestoringLight],
  [ClassName.Sorcerer]: [ClassSkillLine.DaedricSummoning, ClassSkillLine.DarkMagic, ClassSkillLine.StormCalling],
  [ClassName.Nightblade]: [ClassSkillLine.Assassination, ClassSkillLine.ShadowyEmbrace, ClassSkillLine.Siphoning],
  [ClassName.Dragonknight]: [ClassSkillLine.EarthenHeart, ClassSkillLine.DraconicPower, ClassSkillLine.ArdentFlame],
  [ClassName.Warden]: [ClassSkillLine.GreenBalance, ClassSkillLine.WintersEmbrace, ClassSkillLine.AnimalCompanions],
  [ClassName.Necromancer]: [ClassSkillLine.GraveLord, ClassSkillLine.LivingDeath, ClassSkillLine.BoneTyrant],
  [ClassName.Arcanist]: [ClassSkillLine.CurativeRuneforms, ClassSkillLine.HeraldOfTheTomes, ClassSkillLine.SoldierOfApocrypha],
};

export function getClassForSkillLine(skillLine: string | null | undefined): ClassName | null {
  if (!skillLine) return null;

  for (const [className, skillLines] of Object.entries(ESO_CLASS_SKILL_LINES) as Array<[ClassName, readonly ClassSkillLine[]]>) {
    if (skillLines.includes(skillLine as ClassSkillLine)) return className;
  }

  return null;
}
import type { ActivityLevel, Goal, MacroTargets, UserProfile } from '@/types/diet';

// ─── Activity multipliers (Mifflin-St Jeor / ACSM standard) ──────────────────

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  veryActive:  1.9,
  extraActive: 1.9,   // same ceiling as veryActive per common practice
};

// ─── Calorie adjustments per goal ─────────────────────────────────────────────

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  cut:      -500,
  maintain:    0,
  bulk:      +300,
};

// ─── Calorie density constants ────────────────────────────────────────────────

const KCAL_PER_GRAM_PROTEIN = 4;
const KCAL_PER_GRAM_CARB    = 4;
const KCAL_PER_GRAM_FAT     = 9;

/**
 * Calculates Basal Metabolic Rate using the Mifflin-St Jeor equation.
 *
 * Male:   BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
 * Female: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
 */
export function calculateBMR(profile: UserProfile): number {
  const { weightKg, heightCm, age, gender } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * Calculates Total Daily Energy Expenditure by multiplying BMR by the
 * activity-level factor.
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Derives macro targets from TDEE and the user's goal.
 *
 * Rules applied:
 *  - Target calories = TDEE ± goal adjustment (cut −500, bulk +300, maintain ±0)
 *  - Protein = 2 g × body-weight kg  (requires weightKg from profile)
 *  - Fat     = 25 % of target calories
 *  - Carbs   = remaining calories after protein & fat are accounted for
 *
 * Values are rounded to the nearest whole number.
 */
export function calculateMacroTargets(
  tdee: number,
  goal: Goal,
  weightKg: number,
): MacroTargets {
  const calories = Math.round(tdee + GOAL_ADJUSTMENTS[goal]);

  const proteinGrams = Math.round(2 * weightKg);
  const fatGrams     = Math.round((calories * 0.25) / KCAL_PER_GRAM_FAT);

  const caloriesFromProtein = proteinGrams * KCAL_PER_GRAM_PROTEIN;
  const caloriesFromFat     = fatGrams     * KCAL_PER_GRAM_FAT;
  const carbsGrams          = Math.round(
    Math.max(0, calories - caloriesFromProtein - caloriesFromFat) / KCAL_PER_GRAM_CARB,
  );

  return { calories, proteinGrams, carbsGrams, fatGrams };
}

/**
 * Convenience function: runs the full pipeline from a UserProfile to
 * MacroTargets in one call.
 */
export function calculateDietPlan(profile: UserProfile): MacroTargets {
  const bmr  = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  return calculateMacroTargets(tdee, profile.goal, profile.weightKg);
}

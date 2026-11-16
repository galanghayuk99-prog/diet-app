import type { DietaryPreference, FoodItem, MacroTargets } from '@/types/diet';
import foodsRaw from '@/data/foods.json';

const ALL_FOODS = foodsRaw as FoodItem[];

// ─── Meal calorie splits ───────────────────────────────────────────────────────

export const MEAL_SPLITS = {
  breakfast: 0.25,
  lunch:     0.35,
  dinner:    0.30,
  snack:     0.10,
} as const;

export type MealName = keyof typeof MEAL_SPLITS;

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface MealItem {
  food: FoodItem;
  /** Portion weight in grams */
  grams: number;
  /** Calories contributed by this portion */
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface Meal {
  name: MealName;
  targetCalories: number;
  items: MealItem[];
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
}

export interface DailyMealPlan {
  meals: Meal[];
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a seeded-pseudo-random index for deterministic selection per food pool size. */
function pickIndex(pool: FoodItem[], seed: number): number {
  return seed % pool.length;
}

/** Filters foods by dietary preference and optional category. */
function filterFoods(
  preference: DietaryPreference,
  category: FoodItem['category'],
): FoodItem[] {
  return ALL_FOODS.filter(f => {
    if (f.category !== category) return false;
    if (preference === 'vegetarian') return f.tags.includes('vegetarian');
    if (preference === 'halal')      return f.tags.includes('halal');
    return true; // 'all'
  });
}

/**
 * Scales a food item so that it delivers `targetCalories` worth of that food.
 * Returns the calculated MealItem.
 */
function scaleToCalories(food: FoodItem, targetCalories: number): MealItem {
  const grams = (targetCalories / food.caloriesPer100g) * 100;
  const calories       = (food.caloriesPer100g  / 100) * grams;
  const proteinGrams   = (food.proteinPer100g   / 100) * grams;
  const carbsGrams     = (food.carbsPer100g     / 100) * grams;
  const fatGrams       = (food.fatPer100g       / 100) * grams;
  return { food, grams: Math.round(grams), calories, proteinGrams, carbsGrams, fatGrams };
}

/** Sums the nutritional totals of a list of MealItems. */
function sumItems(items: MealItem[]) {
  return items.reduce(
    (acc, item) => ({
      totalCalories:      acc.totalCalories      + item.calories,
      totalProteinGrams:  acc.totalProteinGrams  + item.proteinGrams,
      totalCarbsGrams:    acc.totalCarbsGrams    + item.carbsGrams,
      totalFatGrams:      acc.totalFatGrams      + item.fatGrams,
    }),
    { totalCalories: 0, totalProteinGrams: 0, totalCarbsGrams: 0, totalFatGrams: 0 },
  );
}

// ─── Main meal builder ────────────────────────────────────────────────────────

/**
 * Builds one main meal (breakfast / lunch / dinner) containing:
 *   1 carb + 1 protein + 1 veggie
 *
 * Calorie budget is split proportionally 50 / 35 / 15 (carb / protein / veggie).
 * Portions are then adjusted so that the **combined protein contribution** of the
 * meal lands within ±10 % of the pro-rated protein target for that meal.
 */
function buildMainMeal(
  mealName: MealName,
  targetCalories: number,
  targets: MacroTargets,
  preference: DietaryPreference,
  seed: number,
): Meal {
  const carbs    = filterFoods(preference, 'carb');
  const proteins = filterFoods(preference, 'protein');
  const veggies  = filterFoods(preference, 'veggie');

  // Fallback to 'all' if the preference narrows the pool to zero
  const carbPool    = carbs.length    ? carbs    : filterFoods('all', 'carb');
  const proteinPool = proteins.length ? proteins : filterFoods('all', 'protein');
  const veggiePool  = veggies.length  ? veggies  : filterFoods('all', 'veggie');

  const chosenCarb    = carbPool   [pickIndex(carbPool,    seed)];
  const chosenProtein = proteinPool[pickIndex(proteinPool, seed + 1)];
  const chosenVeggie  = veggiePool [pickIndex(veggiePool,  seed + 2)];

  // Initial calorie split: 50 % carb, 35 % protein, 15 % veggie
  const carbCals   = targetCalories * 0.50;
  const protCals   = targetCalories * 0.35;
  const veggieCals = targetCalories * 0.15;

  const carbItem   = scaleToCalories(chosenCarb,    carbCals);
  let   protItem   = scaleToCalories(chosenProtein, protCals);
  const veggieItem = scaleToCalories(chosenVeggie,  veggieCals);

  // ── Protein adjustment pass ───────────────────────────────────────────────
  // Pro-rated protein target for this meal (by calorie fraction)
  const mealFraction    = MEAL_SPLITS[mealName];
  const mealProteinTarget = targets.proteinGrams * mealFraction;
  const currentProtein  = carbItem.proteinGrams + protItem.proteinGrams + veggieItem.proteinGrams;
  const margin          = mealProteinTarget * 0.10;

  if (Math.abs(currentProtein - mealProteinTarget) > margin) {
    // Scale the protein portion up/down to hit the target; keep other portions fixed
    const proteinNeededFromItem = mealProteinTarget - carbItem.proteinGrams - veggieItem.proteinGrams;
    if (proteinNeededFromItem > 0 && chosenProtein.proteinPer100g > 0) {
      const newGrams   = (proteinNeededFromItem / chosenProtein.proteinPer100g) * 100;
      const newCals    = (chosenProtein.caloriesPer100g / 100) * newGrams;
      const newProtein = (chosenProtein.proteinPer100g  / 100) * newGrams;
      const newCarbs   = (chosenProtein.carbsPer100g    / 100) * newGrams;
      const newFat     = (chosenProtein.fatPer100g      / 100) * newGrams;
      protItem = {
        food:         chosenProtein,
        grams:        Math.round(newGrams),
        calories:     newCals,
        proteinGrams: newProtein,
        carbsGrams:   newCarbs,
        fatGrams:     newFat,
      };
    }
  }

  const items  = [carbItem, protItem, veggieItem];
  const totals = sumItems(items);

  return {
    name: mealName,
    targetCalories,
    items,
    ...totals,
  };
}

/**
 * Builds the snack meal using 1 snack-category item scaled to the snack calorie budget.
 */
function buildSnackMeal(
  targetCalories: number,
  preference: DietaryPreference,
  seed: number,
): Meal {
  const snacks = filterFoods(preference, 'snack');
  const pool   = snacks.length ? snacks : filterFoods('all', 'snack');
  const chosen = pool[pickIndex(pool, seed)];
  const item   = scaleToCalories(chosen, targetCalories);
  const totals = sumItems([item]);
  return {
    name: 'snack',
    targetCalories,
    items: [item],
    ...totals,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a full daily meal plan divided into:
 *   Breakfast 25 % · Lunch 35 % · Dinner 30 % · Snack 10 %
 *
 * Each main meal contains 1 carb + 1 protein + 1 veggie, with portions
 * scaled to match calorie and protein targets within ±10 %.
 *
 * @param targets  - Macro targets from `calculateMacroTargets`
 * @param preference - Dietary preference string ('all' | 'vegetarian' | 'halal')
 * @param seed     - Optional integer seed for deterministic food selection (default 0)
 */
export function generateDailyMealPlan(
  targets: MacroTargets,
  preference: DietaryPreference | string,
  seed = 0,
): DailyMealPlan {
  // Normalise / fallback unknown preferences
  const pref: DietaryPreference =
    preference === 'vegetarian' || preference === 'halal' ? preference : 'all';

  const breakfast = buildMainMeal('breakfast', targets.calories * MEAL_SPLITS.breakfast, targets, pref, seed);
  const lunch     = buildMainMeal('lunch',     targets.calories * MEAL_SPLITS.lunch,     targets, pref, seed + 10);
  const dinner    = buildMainMeal('dinner',    targets.calories * MEAL_SPLITS.dinner,    targets, pref, seed + 20);
  const snack     = buildSnackMeal(targets.calories * MEAL_SPLITS.snack, pref, seed + 30);

  const meals = [breakfast, lunch, dinner, snack];

  const totalCalories      = meals.reduce((s, m) => s + m.totalCalories, 0);
  const totalProteinGrams  = meals.reduce((s, m) => s + m.totalProteinGrams, 0);
  const totalCarbsGrams    = meals.reduce((s, m) => s + m.totalCarbsGrams, 0);
  const totalFatGrams      = meals.reduce((s, m) => s + m.totalFatGrams, 0);

  return { meals, totalCalories, totalProteinGrams, totalCarbsGrams, totalFatGrams };
}

/**
 * Swaps one food item within a meal for a different item of the same category.
 *
 * The replacement item is chosen as the next food in the filtered pool (by
 * category + preference) so it is always a valid, different food.  The new
 * item is re-scaled to the same calorie target as the original.
 *
 * @param meal           - The meal to modify (not mutated; a new object is returned)
 * @param itemIdToReplace - The `food.id` of the MealItem to swap out
 * @param preference     - Dietary preference used to filter replacement candidates
 * @returns A new Meal with the item replaced, or the original meal unchanged if
 *          the id is not found or no suitable replacement exists.
 */
export function swapMealItem(
  meal: Meal,
  itemIdToReplace: string,
  preference: DietaryPreference | string = 'all',
): Meal {
  const pref: DietaryPreference =
    preference === 'vegetarian' || preference === 'halal' ? preference : 'all';

  const targetItemIndex = meal.items.findIndex(i => i.food.id === itemIdToReplace);
  if (targetItemIndex === -1) return meal;

  const original = meal.items[targetItemIndex];
  const category = original.food.category;
  const pool     = filterFoods(pref, category).length
    ? filterFoods(pref, category)
    : filterFoods('all', category);

  // Pick next food in pool that isn't the current one
  const currentIndexInPool = pool.findIndex(f => f.id === original.food.id);
  const nextIndex          = (currentIndexInPool + 1) % pool.length;
  const replacement        = pool[nextIndex];

  // If pool has only one item, return unchanged
  if (replacement.id === original.food.id) return meal;

  // Scale replacement to the same calorie target as the original
  const originalCalorieTarget = original.calories;
  const newItem = scaleToCalories(replacement, originalCalorieTarget);

  const newItems = [...meal.items];
  newItems[targetItemIndex] = newItem;
  const totals = sumItems(newItems);

  return {
    ...meal,
    items: newItems,
    ...totals,
  };
}

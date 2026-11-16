import { generateDailyMealPlan, swapMealItem, MEAL_SPLITS } from './recommender';
import type { MacroTargets } from '@/types/diet';

const targets: MacroTargets = {
  calories:      2000,
  proteinGrams:  160,
  carbsGrams:    190,
  fatGrams:       56,
};

describe('generateDailyMealPlan', () => {
  test('returns 4 meals: breakfast, lunch, dinner, snack', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    expect(plan.meals).toHaveLength(4);
    const names = plan.meals.map(m => m.name);
    expect(names).toContain('breakfast');
    expect(names).toContain('lunch');
    expect(names).toContain('dinner');
    expect(names).toContain('snack');
  });

  test('breakfast target is 25% of daily calories', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const bf = plan.meals.find(m => m.name === 'breakfast')!;
    expect(bf.targetCalories).toBeCloseTo(targets.calories * MEAL_SPLITS.breakfast, 1);
  });

  test('lunch target is 35% of daily calories', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const lunch = plan.meals.find(m => m.name === 'lunch')!;
    expect(lunch.targetCalories).toBeCloseTo(targets.calories * MEAL_SPLITS.lunch, 1);
  });

  test('dinner target is 30% of daily calories', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const dinner = plan.meals.find(m => m.name === 'dinner')!;
    expect(dinner.targetCalories).toBeCloseTo(targets.calories * MEAL_SPLITS.dinner, 1);
  });

  test('snack target is 10% of daily calories', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const snack = plan.meals.find(m => m.name === 'snack')!;
    expect(snack.targetCalories).toBeCloseTo(targets.calories * MEAL_SPLITS.snack, 1);
  });

  test('each main meal has exactly 3 items (carb + protein + veggie)', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    (['breakfast', 'lunch', 'dinner'] as const).forEach(name => {
      const meal = plan.meals.find(m => m.name === name)!;
      expect(meal.items).toHaveLength(3);
      const categories = meal.items.map(i => i.food.category);
      expect(categories).toContain('carb');
      expect(categories).toContain('protein');
      expect(categories).toContain('veggie');
    });
  });

  test('snack meal has exactly 1 item of category "snack"', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const snack = plan.meals.find(m => m.name === 'snack')!;
    expect(snack.items).toHaveLength(1);
    expect(snack.items[0].food.category).toBe('snack');
  });

  test('every meal item has grams > 0', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    plan.meals.forEach(meal => {
      meal.items.forEach(item => {
        expect(item.grams).toBeGreaterThan(0);
      });
    });
  });

  test('protein per main meal is within ±10% of pro-rated protein target', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    (['breakfast', 'lunch', 'dinner'] as const).forEach(name => {
      const meal = plan.meals.find(m => m.name === name)!;
      const mealProteinTarget = targets.proteinGrams * MEAL_SPLITS[name];
      const margin = mealProteinTarget * 0.10;
      expect(meal.totalProteinGrams).toBeGreaterThanOrEqual(mealProteinTarget - margin);
      expect(meal.totalProteinGrams).toBeLessThanOrEqual(mealProteinTarget + margin);
    });
  });

  test('vegetarian plan only contains vegetarian-tagged foods', () => {
    const plan = generateDailyMealPlan(targets, 'vegetarian');
    plan.meals.forEach(meal => {
      meal.items.forEach(item => {
        expect(item.food.tags).toContain('vegetarian');
      });
    });
  });

  test('halal plan only contains halal-tagged foods', () => {
    const plan = generateDailyMealPlan(targets, 'halal');
    plan.meals.forEach(meal => {
      meal.items.forEach(item => {
        expect(item.food.tags).toContain('halal');
      });
    });
  });

  test('unknown preference falls back to "all" without throwing', () => {
    expect(() => generateDailyMealPlan(targets, 'keto')).not.toThrow();
  });

  test('different seeds produce different food selections', () => {
    const plan0 = generateDailyMealPlan(targets, 'all', 0);
    const plan5 = generateDailyMealPlan(targets, 'all', 5);
    const ids0 = plan0.meals.flatMap(m => m.items.map(i => i.food.id)).join(',');
    const ids5 = plan5.meals.flatMap(m => m.items.map(i => i.food.id)).join(',');
    expect(ids0).not.toBe(ids5);
  });

  test('totalCalories on the plan sums all meal totals', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const sum  = plan.meals.reduce((s, m) => s + m.totalCalories, 0);
    expect(plan.totalCalories).toBeCloseTo(sum, 1);
  });
});

describe('swapMealItem', () => {
  test('replaces the specified item with a different food of the same category', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const lunch = plan.meals.find(m => m.name === 'lunch')!;
    const carbItem = lunch.items.find(i => i.food.category === 'carb')!;

    const updated = swapMealItem(lunch, carbItem.food.id, 'all');
    const newCarbItem = updated.items.find(i => i.food.category === 'carb')!;
    expect(newCarbItem.food.id).not.toBe(carbItem.food.id);
    expect(newCarbItem.food.category).toBe('carb');
  });

  test('swapped item is scaled to the same calorie target as the original', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const lunch = plan.meals.find(m => m.name === 'lunch')!;
    const protItem = lunch.items.find(i => i.food.category === 'protein')!;
    const originalCals = protItem.calories;

    const updated = swapMealItem(lunch, protItem.food.id, 'all');
    const newProtItem = updated.items.find(i => i.food.category === 'protein')!;
    expect(newProtItem.calories).toBeCloseTo(originalCals, 0);
  });

  test('returns original meal unchanged if itemIdToReplace is not found', () => {
    const plan  = generateDailyMealPlan(targets, 'all');
    const lunch = plan.meals.find(m => m.name === 'lunch')!;
    const result = swapMealItem(lunch, 'non-existent-id');
    expect(result).toBe(lunch); // same reference
  });

  test('recalculates meal totals after swap', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const lunch = plan.meals.find(m => m.name === 'lunch')!;
    const carbItem = lunch.items.find(i => i.food.category === 'carb')!;

    const updated = swapMealItem(lunch, carbItem.food.id, 'all');
    const expectedTotal = updated.items.reduce((s, i) => s + i.calories, 0);
    expect(updated.totalCalories).toBeCloseTo(expectedTotal, 1);
  });

  test('does not mutate the original meal', () => {
    const plan = generateDailyMealPlan(targets, 'all');
    const lunch = plan.meals.find(m => m.name === 'lunch')!;
    const carbItem = lunch.items.find(i => i.food.category === 'carb')!;
    const originalId = carbItem.food.id;

    swapMealItem(lunch, carbItem.food.id, 'all');
    expect(lunch.items.find(i => i.food.category === 'carb')!.food.id).toBe(originalId);
  });
});

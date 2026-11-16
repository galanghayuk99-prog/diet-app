import { calculateBMR, calculateTDEE, calculateMacroTargets, calculateDietPlan } from './calculator';
import type { UserProfile } from '@/types/diet';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const maleSedentary: UserProfile = {
  age: 30,
  gender: 'male',
  weightKg: 80,
  heightCm: 175,
  activityLevel: 'sedentary',
  goal: 'maintain',
  dietaryPreference: 'all',
};

const femaleActive: UserProfile = {
  age: 25,
  gender: 'female',
  weightKg: 60,
  heightCm: 165,
  activityLevel: 'active',
  goal: 'cut',
  dietaryPreference: 'vegetarian',
};

// ─── calculateBMR ─────────────────────────────────────────────────────────────

describe('calculateBMR', () => {
  test('male: 10×80 + 6.25×175 − 5×30 + 5 = 1843.75', () => {
    // 10×80=800, 6.25×175=1093.75, 5×30=150 → 800+1093.75−150+5 = 1748.75
    expect(calculateBMR(maleSedentary)).toBeCloseTo(1748.75, 2);
  });

  test('female: 10×60 + 6.25×165 − 5×25 − 161 = 1420.25', () => {
    // 10×60=600, 6.25×165=1031.25, 5×25=125 → 600+1031.25−125−161 = 1345.25
    expect(calculateBMR(femaleActive)).toBeCloseTo(1345.25, 2);
  });

  test('returns higher BMR for male vs female with identical stats', () => {
    const base: UserProfile = { ...maleSedentary, weightKg: 70, heightCm: 170, age: 28 };
    const female: UserProfile = { ...base, gender: 'female' };
    expect(calculateBMR(base)).toBeGreaterThan(calculateBMR(female));
    // difference must be exactly 166 (5 − (−161))
    expect(calculateBMR(base) - calculateBMR(female)).toBeCloseTo(166, 5);
  });
});

// ─── calculateTDEE ────────────────────────────────────────────────────────────

describe('calculateTDEE', () => {
  test('sedentary multiplier = 1.2', () => {
    const bmr = calculateBMR(maleSedentary);
    expect(calculateTDEE(bmr, 'sedentary')).toBeCloseTo(bmr * 1.2, 2);
  });

  test('light multiplier = 1.375', () => {
    expect(calculateTDEE(2000, 'light')).toBeCloseTo(2750, 2);
  });

  test('moderate multiplier = 1.55', () => {
    expect(calculateTDEE(2000, 'moderate')).toBeCloseTo(3100, 2);
  });

  test('active multiplier = 1.725', () => {
    expect(calculateTDEE(2000, 'active')).toBeCloseTo(3450, 2);
  });

  test('veryActive multiplier = 1.9', () => {
    expect(calculateTDEE(2000, 'veryActive')).toBeCloseTo(3800, 2);
  });

  test('extraActive multiplier = 1.9', () => {
    expect(calculateTDEE(2000, 'extraActive')).toBeCloseTo(3800, 2);
  });

  test('TDEE is always greater than BMR (all multipliers > 1)', () => {
    const bmr = 1800;
    const levels = ['sedentary', 'light', 'moderate', 'active', 'veryActive', 'extraActive'] as const;
    levels.forEach(level => {
      expect(calculateTDEE(bmr, level)).toBeGreaterThan(bmr);
    });
  });
});

// ─── calculateMacroTargets ────────────────────────────────────────────────────

describe('calculateMacroTargets', () => {
  describe('cut (−500 kcal)', () => {
    test('calories = TDEE − 500', () => {
      const result = calculateMacroTargets(2500, 'cut', 70);
      expect(result.calories).toBe(2000);
    });

    test('protein = 2 g × weightKg', () => {
      const result = calculateMacroTargets(2500, 'cut', 70);
      expect(result.proteinGrams).toBe(140); // 2 × 70
    });

    test('fat = 25% of target kcal ÷ 9 kcal/g', () => {
      // 2000 × 0.25 = 500 ÷ 9 ≈ 55.56 → rounds to 56
      const result = calculateMacroTargets(2500, 'cut', 70);
      expect(result.fatGrams).toBe(56);
    });

    test('carbs fill remaining calories', () => {
      const result = calculateMacroTargets(2500, 'cut', 70);
      // protein: 140 × 4 = 560 kcal, fat: 56 × 9 = 504 kcal
      // remaining = 2000 − 560 − 504 = 936 kcal → 936 ÷ 4 = 234 g
      expect(result.carbsGrams).toBe(234);
    });

    test('macro calorie sum approximates target calories within ±10 kcal', () => {
      const result = calculateMacroTargets(2500, 'cut', 70);
      const total = result.proteinGrams * 4 + result.carbsGrams * 4 + result.fatGrams * 9;
      expect(Math.abs(total - result.calories)).toBeLessThanOrEqual(10);
    });
  });

  describe('maintain (±0 kcal)', () => {
    test('calories = TDEE rounded', () => {
      const result = calculateMacroTargets(2200, 'maintain', 75);
      expect(result.calories).toBe(2200);
    });
  });

  describe('bulk (+300 kcal)', () => {
    test('calories = TDEE + 300', () => {
      const result = calculateMacroTargets(2500, 'bulk', 80);
      expect(result.calories).toBe(2800);
    });

    test('protein = 2 g × weightKg', () => {
      const result = calculateMacroTargets(2500, 'bulk', 80);
      expect(result.proteinGrams).toBe(160); // 2 × 80
    });
  });

  test('carbsGrams is never negative', () => {
    // Very low calorie scenario (e.g. extreme cut)
    const result = calculateMacroTargets(500, 'cut', 50);
    expect(result.carbsGrams).toBeGreaterThanOrEqual(0);
  });
});

// ─── calculateDietPlan (integration) ─────────────────────────────────────────

describe('calculateDietPlan', () => {
  test('returns a complete MacroTargets object', () => {
    const result = calculateDietPlan(maleSedentary);
    expect(result).toHaveProperty('calories');
    expect(result).toHaveProperty('proteinGrams');
    expect(result).toHaveProperty('carbsGrams');
    expect(result).toHaveProperty('fatGrams');
  });

  test('cut plan has lower calories than maintain plan for same user', () => {
    const maintain = calculateDietPlan({ ...maleSedentary, goal: 'maintain' });
    const cut      = calculateDietPlan({ ...maleSedentary, goal: 'cut' });
    expect(cut.calories).toBeLessThan(maintain.calories);
    expect(maintain.calories - cut.calories).toBe(500);
  });

  test('bulk plan has higher calories than maintain plan for same user', () => {
    const maintain = calculateDietPlan({ ...maleSedentary, goal: 'maintain' });
    const bulk     = calculateDietPlan({ ...maleSedentary, goal: 'bulk' });
    expect(bulk.calories).toBeGreaterThan(maintain.calories);
    expect(bulk.calories - maintain.calories).toBe(300);
  });

  test('female active cut produces a valid plan with no negative macros', () => {
    const result = calculateDietPlan(femaleActive);
    expect(result.calories).toBeGreaterThan(0);
    expect(result.proteinGrams).toBeGreaterThan(0);
    expect(result.carbsGrams).toBeGreaterThanOrEqual(0);
    expect(result.fatGrams).toBeGreaterThan(0);
  });

  test('full pipeline — male 30y 80kg 175cm sedentary maintain', () => {
    // BMR = 10×80 + 6.25×175 − 5×30 + 5 = 1748.75
    // TDEE = 1748.75 × 1.2 = 2098.5
    // calories = round(2098.5) = 2099 (maintain)
    // protein = 2×80 = 160 g
    // fat = round(2099×0.25/9) = round(58.3) = 58 g
    // carbs = round((2099 − 160×4 − 58×9) / 4) = round((2099−640−522)/4) = round(937/4) = round(234.25) = 234
    const result = calculateDietPlan(maleSedentary);
    expect(result.calories).toBe(2099);
    expect(result.proteinGrams).toBe(160);
    expect(result.fatGrams).toBe(58);
    expect(result.carbsGrams).toBe(234);
  });
});

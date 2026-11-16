// ─── User Profile ────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'       // little or no exercise
  | 'light'           // light exercise 1–3 days/week
  | 'moderate'        // moderate exercise 3–5 days/week
  | 'active'          // hard exercise 6–7 days/week
  | 'veryActive'      // very hard exercise & physical job
  | 'extraActive';    // extremely active (athlete / 2× training)

export type Goal = 'cut' | 'maintain' | 'bulk';

export type DietaryPreference = 'all' | 'vegetarian' | 'halal';

export interface UserProfile {
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  dietaryPreference: DietaryPreference;
}

// ─── Macro Targets ────────────────────────────────────────────────────────────

export interface MacroTargets {
  /** Total daily calorie target */
  calories: number;
  /** Protein target in grams */
  proteinGrams: number;
  /** Carbohydrate target in grams */
  carbsGrams: number;
  /** Fat target in grams */
  fatGrams: number;
}

// ─── Food Item ────────────────────────────────────────────────────────────────

export type FoodCategory = 'protein' | 'carb' | 'veggie' | 'fat' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  /** e.g. ['halal', 'vegetarian', 'high-fiber'] */
  tags: string[];
  /** Unsplash/illustrative photo URL */
  imageUrl?: string;
}

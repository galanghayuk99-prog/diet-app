"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { UserProfile, MacroTargets } from "@/types/diet";
import type { ActivityLevel, Goal, DietaryPreference } from "@/types/diet";
import type { DailyMealPlan, Meal } from "@/utils/recommender";
import { calculateBMR, calculateTDEE, calculateMacroTargets } from "@/utils/calculator";
import { generateDailyMealPlan, swapMealItem } from "@/utils/recommender";
import BodyVisualizer from "@/components/BodyVisualizer";

// ─── Default form values ──────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  age: 25,
  gender: "male",
  weightKg: 70,
  heightCm: 170,
  activityLevel: "moderate",
  goal: "maintain",
  dietaryPreference: "all",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeResults(profile: UserProfile) {
  const bmr  = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const macros = calculateMacroTargets(tdee, profile.goal, profile.weightKg);
  return { bmr, tdee, macros };
}

function fmt(n: number, decimals = 0) {
  return n.toFixed(decimals);
}

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" as const } },
  exit:   { opacity: 0, y: -10, transition: { duration: 0.22 } },
};

const listStagger: Variants = {
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariant: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 14 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { type: "spring" as const, stiffness: 240, damping: 24 } },
  exit:    { opacity: 0, scale: 0.94, y: -8, transition: { duration: 0.18 } },
};

// ─── MacroBar ─────────────────────────────────────────────────────────────────

function MacroBar({
  label, grams, pct, color, bgColor,
}: {
  label: string; grams: number; pct: number; color: string; bgColor: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">{fmt(grams)} g &nbsp;·&nbsp; {fmt(pct, 1)}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: bgColor }}>
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Macro badge (coloured pill) ──────────────────────────────────────────────

function MacroBadge({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${color}`}>
      <span className="opacity-70">{label}</span>
      <span>{value}<span className="font-normal opacity-70"> {unit}</span></span>
    </span>
  );
}

// ─── FoodItemCard ─────────────────────────────────────────────────────────────

const CAT_BADGE: Record<string, string> = {
  carb:    "bg-amber-100 text-amber-700",
  protein: "bg-sky-100 text-sky-700",
  veggie:  "bg-emerald-100 text-emerald-700",
  fat:     "bg-rose-100 text-rose-700",
  snack:   "bg-purple-100 text-purple-700",
};

function FoodItemCard({
  item,
  mealName,
  onSwap,
}: {
  item: { food: { id: string; name: string; category: string; imageUrl?: string }; grams: number; calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number };
  mealName: Meal["name"];
  onSwap: (mealName: Meal["name"], itemId: string) => void;
}) {
  const [swapping, setSwapping] = useState(false);

  function handleSwap() {
    setSwapping(true);
    setTimeout(() => {
      onSwap(mealName, item.food.id);
      setSwapping(false);
    }, 320);
  }

  return (
    <motion.div
      layout
      variants={cardVariant}
      whileHover={{ scale: 1.018, boxShadow: "0 4px 24px 0 rgba(0,0,0,0.08)" }}
      className="relative flex gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm overflow-hidden"
    >
      {/* Food image */}
      {item.food.imageUrl && (
        <div className="shrink-0 relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={item.food.imageUrl}
            alt={item.food.name}
            fill
            className="object-cover"
            sizes="64px"
            onError={() => {/* silently fail */}}
          />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-800 text-sm leading-tight">{item.food.name}</p>
            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CAT_BADGE[item.food.category] ?? "bg-gray-100 text-gray-500"}`}>
              {item.food.category}
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSwap}
            disabled={swapping}
            className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 transition-colors disabled:opacity-50"
            title={`Swap ${item.food.name}`}
          >
            {swapping ? "…" : "Swap"}
          </motion.button>
        </div>

        {/* Macro badges row */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <MacroBadge label="kcal" value={fmt(item.calories)}        unit=""  color="bg-orange-50 text-orange-700" />
          <MacroBadge label="P"    value={fmt(item.proteinGrams, 1)} unit="g" color="bg-sky-50 text-sky-700" />
          <MacroBadge label="C"    value={fmt(item.carbsGrams, 1)}   unit="g" color="bg-amber-50 text-amber-700" />
          <MacroBadge label="F"    value={fmt(item.fatGrams, 1)}     unit="g" color="bg-rose-50 text-rose-700" />
          <span className="text-[11px] text-gray-400 self-center">{item.grams} g</span>
        </div>
      </div>

      {/* Swap flash overlay */}
      <AnimatePresence>
        {swapping && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.18 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-sky-400 rounded-xl pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── MealCard ─────────────────────────────────────────────────────────────────

const MEAL_LABEL: Record<Meal["name"], string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍎 Snack",
};

const MEAL_ACCENT: Record<Meal["name"], { border: string; header: string }> = {
  breakfast: { border: "border-amber-400",  header: "from-amber-50"  },
  lunch:     { border: "border-sky-400",    header: "from-sky-50"    },
  dinner:    { border: "border-indigo-400", header: "from-indigo-50" },
  snack:     { border: "border-emerald-400",header: "from-emerald-50"},
};

const MEAL_TOTAL_BADGE: Record<Meal["name"], string> = {
  breakfast: "bg-amber-100 text-amber-700",
  lunch:     "bg-sky-100 text-sky-700",
  dinner:    "bg-indigo-100 text-indigo-700",
  snack:     "bg-emerald-100 text-emerald-700",
};

function MealCard({
  meal,
  onSwap,
  targetMacros,
}: {
  meal: Meal;
  onSwap: (mealName: Meal["name"], itemId: string) => void;
  targetMacros: MacroTargets;
}) {
  const accent = MEAL_ACCENT[meal.name];
  const calDiff = meal.totalCalories - meal.targetCalories;
  const calPct  = meal.targetCalories > 0 ? (meal.totalCalories / meal.targetCalories) * 100 : 0;

  return (
    <motion.div
      layout
      variants={cardVariant}
      className={`rounded-2xl border-l-4 bg-white shadow-sm overflow-hidden ${accent.border}`}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${accent.header} to-transparent px-5 pt-4 pb-3 flex items-center justify-between`}>
        <div>
          <h3 className="font-bold text-gray-800 text-base">{MEAL_LABEL[meal.name]}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${MEAL_TOTAL_BADGE[meal.name]}`}>
              {fmt(meal.totalCalories)} kcal
            </span>
            <span className="text-[11px] text-gray-400">
              target {fmt(meal.targetCalories)} kcal
              {Math.abs(calDiff) > 5 && (
                <span className={calDiff > 0 ? " text-rose-500" : " text-emerald-500"}>
                  &nbsp;({calDiff > 0 ? "+" : ""}{fmt(calDiff)})
                </span>
              )}
            </span>
          </div>
        </div>
        {/* Mini calorie ring indicator */}
        <svg className="shrink-0 w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="14" fill="none"
            stroke={calPct > 110 ? "#f87171" : calPct > 95 ? "#34d399" : "#60a5fa"}
            strokeWidth="3"
            strokeDasharray={`${Math.min(calPct, 100) * 0.879} 87.9`}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Food items */}
      <motion.div
        className="px-4 pb-4 pt-2 space-y-2"
        variants={listStagger}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {meal.items.map((item) => (
            <FoodItemCard
              key={item.food.id}
              item={item}
              mealName={meal.name}
              onSwap={onSwap}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Meal macro summary footer */}
      <div className="mx-4 mb-4 rounded-xl bg-gray-50 px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 border border-gray-100">
        <span>P <b className="text-gray-700">{fmt(meal.totalProteinGrams, 1)}</b> g</span>
        <span>C <b className="text-gray-700">{fmt(meal.totalCarbsGrams, 1)}</b> g</span>
        <span>F <b className="text-gray-700">{fmt(meal.totalFatGrams, 1)}</b> g</span>
        <span className="ml-auto text-[11px] text-gray-300">
          vs target P{fmt(targetMacros.proteinGrams / 4, 0)} C{fmt(targetMacros.carbsGrams / 4, 0)} F{fmt(targetMacros.fatGrams / 4, 0)} g
        </span>
      </div>
    </motion.div>
  );
}

// ─── Form field components ────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
}

function NumberInput({
  id, value, min, max, unit, error, onChange,
}: {
  id: string; value: number; min: number; max: number; unit?: string;
  error?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2
            ${error ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-sky-200 focus:border-sky-400"}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SelectInput<T extends string>({
  id, value, options, onChange,
}: {
  id: string; value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Validation ────────────────────────────────────────────────────────────────

interface FormErrors {
  age?: string;
  weightKg?: string;
  heightCm?: string;
}

function validate(p: UserProfile): FormErrors {
  const errors: FormErrors = {};
  if (p.age < 10 || p.age > 100)             errors.age      = "Age must be 10–100.";
  if (p.weightKg < 20 || p.weightKg > 300)   errors.weightKg = "Weight must be 20–300 kg.";
  if (p.heightCm < 100 || p.heightCm > 250)  errors.heightCm = "Height must be 100–250 cm.";
  return errors;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [seed,    setSeed]    = useState(0);
  const [plan,    setPlan]    = useState<DailyMealPlan | null>(null);
  const [bmr,     setBmr]     = useState<number | null>(null);
  const [tdee,    setTdee]    = useState<number | null>(null);
  const [macros,  setMacros]  = useState<MacroTargets | null>(null);
  const [regenKey, setRegenKey] = useState(0);

  function patch<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  const handleGenerate = useCallback(() => {
    const errs = validate(profile);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const { bmr: b, tdee: t, macros: m } = computeResults(profile);
    const newSeed = seed + 1;
    setBmr(b);
    setTdee(t);
    setMacros(m);
    setPlan(generateDailyMealPlan(m, profile.dietaryPreference, newSeed));
    setSeed(newSeed);
    setRegenKey((k) => k + 1);
  }, [profile, seed]);

  const handleSwap = useCallback(
    (mealName: Meal["name"], itemId: string) => {
      if (!plan) return;
      setPlan((prev) => {
        if (!prev) return prev;
        const updatedMeals = prev.meals.map((meal) =>
          meal.name === mealName ? swapMealItem(meal, itemId, profile.dietaryPreference) : meal
        );
        return {
          ...prev,
          meals: updatedMeals,
          totalCalories:     updatedMeals.reduce((s, m) => s + m.totalCalories, 0),
          totalProteinGrams: updatedMeals.reduce((s, m) => s + m.totalProteinGrams, 0),
          totalCarbsGrams:   updatedMeals.reduce((s, m) => s + m.totalCarbsGrams, 0),
          totalFatGrams:     updatedMeals.reduce((s, m) => s + m.totalFatGrams, 0),
        };
      });
    },
    [plan, profile.dietaryPreference]
  );

  const totalKcal = macros?.calories ?? 0;
  const protPct   = totalKcal > 0 ? ((macros!.proteinGrams * 4) / totalKcal) * 100 : 0;
  const carbPct   = totalKcal > 0 ? ((macros!.carbsGrams   * 4) / totalKcal) * 100 : 0;
  const fatPct    = totalKcal > 0 ? ((macros!.fatGrams      * 9) / totalKcal) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/20">
      {/* ── Header ── */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Diet Calculator</h1>
            <p className="text-xs text-gray-400">Personalised Indonesian Meal Planner</p>
          </div>
          <span className="hidden sm:block text-xs text-gray-400 italic">Powered by Mifflin-St Jeor</span>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">

          {/* ── Left: Profile form + BodyVisualizer ── */}
          <section className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-semibold text-gray-800 mb-5">Your Profile</h2>

              <div className="space-y-4">
                {/* Age */}
                <div>
                  <FieldLabel htmlFor="age">Age</FieldLabel>
                  <NumberInput id="age" value={profile.age} min={10} max={100} unit="yr"
                    error={errors.age} onChange={(v) => patch("age", v)} />
                </div>

                {/* Gender */}
                <div>
                  <FieldLabel htmlFor="gender">Gender</FieldLabel>
                  <SelectInput<"male" | "female"> id="gender" value={profile.gender}
                    onChange={(v) => patch("gender", v)}
                    options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
                </div>

                {/* Weight + Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="weight">Weight</FieldLabel>
                    <NumberInput id="weight" value={profile.weightKg} min={20} max={300} unit="kg"
                      error={errors.weightKg} onChange={(v) => patch("weightKg", v)} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="height">Height</FieldLabel>
                    <NumberInput id="height" value={profile.heightCm} min={100} max={250} unit="cm"
                      error={errors.heightCm} onChange={(v) => patch("heightCm", v)} />
                  </div>
                </div>

                {/* Activity Level */}
                <div>
                  <FieldLabel htmlFor="activity">Activity Level</FieldLabel>
                  <SelectInput<ActivityLevel> id="activity" value={profile.activityLevel}
                    onChange={(v) => patch("activityLevel", v)}
                    options={[
                      { value: "sedentary",   label: "Sedentary (desk job, no exercise)" },
                      { value: "light",       label: "Light (1–3 days/week)" },
                      { value: "moderate",    label: "Moderate (3–5 days/week)" },
                      { value: "active",      label: "Active (6–7 days/week)" },
                      { value: "veryActive",  label: "Very Active (hard daily training)" },
                      { value: "extraActive", label: "Extra Active (athlete / 2× training)" },
                    ]} />
                </div>

                {/* Goal */}
                <div>
                  <FieldLabel htmlFor="goal">Goal</FieldLabel>
                  <SelectInput<Goal> id="goal" value={profile.goal}
                    onChange={(v) => patch("goal", v)}
                    options={[
                      { value: "cut",      label: "Cut (−500 kcal deficit)" },
                      { value: "maintain", label: "Maintain (TDEE)" },
                      { value: "bulk",     label: "Bulk (+300 kcal surplus)" },
                    ]} />
                </div>

                {/* Dietary Preference */}
                <div>
                  <FieldLabel htmlFor="diet">Dietary Preference</FieldLabel>
                  <SelectInput<DietaryPreference> id="diet" value={profile.dietaryPreference}
                    onChange={(v) => patch("dietaryPreference", v)}
                    options={[
                      { value: "all",        label: "All (no restriction)" },
                      { value: "vegetarian", label: "Vegetarian" },
                      { value: "halal",      label: "Halal" },
                    ]} />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerate}
                className="mt-6 w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 active:bg-sky-700 transition-colors"
              >
                Calculate &amp; Generate Plan
              </motion.button>
            </motion.div>

            {/* Body Visualizer — live preview */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
            >
              <BodyVisualizer
                weight={profile.weightKg}
                height={profile.heightCm}
                gender={profile.gender}
              />
            </motion.div>
          </section>

          {/* ── Right: Results ── */}
          <section className="space-y-6">
            <AnimatePresence mode="wait">
              {!plan && (
                <motion.div
                  key="empty"
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 text-gray-400"
                >
                  <p className="text-sm text-center px-6">
                    Fill in your profile and click <b className="text-gray-600">Calculate &amp; Generate Plan</b>
                  </p>
                </motion.div>
              )}

              {plan && macros && bmr !== null && tdee !== null && (
                <motion.div
                  key={`results-${regenKey}`}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  {/* Summary stat cards */}
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                    variants={listStagger}
                    initial="hidden"
                    animate="visible"
                  >
                    {[
                      { label: "BMR",             value: fmt(bmr),               unit: "kcal/day", color: "text-violet-600", bg: "bg-violet-50"  },
                      { label: "TDEE",            value: fmt(tdee),              unit: "kcal/day", color: "text-sky-600",    bg: "bg-sky-50"     },
                      { label: "Target Calories", value: fmt(macros.calories),   unit: "kcal/day", color: "text-emerald-600",bg: "bg-emerald-50" },
                      { label: "Protein Target",  value: fmt(macros.proteinGrams),unit: "g/day",   color: "text-amber-600", bg: "bg-amber-50"   },
                    ].map(({ label, value, unit, color, bg }) => (
                      <motion.div
                        key={label}
                        variants={cardVariant}
                        className={`rounded-2xl border border-gray-100 ${bg} p-4 shadow-sm text-center`}
                      >
                        <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
                        <p className="mt-1 text-[11px] text-gray-400 uppercase tracking-wide">{unit}</p>
                        <p className="mt-1 text-xs font-medium text-gray-600">{label}</p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Macro breakdown */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-base font-semibold text-gray-800">Macro Breakdown</h2>
                      <span className="text-xs text-gray-400">{fmt(macros.calories)} kcal target</span>
                    </div>
                    <MacroBar label="Protein" grams={macros.proteinGrams} pct={protPct} color="bg-sky-400"   bgColor="#e0f2fe" />
                    <MacroBar label="Carbs"   grams={macros.carbsGrams}   pct={carbPct} color="bg-amber-400" bgColor="#fef9c3" />
                    <MacroBar label="Fat"     grams={macros.fatGrams}     pct={fatPct}  color="bg-rose-400"  bgColor="#ffe4e6" />
                  </div>

                  {/* Meal plan header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-800">Daily Meal Plan</h2>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGenerate}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                      </svg>
                      Regenerate Plan
                    </motion.button>
                  </div>

                  {/* Meal cards */}
                  <motion.div
                    className="space-y-4"
                    variants={listStagger}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence mode="popLayout">
                      {plan.meals.map((meal) => (
                        <MealCard
                          key={meal.name}
                          meal={meal}
                          onSwap={handleSwap}
                          targetMacros={macros}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {/* Daily totals footer */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Totals (actual vs target)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      {[
                        { label: "Calories", value: fmt(plan.totalCalories),         unit: "kcal", target: fmt(macros.calories),         color: "text-orange-600" },
                        { label: "Protein",  value: fmt(plan.totalProteinGrams, 1),   unit: "g",   target: fmt(macros.proteinGrams) + " g", color: "text-sky-600"    },
                        { label: "Carbs",    value: fmt(plan.totalCarbsGrams, 1),     unit: "g",   target: fmt(macros.carbsGrams) + " g",   color: "text-amber-600"  },
                        { label: "Fat",      value: fmt(plan.totalFatGrams, 1),       unit: "g",   target: fmt(macros.fatGrams) + " g",     color: "text-rose-600"   },
                      ].map(({ label, value, unit, target, color }) => (
                        <div key={label}>
                          <p className={`text-lg font-bold ${color}`}>{value} <span className="text-sm font-normal text-gray-400">{unit}</span></p>
                          <p className="text-xs text-gray-500 font-medium">{label}</p>
                          <p className="text-[11px] text-gray-300 mt-0.5">target: {target}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-100 py-5 text-center text-xs text-gray-300">
        Diet Calculator &amp; Meal Recommender &mdash; built with Next.js, Tailwind CSS &amp; Framer Motion
      </footer>
    </div>
  );
}

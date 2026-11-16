"use client";

import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type BMIClass = "underweight" | "normal" | "overweight" | "obese";
type Gender = "male" | "female";

interface Props {
  weight: number; // kg
  height: number; // cm
  gender: Gender;
}

// ─── BMI classification ───────────────────────────────────────────────────────

function classifyBMI(bmi: number): BMIClass {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25)   return "normal";
  if (bmi < 30)   return "overweight";
  return "obese";
}

// ─── Label + colour configs ───────────────────────────────────────────────────

const CONFIG: Record<
  BMIClass,
  { label: string; physique: string; ring: string; badge: string; badgeText: string }
> = {
  underweight: {
    label:      "Underweight",
    physique:   "Slim",
    ring:       "#60a5fa", // blue-400
    badge:      "bg-blue-100",
    badgeText:  "text-blue-700",
  },
  normal: {
    label:      "Normal",
    physique:   "Athletic / Fit",
    ring:       "#34d399", // emerald-400
    badge:      "bg-emerald-100",
    badgeText:  "text-emerald-700",
  },
  overweight: {
    label:      "Overweight",
    physique:   "Heavy",
    ring:       "#fbbf24", // amber-400
    badge:      "bg-amber-100",
    badgeText:  "text-amber-700",
  },
  obese: {
    label:      "Obese",
    physique:   "Obese",
    ring:       "#f87171", // red-400
    badge:      "bg-red-100",
    badgeText:  "text-red-700",
  },
};

// ─── SVG silhouettes ──────────────────────────────────────────────────────────
// Each silhouette is drawn on a 100×220 viewBox.
// Four male and four female variants for each BMI class.

function MaleSilhouette({ cls }: { cls: BMIClass }) {
  // Torso/body width scales: underweight=narrow, normal=medium, overweight=wide, obese=very wide
  const params: Record<BMIClass, { tw: number; hip: number; belly: number }> = {
    underweight: { tw: 20, hip: 18, belly: 0  },
    normal:      { tw: 26, hip: 25, belly: 2  },
    overweight:  { tw: 33, hip: 32, belly: 10 },
    obese:       { tw: 40, hip: 42, belly: 20 },
  };
  const { tw, hip, belly } = params[cls];
  const cx = 50;
  // head
  const headR = 11;
  const headY = 24;
  // shoulders
  const shoulderY = headY + headR + 4;
  const shoulderLeft  = cx - tw;
  const shoulderRight = cx + tw;
  // waist
  const waistY = shoulderY + 42;
  const waistLeft  = cx - (tw - 4 + belly * 0.3);
  const waistRight = cx + (tw - 4 + belly * 0.3);
  // belly (mid-torso bulge for overweight/obese)
  const bellyY = shoulderY + 22;
  const bellyLeft  = cx - (tw + belly);
  const bellyRight = cx + (tw + belly);
  // hips
  const hipY = waistY + 10;
  const hipLeft  = cx - hip;
  const hipRight = cx + hip;
  // legs bottom
  const legBottomY = hipY + 70;
  const legSplit = 10;

  const color = "#64748b"; // slate-500

  return (
    <svg viewBox="0 0 100 220" className="w-full h-full">
      {/* Head */}
      <circle cx={cx} cy={headY} r={headR} fill={color} />
      {/* Neck */}
      <rect x={cx - 5} y={headY + headR - 2} width={10} height={8} fill={color} rx={2} />
      {/* Torso */}
      <path
        d={`
          M ${shoulderLeft} ${shoulderY}
          C ${bellyLeft} ${bellyY}, ${waistLeft} ${waistY - 5}, ${hipLeft} ${hipY}
          L ${hipRight} ${hipY}
          C ${waistRight} ${waistY - 5}, ${bellyRight} ${bellyY}, ${shoulderRight} ${shoulderY}
          Z
        `}
        fill={color}
      />
      {/* Left arm */}
      <path
        d={`M ${shoulderLeft + 3} ${shoulderY} Q ${shoulderLeft - 8} ${shoulderY + 30} ${shoulderLeft - 4} ${shoulderY + 58}`}
        stroke={color} strokeWidth={9} fill="none" strokeLinecap="round"
      />
      {/* Right arm */}
      <path
        d={`M ${shoulderRight - 3} ${shoulderY} Q ${shoulderRight + 8} ${shoulderY + 30} ${shoulderRight + 4} ${shoulderY + 58}`}
        stroke={color} strokeWidth={9} fill="none" strokeLinecap="round"
      />
      {/* Left leg */}
      <path
        d={`M ${cx - legSplit} ${hipY + 2} Q ${cx - legSplit - 4} ${(hipY + legBottomY) / 2} ${cx - legSplit - 2} ${legBottomY}`}
        stroke={color} strokeWidth={12} fill="none" strokeLinecap="round"
      />
      {/* Right leg */}
      <path
        d={`M ${cx + legSplit} ${hipY + 2} Q ${cx + legSplit + 4} ${(hipY + legBottomY) / 2} ${cx + legSplit + 2} ${legBottomY}`}
        stroke={color} strokeWidth={12} fill="none" strokeLinecap="round"
      />
    </svg>
  );
}

function FemaleSilhouette({ cls }: { cls: BMIClass }) {
  const params: Record<BMIClass, { tw: number; waistIn: number; hip: number; belly: number }> = {
    underweight: { tw: 18, waistIn: 4, hip: 20, belly: 0  },
    normal:      { tw: 24, waistIn: 5, hip: 28, belly: 2  },
    overweight:  { tw: 30, waistIn: 3, hip: 36, belly: 9  },
    obese:       { tw: 37, waistIn: 1, hip: 45, belly: 18 },
  };
  const { tw, waistIn, hip, belly } = params[cls];
  const cx = 50;
  const headR = 11;
  const headY = 24;
  const shoulderY = headY + headR + 4;
  const shoulderLeft  = cx - tw;
  const shoulderRight = cx + tw;
  const bellyY = shoulderY + 22;
  const bellyLeft  = cx - (tw + belly);
  const bellyRight = cx + (tw + belly);
  const waistY = shoulderY + 40;
  const waistLeft  = cx - (tw - waistIn);
  const waistRight = cx + (tw - waistIn);
  const hipY = waistY + 16;
  const hipLeft  = cx - hip;
  const hipRight = cx + hip;
  const legBottomY = hipY + 68;
  const legSplit = 11;
  const color = "#94a3b8"; // slate-400 (slightly lighter for female)

  return (
    <svg viewBox="0 0 100 220" className="w-full h-full">
      {/* Head */}
      <circle cx={cx} cy={headY} r={headR} fill={color} />
      {/* Hair accent */}
      <ellipse cx={cx} cy={headY - 6} rx={12} ry={7} fill={color} opacity={0.7} />
      {/* Neck */}
      <rect x={cx - 5} y={headY + headR - 2} width={10} height={8} fill={color} rx={2} />
      {/* Torso – hourglass shape */}
      <path
        d={`
          M ${shoulderLeft} ${shoulderY}
          C ${bellyLeft} ${bellyY}, ${waistLeft} ${waistY - 4}, ${waistLeft} ${waistY}
          C ${waistLeft} ${waistY + 6}, ${hipLeft} ${hipY - 4}, ${hipLeft} ${hipY}
          L ${hipRight} ${hipY}
          C ${hipRight} ${hipY - 4}, ${waistRight} ${waistY + 6}, ${waistRight} ${waistY}
          C ${waistRight} ${waistY - 4}, ${bellyRight} ${bellyY}, ${shoulderRight} ${shoulderY}
          Z
        `}
        fill={color}
      />
      {/* Left arm */}
      <path
        d={`M ${shoulderLeft + 2} ${shoulderY} Q ${shoulderLeft - 7} ${shoulderY + 28} ${shoulderLeft - 3} ${shoulderY + 54}`}
        stroke={color} strokeWidth={8} fill="none" strokeLinecap="round"
      />
      {/* Right arm */}
      <path
        d={`M ${shoulderRight - 2} ${shoulderY} Q ${shoulderRight + 7} ${shoulderY + 28} ${shoulderRight + 3} ${shoulderY + 54}`}
        stroke={color} strokeWidth={8} fill="none" strokeLinecap="round"
      />
      {/* Left leg */}
      <path
        d={`M ${cx - legSplit} ${hipY + 2} Q ${cx - legSplit - 3} ${(hipY + legBottomY) / 2} ${cx - legSplit - 1} ${legBottomY}`}
        stroke={color} strokeWidth={12} fill="none" strokeLinecap="round"
      />
      {/* Right leg */}
      <path
        d={`M ${cx + legSplit} ${hipY + 2} Q ${cx + legSplit + 3} ${(hipY + legBottomY) / 2} ${cx + legSplit + 1} ${legBottomY}`}
        stroke={color} strokeWidth={12} fill="none" strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BodyVisualizer({ weight, height, gender }: Props) {
  const heightM = height / 100;
  const bmi = heightM > 0 ? weight / (heightM * heightM) : 0;
  const cls = classifyBMI(bmi);
  const cfg = CONFIG[cls];

  // Silhouette scale factor: underweight is thinner, obese is wider
  const scaleX: Record<BMIClass, number> = {
    underweight: 0.78,
    normal:      1.0,
    overweight:  1.18,
    obese:       1.38,
  };

  const animKey = `${cls}-${gender}`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col items-center gap-3">
      <h3 className="text-sm font-semibold text-gray-700 self-start">Estimated Shape Preview</h3>

      {/* BMI + physique badges */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${cfg.badge} ${cfg.badgeText}`}>
          BMI {bmi.toFixed(1)} — {cfg.label}
        </span>
        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-600">
          {cfg.physique}
        </span>
      </div>

      {/* Silhouette */}
      <div className="relative w-32 h-56 flex items-center justify-center">
        {/* Glowing ring */}
        <motion.div
          key={cls}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(ellipse at center, ${cfg.ring}22 0%, transparent 70%)`,
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={animKey}
            initial={{ opacity: 0, scaleX: scaleX[cls] * 0.85 }}
            animate={{ opacity: 1, scaleX: scaleX[cls] }}
            exit={{ opacity: 0, scaleX: scaleX[cls] * 0.9 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="w-full h-full"
            style={{ originX: "50%" }}
          >
            {gender === "male"
              ? <MaleSilhouette cls={cls} />
              : <FemaleSilhouette cls={cls} />
            }
          </motion.div>
        </AnimatePresence>
      </div>

      {/* BMI scale bar */}
      <div className="w-full space-y-1">
        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
          <span>Underweight</span>
          <span>Normal</span>
          <span>Overweight</span>
          <span>Obese</span>
        </div>
        <div className="relative h-2 w-full rounded-full overflow-hidden" style={{
          background: "linear-gradient(to right, #60a5fa 0%, #34d399 25%, #34d399 50%, #fbbf24 65%, #f87171 100%)"
        }}>
          <motion.div
            key={bmi}
            className="absolute top-0 h-full w-1 rounded-full bg-gray-800 shadow"
            animate={{ left: `${Math.min(Math.max(((bmi - 10) / 30) * 100, 0), 99)}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-300">
          <span>10</span>
          <span>18.5</span>
          <span>25</span>
          <span>30+</span>
        </div>
      </div>
    </div>
  );
}

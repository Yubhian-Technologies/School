export interface CellColorOption {
  value: string;
  label: string;
  swatchClassName: string;
  cellClassName: string;
}

// A small fixed palette (not a free color picker) so the grid always renders
// a consistent, accessible set of tints. Literal Tailwind classes are listed
// here so the build's class scanner picks them up even though components
// apply them via a variable.
export const CELL_COLOR_OPTIONS: CellColorOption[] = [
  { value: "indigo", label: "Indigo", swatchClassName: "bg-indigo-200", cellClassName: "bg-indigo-50" },
  { value: "green", label: "Green", swatchClassName: "bg-green-200", cellClassName: "bg-green-50" },
  { value: "amber", label: "Amber", swatchClassName: "bg-amber-200", cellClassName: "bg-amber-50" },
  { value: "red", label: "Red", swatchClassName: "bg-red-200", cellClassName: "bg-red-50" },
  { value: "sky", label: "Sky", swatchClassName: "bg-sky-200", cellClassName: "bg-sky-50" },
  { value: "blue", label: "Blue", swatchClassName: "bg-blue-200", cellClassName: "bg-blue-50" },
  { value: "violet", label: "Violet", swatchClassName: "bg-violet-200", cellClassName: "bg-violet-50" },
  { value: "purple", label: "Purple", swatchClassName: "bg-purple-200", cellClassName: "bg-purple-50" },
  { value: "fuchsia", label: "Fuchsia", swatchClassName: "bg-fuchsia-200", cellClassName: "bg-fuchsia-50" },
  { value: "pink", label: "Pink", swatchClassName: "bg-pink-200", cellClassName: "bg-pink-50" },
  { value: "rose", label: "Rose", swatchClassName: "bg-rose-200", cellClassName: "bg-rose-50" },
  { value: "orange", label: "Orange", swatchClassName: "bg-orange-200", cellClassName: "bg-orange-50" },
  { value: "yellow", label: "Yellow", swatchClassName: "bg-yellow-200", cellClassName: "bg-yellow-50" },
  { value: "lime", label: "Lime", swatchClassName: "bg-lime-200", cellClassName: "bg-lime-50" },
  { value: "emerald", label: "Emerald", swatchClassName: "bg-emerald-200", cellClassName: "bg-emerald-50" },
  { value: "teal", label: "Teal", swatchClassName: "bg-teal-200", cellClassName: "bg-teal-50" },
  { value: "cyan", label: "Cyan", swatchClassName: "bg-cyan-200", cellClassName: "bg-cyan-50" },
  { value: "slate", label: "Slate", swatchClassName: "bg-slate-200", cellClassName: "bg-slate-50" },
  { value: "gray", label: "Gray", swatchClassName: "bg-gray-200", cellClassName: "bg-gray-50" },
  { value: "stone", label: "Stone", swatchClassName: "bg-stone-200", cellClassName: "bg-stone-50" },
];

export function cellClassNameForColor(color: string | null): string {
  return CELL_COLOR_OPTIONS.find((c) => c.value === color)?.cellClassName ?? "";
}

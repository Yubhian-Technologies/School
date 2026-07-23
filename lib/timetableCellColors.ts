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
];

export function cellClassNameForColor(color: string | null): string {
  return CELL_COLOR_OPTIONS.find((c) => c.value === color)?.cellClassName ?? "";
}

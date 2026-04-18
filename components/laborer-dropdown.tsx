"use client";

import { Label } from "@/components/ui/label";

type Laborer = {
  id: number;
  created_at: string;
  name: string;
  mobile_no: string;
  default: boolean;
};

type LaborerDropdownProps = {
  laborers: Laborer[];
  selectedLaborer: Laborer | null;
  onLaborerChange: (laborer: Laborer) => void;
  onOpenSettings: () => void;
};

export function LaborerDropdown({
  laborers,
  selectedLaborer,
  onLaborerChange,
  onOpenSettings,
}: LaborerDropdownProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="laborer-select" className="text-sm dark:text-gray-300">
          Laborer
        </Label>
        <button
          onClick={onOpenSettings}
          className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
        >
          Manage
        </button>
      </div>
      <select
        id="laborer-select"
        value={selectedLaborer?.id ?? ""}
        onChange={(e) => {
          const laborer = laborers.find((l) => l.id === Number(e.target.value));
          if (laborer) onLaborerChange(laborer);
        }}
        className="w-full px-3 py-2 bg-white dark:bg-[#1a2332] border border-gray-300 dark:border-[#0047FF]/20 rounded text-sm text-foreground dark:text-white"
      >
        {laborers.map((laborer) => (
          <option key={laborer.id} value={laborer.id}>
            {laborer.name}
            {laborer.default ? " (Default)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

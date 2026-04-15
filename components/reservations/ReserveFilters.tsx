import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DrumCable = {
  id: number;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  curr_length: number;
  available: number;
};

type ReserveFiltersProps = {
  brands: { id: number; brand_name: string }[];
  types: { id: number; type_name: string }[];
  availableSizes: string[];
  availableCables: DrumCable[];
  brandFilter: string;
  typeFilter: string;
  sizeFilter: string;
  inputLength: string;
  selectedDrumId: string;
  onBrandChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onSizeChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onDrumSelect: (drumId: string) => void;
  onAddClick: () => void;
  onResetClick: () => void;
};

export function ReserveFilters({
  brands,
  types,
  availableSizes,
  availableCables,
  brandFilter,
  typeFilter,
  sizeFilter,
  inputLength,
  selectedDrumId,
  onBrandChange,
  onTypeChange,
  onSizeChange,
  onLengthChange,
  onDrumSelect,
  onAddClick,
  onResetClick,
}: ReserveFiltersProps) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-5">
        <label className="space-y-2 text-sm text-gray-300">
          Brand
          <select
            value={brandFilter}
            onChange={(e) => onBrandChange(e.target.value)}
            className="w-full rounded-md border border-input bg-[#0b1220] px-3 py-2 text-base text-white"
          >
            {brands.map((b) => (
              <option
                key={b.id}
                value={String(b.id)}
                className="bg-[#0b1220] text-white"
              >
                {b.brand_name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-gray-300">
          Type
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full rounded-md border border-input bg-[#0b1220] px-3 py-2 text-base text-white"
          >
            <option value="">Select type</option>
            {types.map((t) => (
              <option
                key={t.id}
                value={String(t.id)}
                className="bg-[#0b1220] text-white"
              >
                {t.type_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm text-gray-300">
        Size
        <div className="mt-2 grid grid-cols-4 gap-2">
          {availableSizes.length === 0 ? (
            <div className="text-sm text-gray-500">No sizes available</div>
          ) : (
            availableSizes
              .sort((a, b) => {
                const [numA1, numA2] = a.split("x").map(Number);
                const [numB1, numB2] = b.split("x").map(Number);
                return numA1 !== numB1 ? numA1 - numB1 : numA2 - numB2;
              })
              .map((s) => (
                <button
                  key={s}
                  onClick={() => onSizeChange(s)}
                  className={`px-3 py-3 rounded ${
                    sizeFilter === s
                      ? "bg-blue-500 text-white"
                      : "bg-[#1b263b] text-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))
          )}
        </div>
      </label>

      {/* Select Drum - Only show when size is selected */}
      {sizeFilter && (
        <label className="space-y-2 text-sm text-gray-300 mb-4">
          Select Drum
          <select
            value={selectedDrumId}
            onChange={(e) => onDrumSelect(e.target.value)}
            className="w-full rounded-md border border-input bg-[#0b1220] px-3 py-2 text-base text-white"
          >
            <option value="">Choose a drum</option>
            {availableCables.map((drum) => (
              <option
                key={drum.id}
                value={String(drum.id)}
                className="bg-[#0b1220] text-white"
              >
                {drum.available}m available - FROM {drum.curr_length}m
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mb-4">
        <label className="space-y-2 text-sm text-gray-300">
          Length to reserve (m)
          <Input
            type="number"
            placeholder="Length to reserve"
            value={inputLength}
            onChange={(e) => onLengthChange(e.target.value)}
          />
        </label>
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={onAddClick}>
            Add
          </Button>
          <Button variant="secondary" onClick={onResetClick}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

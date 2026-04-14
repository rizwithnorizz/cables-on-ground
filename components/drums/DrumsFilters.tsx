type DrumsFiltersProps = {
  brands: { id: number; brand_name: string }[];
  types: { id: number; type_name: string }[];
  availableSizes: string[];
  brandFilter: string;
  typeFilter: string;
  sizeFilter: string;
  onBrandChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onSizeChange: (value: string) => void;
};

export function DrumsFilters({
  brands,
  types,
  availableSizes,
  brandFilter,
  typeFilter,
  sizeFilter,
  onBrandChange,
  onTypeChange,
  onSizeChange,
}: DrumsFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Brand Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Filter by Brand
        </label>
        <select
          value={brandFilter}
          onChange={(e) => onBrandChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#0047FF]/30 text-white focus:outline-none focus:border-[#0047FF] transition-colors"
        >
          {brands.map((brand) => (
            <option
              key={brand.id}
              value={String(brand.id)}
              className="bg-[#0b1220] text-white"
            >
              {brand.brand_name}
            </option>
          ))}
        </select>
      </div>

      {/* Type Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Filter by Type
        </label>
        <select
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#0047FF]/30 text-white focus:outline-none focus:border-[#0047FF] transition-colors"
        >
          {types.map((type) => (
            <option
              key={type.id}
              value={String(type.id)}
              className="bg-[#0b1220] text-white"
            >
              {type.type_name}
            </option>
          ))}
        </select>
      </div>

      {/* Size Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Filter by Size
        </label>
        <select
          value={sizeFilter}
          onChange={(e) => onSizeChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-[#1a1f3a] border border-[#0047FF]/30 text-white focus:outline-none focus:border-[#0047FF] transition-colors"
        >
          <option value="">All Sizes</option>
          {availableSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type DrumCable = {
  id: bigint;
  drum_id: string;
  brand: number | string;
  type: number | string;
  size: string;
  reserved: boolean;
  curr_length: number;
  initial_length: number;
  testcertificate?: string | null;
};

type CableType = {
  id: number;
  type_name: string;
};

type CableBrand = {
  id: number;
  brand_name: string;
};

type StockByBrandType = {
  brand: string;
  type: string;
  sizes: Record<
    string,
    {
      totalLength: number;
      totalInitialLength: number;
      count: number;
    }
  >;
};

type FilterState = {
  brand: string | null;
  type: string | null;
  size: string | null;
};

export function StockByType() {
  const supabase = createClient();
  const [cables, setCables] = useState<DrumCable[]>([]);
  const [types, setTypes] = useState<CableType[]>([]);
  const [brands, setBrands] = useState<CableBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({
    brand: null,
    type: null,
    size: null,
  });

  // Load data from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const [cablesResult, typesResult, brandsResult] = await Promise.all([
          supabase
            .from("drum_cables")
            .select("*")
            .order("curr_length", { ascending: false }),
          supabase
            .from("type")
            .select("*")
            .order("type_name", { ascending: true }),
          supabase
            .from("brand")
            .select("*")
            .order("brand_name", { ascending: true }),
        ]);

        if (cablesResult.error || typesResult.error || brandsResult.error) {
          throw cablesResult.error || typesResult.error || brandsResult.error;
        }

        if (isMounted) {
          setCables(cablesResult.data ?? []);
          setTypes(typesResult.data ?? []);
          setBrands(brandsResult.data ?? []);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setCables([]);
          setTypes([]);
          setBrands([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Create lookup maps
  const brandMap = useMemo(
    () =>
      Object.fromEntries(
        brands.map((brand) => [String(brand.id), brand.brand_name]),
      ),
    [brands],
  );

  const typeMap = useMemo(
    () =>
      Object.fromEntries(
        types.map((type) => [String(type.id), type.type_name]),
      ),
    [types],
  );

  // Sort sizes numerically by prefix and postfix (e.g., 1x10, 1x16, 2x10, 2x16)
  const sortSizesNumeric = (sizes: string[]): string[] => {
    return [...sizes].sort((a, b) => {
      const aParts = a.split("x").map((p) => parseInt(p, 10));
      const bParts = b.split("x").map((p) => parseInt(p, 10));

      // First sort by prefix (first number)
      if (aParts[0] !== bParts[0]) {
        return aParts[0] - bParts[0];
      }

      // Then sort by postfix (second number)
      return aParts[1] - bParts[1];
    });
  };
  // Group data by brand and type, then sum by size
  const groupedData = useMemo(() => {
    const grouped = new Map<string, StockByBrandType>();

    cables.forEach((cable) => {
      const brandName = brandMap[String(cable.brand)] || "Unknown Brand";
      const typeName = typeMap[String(cable.type)] || "Unknown Type";
      const key = `${brandName}|${typeName}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          brand: brandName,
          type: typeName,
          sizes: {},
        });
      }

      const entry = grouped.get(key)!;
      if (!entry.sizes[cable.size]) {
        entry.sizes[cable.size] = {
          totalLength: 0,
          totalInitialLength: 0,
          count: 0,
        };
      }
      entry.sizes[cable.size].totalLength += cable.curr_length;
      entry.sizes[cable.size].totalInitialLength += cable.initial_length;
      entry.sizes[cable.size].count += 1;
    });
    return Array.from(grouped.values());
  }, [cables, brandMap, typeMap]);

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const uniqueBrands = new Set<string>();
    const uniqueTypes = new Set<string>();
    const uniqueSizes = new Set<string>();

    groupedData.forEach((item) => {
      uniqueBrands.add(item.brand);
      uniqueTypes.add(item.type);
      Object.keys(item.sizes).forEach((size) => uniqueSizes.add(size));
    });
    return {
      brands: Array.from(uniqueBrands).sort(),
      types: Array.from(uniqueTypes).sort(),
      sizes: sortSizesNumeric(Array.from(uniqueSizes)),
    };
  }, [groupedData]);

  // Set default selections to first index (brand and type only, not size)
  useEffect(() => {
    if (filterOptions.brands.length > 0 && !filters.brand) {
      setFilters((prev) => ({
        ...prev,
        brand: filterOptions.brands[0],
      }));
    }

    if (filterOptions.types.length > 0 && !filters.type) {
      setFilters((prev) => ({
        ...prev,
        type: filterOptions.types[0],
      }));
    }
  }, [filterOptions.brands, filterOptions.types, filters.brand, filters.type]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return groupedData.filter((item) => {
      if (filters.brand && item.brand !== filters.brand) return false;
      if (filters.type && item.type !== filters.type) return false;
      return true;
    });
  }, [groupedData, filters]);

  // Get sizes for the current filtered data (brand and type only)
  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    filteredData.forEach((item) => {
      Object.keys(item.sizes).forEach((size) => sizes.add(size));
    });
    return sortSizesNumeric(Array.from(sizes));
  }, [filteredData, sortSizesNumeric]);

  const handleFilterChange = (
    filterType: keyof FilterState,
    value: string | null,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({ brand: null, type: null, size: null });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg p-6 shadow-lg dark:shadow-[#0047FF]/10">
        <div className="text-center text-gray-400">Loading stock data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg p-6 shadow-lg dark:shadow-[#0047FF]/10">
        <div className="text-center text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg p-6 shadow-lg dark:shadow-[#0047FF]/10">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Stocks by Brand & Type (meters)
      </h2>

      {/* Filter Controls */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-[#0b1220] rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Brand Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brand
            </label>
            <select
              value={filters.brand || ""}
              onChange={(e) =>
                handleFilterChange("brand", e.target.value || null)
              }
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-[#0047FF]/30 bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#0047FF]"
            >
              <option value="">All Brands</option>
              {filterOptions.brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              value={filters.type || ""}
              onChange={(e) =>
                handleFilterChange("type", e.target.value || null)
              }
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-[#0047FF]/30 bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#0047FF]"
            >
              <option value="">All Types</option>
              {filterOptions.types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Size
            </label>
            <select
              value={filters.size || ""}
              onChange={(e) =>
                handleFilterChange("size", e.target.value || null)
              }
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-[#0047FF]/30 bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#0047FF]"
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

        {/* Reset Button */}
        {(filters.brand || filters.type || filters.size) && (
          <button
            onClick={resetFilters}
            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Stock Items */}
      <div className="space-y-6">
        {filteredData.length > 0 ? (
          filteredData.map((item) => (
            <div key={`${item.brand}|${item.type}`}>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.brand}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.type}
                </p>
              </div>

              {/* Sizes for this brand/type combination */}
              <div className="space-y-3 ml-4 overflow-y-auto max-h-[60vh]">
                {sortSizesNumeric(Object.keys(item.sizes)).map((size) => {
                  const sizeData = item.sizes[size];
                  // Check if size filter is applied
                  if (filters.size && size !== filters.size) {
                    return null;
                  }

                  return (
                    <div key={size}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {size}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {sizeData.count} cables
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {sizeData.totalLength} {"(m)"} Total
                        </p>
                      </div>
                      <div className="w-full bg-gray-300 dark:bg-[#0b1220] rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 dark:from-[#0047FF] to-blue-400 dark:to-[#00C8FF] h-2 rounded-full"
                          style={{
                            width: `${
                              (sizeData.totalLength /
                                sizeData.totalInitialLength) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No stock items match the selected filters
          </p>
        )}
      </div>

      <Link href="/cables_view">
        <p className="text-blue-500 dark:text-[#00C8FF] text-sm font-medium mt-6 hover:text-blue-600 dark:hover:text-[#0047FF] transition-colors">
          View full breakdown →
        </p>
      </Link>
    </div>
  );
}

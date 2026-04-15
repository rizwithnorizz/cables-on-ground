'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import CableModal from '@/components/cable-modal';
import { DrumsFilters, DrumsGrid } from './drums';
import { ExcelExport } from './drums/ExcelExport';

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

export function DrumsTable() {
  const supabase = createClient();
  const [cables, setCables] = useState<DrumCable[]>([]);
  const [types, setTypes] = useState<CableType[]>([]);
  const [brands, setBrands] = useState<CableBrand[]>([]);
  const [selectedCable, setSelectedCable] = useState<DrumCable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filter states
  const [brandFilter, setBrandFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');

  // Load cables and lookup tables from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const [cablesResult, typesResult, brandsResult] = await Promise.all([
          supabase.from('drum_cables').select('*').order('curr_length', { ascending: false }),
          supabase.from('type').select('*').order('type_name', { ascending: true }),
          supabase.from('brand').select('*').order('brand_name', { ascending: true }),
        ]);

        if (cablesResult.error || typesResult.error || brandsResult.error) {
          throw cablesResult.error || typesResult.error || brandsResult.error;
        }

        if (isMounted) {
          setCables(cablesResult.data ?? []);
          setTypes(typesResult.data ?? []);
          setBrands(brandsResult.data ?? []);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load drums');
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

  // Default brand/type filters to first lookup values when available
  useEffect(() => {
    if (!brandFilter && brands.length > 0) {
      setBrandFilter(String(brands[0].id));
    }

    if (!typeFilter && types.length > 1) {
      setTypeFilter(String(types[1].id));
    }
  }, [brands, types, brandFilter, typeFilter]);

  // Helper function to sort sizes numerically by core (first number) then size (second number) (e.g., 1x10, 1x16, 2x10, 2x16, 4x10, 4x16)
  const numericSizeSort = (a: string, b: string) => {
    const getParts = (size: string) => {
      const parts = size.split('x').map(p => parseInt(p, 10));
      return parts.length === 2 ? { core: parts[0], size: parts[1] } : { core: 0, size: 0 };
    };
    
    const aParts = getParts(a);
    const bParts = getParts(b);
    
    // First sort by core (ascending)
    if (aParts.core !== bParts.core) {
      return aParts.core - bParts.core;
    }
    
    // Then sort by size (ascending)
    return aParts.size - bParts.size;
  };

  const uniqueSizes = useMemo(() => {
    return Array.from(new Set(cables.map(c => c.size))).sort(numericSizeSort);
  }, [cables]);

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((brand) => [String(brand.id), brand.brand_name])),
    [brands],
  );

  const typeMap = useMemo(
    () => Object.fromEntries(types.map((type) => [String(type.id), type.type_name])),
    [types],
  );

  // Get available sizes based on selected type and brand
  const availableSizes = useMemo(() => {
    let filtered = cables;

    if (brandFilter) {
      filtered = filtered.filter(c => String(c.brand) === brandFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(c => String(c.type) === typeFilter);
    }

    return Array.from(new Set(filtered.map(c => c.size))).sort(numericSizeSort);
  }, [cables, brandFilter, typeFilter]);

  // Clear size filter if it's no longer available
  useEffect(() => {
    if (sizeFilter && !availableSizes.includes(sizeFilter)) {
      setSizeFilter('');
    }
  }, [availableSizes, sizeFilter]);

  // Group cables by size and sort sizes descending
  const cablesBySize = useMemo(() => {
    const grouped = cables.reduce((acc, cable) => {
      if (!acc[cable.size]) {
        acc[cable.size] = [];
      }
      acc[cable.size].push(cable);
      return acc;
    }, {} as Record<string, DrumCable[]>);

    // Sort sizes in ascending numeric order
    const sortedSizes = Object.keys(grouped).sort(numericSizeSort);

    return sortedSizes.reduce((acc, size) => {
      acc[size] = grouped[size];
      return acc;
    }, {} as Record<string, DrumCable[]>);
  }, [cables]);

  // Filter cables by size groups
  const filteredCablesBySize = useMemo(() => {
    const filtered = {} as Record<string, DrumCable[]>;

    Object.entries(cablesBySize).forEach(([size, cablesInSize]) => {
      const filteredCables = cablesInSize.filter(cable => {
        const matchBrand = !brandFilter || String(cable.brand) === brandFilter;
        const matchType = !typeFilter || String(cable.type) === typeFilter;
        const matchSize = !sizeFilter || cable.size === sizeFilter;
        return matchBrand && matchType && matchSize;
      });

      if (filteredCables.length > 0) {
        filtered[size] = filteredCables;
      }
    });

    return filtered;
  }, [cablesBySize, brandFilter, typeFilter, sizeFilter]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-400">Loading drums...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 relative z-10">
      <div>
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#0047FF] to-[#00C8FF] bg-clip-text text-transparent">
          Drums Inventory
        </h1>

        {/* Filters */}
        <DrumsFilters
          brands={brands}
          types={types}
          availableSizes={availableSizes}
          brandFilter={brandFilter}
          typeFilter={typeFilter}
          sizeFilter={sizeFilter}
          onBrandChange={setBrandFilter}
          onTypeChange={setTypeFilter}
          onSizeChange={setSizeFilter}
        />

        {/* Download Button */}
        <div className="mb-4 flex justify-end">
          <ExcelExport cables={cables} types={types} brands={brands} brandMap={brandMap} typeMap={typeMap} />
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-400 mb-4">
          Showing {Object.values(filteredCablesBySize).flat().length} of {cables.length} drums
        </div>

        {/* Drums Grid */}
        <DrumsGrid
          filteredCablesBySize={filteredCablesBySize}
          numericSizeSort={numericSizeSort}
          onSelectCable={setSelectedCable}
        />

        {/* Modal */}
        <CableModal
          cable={selectedCable}
          onClose={() => setSelectedCable(null)}
          brandName={selectedCable ? brandMap[String(selectedCable.brand)] : undefined}
          typeName={selectedCable ? typeMap[String(selectedCable.type)] : undefined}
          onDelete={(cableId) => {
            setCables(prevCables => prevCables.filter(c => c.id !== cableId));
          }}
        />
      </div>
    </div>
  );
}

import { CableCard } from "./CableCard";

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

type DrumsGridProps = {
  filteredCablesBySize: Record<string, DrumCable[]>;
  numericSizeSort: (a: string, b: string) => number;
  onSelectCable: (cable: DrumCable) => void;
};

export function DrumsGrid({
  filteredCablesBySize,
  numericSizeSort,
  onSelectCable,
}: DrumsGridProps) {
  const sizes = Object.keys(filteredCablesBySize).sort(numericSizeSort);

  if (sizes.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No drums found matching the selected filters
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
      <table className="border-collapse sticky top-0">
        <thead className="sticky top-0 z-20 bg-[#111827]/30 backdrop-blur-sm">
          <tr>
            {sizes.map((size) => (
              <th key={size}>
                <div className="px-4 py-3 text-center text-2xl font-semibold text-gray-300 shadow-inner shadow-[#0047FF] bg-[#1a1f3a] rounded-xl">
                  {size}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(
            {
              length: Math.max(
                ...Object.values(filteredCablesBySize).map(
                  (cables) => cables.length
                )
              ),
            },
            (_, rowIndex) => (
              <tr
                key={rowIndex}
                className="divide-x divide-[#0047FF]/30"
              >
                {sizes.map((size) => {
                  const cable = filteredCablesBySize[size][rowIndex];
                  return (
                    <td
                      key={size}
                      className="px-4 py-2 min-w-[10rem] max-w-[10rem] align-top"
                    >
                      <CableCard
                        cable={cable || null}
                        onSelect={onSelectCable}
                      />
                    </td>
                  );
                })}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

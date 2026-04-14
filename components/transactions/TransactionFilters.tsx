import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TransactionFiltersProps = {
  searchQuery: string;
  fromDate: string;
  toDate: string;
  onSearchChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onClearFilters: () => void;
};

export function TransactionFilters({
  searchQuery,
  fromDate,
  toDate,
  onSearchChange,
  onFromDateChange,
  onToDateChange,
  onClearFilters,
}: TransactionFiltersProps) {
  return (
    <>
      {/* Filter Inputs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm text-gray-300">
          Search (Ref or Drum ID)
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
          />
        </label>
        <label className="space-y-2 text-sm text-gray-300">
          From Date
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm text-gray-300">
          To Date
          <Input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
        </label>
      </div>

      {/* Clear Filters Button */}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    </>
  );
}

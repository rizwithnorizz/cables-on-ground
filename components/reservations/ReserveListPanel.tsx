import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReserveListItem } from "./ReserveListItem";

type ReserveItem = {
  id: number;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  available: number;
  reserveLength: string;
  reservationRef?: string;
  reserve_version: number;
};

type ReserveListPanelProps = {
  items: ReserveItem[];
  selectedDrumId: string;
  reservationRef: string;
  nextReservationId: number | null;
  brands: { id: number; brand_name: string }[];
  types: { id: number; type_name: string }[];
  submitting: boolean;
  onDrumSelect: (drumId: string) => void;
  onReservationRefChange: (value: string) => void;
  onLengthChange: (reserveVersion: number, value: string) => void;
  onRemoveItem: (reserveVersion: number) => void;
  onSubmit: () => void;
  onClear: () => void;
};

export function ReserveListPanel({
  items,
  selectedDrumId,
  reservationRef,
  nextReservationId,
  brands,
  types,
  submitting,
  onDrumSelect,
  onReservationRefChange,
  onLengthChange,
  onRemoveItem,
  onSubmit,
  onClear,
}: ReserveListPanelProps) {
  const brandMap = Object.fromEntries(
    brands.map((b) => [String(b.id), b.brand_name])
  );
  const typeMap = Object.fromEntries(
    types.map((t) => [String(t.id), t.type_name])
  );

  return (
    <div className="bg-secondary dark:bg-[#071025] border border-gray-200 dark:border-[#0b1220] rounded-md p-4">
      <h3 className="text-sm font-semibold text-foreground dark:text-white mb-2">Reserve List</h3>

      {/* Reservation ID Display */}
      <div className="mb-3 p-2 bg-[#0047FF]/10 border border-[#0047FF]/30 rounded text-sm text-muted-foreground dark:text-gray-300">
        <label className="flex text-sm text-black dark:text-gray-300 w-full">
          Reservation ID:  <p className="font-semibold ml-2 dark:text-white"> {nextReservationId ?? "—"} </p>
        </label>
      </div>

      {/* Reference Input */}
      <label className="space-y-2 text-sm dark:text-gray-300 mb-3">
        Reference
        <Input
          className="mb-3"
          placeholder="Reference/Description"
          value={reservationRef}
          onChange={(e) => onReservationRefChange(e.target.value)}
        />
      </label>

      {/* Reserve Items List */}
      {items.length === 0 ? (
        <div className="text-sm text-gray-400 mb-4">No cables added yet.</div>
      ) : (
        <div className="space-y-3 mb-4 max-h-[380px] overflow-auto">
          {items.map((item) => (
            <ReserveListItem
              key={item.reserve_version}
              item={item}
              brandName={brandMap[String(item.brand)] || "Unknown"}
              typeName={typeMap[String(item.type)] || "Unknown"}
              onLengthChange={(value) =>
                onLengthChange(item.reserve_version, value)
              }
              onRemove={() => onRemoveItem(item.reserve_version)}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onSubmit}
          disabled={submitting || items.length === 0}
          className="flex-1 bg-orange-700"
        >
          {submitting ? "Submitting…" : "Submit Reservations"}
        </Button>
        <Button variant="secondary" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

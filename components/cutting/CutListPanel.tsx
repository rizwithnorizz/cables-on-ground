import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CutListItem } from "./CutListItem";

type CutItem = {
  id: string;
  size: string;
  type: number;
  drum_id: string;
  available: number;
  cutLength: string;
  refNo?: string;
  cut_version: number;
};

type CutListPanelProps = {
  items: CutItem[];
  transactionRef: string;
  reservationIdInput: string;
  isLoadingReservation: boolean;
  brands: { id: number; brand_name: string }[];
  types: { id: number; type_name: string }[];
  submitting: boolean;
  onReservationIdChange: (value: string) => void;
  onFindReservation: () => void;
  onTransactionRefChange: (value: string) => void;
  onLengthChange: (cutVersion: number, value: string) => void;
  onRemoveItem: (cutVersion: number) => void;
  onSubmit: () => void;
  onClear: () => void;
};

export function CutListPanel({
  items,
  transactionRef,
  reservationIdInput,
  isLoadingReservation,
  brands,
  types,
  submitting,
  onReservationIdChange,
  onFindReservation,
  onTransactionRefChange,
  onLengthChange,
  onRemoveItem,
  onSubmit,
  onClear,
}: CutListPanelProps) {
  const brandMap = Object.fromEntries(
    brands.map((b) => [String(b.id), b.brand_name])
  );
  const typeMap = Object.fromEntries(
    types.map((t) => [String(t.id), t.type_name])
  );

  return (
    <div className="bg-[#071025] border border-[#0b1220] rounded-md p-4">
      <h3 className="text-sm font-semibold text-white mb-2">Cut List</h3>
      
      {/* Reservation Input Section */}
      <div className="mb-3 p-2 bg-[#0047FF]/10 border border-[#0047FF]/30 rounded text-sm text-gray-300">
        <label className="space-y-2 text-sm text-gray-300 mb-3 w-full">
          Enter Reservation ID
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Reservation ID"
              value={reservationIdInput}
              onChange={(e) => onReservationIdChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onFindReservation();
                }
              }}
            />
            <Button
              onClick={onFindReservation}
              disabled={isLoadingReservation}
              className="px-4"
            >
              {isLoadingReservation ? "Finding…" : "Find"}
            </Button>
          </div>
        </label>
      </div>

      {/* Reference Input */}
      <label className="space-y-2 text-sm text-gray-300 mb-3">
        Reference
        <Input
          className="mb-3"
          placeholder="Reference/Description"
          value={transactionRef}
          onChange={(e) => onTransactionRefChange(e.target.value)}
        />
      </label>

      {/* Cut Items List */}
      {items.length === 0 ? (
        <div className="text-sm text-gray-400 mb-4">No cables added yet.</div>
      ) : (
        <div className="space-y-3 mb-4 max-h-[380px] overflow-auto">
          {items.map((item) => (
            <CutListItem
              key={item.cut_version}
              item={item}
              brandName={brandMap[String(item.type)] || "Unknown"}
              typeName={typeMap[String(item.type)] || "Unknown"}
              onLengthChange={(value) =>
                onLengthChange(item.cut_version, value)
              }
              onRemove={() => onRemoveItem(item.cut_version)}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onSubmit}
          disabled={submitting || items.length === 0}
          className="flex-1"
        >
          {submitting ? "Submitting…" : "Submit Cuts"}
        </Button>
        <Button variant="secondary" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

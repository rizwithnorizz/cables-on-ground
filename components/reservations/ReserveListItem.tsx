import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

type ReserveListItemProps = {
  item: ReserveItem;
  brandName: string;
  typeName: string;
  onLengthChange: (value: string) => void;
  onRemove: () => void;
};

export function ReserveListItem({
  item,
  brandName,
  typeName,
  onLengthChange,
  onRemove,
}: ReserveListItemProps) {
  return (
    <div className="flex items-center gap-3 bg-[#0b1220] p-3 rounded">
      <div className="flex-1">
        <Input
          type="number"
          placeholder="Length"
          value={item.reserveLength}
          onChange={(e) => onLengthChange(e.target.value)}
          className="w-24"
        />
      </div>
      <div className="flex flex-col w-full text-sm text-gray-400">
        <div>
          {brandName} - {typeName}
        </div>
        <div>{item.drum_id}</div>
      </div>
      <div className="text-lg w-full flex justify-center text-white font-semibold">
        {item.size} - {item.available}m
      </div>
      <Button variant="destructive" type="button" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

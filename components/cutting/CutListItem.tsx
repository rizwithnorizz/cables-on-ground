import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

type CutListItemProps = {
  item: CutItem;
  brandName: string;
  typeName: string;
  onLengthChange: (value: string) => void;
  onRemove: () => void;
};

export function CutListItem({
  item,
  brandName,
  typeName,
  onLengthChange,
  onRemove,
}: CutListItemProps) {
  return (
    <div className="flex items-center gap-3 bg-secondary dark:bg-[#0b1220] p-3 rounded border border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <Input
        disabled={true}
          type="number"
          placeholder="Length"
          value={item.cutLength}
          onChange={(e) => onLengthChange(e.target.value)}
          className="w-24 disabled:opacity-100 dark:disabled:bg-[#0b1220 flex justify-center items-center text-center dark:disabled:text-gray-300"
        />
      </div>
      <div className="flex flex-col w-full text-sm text-muted-foreground dark:text-gray-400">
        <div>
          {brandName} - {typeName}
        </div>
        <div>{item.drum_id}</div>
      </div>
      <div className="text-lg w-full flex justify-center text-foreground dark:text-white font-semibold">
        {item.size} - {item.available}m
      </div>
      <Button variant="destructive" type="button" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

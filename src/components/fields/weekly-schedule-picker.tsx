import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface ScheduleEntry {
  day: string;
  start: string;
  end: string;
}

export interface WeeklySchedulePickerProps {
  value: ScheduleEntry[];
  onChange: (value: ScheduleEntry[]) => void;
  disabled?: boolean;
  defaultStart?: string;
  defaultEnd?: string;
  className?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Generic day-of-week + time-range picker — not tied to any one "pickup timing" use case. */
export function WeeklySchedulePicker({
  value,
  onChange,
  disabled,
  defaultStart = "09:00",
  defaultEnd = "17:00",
  className,
}: WeeklySchedulePickerProps) {
  const entryFor = (day: string) => value.find((entry) => entry.day === day);

  const toggleDay = (day: string) => {
    if (entryFor(day)) {
      onChange(value.filter((entry) => entry.day !== day));
    } else {
      onChange([...value, { day, start: defaultStart, end: defaultEnd }]);
    }
  };

  const updateTime = (day: string, field: "start" | "end", time: string) => {
    onChange(value.map((entry) => (entry.day === day ? { ...entry, [field]: time } : entry)));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => {
          const selected = Boolean(entryFor(day));
          return (
            <Badge
              key={day}
              variant={selected ? "default" : "outline"}
              className={cn(
                "cursor-pointer select-none px-3 py-1",
                disabled && "pointer-events-none opacity-50",
              )}
              onClick={() => !disabled && toggleDay(day)}
              role="checkbox"
              aria-checked={selected}
              tabIndex={0}
            >
              {day}
            </Badge>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="space-y-2">
          {DAYS.filter((day) => entryFor(day)).map((day) => {
            const entry = entryFor(day)!;
            return (
              <div key={day} className="flex items-center gap-2 text-sm">
                <span className="w-10 font-medium">{day}</span>
                <Input
                  type="time"
                  value={entry.start}
                  disabled={disabled}
                  onChange={(e) => updateTime(day, "start", e.target.value)}
                  className="w-32"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={entry.end}
                  disabled={disabled}
                  onChange={(e) => updateTime(day, "end", e.target.value)}
                  className="w-32"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

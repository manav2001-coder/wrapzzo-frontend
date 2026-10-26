import * as React from "react";

import { DatePicker } from "@/components/fields/date-picker";
import { DateRangePicker, type DateRangeValue } from "@/components/fields/date-range-picker";
import { DateTimePicker } from "@/components/fields/date-time-picker";
import {
  WeeklySchedulePicker,
  type ScheduleEntry,
} from "@/components/fields/weekly-schedule-picker";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";

export function PickersSection() {
  const [tripDate, setTripDate] = React.useState<Date | null>(null);
  const [departure, setDeparture] = React.useState<Date | null>(null);
  const [window, setWindow] = React.useState<DateRangeValue | undefined>(undefined);
  const [schedule, setSchedule] = React.useState<ScheduleEntry[]>([
    { day: "Mon", start: "06:00", end: "22:00" },
  ]);

  return (
    <section id="pickers" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Pickers</h2>

      <ComponentDemo
        title="DatePicker"
        description="Popover + Calendar with Clear/Cancel/Apply."
        code={`<DatePicker value={tripDate} onChange={setTripDate} placeholder="Trip date" />`}
      >
        <div className="w-56">
          <DatePicker value={tripDate} onChange={setTripDate} placeholder="Trip date" />
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="DateTimePicker"
        description="Adds a time input alongside the calendar."
        code={`<DateTimePicker value={departure} onChange={setDeparture} placeholder="Departure time" />`}
      >
        <div className="w-64">
          <DateTimePicker value={departure} onChange={setDeparture} placeholder="Departure time" />
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="DateRangePicker"
        description="One trigger, two months and a rail of quick ranges. Emits a [from, to] pair of YYYY-MM-DD strings; a preset commits straight away, a hand-picked range waits for Apply. Backs the table's dateRange column filter."
        code={`<DateRangePicker value={window} onChange={setWindow} />`}
      >
        <div className="w-64">
          <DateRangePicker value={window} onChange={setWindow} />
        </div>
      </ComponentDemo>

      <ComponentDemo
        title="WeeklySchedulePicker"
        description="Day-of-week + time-range picker for a recurring delivery window."
        code={`<WeeklySchedulePicker value={schedule} onChange={setSchedule} />`}
      >
        <WeeklySchedulePicker value={schedule} onChange={setSchedule} />
      </ComponentDemo>
    </section>
  );
}

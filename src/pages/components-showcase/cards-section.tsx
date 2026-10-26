import { Gift, TriangleAlert, Truck } from "lucide-react";

import { StatCard } from "@/components/stat-card";
import { ComponentDemo } from "@/pages/components-showcase/component-demo";

export function CardsSection() {
  return (
    <section id="cards" className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">Cards</h2>

      <ComponentDemo
        title="StatCard"
        description="The one metric card. Default, clickable+active, destructive, compact, and loading variants."
        code={`<StatCard title="Orders this month" value={128} icon={Gift} description="Campaign and Quick Gift" />
<StatCard title="Delivered on time" value="94%" color="primary" icon={Truck} active onClick={() => {}} />
<StatCard title="Awaiting artwork review" value={6} color="destructive" icon={TriangleAlert} />
<StatCard title="Quick Gifts pending" value={12} compact />
<StatCard title="Loading…" value={0} loading />`}
      >
        <StatCard
          title="Orders this month"
          value={128}
          icon={Gift}
          description="Campaign and Quick Gift"
          className="w-52"
        />
        <StatCard
          title="Delivered on time"
          value="94%"
          color="primary"
          icon={Truck}
          active
          onClick={() => {}}
          className="w-52"
        />
        <StatCard
          title="Awaiting artwork review"
          value={6}
          color="destructive"
          icon={TriangleAlert}
          className="w-52"
        />
        <StatCard title="Quick Gifts pending" value={12} compact className="w-40" />
        <StatCard title="Loading…" value={0} loading className="w-52" />
      </ComponentDemo>
    </section>
  );
}

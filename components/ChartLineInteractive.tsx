"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "An interactive line chart";

// const chartConfig = {
//   views: { label: "Page Views" },
//   desktop: { label: "Desktop", color: "var(--chart-1)" },
//   mobile: { label: "Mobile", color: "var(--chart-2)" },
// } satisfies ChartConfig;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartLineInteractive({ data }: { data: any[] }) {
  data = data ?? [];

  const [activeChart, setActiveChart] = React.useState<"Sales" | "EBITDA">(
    "Sales"
  );

  const total = React.useMemo(
    () => ({
      Sales: data.reduce(
        (acc, curr) => acc + (parseFloat(curr["Sales"]) || 0),
        0
      ),
      EBITDA: data.reduce(
        (acc, curr) => acc + (parseFloat(curr["EBITDA"]) || 0),
        0
      ),
    }),
    [data]
  );

  return (
    <Card className="py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>Line Chart - Interactive</CardTitle>
          <CardDescription>Showing Sales & EBITDA over time</CardDescription>
        </div>
        <div className="flex">
          {["Sales", "EBITDA"].map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key as "Sales" | "EBITDA")}
            >
              <span className="text-muted-foreground text-xs">{key}</span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {total[key as "Sales" | "EBITDA"].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={{}} className="aspect-auto h-[250px] w-full">
          <LineChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="Store" // <-- Change here
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey={activeChart}
                  labelFormatter={(value) => value}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={
                activeChart === "Sales"
                  ? "#6366f1"
                  : activeChart === "EBITDA"
                  ? "#ef4444"
                  : ""
              }
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

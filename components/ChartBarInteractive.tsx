"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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

export const description = "An interactive bar chart";

// const chartConfig = {
//   views: { label: "Page Views" },
//   desktop: { label: "Desktop", color: "var(--chart-2)" },
//   mobile: { label: "Mobile", color: "var(--chart-1)" },
// } satisfies ChartConfig;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFoodCostPercent(row: any) {
  return row.Sales
    ? (parseFloat(row.Purchases) / parseFloat(row.Sales)) * 100
    : 0;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPayrollPercent(row: any) {
  return row.Sales
    ? (parseFloat(row["Payroll (Adjusted)"]) / parseFloat(row.Sales)) * 100
    : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartBarInteractive({ data }: { data: any[] }) {
  data = data ?? [];

  const [activeChart, setActiveChart] = React.useState<
    "Food Cost %" | "Payroll %"
  >("Food Cost %");

  const total = React.useMemo(
    () => ({
      "Food Cost %": data.reduce(
        (acc, curr) => acc + getFoodCostPercent(curr),
        0
      ),
      "Payroll %": data.reduce((acc, curr) => acc + getPayrollPercent(curr), 0),
    }),
    [data]
  );

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>Bar Chart - Interactive</CardTitle>
          <CardDescription>
            Showing Food Cost % & Payroll % over time
          </CardDescription>
        </div>
        <div className="flex">
          {["Food Cost %", "Payroll %"].map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key as "Food Cost %" | "Payroll %")}
            >
              <span className="text-muted-foreground text-xs">{key}</span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {total[key as "Food Cost %" | "Payroll %"].toLocaleString(
                  undefined,
                  { maximumFractionDigits: 2 }
                )}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={{}} className="aspect-auto h-[250px] w-full">
          <BarChart
            data={data.map((row) => ({
              Store: row.Store, // <-- Change here
              "Food Cost %": getFoodCostPercent(row),
              "Payroll %": getPayrollPercent(row),
            }))}
            margin={{ left: 12, right: 12 }}
          >
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
            <Bar
              dataKey={activeChart}
              fill={activeChart === "Food Cost %" ? "#6366f1" : "#10b981"}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { useAuth } from "../AuthProvider";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
);

interface DataRow {
  month: string;
  store: string;
  sales: number;
  salesofServices: number;
  purchases: number;
  payroll: number;
  severance: number;
  blueExpenses: number;
  utilities: number;
  otherExpenses: number;
  pepeExpenses: number;
  contributionMargin: number;
  rent: number;
  fees: number;
  ebitda: number;
  bankExpenses: number;
  netProfit: number;
  [key: string]: string | number; // Allow string index access
}

const FinancialDashboard = () => {
  const { role, assignedStores, logout } = useAuth();
  const [availableLinks, setAvailableLinks] = useState<any[]>([]);
  const [selectedActualUrl, setSelectedActualUrl] = useState("");
  const [selectedBudgetUrl, setSelectedBudgetUrl] = useState("");
  const [actualDataRaw, setActualDataRaw] = useState<DataRow[]>([]);
  const [budgetDataRaw, setBudgetDataRaw] = useState<DataRow[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stores =
    actualDataRaw.length > 0
      ? [...new Set(actualDataRaw.map((d) => d.store))]
      : [];
  const months =
    actualDataRaw.length > 0
      ? [...new Set(actualDataRaw.map((d) => d.month))]
      : [];

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYTDMonth, setSelectedYTDMonth] = useState("");
  const [viewMode, setViewMode] = useState<"single" | "compare" | "ytd">(
    "single",
  );
  const [compareMode, setCompareMode] = useState<
    "actual-budget" | "store-store"
  >("actual-budget");
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedStore2, setSelectedStore2] = useState("");
  const [excludesalesofServices, setExcludesalesofServices] = useState(false);
  const [excludeBlueExpenses, setExcludeBlueExpenses] = useState(false);
  const [excludePepeExpenses, setExcludePepeExpenses] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const availableColumns = useMemo(() => {
    if (actualDataRaw.length === 0) return [];
    return Object.keys(actualDataRaw[0]).filter(
      (key) => key !== "month" && key !== "store",
    );
  }, [actualDataRaw]);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/excel_links");
        const data = await res.json();
        setAvailableLinks(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load available Excel files");
        setLoading(false);
      }
    };
    fetchLinks();
  }, []);

  useEffect(() => {
    if (stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0]);
      if (stores.length > 1) setSelectedStore2(stores[1]);
    }
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0]);
      setSelectedYTDMonth(months[months.length - 1]);
    }
  }, [stores, months, selectedStore, selectedMonth]);

  useEffect(() => {
    if (availableColumns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(availableColumns);
    }
  }, [availableColumns, selectedColumns]);

  const parseValue = (val: any): number => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/€/g, "").replace(/,/g, "").trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const loadExcelData = async (url: string): Promise<DataRow[]> => {
    try {
      const res = await fetch(
        `/api/excel_proxy?url=${encodeURIComponent(url)}`,
      );
      const json = await res.json();

      if (!json.rows || json.rows.length === 0) return [];

      const processed: DataRow[] = [];
      const columns = json.columns || [];

      const assignedStoreSet =
        role === "client"
          ? new Set(assignedStores.map((s) => s.toLowerCase()))
          : null;

      json.rows.forEach((row: any) => {
        // First column is always the month
        const month = row[columns[0]];
        // Second column is the store
        const store = row[columns[1]];
        if (
          role === "client" &&
          !assignedStoreSet!.has(String(store).toLowerCase())
        ) {
          return;
        }

        if (!month || !store) return;

        const sales = parseValue(
          row["ΠΩΛΗΣΕΙΣ (SALES)"] || row["SALES"] || row["ΠΩΛΗΣΕΙΣ"] || 0,
        );
        const salesofServices = parseValue(
          row["ΠΩΛΗΣΕΙΣ ΥΠΗΡΕΣΙΩΝ (Sales of Services)"] ||
            row["BLUE SALES"] ||
            row["ΠΩΛΗΣΕΙΣ BLUE"] ||
            0,
        );
        const purchases = parseValue(
          row["ΑΓΟΡΕΣ (Purchases)"] || row["Purchases"] || row["ΑΓΟΡΕΣ"] || 0,
        );
        const payroll = parseValue(
          row["ΑΝΑΠ/ΜΕΝΗ ΜΙΣΘΟΔΟΣΙΑ (Payroll (Adjusted)"] ||
            row["Payroll (Adjusted)"] ||
            row["ΑΝΑΠ/ΜΕΝΗ ΜΙΣΘΟΔΟΣΙΑ"] ||
            0,
        );
        const severance = parseValue(
          row["ΑΠΟΖ/ΣΕΙΣ (Severance Payments)"] ||
            row["Severance Payments"] ||
            row["ΑΠΟΖ/ΣΕΙΣ"] ||
            0,
        );
        const blueExpenses = parseValue(
          row["ΕΞΟΔΑ BLUE (BLUE EXPENSES)"] ||
            row["BLUE EXPENSES"] ||
            row["ΕΞΟΔΑ BLUE"] ||
            0,
        );
        const utilities = parseValue(
          row["ΔΕΚO (Utilities)"] || row["Utilities"] || row["ΔΕΚO"] || 0,
        );
        const otherExpenses = parseValue(
          row["ΛΟIΠΑ ΕΞΟΔΑ (Other Expenses)"] ||
            row["Other Expenses"] ||
            row["ΛΟIΠΑ ΕΞΟΔΑ"] ||
            0,
        );
        const pepeExpenses = parseValue(
          row["ΕΞΟΔΑ PEPE (PEPE EXPENSES)"] ||
            row["PEPE EXPENSES"] ||
            row["ΕΞΟΔΑ PEPE"] ||
            0,
        );
        const contributionMargin = parseValue(
          row["Contributio n Margin"] || row["Contribution Margin"] || 0,
        );
        const rent = parseValue(
          row["ΕΝΟIΚΙO (RENT)"] || row["RENT"] || row["ΕΝΟIΚΙO"] || 0,
        );
        const fees = parseValue(row["FEES"] || 0);
        const ebitda = parseValue(row["EBITDA"] || 0);
        const bankExpenses = parseValue(
          row["ΕΞΟΔΑ ΤΡΑΠΕΖΑΣ - ΑΠΟΣΒΕΣΕΙΣ (BANK EXPENSES - DEPRECIATION)"] ||
            row["BANK EXPENSES - DEPRECIATION"] ||
            row["ΕΞΟΔΑ ΤΡΑΠΕΖΑΣ - ΑΠΟΣΒΕΣΕΙΣ"] ||
            0,
        );
        const netProfit = parseValue(
          row["ΚΑΘΑΡΟ ΚΕΡΔΟΣ (NET PROFIT)"] ||
            row["NET PROFIT"] ||
            row["ΚΑΘΑΡΟ ΚΕΡΔΟΣ"] ||
            0,
        );

        processed.push({
          month,
          store,
          sales,
          salesofServices,
          purchases,
          payroll,
          severance,
          blueExpenses,
          utilities,
          otherExpenses,
          pepeExpenses,
          contributionMargin,
          rent,
          fees,
          ebitda,
          bankExpenses,
          netProfit,
        });
      });

      return processed;
    } catch (err) {
      console.error("Error loading Excel data:", err);
      return [];
    }
  };

  useEffect(() => {
    if (!selectedActualUrl) return;
    setLoading(true);
    setError(null);
    loadExcelData(selectedActualUrl)
      .then((data) => {
        setActualDataRaw(data);
        checkDataLoaded(data, budgetDataRaw);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load actual data");
        setLoading(false);
      });
  }, [selectedActualUrl]);

  useEffect(() => {
    if (!selectedBudgetUrl) return;
    setLoading(true);
    setError(null);
    loadExcelData(selectedBudgetUrl)
      .then((data) => {
        setBudgetDataRaw(data);
        checkDataLoaded(actualDataRaw, data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load budget data");
        setLoading(false);
      });
  }, [selectedBudgetUrl]);

  const checkDataLoaded = (actual: DataRow[], budget: DataRow[]) => {
    if (actual.length > 0 && budget.length > 0) {
      setDataLoaded(true);
    }
  };

  const calculateAdjusted = (
    record: DataRow,
    sourceData: DataRow[],
  ): DataRow => {
    // find original untouched row
    const original =
      sourceData.find(
        (r) => r.month === record.month && r.store === record.store,
      ) ?? record;

    // if nothing is excluded → return original row
    if (!excludesalesofServices && !excludeBlueExpenses && !excludePepeExpenses) {
      return { ...original };
    }

    // start from original values (IMPORTANT)
    let adjustedEbitda = original.ebitda;
    let adjustedNetProfit = original.netProfit;

    if (excludesalesofServices) {
      adjustedEbitda -= original.salesofServices;
      adjustedNetProfit -= original.salesofServices;
    }

    if (excludeBlueExpenses) {
      adjustedEbitda += original.blueExpenses;
      adjustedNetProfit += original.blueExpenses;
    }

    if (excludePepeExpenses) {
      adjustedEbitda += original.pepeExpenses;
      adjustedNetProfit += original.pepeExpenses;
    }

    return {
      ...original,
      ebitda: adjustedEbitda,
      netProfit: adjustedNetProfit,
    };
  };

  const fmt = (val: number) =>
    `€${val.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const VarianceIndicator = ({ value }: { value: number }) => {
    if (value > 0)
      return <TrendingUp className="inline w-4 h-4 text-green-600" />;
    if (value < 0)
      return <TrendingDown className="inline w-4 h-4 text-red-600" />;
    return <Minus className="inline w-4 h-4 text-gray-400" />;
  };

  const getActualVsBudgetBarData = () => {
    let actual = actualDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );
    let budget = budgetDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );
    if (!actual || !budget) return { labels: [], datasets: [] };
    const adjustedActualData = calculateAdjusted(actual, actualDataRaw);
    const adjustedBudgetData = calculateAdjusted(budget, budgetDataRaw);
    actual = adjustedActualData;
    budget = adjustedBudgetData;

    const actualData = selectedColumns.map((col) => actual[col] || 0);
    const budgetData = selectedColumns.map((col) => budget[col] || 0);

    return {
      labels: selectedColumns,
      datasets: [
        {
          label: "Actual",
          data: actualData,
          backgroundColor: "#36A2EB",
        },
        {
          label: "Budget",
          data: budgetData,
          backgroundColor: "#FF6384",
        },
      ],
    };
  };

  const getActualVsBudgetPieData = () => {
    let actual = actualDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );
    let budget = budgetDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );
    if (!actual || !budget) return { labels: [], datasets: [] };
    const adjustedActualData = calculateAdjusted(actual, actualDataRaw);
    const adjustedBudgetData = calculateAdjusted(budget, budgetDataRaw);
    actual = adjustedActualData;
    budget = adjustedBudgetData;

    const varianceData = selectedColumns.map(
      (col) => parseValue(actual[col]) - parseValue(budget[col]),
    );

    return {
      labels: selectedColumns,
      datasets: [
        {
          label: "Variance",
          data: varianceData,
          backgroundColor: [
            "#36A2EB",
            "#FFCE56",
            "#FF6384",
            "#4BC0C0",
            "#9966FF",
          ],
        },
      ],
    };
  };

  const getMonthsUpTo = (month: string) => {
    const idx = months.indexOf(month);
    return idx === -1 ? months : months.slice(0, idx + 1);
  };

  const downloadChartAsImage = (chartRef: any, filename: any) => {
    try {
      if (chartRef && chartRef.current) {
        const chart = chartRef.current;
        const url = chart.toBase64Image();
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
      } else {
        console.error("Chart reference is not available or not rendered.");
      }
    } catch (error) {
      console.error("Error downloading chart as image:", error);
    }
  };

  const downloadTableAsExcel = (tableId: any, filename: any) => {
    try {
      const table = document.getElementById(tableId);
      if (!table) {
        console.error("Table element not found with ID:", tableId);
        return;
      }

      const worksheet = XLSX.utils.table_to_sheet(table);
      const range = XLSX.utils.decode_range(worksheet["!ref"] as string);

      let varianceColIndex: number | null = null;

      // 🔍 Find "Variance %" column index from header row
      for (let col = range.s.c; col <= range.e.c; col++) {
        const headerCell =
          worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];

        if (
          headerCell &&
          typeof headerCell.v === "string" &&
          headerCell.v.trim().toLowerCase() === "variance %"
        ) {
          varianceColIndex = col;
          break;
        }
      }

      // ➕ Append % to each value in Variance % column
      if (varianceColIndex !== null) {
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({
            r: row,
            c: varianceColIndex,
          });
          const cell = worksheet[cellAddress];

          if (cell && cell.v !== undefined && cell.v !== "") {
            // Avoid double %
            if (typeof cell.v === "number") {
              cell.v = `${cell.v}%`;
            } else if (
              typeof cell.v === "string" &&
              !cell.v.trim().endsWith("%")
            ) {
              cell.v = `${cell.v}%`;
            }
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const data = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      saveAs(data, filename);
    } catch (error) {
      console.error("Error downloading table as Excel file:", error);
    }
  };

  const renderActualVsBudget = () => {
    const actual = actualDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );
    const budget = budgetDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );
    if (!actual || !budget)
      return <div className="text-gray-500">No data available</div>;

    const barChartRef = React.createRef();
    const pieChartRef = React.createRef();

    // Get pie data and check if all variance is zero
    const pieData = getActualVsBudgetPieData();
    const allVarianceZero =
      pieData.datasets.length > 0 &&
      pieData.datasets[0].data.every((v: number) => v === 0);

    // Get bar chart data and check if all values are zero
    const barData = getActualVsBudgetBarData();
    const allBarZero =
      barData.datasets.length === 2 &&
      barData.datasets[0].data.every((v) => Number(v) === 0) &&
      barData.datasets[1].data.every((v) => Number(v) === 0);

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800">
          {selectedStore} - {selectedMonth}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
          {/* Only show bar chart if not all values are zero */}
          {!allBarZero && (
            <div className="bg-white p-4 rounded shadow overflow-auto">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold mb-2">
                  Actual Vs Budget Data Bar Chart
                </h3>
                <button
                  onClick={() =>
                    downloadChartAsImage(barChartRef, "bar-chart.png")
                  }
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                >
                  Download
                </button>
              </div>
              <div className="overflow-x-auto">
                <Bar
                  ref={barChartRef as any}
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "top" } },
                  }}
                  height={300} // Set fixed height for better mobile visualization
                />
              </div>
            </div>
          )}
          {/* If all bar values are zero, show a message instead of the chart */}
          {allBarZero && (
            <div className="bg-white p-4 rounded shadow overflow-auto text-center text-gray-500">
              <h3 className="font-semibold mb-2">
                Actual Vs Budget Data Bar Chart
              </h3>
              <div className="py-4">
                All values are zero. No bar chart to display.
              </div>
            </div>
          )}
          {/* Only show pie chart if not all variance is zero */}
          {!allVarianceZero && (
            <div className="bg-white p-4 rounded shadow overflow-auto">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold mb-2">
                  Actual Vs Budget Variance Pie Chart
                </h3>
                <button
                  onClick={() =>
                    downloadChartAsImage(pieChartRef, "pie-chart.png")
                  }
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                >
                  Download
                </button>
              </div>
              <div className="overflow-x-auto">
                <Pie
                  ref={pieChartRef as any}
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "top" } },
                  }}
                  height={300} // Set fixed height for better mobile visualization
                />
              </div>
            </div>
          )}
          {/* If all variance is zero, show a message instead of the pie chart */}
          {allVarianceZero && (
            <div className="bg-white p-4 rounded shadow overflow-auto text-center text-gray-500">
              <h3 className="font-semibold mb-2">
                Actual Vs Budget Variance Pie Chart
              </h3>
              <div className="py-4">
                All variances are zero. No pie chart to display.
              </div>
            </div>
          )}
          {/* Only show Actual vs Budget Table if not all bar values are zero */}
          {!allBarZero && (
            <div>
              <div className="mt-4 flex justify-between items-center mb-5">
                <h3 className="font-semibold mt-4 mb-2">
                  Actual vs Budget Table
                </h3>
                <button
                  onClick={() =>
                    downloadTableAsExcel(
                      "actual-vs-budget-table",
                      "actual-vs-budget.xlsx",
                    )
                  }
                  className="px-3 py-1 bg-green-600 text-white rounded-md text-sm"
                >
                  Download
                </button>
              </div>
              {renderActualVsBudgetTable()}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStoreComparison = () => {
    let store1Data = actualDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );
    let store2Data = actualDataRaw.find(
      (d) => d.store === selectedStore2 && d.month === selectedMonth,
    );

    if (!store1Data || !store2Data)
      return <div className="text-gray-500">No data available</div>;
    const adjustedActualData = calculateAdjusted(store1Data, actualDataRaw);
    const adjustedBudgetData = calculateAdjusted(store2Data, actualDataRaw);
    store1Data = adjustedActualData;
    store2Data = adjustedBudgetData;

    const storeLineChartRef = React.createRef();

    const fmtPercent = (value: number) => `${value.toFixed(2)}%`;

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800">
          {selectedStore} vs {selectedStore2} - {selectedMonth}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
          {/* Line Chart */}
          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold mb-2">Line Chart (Store Metrics)</h3>
              <button
                onClick={() =>
                  downloadChartAsImage(
                    storeLineChartRef,
                    "store-comparison-line-chart.png",
                  )
                }
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
              >
                Download
              </button>
            </div>

            <div className="overflow-x-auto">
              <Line
                ref={storeLineChartRef as any}
                data={{
                  labels: selectedColumns,
                  datasets: [
                    {
                      label: selectedStore,
                      data: selectedColumns.map((col) =>
                        parseValue(store1Data[col]),
                      ),
                      borderColor: "#36A2EB",
                      backgroundColor: "#36A2EB33",
                      tension: 0.3,
                    },
                    {
                      label: selectedStore2,
                      data: selectedColumns.map((col) =>
                        parseValue(store2Data[col]),
                      ),
                      borderColor: "#FF6384",
                      backgroundColor: "#FF638433",
                      tension: 0.3,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "top" } },
                }}
                height={300} // Set fixed height for better mobile visualization
              />
            </div>

            {/* Comparison Table */}
            <div className="mt-4 flex justify-between items-center mb-5">
              <h3 className="font-semibold mt-4 mb-2">
                Store Comparison Table
              </h3>
              <button
                onClick={() =>
                  downloadTableAsExcel(
                    "store-comparison-table",
                    "store-comparison.xlsx",
                  )
                }
                className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm"
              >
                Download
              </button>
            </div>

            <div className="overflow-x-auto">
              <table
                id="store-comparison-table"
                className="w-full border-collapse text-sm"
              >
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1">Metric</th>
                    <th className="px-2 py-1">{selectedStore}</th>
                    <th className="px-2 py-1">{selectedStore2}</th>
                    <th className="px-2 py-1">Variance</th>
                    <th className="px-2 py-1">Variance %</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedColumns.map((col) => {
                    const val1: number = parseValue(store1Data[col]);
                    const val2: number = parseValue(store2Data[col]);
                    const variance: number = val1 - val2;
                    const variancePercent: number =
                      val2 !== 0 ? (variance / val2) * 100 : 0;

                    return (
                      <tr key={col}>
                        <td className="px-2 py-1 font-medium">
                          {col.charAt(0).toUpperCase() + col.slice(1)}
                        </td>
                        <td className="px-2 py-1">{fmt(val1)}</td>
                        <td className="px-2 py-1">{fmt(val2)}</td>
                        <td className="px-2 py-1">{fmt(variance)}</td>
                        <td className="px-2 py-1">
                          {fmtPercent(variancePercent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderYTD = () => {
    const ytdMonths = getMonthsUpTo(selectedYTDMonth);

    const ytdData = actualDataRaw
      .filter((d) => d.store === selectedStore && ytdMonths.includes(d.month))
      .reduce((acc: { [key: string]: number }, curr) => {
        const effectiveRow = calculateAdjusted(curr, actualDataRaw);

        selectedColumns.forEach((col) => {
          acc[col] = (acc[col] || 0) + parseValue(effectiveRow[col]);
        });

        return acc;
      }, {});

    const ytdBudget = budgetDataRaw
      .filter((d) => d.store === selectedStore && ytdMonths.includes(d.month))
      .reduce((acc: { [key: string]: number }, curr) => {
        const effectiveRow = calculateAdjusted(curr, budgetDataRaw);

        selectedColumns.forEach((col) => {
          acc[col] = (acc[col] || 0) + parseValue(effectiveRow[col]);
        });

        return acc;
      }, {});

    const ytdBarChartRef = React.createRef();
    const ytdLineChartRef = React.createRef();

    // Helper to format percentage
    const fmtPercent = (value: number) => `${value.toFixed(2)}%`;

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800">
          {selectedStore} - Year to Date (YTD) up to {selectedYTDMonth}
        </h3>

        <div className="mb-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
          <strong>Year-to-Date (YTD):</strong> Sums each metric from January up
          to and including the selected month, for both Actual and Budget.
        </div>

        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-gray-700">
            YTD up to month:
          </label>
          <select
            value={selectedYTDMonth}
            onChange={(e) => setSelectedYTDMonth(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
          {/* Bar Chart */}
          <div className="bg-white p-4 rounded shadow overflow-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold mb-2">Bar Chart (YTD)</h3>
              <button
                onClick={() =>
                  downloadChartAsImage(ytdBarChartRef, "ytd-bar-chart.png")
                }
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
              >
                Download
              </button>
            </div>

            <div className="overflow-x-auto">
              <Bar
                ref={ytdBarChartRef as any}
                data={{
                  labels: selectedColumns,
                  datasets: [
                    {
                      label: "Actual YTD",
                      data: selectedColumns.map((col) => ytdData[col] || 0),
                      backgroundColor: "#36A2EB",
                    },
                    {
                      label: "Budget YTD",
                      data: selectedColumns.map((col) => ytdBudget[col] || 0),
                      backgroundColor: "#FF6384",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "top" } },
                }}
                height={300} // Set fixed height for better mobile visualization
              />
            </div>
          </div>

          {/* Line Chart */}
          <div className="bg-white p-4 rounded shadow overflow-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold mb-2">Line Chart (YTD)</h3>
              <button
                onClick={() =>
                  downloadChartAsImage(ytdLineChartRef, "ytd-line-chart.png")
                }
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
              >
                Download
              </button>
            </div>

            <div className="overflow-x-auto">
              <Line
                ref={ytdLineChartRef as any}
                data={{
                  labels: selectedColumns,
                  datasets: [
                    {
                      label: "Actual YTD",
                      data: selectedColumns.map((col) => ytdData[col] || 0),
                      borderColor: "#36A2EB",
                      backgroundColor: "#36A2EB33",
                      tension: 0.3,
                    },
                    {
                      label: "Budget YTD",
                      data: selectedColumns.map((col) => ytdBudget[col] || 0),
                      borderColor: "#FF6384",
                      backgroundColor: "#FF638433",
                      tension: 0.3,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "top" } },
                }}
                height={300} // Set fixed height for better mobile visualization
              />
            </div>
          </div>

          {/* YTD Table */}
          <div className="bg-white p-4 rounded shadow overflow-auto">
            <div className="mt-4 flex justify-between items-center mb-5">
              <h3 className="font-semibold mt-4 mb-2">YTD Table</h3>
              <button
                onClick={() =>
                  downloadTableAsExcel("ytd-table", "ytd-data.xlsx")
                }
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm"
              >
                Download
              </button>
            </div>

            <div className="overflow-x-auto">
              <table id="ytd-table" className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1">Metric</th>
                    <th className="px-2 py-1">Actual YTD</th>
                    <th className="px-2 py-1">Budget YTD</th>
                    <th className="px-2 py-1">Variance</th>
                    <th className="px-2 py-1">Variance %</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedColumns.map((col) => {
                    const actualValue = ytdData[col] || 0;
                    const budgetValue = ytdBudget[col] || 0;
                    const variance = actualValue - budgetValue;
                    const variancePercent =
                      budgetValue !== 0 ? (variance / budgetValue) * 100 : 0;

                    return (
                      <tr key={col}>
                        <td className="px-2 py-1 font-medium">
                          {col.charAt(0).toUpperCase() + col.slice(1)}
                        </td>
                        <td className="px-2 py-1">{fmt(actualValue)}</td>
                        <td className="px-2 py-1">{fmt(budgetValue)}</td>
                        <td className="px-2 py-1">{fmt(variance)}</td>
                        <td className="px-2 py-1">
                          {fmtPercent(variancePercent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleColumnSelection = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((col) => col !== column)
        : [...prev, column],
    );
  };

  const renderActualVsBudgetTable = () => {
    let actual = actualDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );
    let budget = budgetDataRaw.find(
      (d) => d.store === selectedStore && d.month === selectedMonth,
    );

    if (!actual || !budget)
      return <div className="text-gray-500">No data available</div>;
    const adjustedActualData = calculateAdjusted(actual, actualDataRaw);
    const adjustedBudgetData = calculateAdjusted(budget, budgetDataRaw);
    actual = adjustedActualData;
    budget = adjustedBudgetData;

    const fmtPercent = (value: number) => `${value.toFixed(2)}%`;

    return (
      <div className="overflow-x-auto">
        <table
          id="actual-vs-budget-table"
          className="w-full border-collapse text-sm"
        >
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Metric</th>
              <th className="border px-4 py-2">Actual</th>
              <th className="border px-4 py-2">Budget</th>
              <th className="border px-4 py-2">Variance</th>
              <th className="border px-4 py-2">Variance %</th>
            </tr>
          </thead>
          <tbody>
            {selectedColumns.map((col) => {
              const actualValue: number = parseValue(actual[col]);
              const budgetValue: number = parseValue(budget[col]);
              const variance: number = actualValue - budgetValue;
              const variancePercent: number =
                budgetValue !== 0 ? (variance / budgetValue) * 100 : 0;

              return (
                <tr key={col}>
                  <td className="border px-4 py-2 font-medium">
                    {" "}
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                  </td>
                  <td className="border px-4 py-2">{fmt(actualValue)}</td>
                  <td className="border px-4 py-2">{fmt(budgetValue)}</td>
                  <td className="border px-4 py-2">{fmt(variance)}</td>
                  <td className="border px-4 py-2">
                    {fmtPercent(variancePercent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Financial Dashboard</h1>
          <p className="mb-6 text-gray-500">
            Please select your data sources below to begin.
          </p>
          {/* Data Source Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-semibold mb-3 text-blue-900">
                Step 1: Select Actual Data
              </h3>
              {loading && availableLinks.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Loading available files...
                </div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Actual Data Source:
                  </label>
                  <select
                    value={selectedActualUrl}
                    onChange={(e) => setSelectedActualUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    disabled={loading}
                  >
                    <option value="">-- Choose Data Source --</option>
                    {availableLinks.map((link, idx) => (
                      <option key={idx} value={link.url || link}>
                        {link.name || link.url || link}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedActualUrl && actualDataRaw.length > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ Actual data loaded ({actualDataRaw.length} records)
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-blue-900">
                Step 2: Select Budget Data
              </h3>
              {loading && availableLinks.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Loading available files...
                </div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Budget Data Source:
                  </label>
                  <select
                    value={selectedBudgetUrl}
                    onChange={(e) => setSelectedBudgetUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    disabled={loading}
                  >
                    <option value="">-- Choose Data Source --</option>
                    {availableLinks.map((link, idx) => (
                      <option key={idx} value={link.url || link}>
                        {link.name || link.url || link}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedBudgetUrl && budgetDataRaw.length > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ Budget data loaded ({budgetDataRaw.length} records)
                </div>
              )}
            </div>
          </div>

          {!dataLoaded && !loading && (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded mb-6">
              <p className="font-medium">
                Please select both Actual and Budget data sources to continue.
              </p>
            </div>
          )}

          {loading && (
            <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded mb-6">
              <p className="font-medium">Loading data...</p>
            </div>
          )}

          {dataLoaded && (
            <>
              {/* View Mode Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View Mode
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setViewMode("single")}
                    className={`px-4 py-2 rounded-lg ${
                      viewMode === "single"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    Single Store
                  </button>
                  <button
                    onClick={() => setViewMode("compare")}
                    className={`px-4 py-2 rounded-lg ${
                      viewMode === "compare"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    Compare
                  </button>
                  <button
                    onClick={() => setViewMode("ytd")}
                    className={`px-4 py-2 rounded-lg ${
                      viewMode === "ytd"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    Year to Date
                  </button>
                </div>
              </div>

              {viewMode === "compare" && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comparison Type
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setCompareMode("actual-budget")}
                      className={`px-4 py-2 rounded-lg ${
                        compareMode === "actual-budget"
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Actual vs Budget
                    </button>
                    <button
                      onClick={() => setCompareMode("store-store")}
                      className={`px-4 py-2 rounded-lg ${
                        compareMode === "store-store"
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Store vs Store
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {stores.map((store) => (
                      <option key={store} value={store}>
                        {store}
                      </option>
                    ))}
                  </select>
                </div>

                {viewMode === "compare" && compareMode === "store-store" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compare with Store
                    </label>
                    <select
                      value={selectedStore2}
                      onChange={(e) => setSelectedStore2(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {stores
                        .filter((s) => s !== selectedStore)
                        .map((store) => (
                          <option key={store} value={store}>
                            {store}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {viewMode !== "ytd" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {months.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Adjust EBITDA & Net Profit
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={excludesalesofServices}
                      onChange={(e) => setExcludesalesofServices(e.target.checked)}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm">
                      Exclude Sales of Services from EBITDA & Net Profit
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={excludeBlueExpenses}
                      onChange={(e) => setExcludeBlueExpenses(e.target.checked)}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm">
                      Exclude Blue Expenses from EBITDA & Net Profit
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={excludePepeExpenses}
                      onChange={(e) => setExcludePepeExpenses(e.target.checked)}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm">
                      Exclude Pepe Expenses from EBITDA & Net Profit
                    </span>
                  </label>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Columns to Display
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableColumns.map((col) => (
                    <button
                      key={col}
                      onClick={() => handleColumnSelection(col)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        selectedColumns.includes(col)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {col.charAt(0).toUpperCase() + col.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {dataLoaded && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            {viewMode === "single" && renderActualVsBudget()}
            {viewMode === "compare" &&
              compareMode === "actual-budget" &&
              renderActualVsBudget()}
            {viewMode === "compare" &&
              compareMode === "store-store" &&
              renderStoreComparison()}
            {viewMode === "ytd" && renderYTD()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboard;

"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FreeSerif } from "@/fonts/FreeSerif";
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Store as StoreIcon,
  BarChart3,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import StoreList from "@/components/StoreList";
import FinancialDashboard from "../../components/financial-dashboard/page";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type ExcelRow = {
  [key: string]: any;
  Month?: string;
  Store?: string;
};

type Link = { id: string; name: string; url: string };

function parseMonthYear(
  monthStr: string,
): { month: number; year: number } | null {
  if (!monthStr) return null;
  const parts = monthStr.split("-");
  if (parts.length !== 2) return null;
  const monthMap: { [key: string]: number } = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const month = monthMap[parts[0]];
  const year = parseInt("20" + parts[1]);
  if (month === undefined || isNaN(year)) return null;
  return { month, year };
}

/** --- Robust normalization for column matching (Greek/Latin lookalikes, spaces, punctuation) --- */
function normalizeHeader(s: any) {
  const str = String(s ?? "");

  // Replace common Latin lookalikes with Greek (and vice versa where needed)
  const map: Record<string, string> = {
    // Latin -> Greek lookalikes
    O: "Ο",
    I: "Ι",
    A: "Α",
    B: "Β",
    E: "Ε",
    H: "Η",
    K: "Κ",
    M: "Μ",
    N: "Ν",
    P: "Ρ",
    T: "Τ",
    Y: "Υ",
    X: "Χ",
    o: "ο",
    i: "ι",
    a: "α",
    e: "ε",
    h: "η",
    k: "κ",
    m: "μ",
    n: "ν",
    p: "ρ",
    t: "τ",
    y: "υ",
    x: "χ",
  };

  let out = "";
  for (const ch of str) out += map[ch] ?? ch;

  // Normalize whitespace and remove invisible weirdness
  out = out
    .replace(/\u00A0/g, " ") // nbsp
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // Remove trailing/leading punctuation variance
  out = out.replace(/[()]+/g, (m) => m); // keep parentheses but normalize via lower/trim already

  return out;
}

function calculateKPIs(data: any[], excludeSeverance = false) {
  if (!data || data.length === 0) return {};

  // Helper to find column by possible names (robust)
  function findCol(row: any, candidates: string[]) {
    const keys = Object.keys(row ?? {});
    const normKeys = new Map<string, string>(); // normalized -> original
    for (const k of keys) normKeys.set(normalizeHeader(k), k);

    for (const c of candidates) {
      const hit = normKeys.get(normalizeHeader(c));
      if (hit) return hit;
    }
    return null;
  }

  // All possible column names for each KPI
  const colNames = {
    sales: ["ΠΩΛΗΣΕΙΣ (SALES)", "Sales"],
    salesServices: [
      "ΠΩΛΗΣΕΙΣ ΥΠΗΡΕΣΙΩΝ (Sales of Services)",
      "Sales of Services",
      "ΠΩΛΗΣΕΙΣ ΥΠΗΡΕΣΙΩΝ",
    ],
    purchases: ["ΑΓΟΡΕΣ (Purchases)", "Purchases"],
    payroll: [
      "ΑΝΑΠ/ΜΕΝΗ ΜΙΣΘΟΔΟΣΙΑ (Payroll (Adjusted))",
      "ΑΝΑΠ/ΜΕΝΗ ΜΙΣΘΟΔΟΣΙΑ (Payroll (Adjusted)",
      "Payroll (Adjusted)",
      "Payroll",
    ],
    utilities: ["ΔΕΚΟ (Utilities)", "Utilities", "ΔΕΚO (Utilities)"],
    otherExpenses: [
      "ΛΟΙΠΑ ΕΞΟΔΑ (Other Expenses)",
      "Other Expenses",
      "ΛΟIΠΑ ΕΞΟΔΑ (Other Expenses)",
    ],
    rent: ["ΕΝΟΙΚΙΟ (RENT)", "Rent", "ΕΝΟIΚΙO (RENT)"],
    fees: ["FEES", "Fees"],
    severance: ["ΑΠΟΖ/ΣΕΙΣ (Severance Payments)", "Severance Payments"],
    contributionMargin: ["Contribution Margin"],
    ebitda: ["EBITDA"],
  };

  // Parse number helper
  function toNumber(val: any) {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    const s = String(val)
      .replace(/€/g, "")
      .replace(/,/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function sum(cols: string[]) {
    return data.reduce((acc, row) => {
      const col = findCol(row, cols);
      if (!col) return acc;
      return acc + toNumber(row[col]);
    }, 0);
  }

  const sales = sum(colNames.sales);
  const salesServices = sum(colNames.salesServices);
  const totalRevenue = sales + salesServices;

  const purchases = sum(colNames.purchases);
  const payroll = sum(colNames.payroll);
  const utilities = sum(colNames.utilities);
  const otherExpenses = sum(colNames.otherExpenses);
  const rent = sum(colNames.rent);
  const fees = sum(colNames.fees);
  const severance = sum(colNames.severance);
  const contributionMargin = sum(colNames.contributionMargin);
  let ebitda = sum(colNames.ebitda);

  if (excludeSeverance && severance) {
    ebitda = ebitda + severance;
  }

  function percent(n: number, d: number) {
    if (!d || d === 0) return "—";
    return ((n / d) * 100).toFixed(2) + "%";
  }

  return {
    sales,
    salesServices,
    totalRevenue,
    purchases,
    payroll,
    utilities,
    otherExpenses,
    rent,
    fees,
    ebitda,
    severance,
    contributionMargin,

    // Percentages always on TOTAL REVENUE (Sales + Sales of Services)
    foodCostPercent: percent(purchases, totalRevenue),
    payrollPercent: percent(payroll, totalRevenue),
    utilitiesPercent: percent(utilities, totalRevenue),
    otherExpensesPercent: percent(otherExpenses, totalRevenue),
    rentPercent: percent(rent, totalRevenue),
    feesPercent: percent(fees, totalRevenue),
    ebitdaPercent: percent(ebitda, totalRevenue),
    contributionMarginPercent: percent(contributionMargin, totalRevenue),
  };
}

export default function DashboardPage() {
  const { role, assignedStores, logout } = useAuth();

  const [links, setLinks] = useState<Link[]>([]);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [excludeSeverance, setExcludeSeverance] = useState(false);

  // Fetch Excel links
  useEffect(() => {
    fetch("/api/excel_links")
      .then((res) => res.json())
      .then((data) => {
        setLinks(data);
        if (data.length > 0) setSelectedLink(data[0]);
      })
      .catch(() => setLinks([]));
  }, []);

  // Fetch Excel data when link changes
  useEffect(() => {
    if (!selectedLink) return;

    Promise.resolve().then(() => {
      setLoading(true);
      fetch(`/api/excel_proxy?url=${encodeURIComponent(selectedLink.url)}`)
        .then((res) => res.json())
        .then((json) => {
          setColumns(json.columns || []);
          setExcelData(json.rows || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    });
  }, [selectedLink]);

  // Hide empty helper (for display only)
  const isEmptyCol = (c: string) =>
    String(c ?? "").toUpperCase().startsWith("__EMPTY");

  const displayColumns = useMemo(
    () => (columns || []).filter((c) => !isEmptyCol(c)),
    [columns],
  );

  // Unique months
  const allMonths = useMemo(() => {
    if (!excelData.length || columns.length < 1) return [];
    return [...new Set(excelData.map((row) => row[columns[0]]))].sort();
  }, [excelData, columns]);

  // Stores
  const allStores = useMemo(() => {
    if (!excelData.length || columns.length < 2) return [];
    if (role !== "client") {
      return [...new Set(excelData.map((row) => row[columns[1]]))];
    }
    if (assignedStores.length === 0) return [];
    const assigned = assignedStores.map((s) => s.toLowerCase());
    return [
      ...new Set(
        excelData
          .map((row) => row[columns[1]])
          .filter((store) => store && assigned.includes(store.toLowerCase())),
      ),
    ];
  }, [excelData, assignedStores, role, columns]);

  // Years
  const allYears = useMemo(() => {
    if (!excelData.length || columns.length < 1) return [];
    const years = new Set<string>();
    excelData.forEach((row) => {
      const parsed = parseMonthYear(row[columns[0]] || "");
      if (parsed) years.add(parsed.year.toString());
    });
    return Array.from(years).sort();
  }, [excelData, columns]);

  // Filtered data
  const filteredData = useMemo(() => {
    let data = excelData;

    // Role authorization
    if (role === "client" && columns.length >= 2) {
      const normalizedAssignedStores = assignedStores.map((store) =>
        store.toLowerCase().replace(/\s+/g, ""),
      );
      data = data.filter((row) => {
        const rowStore = (row?.[columns[1]] ?? "")
          .toLowerCase()
          .replace(/\s+/g, "");
        return normalizedAssignedStores.includes(rowStore);
      });
    }

    // Month filter
    if (selectedMonths.length > 0 && columns.length >= 1) {
      data = data.filter((row) =>
        selectedMonths.includes(row[columns[0]] || ""),
      );
    }

    // Store filter
    if (selectedStores.length > 0 && columns.length >= 2) {
      data = data.filter((row) =>
        selectedStores.includes(row[columns[1]] || ""),
      );
    }

    // Year filter
    if (selectedYear !== "all" && columns.length >= 1) {
      data = data.filter((row) => {
        const parsed = parseMonthYear(row[columns[0]] || "");
        return parsed && parsed.year.toString() === selectedYear;
      });
    }

    // Period filter
    if (periodStart && periodEnd && columns.length >= 1) {
      const startParsed = parseMonthYear(periodStart);
      const endParsed = parseMonthYear(periodEnd);

      if (startParsed && endParsed) {
        data = data.filter((row) => {
          const month = row[columns[0]] || "";
          const parsed = parseMonthYear(month);
          if (!parsed) return false;

          const isAfterStart =
            parsed.year > startParsed.year ||
            (parsed.year === startParsed.year &&
              parsed.month >= startParsed.month);
          const isBeforeEnd =
            parsed.year < endParsed.year ||
            (parsed.year === endParsed.year && parsed.month <= endParsed.month);

          return isAfterStart && isBeforeEnd;
        });
      }
    }

    return data;
  }, [
    excelData,
    selectedMonths,
    selectedStores,
    selectedYear,
    periodStart,
    periodEnd,
    role,
    assignedStores,
    columns,
  ]);

  // KPIs
  const kpis = useMemo(
    () => calculateKPIs(filteredData, excludeSeverance),
    [filteredData, excludeSeverance],
  ) as any;

  const formatCurrency = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || isNaN(Number(val))) return "€0.00";
    return (
      "€" +
      parseFloat(String(val)).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month],
    );
  };

  const toggleStore = (store: string) => {
    setSelectedStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store],
    );
  };

  // Validate if selected months are in ascending order
  const validateMonthOrder = (start: string, end: string) => {
    const startParsed = parseMonthYear(start);
    const endParsed = parseMonthYear(end);

    if (startParsed && endParsed) {
      if (
        endParsed.year < startParsed.year ||
        (endParsed.year === startParsed.year &&
          endParsed.month < startParsed.month)
      ) {
        alert("Error: Period End cannot be earlier than Period Start.");
        return false;
      }
    }
    return true;
  };

  const handlePeriodStartChange = (value: string) => {
    if (validateMonthOrder(value, periodEnd)) setPeriodStart(value);
  };

  const handlePeriodEndChange = (value: string) => {
    if (validateMonthOrder(periodStart, value)) setPeriodEnd(value);
  };

  // Ensure month order
  const sortedMonths = useMemo(() => {
    return allMonths.sort((a, b) => {
      const parsedA = parseMonthYear(a);
      const parsedB = parseMonthYear(b);

      if (parsedA && parsedB) {
        if (parsedA.year === parsedB.year) return parsedA.month - parsedB.month;
        return parsedA.year - parsedB.year;
      }
      return 0;
    });
  }, [allMonths]);

  const clearFilters = () => {
    setSelectedMonths([]);
    setSelectedStores([]);
    setSelectedYear("all");
    setPeriodStart("");
    setPeriodEnd("");
  };

  // Business warning: Sales is too small vs Services
  const showRevenueMixWarning =
    (kpis?.totalRevenue ?? 0) > 0 &&
    (kpis?.sales ?? 0) / (kpis?.totalRevenue ?? 1) < 0.2;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 pt-6 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 md:space-y-6">
        {/* Header */}
        <div>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex flex-row items-start gap-4 md:gap-0 justify-between w-full">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
                  <BarChart3 className="text-blue-600" />
                  Advanced KPI Dashboard
                </h1>
                <p className="text-slate-600 mt-1">
                  Comprehensive analytics with multi-dimensional comparisons
                </p>

                {showRevenueMixWarning && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    Sales are a small share of Total Revenue — KPIs are driven by
                    services.
                  </div>
                )}
              </div>
              <div>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="cursor-pointer bg-red-500 text-white hover:bg-red-600 border-red-600 hover:border-red-700 md:hidden"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="w-full md:w-1/2 flex flex-row gap-2 mt-4 md:mt-0 items-end justify-end md:justify-between">
              <Button
                onClick={() => {}}
                variant="outline"
                size="lg"
                className="cursor-pointer bg-blue-500 text-white hover:bg-blue-600 border-blue-600 hover:border-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV <span className="hidden md:flex">Download</span>
              </Button>
              <Button
                onClick={() => {}}
                variant="outline"
                size="lg"
                className="cursor-pointer bg-blue-500 text-white hover:bg-blue-600 border-blue-600 hover:border-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF <span className="hidden md:flex">Download</span>
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                size="lg"
                className="
                  hidden md:flex 
                  cursor-pointer 
                  bg-red-500 text-white 
                  hover:bg-red-600 
                  border-red-600 hover:border-red-700
                "
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </div>

        {/* Excel Link Selector */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <FileSpreadsheet className="inline w-4 h-4 mr-2" />
            Select Data Source
          </label>
          <select
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedLink?.id || ""}
            onChange={(e) => {
              const link = links.find((l) => l.id === e.target.value);
              setSelectedLink(link || null);
            }}
          >
            <option value="">-- Select Excel File --</option>
            {links.map((link) => (
              <option key={link.id} value={link.id}>
                {link.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-6 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Filters & Time Periods
            </h2>
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              className="cursor-pointer bg-red-200 text-red-700 hover:bg-red-300 border-red-400 hover:text-red-800"
            >
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Years</option>
                {allYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Start */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Period Start
              </label>
              <select
                value={periodStart}
                onChange={(e) => handlePeriodStartChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select start month</option>
                {sortedMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Period End */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Period End
              </label>
              <select
                value={periodEnd}
                onChange={(e) => handlePeriodEndChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select end month</option>
                {sortedMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month Selection */}
          {!periodStart && !periodEnd && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Months ({selectedMonths.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {sortedMonths.map((month) => (
                  <button
                    key={month}
                    onClick={() => toggleMonth(month || "")}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonths.includes(month || "")
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Store Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <StoreIcon className="w-4 h-4 inline mr-1" />
              Select Stores ({selectedStores.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {allStores.map((store) => (
                <button
                  key={store}
                  onClick={() => toggleStore(store || "")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedStores.includes(store || "")
                      ? "bg-green-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Data Table (hide __EMPTY cols for display) */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Detailed Data Table
          </h3>
          <div className="overflow-x-auto overflow-y-auto max-h-[100vh]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  {displayColumns.map((col) => (
                    <th
                      key={col}
                      className="text-left py-3 px-4 font-semibold text-slate-700"
                    >
                      {col == "__EMPTY" ? "Month" : col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredData.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    {displayColumns.map((col, idx) => {
                      let value = row[col];

                      if (idx === 0) {
                        return (
                          <td
                            key={col}
                            className="py-2 px-4 font-semibold text-blue-700"
                          >
                            {value}
                          </td>
                        );
                      }

                      if (typeof value === "string" && value.includes("€")) {
                        value = value
                          .replace(/€/g, "")
                          .replace(/,/g, "")
                          .trim();
                        value = parseFloat(value) || 0;
                      }
                      const isNumeric = !isNaN(parseFloat(value));
                      const isNegative = isNumeric && parseFloat(value) < 0;

                      const isEBITDA =
                        col === "EBITDA" || String(col).includes("EBITDA");

                      return (
                        <td
                          key={col}
                          className={`py-2 px-4 ${
                            isNegative && isEBITDA
                              ? "text-red-600 font-semibold"
                              : ""
                          }`}
                        >
                          {isNumeric ? formatCurrency(value) : value}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {filteredData.length > 1 && (
                  <tr className="bg-slate-100 font-bold">
                    <td className="py-3 px-4" colSpan={2}>
                      TOTAL
                    </td>
                    {displayColumns.slice(2).map((col) => {
                      const total = filteredData.reduce((sum, row) => {
                        let val = row[col];
                        if (typeof val === "string" && val.includes("€")) {
                          val = val.replace(/€/g, "").replace(/,/g, "").trim();
                          val = parseFloat(val) || 0;
                        }
                        val = parseFloat(val);
                        return sum + (isNaN(val) ? 0 : val);
                      }, 0);
                      const isNegative = total < 0;
                      const isEBITDA = col === "EBITDA";
                      return (
                        <td
                          key={col}
                          className={`py-3 px-4 text-right ${
                            isNegative && isEBITDA ? "text-red-600" : ""
                          }`}
                        >
                          {formatCurrency(total)}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {role == "client" ? (
          <div>
            <h1 className="text-2xl font-bold text-blue-700 mb-4 px-2">
              All Assigned Stores
            </h1>
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <StoreList
                readOnly
                onEdit={function (): void {
                  throw new Error("Function not implemented.");
                }}
                onDelete={function (): void {
                  throw new Error("Function not implemented.");
                }}
                search={""}
                allowedStores={role == "client" ? assignedStores : undefined}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col px-2">
          <h1 className="text-xl md:text-2xl font-bold text-blue-700">
            Total Records: {filteredData.length}
          </h1>
          <span className="text-xs md:text-sm text-gray-500">
            (Rows after filters)
          </span>
        </div>

        {/* Cards: totals + % of Total Revenue */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayColumns.slice(2).map((col) => {
            const totalValue = filteredData.reduce((sum, row) => {
              let val = row[col];
              if (typeof val === "string" && val.includes("€")) {
                val = val.replace(/€/g, "").replace(/,/g, "").trim();
                val = parseFloat(val) || 0;
              }
              val = parseFloat(val);
              return sum + (isNaN(val) ? 0 : val);
            }, 0);

            const isNegative = totalValue < 0;
            const isEBITDA = col === "EBITDA" || String(col).includes("EBITDA");
            const isSeverance =
              col === "Severance Payments" || String(col).includes("ΑΠΟΖ/ΣΕΙΣ");

            // Denominator: TOTAL REVENUE
            const denom = kpis?.totalRevenue ?? 0;

            // Don't show % for revenue lines themselves
            const isSalesCol =
              normalizeHeader(col) === normalizeHeader("ΠΩΛΗΣΕΙΣ (SALES)") ||
              normalizeHeader(col) === normalizeHeader("Sales");
            const isSalesServicesCol =
              normalizeHeader(col) ===
                normalizeHeader("ΠΩΛΗΣΕΙΣ ΥΠΗΡΕΣΙΩΝ (Sales of Services)") ||
              normalizeHeader(col) === normalizeHeader("Sales of Services");

            let percentage = "—";
            if (denom && denom !== 0 && !isSalesCol && !isSalesServicesCol) {
              percentage = ((totalValue / denom) * 100).toFixed(2) + "%";
            }

            return (
              <div
                key={col}
                className={`bg-white rounded-lg shadow-sm pt-4 px-3 md:px-6 pb-2 border-l-4 ${
                  isEBITDA && isNegative
                    ? "border-red-500"
                    : isSeverance
                      ? "border-orange-500"
                      : "border-blue-500"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-600">{col}</h3>
                  {isEBITDA &&
                    (isNegative ? (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ))}
                </div>

                <p
                  className={`text-lg md:text-xl font-bold mb-1 ${
                    isNegative ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {formatCurrency(totalValue)}
                </p>

                {!isSalesCol && !isSalesServicesCol && percentage !== "—" && (
                  <p className="text-xs text-gray-500">
                    {percentage} of Total Revenue
                  </p>
                )}

                {isSeverance && totalValue > 0 && (
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    Non-recurring
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* KPI % section */}
        <div className="px-2">
          <h1 className="text-xl md:text-2xl font-bold text-blue-700 mb-2">
            All KPI Percentages
          </h1>
          <p className="text-sm text-slate-600">
            All percentages are calculated on <b>Total Revenue</b> (Sales + Sales
            of Services).
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-3 md:p-6 border-l-4 border-blue-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Food Cost %
            </h3>
            <p className="text-2xl font-bold mb-1 text-gray-900">
              {kpis.foodCostPercent}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Payroll %
            </h3>
            <p className="text-2xl font-bold mb-1 text-gray-900">
              {kpis.payrollPercent}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Utilities %
            </h3>
            <p className="text-2xl font-bold mb-1 text-gray-900">
              {kpis.utilitiesPercent}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Other Expenses %
            </h3>
            <p className="text-2xl font-bold mb-1 text-gray-900">
              {kpis.otherExpensesPercent}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Rent %</h3>
            <p className="text-2xl font-bold mb-1 text-gray-900">
              {kpis.rentPercent}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Fees %</h3>
            <p className="text-2xl font-bold mb-1 text-gray-900">
              {kpis.feesPercent}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">EBITDA %</h3>
            <p
              className={`text-2xl font-bold mb-1 ${
                (kpis?.ebitda ?? 0) < 0 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {kpis.ebitdaPercent}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-400">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Contribution Margin %
            </h3>
            <p className="text-2xl font-bold mb-1 text-gray-900">
              {kpis.contributionMarginPercent}
            </p>
          </div>
        </div>
      </div>

      <FinancialDashboard />
    </div>
  );
}

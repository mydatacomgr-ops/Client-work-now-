"use client";
import { useState, useEffect, useMemo } from "react";
import ExcelDataTable from "@/components/ExcelDataTable";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FreeSerif } from "@/fonts/FreeSerif";
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Store as StoreIcon,
  BarChart3,
  ArrowUpDown,
  Image,
  ChartBar,
  LogOut,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
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

function calculateKPIs(data: any[], excludeSeverance = false) {
  if (!data || data.length === 0) return {};

  // Helper to find column by possible names
  function findCol(row: any, names: string[]) {
    const rowKeys = Object.keys(row);
    // 1. Exact match
    for (const name of names) {
      if (row.hasOwnProperty(name)) return name;
    }
    // 2. Case-insensitive match with whitespace normalization
    for (const name of names) {
      const n = name.toLowerCase().replace(/\s+/g, " ").trim();
      for (const key of rowKeys) {
        if (key.toLowerCase().replace(/\s+/g, " ").trim() === n) return key;
      }
    }
    // 3. Keyword-based match: extract meaningful words and check if all appear in key
    for (const name of names) {
      const keywords = name.toLowerCase().split(/[\s()/,]+/).filter((w: string) => w.length > 2);
      for (const key of rowKeys) {
        const kl = key.toLowerCase();
        if (keywords.length > 0 && keywords.every((kw: string) => kl.includes(kw))) return key;
      }
    }
    // 4. Partial match: check if any name is contained in any key or vice versa
    for (const name of names) {
      const nl = name.toLowerCase();
      for (const key of rowKeys) {
        const kl = key.toLowerCase();
        if (kl.includes(nl) || nl.includes(kl)) return key;
      }
    }
    return names[0]; // fallback
  }

  // All possible column names for each KPI
  const colNames = {
    sales: ["ΠΩΛΗΣΕΙΣ (SALES)", "Sales"],
    purchases: ["ΑΓΟΡΕΣ (Purchases)", "Purchases"],
    payroll: [
      "ΑΝΑΠ/ΜΕΝΗ ΜΙΣΘΟΔΟΣΙΑ (Payroll (Adjusted))",
      "ΑΝΑΠ/ΜΕΝΗ ΜΙΣΘΟΔΟΣΙΑ (Payroll (Adjusted)",
      "ΑΝΑΠ/ΜΕΝΗ ΜΙΣΘΟΔΟΣΙΑ",
      "Payroll (Adjusted)",
      "Payroll",
    ],
    utilities: ["ΔΕΚΟ (Utilities)", "ΔΕΚO (Utilities)", "Utilities"],
    otherExpenses: ["ΛΟΙΠΑ ΕΞΟΔΑ (Other Expenses)", "ΛΟIΠΑ ΕΞΟΔΑ (Other Expenses)", "Other Expenses"],
    rent: ["ΕΝΟΙΚΙΟ (RENT)", "ΕΝΟIΚΙO (RENT)", "ΕΝΟΙΚΙΟ", "Rent"],
    fees: ["FEES", "Fees"],
    severance: ["ΑΠΟΖ/ΣΕΙΣ (Severance Payments)", "Severance Payments"],
    contributionMargin: ["Contribution Margin"],
    ebitda: ["EBITDA"],
    salesOfServices: [
      "ΠΩΛΗΣΕΙΣ ΥΠΗΡΕΣΙΩΝ (Sales of Services)",
      "ΠΩΛΗΣΕΙΣ BLUE (BLUE SALES)",
      "ΠΩΛΗΣΕΙΣ ΥΠΗΡΕΣΙΩΝ",
      "ΠΩΛΗΣΕΙΣ BLUE",
      "Sales of Services",
      "Blue Sales",
    ],
  };

  // Sum helper that removes euro symbol and parses
  function sum(names: any) {
    return data.reduce((acc, row) => {
      const col = findCol(row, names);
      let val = row[col];
      if (typeof val === "string" && val.includes("€")) {
        val = val.replace(/€/g, "").replace(/,/g, "").trim();
        val = parseFloat(val) || 0;
      }
      val = parseFloat(val);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }

  const sales = sum(colNames.sales);
  const salesOfServices = sum(colNames.salesOfServices);
  const totalRevenue = sales + salesOfServices;
  const purchases = sum(colNames.purchases);
  const payroll = sum(colNames.payroll);
  const utilities = sum(colNames.utilities);
  const otherExpenses = sum(colNames.otherExpenses);
  const rent = sum(colNames.rent);
  const fees = sum(colNames.fees);
  const severance = sum(colNames.severance);
  const contributionMargin = sum(colNames.contributionMargin);
  let ebitda = sum(colNames.ebitda);

  // Debug: log which columns were found
  if (data.length > 0) {
    const row = data[0];
    const rowKeys = Object.keys(row);
    console.log("KPI DEBUG - All columns from data:", rowKeys);
    console.log("KPI DEBUG - Payroll column found:", findCol(row, colNames.payroll));
    console.log("KPI DEBUG - SalesOfServices column found:", findCol(row, colNames.salesOfServices));
    console.log("KPI DEBUG - Sales:", sales, "SalesOfServices:", salesOfServices, "TotalRevenue:", totalRevenue, "Payroll:", payroll);
  }

  if (excludeSeverance && severance) {
    ebitda = ebitda + severance;
  }

  function percent(n: number, d: number) {
    if (!d || d === 0) return "—";
    return ((n / d) * 100).toFixed(2) + "%";
  }

  return {
    sales,
    salesOfServices,
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

  // State from original code
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // New filter states
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [excludeSeverance, setExcludeSeverance] = useState(false);

  // Comparison settings
  const [comparisonMode, setComparisonMode] = useState<
    "none" | "stores" | "ytd" | "yoy"
  >("none");
  const [compareStores, setCompareStores] = useState<string[]>([]);
  const [yoyYear, setYoyYear] = useState<string>("");

  console.log("Assigned Stores:", assignedStores);

  // Fetch Excel links (from original code)
  useEffect(() => {
    fetch("/api/excel_links")
      .then((res) => res.json())
      .then((data) => {
        setLinks(data);
        if (data.length > 0) setSelectedLink(data[0]);
      })
      .catch(() => setLinks([]));
  }, []);

  // Fetch Excel data when link changes (from original code)
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

  // Get unique months and years from first column, stores from second column
  const allMonths = useMemo(() => {
    if (!excelData.length || columns.length < 1) return [];
    return [...new Set(excelData.map((row) => row[columns[0]]))].sort();
  }, [excelData, columns]);

  const allStores = useMemo(() => {
    if (!excelData.length || columns.length < 2) return [];
    if (role !== "client") {
      return [...new Set(excelData.map((row) => row[columns[1]]))];
    }
    if (assignedStores.length === 0) {
      return [];
    }
    const assigned = assignedStores.map((s) => s.toLowerCase());
    return [
      ...new Set(
        excelData
          .map((row) => row[columns[1]])
          .filter((store) => store && assigned.includes(store.toLowerCase())),
      ),
    ];
  }, [excelData, assignedStores, role, columns]);

  const normalizedColumns = columns.map((c) => c.toLowerCase());

  // Extract years from first column
  const allYears = useMemo(() => {
    if (!excelData.length || columns.length < 1) return [];
    const years = new Set<string>();
    excelData.forEach((row) => {
      const parsed = parseMonthYear(row[columns[0]] || "");
      if (parsed) years.add(parsed.year.toString());
    });
    return Array.from(years).sort();
  }, [excelData, columns]);

  // Filtered data (enhanced from original)
  const filteredData = useMemo(() => {
    let data = excelData;
    // Role authorization (from original code)
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
    // Month filter (multi-select)
    if (selectedMonths.length > 0 && columns.length >= 1) {
      data = data.filter((row) =>
        selectedMonths.includes(row[columns[0]] || ""),
      );
    }
    // Store filter (multi-select)
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
  );

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

  const exportCSV = () => {
    if (filteredData.length === 0) return;

    const numberFormatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const toNumber = (val: string | number | null | undefined) =>
      parseFloat(
        String(val ?? "")
          .replace(/€/g, "")
          .replace(/,/g, "")
          .trim(),
      ) || 0;

    // 🔑 MUST escape commas & quotes
    const escapeCSV = (value: string | number | null | undefined) => {
      const str = String(value ?? "");
      return str.includes(",") || str.includes('"')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    // -------- Header --------
    const header = columns.map(escapeCSV).join(",");

    // -------- Rows --------
    const rows = filteredData.map((row) =>
      columns
        .map((col, index) => {
          if (index <= 1) {
            return escapeCSV(row[col]);
          }

          const num = toNumber(row[col]);
          return escapeCSV(`€ ${numberFormatter.format(num)}`);
        })
        .join(","),
    );

    // -------- Totals --------
    const totals = columns
      .map((_, index) => {
        if (index === 0) return escapeCSV("Total");
        if (index === 1) return escapeCSV("");

        const sum = filteredData.reduce(
          (acc, row) => acc + toNumber(row[columns[index]]),
          0,
        );

        return escapeCSV(`€ ${numberFormatter.format(sum)}`);
      })
      .join(",");

    // -------- CSV Content (CRLF for Excel) --------
    const csvContent = "\ufeff" + [header, ...rows, totals].join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (filteredData.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [520, 210],
    });

    doc.addFileToVFS("FreeSerif.ttf", FreeSerif);
    doc.addFont("FreeSerif.ttf", "FreeSerif", "normal");
    doc.setFont("FreeSerif");

    doc.setFontSize(16);
    doc.text("Filtered Data Export", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const numberFormatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const toNumber = (val: string | number | null | undefined) =>
      parseFloat(
        String(val ?? "")
          .replace(/€/g, "")
          .replace(/,/g, "")
          .trim(),
      ) || 0;

    const EBITDA_COL_INDEX = columns.findIndex(
      (c) => c.toLowerCase() === "ebitda",
    );

    // ---------------- Table Body ----------------
    const tableData = filteredData.map((row) =>
      columns.map((col, index) => {
        if (index <= 1) return String(row[col] ?? "");

        const num = toNumber(row[col]);
        return `€ ${numberFormatter.format(num)}`;
      }),
    );

    // ---------------- Totals ----------------
    const totals = columns.map((_, index) => {
      if (index === 0) return "Total";
      if (index === 1) return "";

      const sum = filteredData.reduce(
        (acc, row) => acc + toNumber(row[columns[index]]),
        0,
      );

      return `€ ${numberFormatter.format(sum)}`;
    });

    tableData.push(totals);

    // ---------------- AutoTable ----------------
    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: 30,
      styles: {
        font: "FreeSerif",
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: "normal",
        font: "FreeSerif",
      },

      didParseCell: function (data) {
        const rowIndex = data.row.index;
        const colIndex = data.column.index;

        // Left-align first two columns
        if (colIndex <= 1) {
          data.cell.styles.halign = "left";
        }

        // Bold totals row
        if (rowIndex === tableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
        }

        // EBITDA negative → RED
        if (colIndex === EBITDA_COL_INDEX && rowIndex < tableData.length) {
          const rawValue =
            rowIndex === tableData.length - 1
              ? toNumber(
                  filteredData.reduce(
                    (a, r) => a + toNumber(r[columns[colIndex]]),
                    0,
                  ),
                )
              : toNumber(filteredData[rowIndex][columns[colIndex]]);

          if (rawValue < 0) {
            data.cell.styles.textColor = [200, 0, 0];
          }
        }
      },
    });

    doc.save("filtered-data.pdf");
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

  // Update Period Start with validation
  const handlePeriodStartChange = (value: string) => {
    if (validateMonthOrder(value, periodEnd)) {
      setPeriodStart(value);
    }
  };

  // Update Period End with validation
  const handlePeriodEndChange = (value: string) => {
    if (validateMonthOrder(periodStart, value)) {
      setPeriodEnd(value);
    }
  };

  // Ensure the first column (Month) is always in ascending order
  const sortedMonths = useMemo(() => {
    return allMonths.sort((a, b) => {
      const parsedA = parseMonthYear(a);
      const parsedB = parseMonthYear(b);

      if (parsedA && parsedB) {
        if (parsedA.year === parsedB.year) {
          return parsedA.month - parsedB.month;
        }
        return parsedA.year - parsedB.year;
      }
      return 0;
    });
  }, [allMonths]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedMonths([]);
    setSelectedStores([]);
    setSelectedYear("all");
    setPeriodStart("");
    setPeriodEnd("");
  };

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
                onClick={exportCSV}
                variant="outline"
                size="lg"
                className="cursor-pointer bg-blue-500 text-white hover:bg-blue-600 border-blue-600 hover:border-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV <span className="hidden md:flex">Download</span>
              </Button>
              <Button
                onClick={exportPDF}
                variant="outline"
                size="lg"
                className="cursor-pointer bg-blue-500 text-white hover:bg-blue-600 border-blue-600 hover:border-blue-700  "
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

        {/* Advanced Filters */}
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
            {/* Year Filter */}
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

        {/* Detailed Data Table */}
        <div className="bg-white rounded-xl shadow-lg p-3 md:p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Detailed Data Table
          </h3>
          <div className="overflow-x-auto overflow-y-auto max-h-[100vh]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  {columns.map((col) => (
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
                    {columns.map((col, idx) => {
                      let value = row[col];
                      // Always treat first column as Month
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
                      // Remove euro symbol and convert to number if present
                      if (typeof value === "string" && value.includes("€")) {
                        value = value
                          .replace(/€/g, "")
                          .replace(/,/g, "")
                          .trim();
                        value = parseFloat(value) || 0;
                      }
                      const isNumeric = !isNaN(parseFloat(value));
                      const isNegative = isNumeric && parseFloat(value) < 0;
                      // Accept both Greek and English column names for EBITDA
                      const isEBITDA =
                        col === "EBITDA" || col.includes("EBITDA");
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
                    {columns.slice(2).map((col) => {
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
                onEdit={function (store: {
                  id: string;
                  name: string;
                  storeId: string;
                }): void {
                  throw new Error("Function not implemented.");
                }}
                onDelete={function (store: {
                  id: string;
                  name: string;
                  storeId: string;
                }): void {
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
            {" "}
            (Total Number of Columns in the excel sheet)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.slice(2).map((col) => {
            // Skip first column (Month)
            // Remove euro symbol and convert to number if present
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
            // Accept both Greek and English column names for EBITDA
            const isEBITDA = col === "EBITDA" || col.includes("EBITDA");
            const isSeverance =
              col === "Severance Payments" || col.includes("ΑΠΟΖ/ΣΕΙΣ");

            // Calculate percentage for this column relative to Total Revenue (Sales + Sales of Services)
            let percentage = "—";
            if (
              kpis.totalRevenue &&
              kpis.totalRevenue !== 0 &&
              col !== "ΠΩΛΗΣΕΙΣ (SALES)" &&
              col !== "Sales" &&
              col !== "ΠΩΛΗΣΕΙΣ BLUE (BLUE SALES)" &&
              col !== "Blue Sales"
            ) {
              percentage = ((totalValue / kpis.totalRevenue) * 100).toFixed(2) + "%";
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
                {col !== "ΠΩΛΗΣΕΙΣ (SALES)" &&
                  col !== "Sales" &&
                  percentage !== "—" && (
                    <p className="text-xs text-gray-500">
                      {percentage} of Sales
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

        <h1 className="text-xl md:text-2xl font-bold text-blue-700 mb-4 px-2">
          All KPIs Percentages
        </h1>

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
            <p className="text-2xl font-bold mb-1 text-gray-900">
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

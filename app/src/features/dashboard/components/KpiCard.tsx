"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  iconBg?: string;
  iconColor?: string;
  precision?: number | null; // New prop to control number formatting precision
}

export default function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  className = "",
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  precision = 1, // Default to 1 decimal place
}: KpiCardProps) {
  const getValueParts = () => {
    if (typeof value === "string") {
      const match = value.trim().match(/^([\d,\.]+)\s*(.*)$/);
      if (match) {
        const numberText = formatCompactNumber(match[1], precision);
        const unitText = match[2] || "";
        return { numberText, unitText };
      }
      return { numberText: value, unitText: "" };
    }

    // Handle numeric values
    return {
      numberText: formatCompactNumber(value, precision),
      unitText: "",
    };
  };

  const getChangeIcon = () => {
    if (!change) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return change > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getChangeColor = () => {
    if (!change) return "text-muted-foreground";
    return change > 0 ? "text-green-500" : "text-red-500";
  };

  const { numberText, unitText } = getValueParts();

  return (
    <Card
      className={`relative bg-gradient-to-r from-gray-50/40 via-gray-100/60 to-gray-50/40 hover:from-gray-100/50 hover:via-gray-200/70 hover:to-gray-100/50 dark:from-gray-800/20 dark:via-gray-700/30 dark:to-gray-800/20 dark:hover:from-gray-700/30 dark:hover:via-gray-600/40 dark:hover:to-gray-700/30 rounded-lg shadow-sm border border-dashed border-gray-200/60 dark:border-gray-300/20 hover:border-solid hover:border-gray-300/80 dark:hover:border-gray-400/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg px-4 py-3 flex flex-col justify-between ${className}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-0">
        <CardTitle className="text-sm text-gray-500 tracking-wide">
          {title}
        </CardTitle>
        {icon && (
          <div
            className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-all duration-200`}
          >
            <div className={iconColor}>{icon}</div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0 px-0 flex-1 flex flex-col justify-end">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-semibold text-gray-900">
            {numberText}
          </span>
          {unitText && <span className="text-gray-500"> {unitText}</span>}
        </div>
        {change !== undefined && (
          <div className={`mt-1 flex items-center text-sm ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="ml-1">
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
            {changeLabel && (
              <span className="ml-2 text-gray-500">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>

      {/* 噪声纹理背景 */}
      <div
        className="pointer-events-none absolute inset-0 bg-[size:180px] bg-repeat opacity-[0.02] dark:opacity-[0.01] rounded-lg"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 装饰角落 */}
      <div className="absolute z-10 w-2 h-2 rotate-45 rounded-[1px] border border-gray-200 dark:border-gray-300/20 bg-white dark:bg-gray-900 bottom-[-4px] left-[-4px]" />
      <div className="absolute z-10 w-2 h-2 rotate-45 rounded-[1px] border border-gray-200 dark:border-gray-300/20 bg-white dark:bg-gray-900 right-[-4px] bottom-[-4px]" />
    </Card>
  );
}

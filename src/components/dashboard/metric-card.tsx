"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  gradient?: string;
}

export function MetricCard({ title, value, subtitle, trend, icon, gradient }: MetricCardProps) {
  const trendColor = trend === undefined || trend === 0
    ? "text-muted-foreground"
    : trend > 0
      ? "text-emerald-600"
      : "text-red-500";

  const trendIcon = trend === undefined || trend === 0
    ? ""
    : trend > 0
      ? "↑"
      : "↓";

  return (
    <Card className="relative overflow-hidden">
      {gradient && (
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      )}
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && trend !== 0 && (
            <span className={`text-xs font-medium ${trendColor}`}>
              {trendIcon} {Math.abs(trend)}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

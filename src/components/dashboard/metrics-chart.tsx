"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricDataPoint {
  date: string;
  zenn_likes?: number;
  zenn_bookmarks?: number;
  x_likes?: number;
  [key: string]: string | number | undefined;
}

interface MetricsChartProps {
  data: MetricDataPoint[];
  title?: string;
}

const COLORS = {
  zenn_likes: "#8b5cf6",
  zenn_bookmarks: "#10b981",
  x_likes: "#3b82f6",
};

const LABELS: Record<string, string> = {
  zenn_likes: "Zenn いいね",
  zenn_bookmarks: "Zenn ブックマーク",
  x_likes: "X いいね",
};

export function MetricsChart({ data, title = "メトリクス推移" }: MetricsChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            データがありません。「データ収集」ボタンを押してください。
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine which lines to show based on data
  const lineKeys = Object.keys(data[0]).filter(
    (k) => k !== "date" && data.some((d) => (d[k] as number) > 0)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelFormatter={(v) => {
                const d = new Date(v);
                return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <Legend
              formatter={(value: string) => LABELS[value] ?? value}
            />
            {lineKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[key as keyof typeof COLORS] ?? "#888"}
                strokeWidth={2}
                dot={false}
                name={key}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

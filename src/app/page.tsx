import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-8 px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          ContentPilot
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          X + Zenn + note を一元管理
          <br />
          収益ファネルの可視化とAI記者エージェント
        </p>

        <div className="flex gap-4 mt-4">
          <Button asChild size="lg">
            <Link href="/dashboard">ダッシュボードへ</Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">UTMリンク管理</CardTitle>
              <CardDescription>クロスプラットフォーム計測</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">収益ファネル</CardTitle>
              <CardDescription>認知→信頼→購入を可視化</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">記者エージェント</CardTitle>
              <CardDescription>AIインタビューで記事生成</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}

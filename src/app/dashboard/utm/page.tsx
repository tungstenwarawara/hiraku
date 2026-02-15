"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UtmLink {
  id: string;
  original_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string | null;
  utm_content: string | null;
  short_code: string;
  click_count: number;
  created_at: string;
}

const sourceOptions = [
  { value: "x", label: "X (Twitter)" },
  { value: "zenn", label: "Zenn" },
  { value: "note", label: "note" },
  { value: "other", label: "その他" },
];

const mediumOptions = [
  { value: "social", label: "SNS投稿" },
  { value: "article", label: "記事" },
  { value: "profile", label: "プロフィール" },
  { value: "other", label: "その他" },
];

export default function UtmPage() {
  const supabase = createClient();
  const [links, setLinks] = useState<UtmLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    original_url: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
  });

  const loadLinks = useCallback(async () => {
    const { data } = await supabase
      .from("utm_links")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLinks(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleCreate = async () => {
    if (!form.original_url || !form.utm_source || !form.utm_medium) return;

    setCreating(true);
    const res = await fetch("/api/utm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm({ original_url: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "" });
      setDialogOpen(false);
      loadLinks();
    }
    setCreating(false);
  };

  const copyShortUrl = (code: string) => {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">UTMリンク管理</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>新規リンク作成</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>UTMリンクを作成</DialogTitle>
              <DialogDescription>
                トラッキング用のUTMパラメータ付きリンクを生成します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">リンク先URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={form.original_url}
                  onChange={(e) => setForm({ ...form, original_url: e.target.value })}
                  placeholder="https://example.com/article"
                />
              </div>
              <div className="space-y-2">
                <Label>ソース（utm_source） *</Label>
                <Select value={form.utm_source} onValueChange={(v) => setForm({ ...form, utm_source: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="プラットフォームを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>メディア（utm_medium） *</Label>
                <Select value={form.utm_medium} onValueChange={(v) => setForm({ ...form, utm_medium: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="媒体タイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediumOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign">キャンペーン名（任意）</Label>
                <Input
                  id="campaign"
                  value={form.utm_campaign}
                  onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
                  placeholder="launch-2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">コンテンツ（任意）</Label>
                <Input
                  id="content"
                  value={form.utm_content}
                  onChange={(e) => setForm({ ...form, utm_content: e.target.value })}
                  placeholder="tweet-01"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={creating || !form.original_url || !form.utm_source || !form.utm_medium}
              >
                {creating ? "作成中..." : "リンクを作成"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : links.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">まだリンクがありません</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              「新規リンク作成」ボタンから最初のUTMリンクを作りましょう。
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>短縮URL</TableHead>
                  <TableHead>リンク先</TableHead>
                  <TableHead>ソース</TableHead>
                  <TableHead>メディア</TableHead>
                  <TableHead>キャンペーン</TableHead>
                  <TableHead className="text-right">クリック数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <button
                        onClick={() => copyShortUrl(link.short_code)}
                        className="font-mono text-sm text-primary hover:underline cursor-pointer"
                      >
                        /r/{link.short_code}
                      </button>
                      {copied === link.short_code && (
                        <span className="ml-2 text-xs text-muted-foreground">コピー済</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                      {link.original_url}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{link.utm_source}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{link.utm_medium}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {link.utm_campaign || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {link.click_count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InterviewSession {
  id: string;
  title: string;
  status: "in_progress" | "completed";
  messages: Array<{ role: string; question: string; answer: string; timestamp: string }>;
  created_at: string;
  updated_at: string;
}

export default function InterviewsPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/interviews");
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setCreating(true);
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });

    if (res.ok) {
      setTitle("");
      setDialogOpen(false);
      loadSessions();
    }
    setCreating(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">記者AI セッション</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>新規セッション</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>インタビューを開始</DialogTitle>
              <DialogDescription>
                テーマを入力してセッションを作成します。Claude Code からインタビューを進めてください。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">テーマ *</Label>
                <Input
                  id="theme"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: Supabase認証の実装体験"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && title.trim()) handleCreate();
                  }}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={creating || !title.trim()}
              >
                {creating ? "作成中..." : "セッションを作成"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : sessions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">まだセッションがありません</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              「新規セッション」からテーマを作成し、Claude Code で <code className="bg-muted px-1 py-0.5 rounded text-sm">start_interview</code> を使ってインタビューを始めましょう。
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>テーマ</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">Q&A数</TableHead>
                  <TableHead>作成日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/interviews/${session.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {session.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                        {session.status === "completed" ? "完了" : "進行中"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {session.messages?.length ?? 0}件
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString("ja-JP")}
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

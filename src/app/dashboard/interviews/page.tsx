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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyPrompt = (session: InterviewSession) => {
    const prompt = `「${session.title}」というテーマでインタビューしてください。セッションID: ${session.id}`;
    navigator.clipboard.writeText(prompt);
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2000);
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
                テーマを入力してセッションを作成します。作成後、Claude Code でインタビューを進めてください。
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
          <CardContent className="py-10">
            <div className="max-w-md mx-auto text-center space-y-5">
              <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-violet-600"
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  記者AIで記事を作成
                </h3>
                <p className="text-sm text-muted-foreground">
                  テーマを入力してセッションを作成すると、Claude Code
                  が記者としてインタビューし、Zenn・note・X向けの記事を自動生成します。
                </p>
              </div>
              <div className="text-left bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium">フロー</p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>ここでテーマを入力してセッション作成</li>
                  <li>
                    Claude Code でセッションIDを伝えてインタビュー開始
                  </li>
                  <li>質問に回答すると記事が自動生成される</li>
                  <li>ここに戻って記事を確認・コピー・投稿</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              セッション一覧
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>テーマ</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">Q&A数</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead></TableHead>
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
                      <Badge
                        variant={
                          session.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {session.status === "completed" ? "完了" : "進行中"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {session.messages?.length ?? 0}件
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      {session.status === "in_progress" &&
                        (!session.messages ||
                          session.messages.length === 0) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => copyPrompt(session)}
                          >
                            {copiedId === session.id
                              ? "コピー済"
                              : "プロンプトをコピー"}
                          </Button>
                        )}
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

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Profile {
  display_name: string;
  x_username: string;
  zenn_username: string;
  note_username: string;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    x_username: "",
    zenn_username: "",
    note_username: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("display_name, x_username, zenn_username, note_username")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({
          display_name: data.display_name ?? "",
          x_username: data.x_username ?? "",
          zenn_username: data.zenn_username ?? "",
          note_username: data.note_username ?? "",
        });
      }
    }
    loadProfile();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name || null,
        x_username: profile.x_username || null,
        zenn_username: profile.zenn_username || null,
        note_username: profile.note_username || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);
    setMessage(error ? "保存に失敗しました" : "保存しました");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">設定</h2>

      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
          <CardDescription>
            表示名と各プラットフォームのユーザー名を設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">表示名</Label>
            <Input
              id="display_name"
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              placeholder="あなたの名前"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="x_username">X (Twitter) ユーザー名</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                id="x_username"
                value={profile.x_username}
                onChange={(e) => setProfile({ ...profile, x_username: e.target.value })}
                placeholder="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zenn_username">Zenn ユーザー名</Label>
            <Input
              id="zenn_username"
              value={profile.zenn_username}
              onChange={(e) => setProfile({ ...profile, zenn_username: e.target.value })}
              placeholder="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note_username">note ユーザー名</Label>
            <Input
              id="note_username"
              value={profile.note_username}
              onChange={(e) => setProfile({ ...profile, note_username: e.target.value })}
              placeholder="username"
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
            {message && (
              <span className={`text-sm ${message.includes("失敗") ? "text-destructive" : "text-muted-foreground"}`}>
                {message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/dashboard/metrics", label: "メトリクス" },
  { href: "/dashboard/utm", label: "UTMリンク" },
  { href: "/dashboard/settings", label: "設定" },
];

export function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="border-b border-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold">
            ContentPilot
          </Link>
          <nav className="flex gap-6 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground transition-colors"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            ログアウト
          </Button>
        </div>
      </div>
    </header>
  );
}

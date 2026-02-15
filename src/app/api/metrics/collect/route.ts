import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchZennArticles, zennArticlesToMetrics } from "@/lib/integrations/zenn";
import { fetchNoteArticles, noteArticlesToContents } from "@/lib/integrations/note";

/**
 * POST /api/metrics/collect
 * Triggers metrics collection for the current authenticated user.
 * Collects from Zenn (API) and note (RSS) based on configured usernames.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile with platform usernames
  const { data: profile } = await supabase
    .from("profiles")
    .select("zenn_username, note_username")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found. Please configure your settings first." },
      { status: 400 }
    );
  }

  const results: Record<string, { success: boolean; count?: number; error?: string }> = {};

  // Collect Zenn metrics
  if (profile.zenn_username?.trim()) {
    try {
      const articles = await fetchZennArticles(profile.zenn_username);
      const { metrics, contents } = zennArticlesToMetrics(user.id, articles);

      // Upsert contents
      if (contents.length > 0) {
        const { error: contentsError } = await supabase
          .from("contents")
          .upsert(contents, { onConflict: "user_id,platform,external_id" });
        if (contentsError) {
          console.error("Zenn contents upsert error:", contentsError);
        }
      }

      // Upsert metrics (daily dedup via unique index)
      if (metrics.length > 0) {
        const { error: metricsError } = await supabase
          .from("metrics")
          .upsert(metrics, {
            onConflict: "user_id,platform,content_id,metric_type,collected_date",
          });
        if (metricsError) {
          console.error("Zenn metrics upsert error:", metricsError);
          results.zenn = { success: false, error: metricsError.message };
        } else {
          results.zenn = { success: true, count: articles.length };
        }
      } else {
        results.zenn = { success: true, count: 0 };
      }
    } catch (e) {
      results.zenn = { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  // Collect note articles (RSS - no metrics, just article list)
  if (profile.note_username) {
    try {
      const articles = await fetchNoteArticles(profile.note_username);
      const contents = noteArticlesToContents(user.id, articles);

      if (contents.length > 0) {
        const { error: contentsError } = await supabase
          .from("contents")
          .upsert(contents, { onConflict: "user_id,platform,external_id" });
        if (contentsError) {
          results.note = { success: false, error: contentsError.message };
        } else {
          results.note = { success: true, count: articles.length };
        }
      } else {
        results.note = { success: true, count: 0 };
      }
    } catch (e) {
      results.note = { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  // Update last_collected_at
  await supabase
    .from("profiles")
    .update({ last_collected_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({
    collected_at: new Date().toISOString(),
    results,
  });
}

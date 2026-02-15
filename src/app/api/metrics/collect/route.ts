import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchZennArticles,
  zennArticlesToMetrics,
  fetchZennProfile,
  zennProfileToMetrics,
} from "@/lib/integrations/zenn";
import {
  fetchNoteArticles,
  noteArticlesToContents,
  fetchNoteProfile,
  noteProfileToMetrics,
  fetchNoteApiArticles,
  noteApiArticlesToMetrics,
} from "@/lib/integrations/note";

/**
 * POST /api/metrics/collect
 * Triggers metrics collection for the current authenticated user.
 * Collects from Zenn (API) and note (RSS + supplementary API).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const results: Record<
    string,
    { success: boolean; count?: number; error?: string }
  > = {};

  // ─── Zenn Collection ───────────────────────────────────

  if (profile.zenn_username?.trim()) {
    try {
      // 1. Article metrics
      const articles = await fetchZennArticles(profile.zenn_username);
      const { metrics, contents } = zennArticlesToMetrics(user.id, articles);

      if (contents.length > 0) {
        const { error: contentsError } = await supabase
          .from("contents")
          .upsert(contents, { onConflict: "user_id,platform,external_id" });
        if (contentsError) {
          console.error("Zenn contents upsert error:", contentsError);
        }
      }

      if (metrics.length > 0) {
        const { error: metricsError } = await supabase
          .from("metrics")
          .upsert(metrics, {
            onConflict:
              "user_id,platform,content_id,metric_type,collected_date",
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

      // 2. Profile metrics (followers, total_likes)
      try {
        const zennProfile = await fetchZennProfile(profile.zenn_username);
        const profileMetrics = zennProfileToMetrics(user.id, zennProfile);
        if (profileMetrics.length > 0) {
          await supabase.from("metrics").upsert(profileMetrics, {
            onConflict:
              "user_id,platform,content_id,metric_type,collected_date",
          });
        }
      } catch (e) {
        console.error("Zenn profile metrics error:", e);
        // Non-critical: article metrics already saved
      }
    } catch (e) {
      results.zenn = {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }

  // ─── note Collection ───────────────────────────────────

  if (profile.note_username?.trim()) {
    try {
      // 1. RSS: article list (primary, reliable)
      const rssArticles = await fetchNoteArticles(profile.note_username);
      const rssContents = noteArticlesToContents(user.id, rssArticles);

      if (rssContents.length > 0) {
        const { error: contentsError } = await supabase
          .from("contents")
          .upsert(rssContents, { onConflict: "user_id,platform,external_id" });
        if (contentsError) {
          console.error("note RSS contents upsert error:", contentsError);
        }
      }

      results.note = { success: true, count: rssArticles.length };

      // 2. JSON API: article metrics (supplementary, with fallback)
      try {
        const apiArticles = await fetchNoteApiArticles(
          profile.note_username
        );
        if (apiArticles.length > 0) {
          const { metrics, contents } = noteApiArticlesToMetrics(
            user.id,
            apiArticles
          );

          // Upsert contents from API (may have more recent data)
          if (contents.length > 0) {
            await supabase
              .from("contents")
              .upsert(contents, {
                onConflict: "user_id,platform,external_id",
              });
          }

          // Upsert engagement metrics
          if (metrics.length > 0) {
            await supabase.from("metrics").upsert(metrics, {
              onConflict:
                "user_id,platform,content_id,metric_type,collected_date",
            });
          }

          results.note = { success: true, count: apiArticles.length };
        }
      } catch {
        // Non-critical: RSS contents already saved
        console.warn("note API metrics failed, RSS data preserved");
      }

      // 3. Profile metrics (supplementary, with fallback)
      try {
        const noteProfile = await fetchNoteProfile(profile.note_username);
        if (noteProfile) {
          const profileMetrics = noteProfileToMetrics(
            user.id,
            profile.note_username,
            noteProfile
          );
          if (profileMetrics.length > 0) {
            await supabase.from("metrics").upsert(profileMetrics, {
              onConflict:
                "user_id,platform,content_id,metric_type,collected_date",
            });
          }
        }
      } catch {
        console.warn("note profile metrics failed (non-critical)");
      }
    } catch (e) {
      results.note = {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
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

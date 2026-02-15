import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/metrics
 * Fetch metrics for the current user with optional filters.
 *
 * Query params:
 *   platform: "zenn" | "note" | "x" (optional)
 *   period: "7d" | "30d" | "90d" (default: "30d")
 *   content_id: specific content (optional)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const period = searchParams.get("period") || "30d";
  const contentId = searchParams.get("content_id");

  // Calculate date range
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = supabase
    .from("metrics")
    .select("*")
    .eq("user_id", user.id)
    .gte("collected_date", startDate.toISOString().split("T")[0])
    .order("collected_date", { ascending: true });

  if (platform) {
    query = query.eq("platform", platform);
  }
  if (contentId) {
    query = query.eq("content_id", contentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

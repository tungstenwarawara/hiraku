import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildUtmUrl } from "@/lib/utm";

// Use service-level client for public redirect (no auth needed)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = getSupabase();

  const { data: link } = await supabase
    .from("utm_links")
    .select("*")
    .eq("short_code", code)
    .single();

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Record click asynchronously
  const headers = request.headers;
  supabase.from("utm_clicks").insert({
    utm_link_id: link.id,
    referrer: headers.get("referer") || null,
    user_agent: headers.get("user-agent") || null,
    ip_hash: null, // Would hash IP in production
  }).then(() => {});

  // Increment click count
  supabase.rpc("increment_click_count", { link_id: link.id }).then(() => {});

  const redirectUrl = buildUtmUrl(link.original_url, {
    utm_source: link.utm_source,
    utm_medium: link.utm_medium,
    utm_campaign: link.utm_campaign,
    utm_content: link.utm_content,
  });

  return NextResponse.redirect(redirectUrl);
}

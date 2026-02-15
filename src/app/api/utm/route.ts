import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateShortCode } from "@/lib/utm";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("utm_links")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { original_url, utm_source, utm_medium, utm_campaign, utm_content } = body;

  if (!original_url || !utm_source || !utm_medium) {
    return NextResponse.json(
      { error: "original_url, utm_source, utm_medium are required" },
      { status: 400 }
    );
  }

  // Validate URL
  try {
    new URL(original_url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const short_code = generateShortCode();

  const { data, error } = await supabase
    .from("utm_links")
    .insert({
      user_id: user.id,
      original_url,
      utm_source,
      utm_medium,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      short_code,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

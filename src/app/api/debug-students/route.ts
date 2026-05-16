import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase.from("subscriptions").select(`
 id,
 student:profiles (
 id,
 name,
 email,
 phone
 )
 `);

    return NextResponse.json({
      count: data?.length || 0,
      sample: data?.slice(0, 5),
      error: error?.message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}

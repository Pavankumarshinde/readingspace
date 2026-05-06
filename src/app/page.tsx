import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingClient from "./LandingClient";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "manager") redirect("/manager/rooms");
    else redirect("/student/rooms");
  }

  // Show landing page for unauthenticated users
  return <LandingClient />;
}

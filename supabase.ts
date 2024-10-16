import { createClient } from "@supabase/supabase-js";
import "jsr:@std/dotenv/load";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_KEY");

if (!supabaseKey || !supabaseUrl) {
  throw new Error("Missing env variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

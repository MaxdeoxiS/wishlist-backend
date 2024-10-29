import { createClient } from "@supabase/supabase-js";
import "jsr:@std/dotenv/load";
import type { Database } from "./database.types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_KEY");

if (!supabaseKey || !supabaseUrl) {
  throw new Error("Missing env variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

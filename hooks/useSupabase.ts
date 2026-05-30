"use client";
import { createClientSupabase } from "@/lib/supabase-client";
import { useMemo } from "react";

export function useSupabase() {
  // memoised so the same client instance is returned on every render
  return useMemo(() => createClientSupabase(), []);
}

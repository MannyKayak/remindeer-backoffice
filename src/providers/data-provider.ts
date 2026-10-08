import { dataProvider } from "@refinedev/supabase";
import { supabaseClient } from "./supabase-client";

export const refineDataProvider = dataProvider(supabaseClient);

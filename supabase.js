const SUPABASE_URL = "https://hdxfuxmzxlivdqwtuewc.supabase.co";
const SUPABASE_KEY = "sb_publishable_Edz4OKs_E7_1d4sgL7-1Tw_vKkGDkhw";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
console.log("Supabase loaded:", supabase);
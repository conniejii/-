const SUPABASE_URL = 'https://eyvezsooeguaclwwlntj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u39s6S8yq4S2beuR9IKIGg_flTR3Sfm';

let MYsupabase;

try {
    if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
        MYsupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase 初始化成功！");
    } else {
        console.error("Supabase SDK 尚未載入完成，請確認 HTML 是否有引入 CDN");
    }
} catch (e) {
    console.error("Supabase 初始化失敗:", e);
}

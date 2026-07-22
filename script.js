// 1. 初始化 Supabase
const SUPABASE_URL = 'https://eyvezsooeguaclwwlntj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u39s6S8yq4S2beuR9IKIGg_flTR3Sfm'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadExams() {
    const tableBody = document.getElementById('examTableBody');
    if (!tableBody) return;

    if (!MYsupabase) {
        console.error("Supabase 未能成功初始化，請檢查 SDK 是否有正確載入。");
        return;
    }

    try {
        const { data, error } = await MYsupabase
            .from('exams')
            .select('*');

        if (error) {
            console.error("Supabase 查詢失敗：", error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-red-400">讀取失敗：${error.message}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-gray-400">資料庫中目前沒有資料</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(exam => {
            const pdfUrl = exam.file_url || exam.link;
            const ansPdfUrl = exam.ans_url || exam.ansLink;

            return `
                <tr class="hover:bg-gray-800 transition">
                    <td class="border border-gray-700 px-4 py-2 text-center">${exam.year || ''}</td>
                    <td class="border border-gray-700 px-4 py-2 font-medium">${exam.sub || ''}</td>
                    <td class="border border-gray-700 px-4 py-2">${exam.prof || ''}</td>
                    <td class="border border-gray-700 px-4 py-2 text-center">${exam.type || ''}</td>
                    <td class="border border-gray-700 px-4 py-2 text-center text-sm text-gray-300">${exam.scope || '-'}</td>
                    <td class="border border-gray-700 px-4 py-2 text-center">
                        ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" class="text-blue-400 hover:underline">📄 題目</a>` : '-'}
                    </td>
                    <td class="border border-gray-700 px-4 py-2 text-center">
                        ${ansPdfUrl ? `<a href="${ansPdfUrl}" target="_blank" class="text-green-400 hover:underline">📄 答案</a>` : '-'}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("執行 loadExams 時發生未知錯誤：", err);
    }
}

document.addEventListener('DOMContentLoaded', loadExams);

// 1. 初始化 Supabase 連線 (已填入你的專案資訊)
const supabaseUrl = 'https://mgbhyzbklpiiorqnbljp.supabase.co';
const supabaseKey = 'sb_publishable_IgrbbxcW5lmbI_pwg6KAkA_CZ4PkSGi';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. 全域變數
let allExams = [];
let data = {
    "Freshman1": { subjects: [], teachers: {} },
    "Freshman2": { subjects: [], teachers: {} }
};

const gradeSelect = document.getElementById('grade');
const subjectSelect = document.getElementById('subject');
const teacherSelect = document.getElementById('teacher');
const tableBody = document.getElementById('examTableBody');

// --- 【核心功能：從雲端同步資料】 ---
async function fetchExams() {
    console.log("正在從雲端同步資料...");
    // 從 Supabase 的 'exams' 表格抓取所有資料
    const { data: cloudData, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("抓取失敗:", error.message);
        return;
    }

    if (cloudData) {
        allExams = cloudData;
        rebuildMenuData(); // 根據雲端資料重建選單目錄
        renderTable();     // 渲染表格
        updateGradeUI();   // 更新年級選單
    }
}

// 根據 allExams 重建選單結構 (確保下拉選單跟雲端一致)
function rebuildMenuData() {
    let newData = {
        "Freshman1": { subjects: [], teachers: {} },
        "Freshman2": { subjects: [], teachers: {} }
    };

    allExams.forEach(exam => {
        if (!newData[exam.grade]) newData[exam.grade] = { subjects: [], teachers: {} };
        if (!newData[exam.grade].subjects.includes(exam.sub)) {
            newData[exam.grade].subjects.push(exam.sub);
        }
        if (!newData[exam.grade].teachers[exam.sub]) {
            newData[exam.grade].teachers[exam.sub] = [];
        }
        if (!newData[exam.grade].teachers[exam.sub].includes(exam.prof)) {
            newData[exam.grade].teachers[exam.sub].push(exam.prof);
        }
    });
    data = newData;
}

// --- 【新增功能：存入雲端】 ---
async function add(grade, sub, prof, year, type, link) {
    const { error } = await supabase
        .from('exams')
        .insert([{ grade, sub, prof, year, type, link }]);

    if (error) {
        alert("新增失敗，請檢查 Supabase 的 RLS 權限設定！");
        console.error(error);
        return;
    }

    // 成功後重新抓取
    await fetchExams();
}

// --- 【刪除功能：從雲端移除】 ---
async function removeAt(index) {
    const targetId = allExams[index].id;

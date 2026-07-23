const SUPABASE_URL = 'https://eyvezsooeguaclwwlntj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u39s6S8yq4S2beuR9IKIGg_flTR3Sfm'; 

let MYsupabase;
try {
    if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
        MYsupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.error("Supabase SDK 初始化失敗", e);
}

// 全域變數
let allExams = [];   

// DOM 元素
const gradeSelect = document.getElementById('grade');
const subjectSelect = document.getElementById('subject');
const teacherSelect = document.getElementById('teacher');
const tableBody = document.getElementById('examTableBody');

// 💡 乾淨的字串處理：只去掉前後空白
function clean(str) {
    if (!str) return '';
    return str.toString().trim();
}

// 1. 從 Supabase 讀取資料
async function loadExamsFromSupabase() {
    if (!MYsupabase && window.supabase) {
        MYsupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    if (!MYsupabase) {
        console.error("無法連線 Supabase，請確認 CDN 是否已引入。");
        return;
    }

    try {
        const { data: exams, error } = await MYsupabase
            .from('exams')
            .select('*');

        if (error) throw error;

        allExams = exams || [];

        // 初始化選單與表格
        initDropdownOptions();
        renderTable();

    } catch (err) {
        console.error("無法讀取資料：", err.message);
    }
}

// 2. 初始化選單選項（預設載入全部）
function initDropdownOptions() {
    if (!gradeSelect || !subjectSelect || !teacherSelect) return;

    gradeSelect.innerHTML = '<option value="">所有年級</option>';
    subjectSelect.innerHTML = '<option value="">所有科目</option>';
    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    const allGrades = new Set();
    const allSubjects = new Set();
    const allTeachers = new Set();

    allExams.forEach(exam => {
        const grade = clean(exam.grade);
        const sub = clean(exam.sub || exam.subject);
        const prof = clean(exam.prof || exam.teacher);

        if (grade) allGrades.add(grade);
        if (sub) allSubjects.add(sub);
        if (prof) allTeachers.add(prof);
    });

    allGrades.forEach(grade => {
        gradeSelect.innerHTML += `<option value="${grade}">${grade}</option>`;
    });
    allSubjects.forEach(sub => {
        subjectSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
    allTeachers.forEach(prof => {
        teacherSelect.innerHTML += `<option value="${prof}">${prof}</option>`;
    });
}

// 3. 當「年級」改變時更新科目選單（統一用 clean 去空白）
function updateGradeUI() {
    const selectedGrade = clean(gradeSelect.value);

    // 如果切回「所有年級」，恢復預設全區域選單
    if (!selectedGrade) {
        initDropdownOptions();
        return;
    }

    subjectSelect.innerHTML = '<option value="">所有科目</option>';
    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    const subjectsInGrade = new Set();

    allExams.forEach(exam => {
        const examGrade = clean(exam.grade);
        const examSub = clean(exam.sub || exam.subject);

        // 比對時去空白，存入 Set 時也去空白
        if (examGrade === selectedGrade && examSub) {
            subjectsInGrade.add(examSub);
        }
    });

    subjectsInGrade.forEach(sub => {
        subjectSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
}

// 4. 當「科目」改變時更新教師選單
function updateSubjectUI() {
    const selectedGrade = clean(gradeSelect.value);
    const selectedSub = clean(subjectSelect.value);

    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    const teachersForSub = new Set();

    allExams.forEach(exam => {
        const examGrade = clean(exam.grade);
        const examSub = clean(exam.sub || exam.subject);
        const examProf = clean(exam.prof || exam.teacher);

        const matchGrade = !selectedGrade || examGrade === selectedGrade;
        const matchSub = !selectedSub || examSub === selectedSub;

        if (matchGrade && matchSub && examProf) {
            teachersForSub.add(examProf);
        }
    });

    teachersForSub.forEach(prof => {
        teacherSelect.innerHTML += `<option value="${prof}">${prof}</option>`;
    });
}

// 5. 渲染表格
function renderTable() {
    if (!tableBody) return;

    const selectedGrade = clean(gradeSelect ? gradeSelect.value : '');
    const selectedSubject = clean(subjectSelect ? subjectSelect.value : '');
    const selectedTeacher = clean(teacherSelect ? teacherSelect.value : '');

    const filtered = allExams.filter(exam => {
        const examGrade = clean(exam.grade);
        const examSub = clean(exam.sub || exam.subject);
        const examProf = clean(exam.prof || exam.teacher);

        const matchGrade = !selectedGrade || examGrade === selectedGrade;
        const matchSubject = !selectedSubject || examSub === selectedSubject;
        const matchTeacher = !selectedTeacher || examProf === selectedTeacher;
        
        return matchGrade && matchSubject && matchTeacher;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="border border-gray-700 px-4 py-8 text-center text-gray-400">
                    目前沒有符合條件的考古題喔！
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(exam => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-800/50 transition-colors";

        const pdfUrl = exam.file_url || exam.link;
        const ansPdfUrl = exam.ans_url || exam.ansLink;

        row.innerHTML = `
            <td class="border border-gray-700 px-4 py-2 text-center">${exam.grade || '-'}</td>
            <td class="border border-gray-700 px-4 py-2 text-center">${exam.year || ''}</td>
            <td class="border border-gray-700 px-4 py-2 font-medium">${exam.sub || exam.subject || ''}</td>
            <td class="border border-gray-700 px-4 py-2">${exam.prof || exam.teacher || ''}</td>
            <td class="border border-gray-700 px-4 py-2 text-center">${exam.type || ''}</td>
            <td class="border border-gray-700 px-4 py-2 text-center text-sm text-gray-300">${exam.scope || '-'}</td>
            <td class="border border-gray-700 px-4 py-2 text-center">
                ${pdfUrl 
                    ? `<a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline font-medium">📄 題目</a>` 
                    : '<span class="text-gray-500">-</span>'}
            </td>
            <td class="border border-gray-700 px-4 py-2 text-center">
                ${ansPdfUrl 
                    ? `<a href="${ansPdfUrl}" target="_blank" rel="noopener noreferrer" class="text-green-400 hover:text-green-300 hover:underline font-medium">📄 答案</a>` 
                    : '<span class="text-gray-500">-</span>'}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 6. 事件監聽
if (gradeSelect) {
    gradeSelect.addEventListener('change', function() {
        updateGradeUI();
        renderTable();
    });
}

if (subjectSelect) {
    subjectSelect.addEventListener('change', function() {
        updateSubjectUI();
        renderTable();
    });
}

if (teacherSelect) {
    teacherSelect.addEventListener('change', renderTable);
}

// 7. 網頁開啟時執行
document.addEventListener('DOMContentLoaded', loadExamsFromSupabase);

function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    const btnText = document.getElementById('toggleText');

    if (!panel || !btnText) return;

    panel.classList.toggle('hidden');

    if (panel.classList.contains('hidden')) {
        btnText.innerText = '➕ 新增考古題';
    } else {
        btnText.innerText = '❌ 關閉面板';
    }
}

// 當網頁載入完成後，幫按鈕綁定點擊事件
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAdmin);
    }
});


// 新增考古題資料處理函式
async function handleManualAdd() {
    // 1. 抓取所有欄位的值 (ID 與 HTML 保持一致)
    const grade = document.getElementById('add-grade').value;
    const sub = document.getElementById('add-subject').value.trim();
    const prof = document.getElementById('add-teacher').value.trim();
    const year = document.getElementById('semester').value.trim();
    const type = document.getElementById('testType').value.trim();
    const scope = document.getElementById('testScope').value.trim(); // 考試範圍 (選填)

    // 檔案物件 (若後續需上傳至 Supabase Storage 使用)
    const fileInput = document.getElementById('newfile');
    const ansFileInput = document.getElementById('ansfile');
    const file = fileInput.files[0];
    const ansFile = ansFileInput.files[0];

    // 2. 基礎必填欄位檢查 (科目、老師、學年度、考試類別、題目檔案)
    if (!sub || !prof || !year || !type || !fileInput.value) {
        alert("請填寫完整資訊並選擇題目 PDF 檔案喔！");
        return; // 中止執行
    }

    // 3. 呼叫新增資料的函式 (以物件或多參數形式傳遞)
    // 如果你有對接資料庫 (如 Supabase)，可以在 add 函式內處理上傳
    if (typeof add === "function") {
        await add({
            grade,
            sub,
            prof,
            year,
            type,
            scope,
            file,
            ansFile
        });
    } else {
        console.log("新增資料中...", { grade, sub, prof, year, type, scope, file, ansFile });
    }

    // 4. 提示與介面更新
    alert("成功加入考古題！");

    // 重新繪製畫面表格 (如果有 renderTable 函式)
    if (typeof renderTable === "function") {
        renderTable();
    }

    // 自動收起管理面板
    if (typeof toggleAdmin === "function") {
        toggleAdmin();
    }

    // 5. 清空輸入框內容，方便下一次輸入
    document.getElementById('add-subject').value = '';
    document.getElementById('add-teacher').value = '';
    document.getElementById('semester').value = '';
    document.getElementById('testType').value = '';
    document.getElementById('testScope').value = '';
    fileInput.value = '';
    ansFileInput.value = '';
}

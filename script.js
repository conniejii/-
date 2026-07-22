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

// 2. 初始化選單選項（使用 Set 保證所有選項 100% 不重複）
function initDropdownOptions() {
    if (!gradeSelect || !subjectSelect || !teacherSelect) return;

    gradeSelect.innerHTML = '<option value="">所有年級</option>';
    subjectSelect.innerHTML = '<option value="">所有科目</option>';
    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    const allGrades = new Set();
    const allSubjects = new Set();
    const allTeachers = new Set();

    allExams.forEach(exam => {
        const grade = (exam.grade || '').trim();
        const sub = (exam.sub || exam.subject || '').trim();
        const prof = (exam.prof || exam.teacher || '').trim();

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

// 3. 當「年級」改變時更新科目選單（去重）
function updateGradeUI() {
    const selectedGrade = gradeSelect.value;

    if (!selectedGrade) {
        initDropdownOptions();
        return;
    }

    subjectSelect.innerHTML = '<option value="">所有科目</option>';
    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    const subjectsInGrade = new Set();
    allExams
        .filter(exam => exam.grade === selectedGrade)
        .forEach(exam => {
            const sub = exam.sub || exam.subject;
            if (sub) subjectsInGrade.add(sub);
        });

    subjectsInGrade.forEach(sub => {
        subjectSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
}

// 4. 當「科目」改變時更新教師選單（去重）
function updateSubjectUI() {
    const selectedGrade = gradeSelect.value;
    const selectedSub = subjectSelect.value;

    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    const teachersForSub = new Set();
    allExams
        .filter(exam => {
            const matchGrade = !selectedGrade || exam.grade === selectedGrade;
            const matchSub = !selectedSub || (exam.sub || exam.subject) === selectedSub;
            return matchGrade && matchSub;
        })
        .forEach(exam => {
            const prof = exam.prof || exam.teacher;
            if (prof) teachersForSub.add(prof);
        });

    teachersForSub.forEach(prof => {
        teacherSelect.innerHTML += `<option value="${prof}">${prof}</option>`;
    });
}

// 5. 渲染表格（修正欄位順序：年級 -> 學年度 -> 科目 -> 教師 -> 類別 -> 範圍 -> 題目 -> 答案）
function renderTable() {
    if (!tableBody) return;

    const selectedGrade = gradeSelect ? gradeSelect.value : '';
    const selectedSubject = subjectSelect ? subjectSelect.value : '';
    const selectedTeacher = teacherSelect ? teacherSelect.value : '';

    const filtered = allExams.filter(exam => {
        const examGrade = exam.grade || '';
        const examSub = exam.sub || exam.subject || '';
        const examProf = exam.prof || exam.teacher || '';

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

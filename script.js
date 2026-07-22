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
let data = {};       // 選單階層結構 { 年級: { subjects: [...], teachers: { 科目: [...] } } }
let allExams = [];   // 原始完整資料

// DOM 元素
const gradeSelect = document.getElementById('grade');
const subjectSelect = document.getElementById('subject');
const teacherSelect = document.getElementById('teacher');
const tableBody = document.getElementById('examTableBody');

// 1. 從 Supabase 讀取資料
async function loadExamsFromSupabase() {
    // 防呆：如果沒初始化成功，嘗試重新抓取一次 window.supabase
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
            .select('*')
            .order('year', { ascending: false });

        if (error) throw error;

        allExams = exams || [];
        data = {};

        // 整理階層資料 (年級 -> 科目 -> 老師)
        allExams.forEach(item => {
            const { grade, sub, prof } = item;
            if (!grade || !sub) return;

            if (!data[grade]) {
                data[grade] = { subjects: [], teachers: {} };
            }
            if (!data[grade].subjects.includes(sub)) {
                data[grade].subjects.push(sub);
            }
            if (!data[grade].teachers[sub]) {
                data[grade].teachers[sub] = [];
            }
            if (prof && !data[grade].teachers[sub].includes(prof)) {
                data[grade].teachers[sub].push(prof);
            }
        });

        // 預設初始化下拉選單選項，並印出全部表格
        initDropdownOptions();
        renderTable();

    } catch (err) {
        console.error("無法讀取資料：", err.message);
    }
}

// 2. 初始化選單選項（預設列出所有不重複的科目與教師）
function initDropdownOptions() {
    if (!subjectSelect || !teacherSelect) return;

    // 清空並重設預設提示
    subjectSelect.innerHTML = '<option value="">所有科目</option>';
    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    // 收集全部不重複的科目與教師
    const allSubjects = new Set();
    const allTeachers = new Set();

    allExams.forEach(exam => {
        if (exam.sub) allSubjects.add(exam.sub);
        if (exam.prof) allTeachers.add(exam.prof);
    });

    allSubjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subjectSelect.appendChild(opt);
    });

    allTeachers.forEach(prof => {
        const opt = document.createElement('option');
        opt.value = prof;
        opt.textContent = prof;
        teacherSelect.appendChild(opt);
    });
}

// 3. 渲染表格（未選擇任何條件時 = 顯示全部）
function renderTable() {
    if (!tableBody) return;

    const selectedGrade = gradeSelect ? gradeSelect.value : '';
    const selectedSubject = subjectSelect ? subjectSelect.value : '';
    const selectedTeacher = teacherSelect ? teacherSelect.value : '';

    const filtered = allExams.filter(exam => {
        const matchGrade = !selectedGrade || exam.grade === selectedGrade;
        const matchSubject = !selectedSubject || exam.sub === selectedSubject;
        const matchTeacher = !selectedTeacher || exam.prof === selectedTeacher;
        return matchGrade && matchSubject && matchTeacher;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="border border-gray-700 px-4 py-8 text-center text-gray-400">
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
            <td class="border border-gray-700 px-4 py-2 text-center">${exam.year || ''}</td>
            <td class="border border-gray-700 px-4 py-2 font-medium">${exam.sub || ''}</td>
            <td class="border border-gray-700 px-4 py-2">${exam.prof || ''}</td>
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

// 4. 當選擇年級時更新動態選單
function updateGradeUI() {
    const selectedGrade = gradeSelect.value;

    // 如果切回「所有年級」，恢復全域預設選單選項
    if (!selectedGrade) {
        initDropdownOptions();
        return;
    }

    subjectSelect.innerHTML = '<option value="">所有科目</option>';
    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    const currentSubjects = data[selectedGrade] ? data[selectedGrade].subjects : [];
    
    currentSubjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subjectSelect.appendChild(opt);
    });
}

// 5. 事件監聽設定
if (gradeSelect) {
    gradeSelect.addEventListener('change', function() {
        updateGradeUI();
        renderTable();
    });
}

if (subjectSelect) {
    subjectSelect.addEventListener('change', function() {
        const selectedSub = this.value;
        const selectedGrade = gradeSelect.value;
        
        teacherSelect.innerHTML = '<option value="">所有授課教師</option>';
        
        if (selectedGrade && selectedSub && data[selectedGrade] && data[selectedGrade].teachers[selectedSub]) {
            data[selectedGrade].teachers[selectedSub].forEach(t => {
                const opt = document.createElement('option');
                opt.value = t; 
                opt.textContent = t;
                teacherSelect.appendChild(opt);
            });
        } else if (selectedSub) {
            // 若未選擇年級但選了科目，自動帶出該科目的所有教授
            const teachersForSub = new Set();
            allExams.filter(e => e.sub === selectedSub).forEach(e => {
                if (e.prof) teachersForSub.add(e.prof);
            });
            teachersForSub.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                teacherSelect.appendChild(opt);
            });
        }
        renderTable();
    });
}

if (teacherSelect) {
    teacherSelect.addEventListener('change', renderTable);
}

// 6. 網頁開啟時執行
document.addEventListener('DOMContentLoaded', loadExamsFromSupabase);

const SUPABASE_URL = 'https://eyvezsooeguaclwwlntj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u39s6S8yq4S2beuR9IKIGg_flTR3Sfm'; 

let MYsupabase;
try {
    MYsupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    console.error("Supabase SDK 載入失敗", e);
}

// 全域變數
let data = {};       // 選單階層結構
let allExams = [];   // 原始完整資料

// DOM 元素
const gradeSelect = document.getElementById('grade');
const subjectSelect = document.getElementById('subject');
const teacherSelect = document.getElementById('teacher');
const tableBody = document.getElementById('examTableBody');

// 1. 從 Supabase 讀取資料
async function loadExamsFromSupabase() {
    if (!MYsupabase) return;

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

        // 預設直接顯示全部資料
        renderTable();

    } catch (err) {
        console.error("無法讀取資料：", err.message);
    }
}

// 2. 渲染表格（沒選條件時 = 顯示全部）
function renderTable() {
    if (!tableBody) return;

    const selectedGrade = gradeSelect ? gradeSelect.value : '';
    const selectedSubject = subjectSelect ? subjectSelect.value : '';
    const selectedTeacher = teacherSelect ? teacherSelect.value : '';

    // 篩選邏輯：如果 selectedGrade/Subject/Teacher 為空字串，代表「不限」，全部通過！
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

// 3. 更新年級對應的科目選單
function updateGradeUI() {
    const selectedGrade = gradeSelect.value;

    subjectSelect.innerHTML = '<option value="">所有科目</option>';
    teacherSelect.innerHTML = '<option value="">所有授課教師</option>';

    if (!selectedGrade) return;

    const currentSubjects = data[selectedGrade] ? data[selectedGrade].subjects : [];
    
    currentSubjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subjectSelect.appendChild(opt);
    });
}

// 4. 事件監聽設定
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
        }
        renderTable();
    });
}

if (teacherSelect) {
    teacherSelect.addEventListener('change', renderTable);
}

// 5. 網頁開啟時執行
document.addEventListener('DOMContentLoaded', loadExamsFromSupabase);

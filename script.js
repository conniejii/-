const SUPABASE_URL = 'https://eyvezsooeguaclwwlntj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u39s6S8yq4S2beuR9IKIGg_flTR3Sfm'; 
const MYsupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let data = {};
let allExams = [];

const gradeSelect = document.getElementById('grade');
const subjectSelect = document.getElementById('subject');
const teacherSelect = document.getElementById('teacher');
const tableBody = document.getElementById('examTableBody');

async function loadMenuDataFromSupabase() {
    try {
        const { data: exams, error } = await MYsupabase
            .from('exams')
            .select('grade, sub, prof');

        if (error) throw error;

        data = {};

        exams.forEach(item => {
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

        if (typeof initSelectOptions === 'function') {
            initSelectOptions();
        }

    } catch (err) {
        console.error("無法從 Supabase 載入選單資料：", err.message);
    }
}

async function loadExamsFromSupabase() {
    try {
        const { data, error } = await MYsupabase
            .from('exams')
            .select('*')
            .order('year', { ascending: false });

        if (error) throw error;

        allExams = data || [];
        renderTable();

    } catch (err) {
        console.error("無法從 Supabase 讀取考古題資料：", err.message);
    }
}

function renderTable() {
    const selectedGrade = gradeSelect ? gradeSelect.value : '';
    const selectedSubject = subjectSelect ? subjectSelect.value : '';
    const selectedTeacher = teacherSelect ? teacherSelect.value : '';

    const filtered = allExams.filter(exam => {
        const matchGrade = !selectedGrade || exam.grade === selectedGrade;
        const matchSubject = !selectedSubject || exam.sub === selectedSubject;
        const matchTeacher = !selectedTeacher || exam.prof === selectedTeacher;
        return matchGrade && matchSubject && matchTeacher;
    });

    if (!tableBody) return;
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
                    ? `<a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline font-medium inline-flex items-center gap-1">📄 開啟題目</a>` 
                    : '<span class="text-gray-500">-</span>'}
            </td>
            <td class="border border-gray-700 px-4 py-2 text-center">
                ${ansPdfUrl 
                    ? `<a href="${ansPdfUrl}" target="_blank" rel="noopener noreferrer" class="text-green-400 hover:text-green-300 hover:underline font-medium inline-flex items-center gap-1">📄 開啟答案</a>` 
                    : '<span class="text-gray-500">-</span>'}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function initApp() {
    await loadMenuDataFromSupabase();
    await loadExamsFromSupabase();
}

initApp();

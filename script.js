// 1. 初始化 Supabase 連線 (請填入你從 Supabase 後台拿到的資料)
const supabaseUrl = 'https://mgbhyzbklpiiorqnbljp.supabase.co';
const supabaseKey = 'sb_publishable_IgrbbxcW5lmbI_pwg6KAkA_CZ4PkSGi';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. 全域變數 (原本從 LocalStorage 拿，現在改為從雲端同步後填入)
let allExams = [];
let data = {
    "Freshman1": { subjects: [], teachers: {} },
    "Freshman2": { subjects: [], teachers: {} },
    "Sophomore1":{ subjects: [], teachers: {} },
    "Sophomore2":{ subjects: [], teachers: {} },
    "Junior1":{ subjects: [], teachers: {} },
    "Junior2":{ subjects: [], teachers: {} },
    "Senior1":{ subjects: [], teachers: {} },
    "Senior2":{ subjects: [], teachers: {} },
    "General":{ subjects: [], teachers: {} },
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
        .order('created_at', { ascending: false }); // 按時間排序，新的在前

    if (error) {
        console.error("抓取失敗:", error.message);
        return;
    }

    if (cloudData) {
        allExams = cloudData;
        rebuildMenuData(); // 根據抓回來的資料重新建立選單目錄
        renderTable();     // 畫出表格
        updateGradeUI();   // 更新年級選單
    }
}

// 根據 allExams 重建你的 data 結構 (就是你覺得很繞但很穩的那段)
function rebuildMenuData() {
    let newData = {
        "Freshman1": { subjects: [], teachers: {} },
        "Freshman2": { subjects: [], teachers: {} },
        "Sophomore1":{ subjects: [], teachers: {} },
        "Sophomore2":{ subjects: [], teachers: {} },
        "Junior1":{ subjects: [], teachers: {} },
        "Junior2":{ subjects: [], teachers: {} },
        "Senior1":{ subjects: [], teachers: {} },
        "Senior2":{ subjects: [], teachers: {} },
        "General":{ subjects: [], teachers: {} }
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
    // 1. 存入 Supabase
    const { error } = await supabase
        .from('exams')
        .insert([{ grade, sub, prof, year, type, link }]);

    if (error) {
        alert("新增失敗，請檢查權限設定或網路！");
        console.error(error);
        return;
    }

    // 2. 存入後重新抓取最新資料
    await fetchExams();
}

// --- 【刪除功能：從雲端移除】 ---
async function removeAt(index) {
    const targetId = allExams[index].id; // 確保你的 Supabase 表格有 id 欄位

    if (confirm(`確定要刪除第 ${index} 筆資料嗎？`)) {
        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', targetId);

        if (!error) {
            await fetchExams();
        } else {
            alert("刪除失敗！");
        }
    }
}

// --- 【介面渲染功能】 ---
function renderTable() {
    const sGrade = gradeSelect.value;
    const sSub = subjectSelect.value;
    const sProf = teacherSelect.value;

    tableBody.innerHTML = '';

    const filtered = allExams.filter(exam => {
        return (!sGrade || exam.grade === sGrade) &&
               (!sSub || exam.sub === sSub) &&
               (!sProf || exam.prof === sProf);
    });

    filtered.forEach((exam, index) => {
        const originalIndex = allExams.indexOf(exam);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="border border-gray-700 px-4 py-2 text-center text-gray-500 text-xs">${originalIndex}</td>
            <td class="border border-gray-700 px-4 py-2 text-center">${exam.year}</td>
            <td class="border border-gray-700 px-4 py-2">${exam.sub}</td>
            <td class="border border-gray-700 px-4 py-2">${exam.prof}</td>
            <td class="border border-gray-700 px-4 py-2 text-center">${exam.type || '期中考'}</td> 
            <td class="border border-gray-700 px-4 py-2 text-center text-blue-400">
                <a href="${exam.link}" target="_blank" rel="noopener noreferrer" class="hover:underline">下載</a>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateGradeUI() {
    const selectedGrade = gradeSelect.value;
    subjectSelect.innerHTML = '<option value="">科目</option>';
    teacherSelect.innerHTML = '<option value="">授課教師</option>';

    if (!selectedGrade || !data[selectedGrade]) return;

    data[selectedGrade].subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub; opt.textContent = sub;
        subjectSelect.appendChild(opt);
    });
}

// --- 【監聽器與初始化】 ---
gradeSelect.addEventListener('change', () => { updateGradeUI(); renderTable(); });

subjectSelect.addEventListener('change', function() {
    const selectedSub = this.value;
    const selectedGrade = gradeSelect.value;
    teacherSelect.innerHTML = '<option value="">授課教師</option>';
    if (selectedGrade && selectedSub && data[selectedGrade].teachers[selectedSub]) {
        data[selectedGrade].teachers[selectedSub].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t; opt.textContent = t;
            teacherSelect.appendChild(opt);
        });
    }
    renderTable();
});

teacherSelect.addEventListener('change', renderTable);

function handleManualAdd() {
    const grade = document.getElementById('add-grade').value;
    const sub = document.getElementById('add-subject').value;
    const prof = document.getElementById('add-teacher').value;
    const year = document.getElementById('semester').value;
    const type = document.getElementById('testType').value;
    const link = document.getElementById('newfile').value;

    if (!sub || !prof || !year || !grade || !link) {
        alert("請填寫完整資訊喔！");
        return;
    }

    add(grade, sub, prof, year, type, link);
    
    // 清空輸入框
    document.getElementById('add-subject').value = '';
    document.getElementById('add-teacher').value = '';
    document.getElementById('semester').value = '';
    document.getElementById('newfile').value = '';
}

function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    const btnText = document.getElementById('toggleText');
    panel.classList.toggle('hidden');
    btnText.innerText = panel.classList.contains('hidden') ? '➕ 新增考古題' : '❌ 關閉面板';
}

// 初始啟動：從雲端抓資料
fetchExams();

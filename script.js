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
let currentPage = 1;        // 當前頁碼
const PAGE_SIZE = 10;       // 每頁最多顯示 10 筆

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
        currentPage = 1; // 重新載入時歸零頁碼
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

// 3. 當「年級」改變時更新科目選單
function updateGradeUI() {
    const selectedGrade = clean(gradeSelect.value);

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

// 5. 渲染表格（限制最多 10 列並包含分頁）
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
        renderPagination(0, 0);
        return;
    }

    // 計算總頁數與當前頁面截取範圍
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageData = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    // 只渲染當前頁面的資料（最多 10 筆）
    pageData.forEach(exam => {
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

    // 渲染分頁按鈕與頁碼資訊
    renderPagination(filtered.length, totalPages);
}

// 5.1 渲染分頁按鈕 UI
function renderPagination(totalCount, totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    if (totalCount === 0) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.innerHTML = `
        <div class="flex items-center justify-between text-sm text-gray-400 my-4 px-2">
            <div>
                顯示第 <span class="text-white font-medium">${(currentPage - 1) * PAGE_SIZE + 1}</span> 到 
                <span class="text-white font-medium">${Math.min(currentPage * PAGE_SIZE, totalCount)}</span> 筆，
                共 <span class="text-white font-medium">${totalCount}</span> 筆
            </div>
            <div class="flex items-center gap-2">
                <button id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''} 
                    class="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    上一頁
                </button>
                <span class="px-2 text-gray-300">${currentPage} / ${totalPages} 頁</span>
                <button id="nextPageBtn" ${currentPage >= totalPages ? 'disabled' : ''} 
                    class="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    下一頁
                </button>
            </div>
        </div>
    `;

    // 綁定上一頁與下一頁點擊動作
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
    }
}

// 6. 切換新增面板展開 / 隱藏
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

// 7. 新增考古題處理邏輯
async function handleManualAdd() {
    console.log("👉 點擊了確認新增按鈕！");

    const grade = document.getElementById('add-grade').value;
    const sub = document.getElementById('add-subject').value.trim();
    const prof = document.getElementById('add-teacher').value.trim();
    const year = document.getElementById('semester').value.trim();
    const type = document.getElementById('testType').value.trim();
    
    // 選填欄位：如果沒填預設為空字串
    const scope = document.getElementById('testScope').value.trim();

    const fileInput = document.getElementById('newfile');
    const ansFileInput = document.getElementById('ansfile');
    const file = fileInput.files[0];
    const ansFile = ansFileInput.files[0];

    // 必填欄位驗證（科目、老師、學年度、考試類別、題目PDF）
    if (!sub || !prof || !year || !type || !file) {
        alert("請填寫必填資訊（科目、老師、學年度、考試類別）並選擇題目 PDF 檔案喔！");
        return;
    }

    try {
        let fileUrl = '';
        let ansUrl = '';

        // 1. 上傳題目 PDF (必填)
        if (file) {
            // 擷取副檔名並只使用時間戳記作為 Storage 檔名，避免中文或特殊符號觸發 InvalidKey
            const fileExt = file.name.split('.').pop();
            const fileName = `exam_${Date.now()}.${fileExt}`;

            const { data, error } = await MYsupabase.storage
                .from('exam_files')
                .upload(fileName, file);

            if (error) {
                console.error("題目上傳失敗:", error);
                throw new Error("題目檔上傳失敗：" + error.message);
            }

            const { data: publicData } = MYsupabase.storage
                .from('exam_files')
                .getPublicUrl(fileName);

            fileUrl = publicData ? publicData.publicUrl : '';
        }

        // 2. 上傳解答 PDF (選填：有選擇檔案才執行)
        if (ansFile) {
            const ansExt = ansFile.name.split('.').pop();
            const fileName = `ans_${Date.now()}.${ansExt}`;

            const { data, error } = await MYsupabase.storage
                .from('exam_files')
                .upload(fileName, ansFile);

            if (error) {
                console.error("答案上傳失敗:", error);
                throw new Error("答案檔上傳失敗：" + error.message);
            }

            const { data: publicData } = MYsupabase.storage
                .from('exam_files')
                .getPublicUrl(fileName);

            ansUrl = publicData ? publicData.publicUrl : '';
        }

        // 3. 寫入 Supabase 數據庫
        const { error: insertError } = await MYsupabase
            .from('exams')
            .insert([
                {
                    grade: grade,
                    sub: sub,
                    prof: prof,
                    year: year,
                    type: type,
                    scope: scope || '',
                    file_url: fileUrl,
                    ans_url: ansUrl
                }
            ]);

        if (insertError) throw insertError;

        alert("🎉 成功加入考古題！");

        // 4. 清空輸入框內容
        document.getElementById('add-subject').value = '';
        document.getElementById('add-teacher').value = '';
        document.getElementById('semester').value = '';
        document.getElementById('testType').value = '';
        document.getElementById('testScope').value = '';
        fileInput.value = '';
        ansFileInput.value = '';

        // 5. 自動關閉面板並刷新資料列表
        toggleAdmin();
        await loadExamsFromSupabase();

    } catch (err) {
        console.error("新增失敗：", err);
        alert("新增失敗：" + err.message);
    }
}

// 8. 頁面載入完成後統一下達事件綁定
document.addEventListener('DOMContentLoaded', () => {
    // 載入資料庫初始資料
    loadExamsFromSupabase();

    // 篩選下拉選單事件（切換選單時自動回到第 1 頁）
    if (gradeSelect) {
        gradeSelect.addEventListener('change', () => {
            updateGradeUI();
            currentPage = 1;
            renderTable();
        });
    }

    if (subjectSelect) {
        subjectSelect.addEventListener('change', () => {
            updateSubjectUI();
            currentPage = 1;
            renderTable();
        });
    }

    if (teacherSelect) {
        teacherSelect.addEventListener('change', () => {
            currentPage = 1;
            renderTable();
        });
    }

    // 展開/關閉新增面板按鈕
    const toggleBtn = document.getElementById('toggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAdmin);
    }

    // 確認新增按鈕
    const addSubmitBtn = document.getElementById('addSubmitBtn');
    if (addSubmitBtn) {
        addSubmitBtn.addEventListener('click', handleManualAdd);
    }
});


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Trash2, LayoutGrid, Calendar, BookOpen, 
  UserPlus, Sparkles, Loader2, Wand2, GraduationCap,
  Edit2, FileSpreadsheet, Eye, BrainCircuit, 
  Phone, ShieldAlert, CheckCircle2, Copyright, Heart,
  Download, Search, X, Settings, Database, Upload, BarChart3, Info
} from 'lucide-react';

import { ViewMode, Level, Student, EvaluationData, TeacherAdvice, BaseItem, ModalType } from './types';
import { AUTHOR_NAME, AUTHOR_PHONE, APP_NAME, ZaloIcon } from './constants';
import { storage } from './services/storageService';
import { generateEvaluationComment, getPedagogicalAdvice } from './services/geminiService';
import EditableCell from './components/EditableCell';

const App: React.FC = () => {
  // --- Core State ---
  const [years, setYears] = useState<BaseItem[]>([]);
  const [classes, setClasses] = useState<BaseItem[]>([]);
  const [months, setMonths] = useState<BaseItem[]>([]);
  const [subjects, setSubjects] = useState<BaseItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluationMap, setEvaluationMap] = useState<Record<string, EvaluationData>>({});

  const [selectedYearId, setSelectedYearId] = useState(localStorage.getItem('last_year') || '');
  const [selectedClassId, setSelectedClassId] = useState(localStorage.getItem('last_class') || '');
  const [selectedMonthId, setSelectedMonthId] = useState(localStorage.getItem('last_month') || '');
  const [selectedSubId, setSelectedSubId] = useState(localStorage.getItem('last_subject') || '');
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SUBJECT);
  const [showLevel, setShowLevel] = useState(true);
  const [showNote, setShowNote] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- UI State ---
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null);
  const [editItem, setEditItem] = useState<BaseItem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [hoveredStudent, setHoveredStudent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [adviceCache, setAdviceCache] = useState<Record<string, TeacherAdvice>>({});
  const [isAuthValid, setIsAuthValid] = useState(true);
  const [showStats, setShowStats] = useState(false);

  // --- Initialization & Data Fetching ---
  useEffect(() => {
    const _v = (s: string) => btoa(unescape(encodeURIComponent(s)));
    if (_v(AUTHOR_NAME) !== "VHLhuqduIFRy4buNbmcgS2lt" || _v(AUTHOR_PHONE) !== "MDk2NDU2NzgwNg==") {
      setIsAuthValid(false);
    }

    setYears(storage.getYears());
    setClasses(storage.getClasses());
    setMonths(storage.getMonths());
    setSubjects(storage.getSubjects());
  }, []);

  // Persist selections
  useEffect(() => {
    localStorage.setItem('last_year', selectedYearId);
    localStorage.setItem('last_class', selectedClassId);
    localStorage.setItem('last_month', selectedMonthId);
    localStorage.setItem('last_subject', selectedSubId);
  }, [selectedYearId, selectedClassId, selectedMonthId, selectedSubId]);

  // Sync Students
  useEffect(() => {
    if (selectedYearId && selectedClassId) {
      setStudents(storage.getStudents(selectedYearId, selectedClassId));
    } else {
      setStudents([]);
    }
  }, [selectedYearId, selectedClassId]);

  // Unique Key for Evaluation Mapping
  const evalKey = useMemo(() => {
    if (!selectedYearId || !selectedClassId || !selectedMonthId) return '';
    const contentPart = viewMode === ViewMode.SUBJECT ? selectedSubId : viewMode;
    return `${selectedYearId}_${selectedClassId}_${selectedMonthId}_${contentPart}`;
  }, [selectedYearId, selectedClassId, selectedMonthId, selectedSubId, viewMode]);

  // Sync Evaluations
  useEffect(() => {
    if (evalKey) {
      setEvaluationMap(storage.getEvaluations(evalKey));
    } else {
      setEvaluationMap({});
    }
  }, [evalKey]);

  // Statistics
  const stats = useMemo(() => {
    const counts: Record<string, number> = { 'T': 0, 'H': 0, 'Đ': 0, 'C': 0, 'none': 0 };
    students.forEach(s => {
      const lv = evaluationMap[s.id]?.level;
      if (lv) counts[lv] = (counts[lv] || 0) + 1;
      else counts['none']++;
    });
    return counts;
  }, [students, evaluationMap]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [students, searchQuery]);

  // --- Handlers ---
  const handleUpdateEvaluation = (studentId: string, field: keyof EvaluationData, value: string) => {
    if (!evalKey) return;
    const current = evaluationMap[studentId] || { level: '' };
    const updated = { ...evaluationMap, [studentId]: { ...current, [field]: value } };
    setEvaluationMap(updated);
    storage.saveEvaluations(evalKey, updated);
  };

  const handleSaveItem = () => {
    if (!inputValue.trim()) return;
    let list: BaseItem[] = [];
    let setter: (val: BaseItem[]) => void = () => {};
    let save: (val: BaseItem[]) => void = () => {};

    switch(modalType) {
      case 'year': list = [...years]; setter = setYears; save = storage.saveYears; break;
      case 'class': list = [...classes]; setter = setClasses; save = storage.saveClasses; break;
      case 'month': list = [...months]; setter = setMonths; save = storage.saveMonths; break;
      case 'subject': list = [...subjects]; setter = setSubjects; save = storage.saveSubjects; break;
    }

    if (editItem) {
      const newList = list.map(i => i.id === editItem.id ? { ...i, name: inputValue } : i);
      setter(newList);
      save(newList);
    } else {
      const newItem = { id: Date.now().toString(), name: inputValue, createdAt: Date.now() };
      const newList = [...list, newItem];
      setter(newList);
      save(newList);
    }
    setInputValue('');
    setModalType(null);
    setEditItem(null);
  };

  const handleAddBulkStudents = () => {
    if (!bulkInput.trim() || !selectedYearId || !selectedClassId) return;
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n !== '');
    const currentStudents = storage.getStudents(selectedYearId, selectedClassId);
    const newStudents = [...currentStudents, ...names.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: Date.now()
    }))];
    setStudents(newStudents);
    storage.saveStudents(selectedYearId, selectedClassId, newStudents);
    setBulkInput('');
    setModalType(null);
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;

    if (type === 'student') {
      const newList = students.filter(s => s.id !== id);
      setStudents(newList);
      storage.saveStudents(selectedYearId, selectedClassId, newList);
    } else {
      let list: BaseItem[] = [];
      let setter: (val: BaseItem[]) => void = () => {};
      let save: (val: BaseItem[]) => void = () => {};

      if (type === 'year') { list = years; setter = setYears; save = storage.saveYears; if (selectedYearId === id) setSelectedYearId(''); }
      if (type === 'class') { list = classes; setter = setClasses; save = storage.saveClasses; if (selectedClassId === id) setSelectedClassId(''); }
      if (type === 'month') { list = months; setter = setMonths; save = storage.saveMonths; if (selectedMonthId === id) setSelectedMonthId(''); }
      if (type === 'subject') { list = subjects; setter = setSubjects; save = storage.saveSubjects; if (selectedSubId === id) setSelectedSubId(''); }

      const newList = list.filter(i => i.id !== id);
      setter(newList);
      save(newList);
    }
    setConfirmDelete(null);
  };

  const runAI = async () => {
    const targets = filteredStudents.filter(s => evaluationMap[s.id]?.level && !evaluationMap[s.id]?.comment);
    if (!targets.length) return;

    setIsGenerating(true);
    const subName = viewMode === ViewMode.SUBJECT 
      ? subjects.find(s => s.id === selectedSubId)?.name || "Môn học"
      : (viewMode === ViewMode.COMPETENCY ? 'Năng lực' : 'Phẩm chất');

    for (const stu of targets) {
      const data = evaluationMap[stu.id];
      const comment = await generateEvaluationComment(subName, data.level, data.note || '', aiPrompt);
      if (comment) {
        handleUpdateEvaluation(stu.id, 'comment', comment);
      }
    }
    setIsGenerating(false);
  };

  const exportFullData = () => {
    const data = {
      years: storage.getYears(),
      classes: storage.getClasses(),
      months: storage.getMonths(),
      subjects: storage.getSubjects(),
      allData: Object.keys(localStorage).filter(k => k.startsWith('thkb_')).reduce((obj, key) => {
        obj[key] = localStorage.getItem(key);
        return obj;
      }, {} as Record<string, any>)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `THKB_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    a.click();
  };

  const importFullData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.allData) {
          Object.entries(data.allData).forEach(([key, val]) => {
            localStorage.setItem(key, val as string);
          });
          window.location.reload();
        }
      } catch (err) {
        alert("File không hợp lệ!");
      }
    };
    reader.readAsText(file);
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    } else {
      alert("Tính năng chọn Key chỉ khả dụng khi chạy trong môi trường AI Studio. Nếu bạn dùng cục bộ, hãy cấu hình file .env");
    }
  };

  // --- Add missing handler functions ---

  /**
   * Exports current student evaluation data to a CSV file.
   */
  const exportToExcel = () => {
    const subName = viewMode === ViewMode.SUBJECT 
      ? subjects.find(s => s.id === selectedSubId)?.name || "Môn học"
      : (viewMode === ViewMode.COMPETENCY ? 'Năng lực' : 'Phẩm chất');
    
    let csv = "STT,Họ và tên,Mức đạt,Ghi chú,Nhận xét chi tiết\n";
    filteredStudents.forEach((stu, idx) => {
      const data = evaluationMap[stu.id] || {};
      const row = [
        idx + 1,
        `"${stu.name}"`,
        `"${data.level || ''}"`,
        `"${(data.note || '').replace(/"/g, '""')}"`,
        `"${(data.comment || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(",") + "\n";
    });

    // Add BOM for UTF-8 support in Excel
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_nhan_xet_${subName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Fetches pedagogical advice from Gemini for a student if not already cached.
   */
  const handleMouseEnterStudent = async (studentId: string) => {
    if (adviceCache[studentId]) return;
    
    const stu = students.find(s => s.id === studentId);
    if (!stu) return;
    
    const data = evaluationMap[studentId];
    if (!data?.level) return;

    const subName = viewMode === ViewMode.SUBJECT 
      ? subjects.find(s => s.id === selectedSubId)?.name || "Môn học"
      : (viewMode === ViewMode.COMPETENCY ? 'Năng lực' : 'Phẩm chất');

    const advice = await getPedagogicalAdvice(
      viewMode === ViewMode.SUBJECT ? 'môn học' : 'lĩnh vực',
      subName,
      data.level,
      data.note || ''
    );
    
    if (advice) {
      setAdviceCache(prev => ({ ...prev, [studentId]: advice }));
    }
  };

  /**
   * Copies the student's evaluation comment to clipboard for easy pasting into Zalo.
   */
  const handleSendZalo = async (studentId: string) => {
    const comment = evaluationMap[studentId]?.comment;
    if (!comment) return;

    try {
      await navigator.clipboard.writeText(comment);
      setCopySuccess(studentId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // --- UI Components ---
  const SectionBox = ({ label, items, selectedId, onSelect, type, icon: Icon }: any) => (
    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-2 transition-all hover:shadow-indigo-100 hover:shadow-md">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 tracking-widest"><Icon size={12}/> {label}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {selectedId && (
            <>
              <button onClick={() => { const item = items.find((i: any) => i.id === selectedId); setEditItem(item); setInputValue(item.name); setModalType(type); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={12}/></button>
              <button onClick={() => { const item = items.find((i: any) => i.id === selectedId); setConfirmDelete({ type, id: item.id, name: item.name }); }} className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 size={12}/></button>
            </>
          )}
          <button onClick={() => { setEditItem(null); setInputValue(''); setModalType(type); }} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"><Plus size={14}/></button>
        </div>
      </div>
      <div className="group relative">
        <select 
          value={selectedId || ''} 
          onChange={(e) => onSelect(e.target.value)} 
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
        >
          <option value="">-- {label} --</option>
          {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
           <Settings size={14} />
        </div>
      </div>
    </div>
  );

  if (!isAuthValid) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-[0_20px_60px_-15px_rgba(255,0,0,0.3)] border-4 border-red-500">
          <ShieldAlert size={60} className="mx-auto text-red-500 mb-6 animate-pulse" />
          <h1 className="text-3xl font-black text-slate-900 mb-4 uppercase italic">Bản quyền bị thay đổi!</h1>
          <p className="text-slate-500 mb-8">Vui lòng liên hệ tác giả {AUTHOR_NAME} ({AUTHOR_PHONE}) để khôi phục quyền truy cập.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 pb-12 font-sans flex flex-col relative overflow-x-hidden">
      {/* Top Banner / Actions */}
      <div className="bg-slate-900 text-white px-6 py-2 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Database size={12} className="text-indigo-400"/> Local Storage Active</span>
          <span className="text-slate-600">|</span>
          <button onClick={handleSelectKey} className="text-indigo-400 hover:text-white transition-colors flex items-center gap-1">
             <Settings size={12}/> Config API Key
          </button>
        </div>
        <div className="flex items-center gap-6">
           <button onClick={exportFullData} className="hover:text-emerald-400 transition-colors flex items-center gap-1"><Download size={12}/> Sao lưu</button>
           <label className="hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer">
              <Upload size={12}/> Khôi phục
              <input type="file" className="hidden" accept=".json" onChange={importFullData} />
           </label>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-100 p-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-[30px] flex items-center justify-center shadow-2xl shadow-indigo-200 rotate-6 transform hover:rotate-0 transition-transform duration-500">
               <GraduationCap size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">TH KHÁNH BÌNH</h1>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">Hệ thống Đánh giá v2.2</span>
                <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest italic">{APP_NAME}</span>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100/80 p-2 rounded-3xl gap-1 border border-slate-200">
            {Object.values(ViewMode).map(m => (
              <button 
                key={m} 
                onClick={() => setViewMode(m)} 
                className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all duration-300 ${viewMode === m ? 'bg-white text-indigo-600 shadow-xl scale-105 border border-slate-200' : 'text-slate-400 hover:text-slate-900'}`}
              >
                {m === ViewMode.SUBJECT ? 'Môn học' : m === ViewMode.COMPETENCY ? 'Năng lực' : 'Phẩm chất'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Selectors Section */}
      <div className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-20">
        <SectionBox label="Năm học" icon={Calendar} items={years} selectedId={selectedYearId} onSelect={setSelectedYearId} type="year" />
        <SectionBox label="Lớp học" icon={LayoutGrid} items={classes} selectedId={selectedClassId} onSelect={setSelectedClassId} type="class" />
        <SectionBox label="Tháng" icon={Calendar} items={months} selectedId={selectedMonthId} onSelect={setSelectedMonthId} type="month" />
        {viewMode === ViewMode.SUBJECT ? (
          <SectionBox label="Môn học" icon={BookOpen} items={subjects} selectedId={selectedSubId} onSelect={setSelectedSubId} type="subject" />
        ) : (
          <div className="bg-indigo-600 p-4 rounded-3xl border border-indigo-400 shadow-lg flex items-center justify-between text-white overflow-hidden relative group">
            <div className="relative z-10">
               <span className="text-[10px] font-black uppercase opacity-60 block mb-1">Đang đánh giá</span>
               <span className="text-sm font-black uppercase tracking-wider">{viewMode === ViewMode.COMPETENCY ? 'Năng lực' : 'Phẩm chất'}</span>
            </div>
            <BrainCircuit size={40} className="absolute right-[-10px] top-[-10px] opacity-20 group-hover:scale-125 transition-transform" />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 flex-1 w-full">
        {selectedYearId && selectedClassId && selectedMonthId && (viewMode !== ViewMode.SUBJECT || selectedSubId) ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Control Panel */}
            <div className="flex flex-col xl:flex-row gap-6">
               {/* Search & Prompt */}
               <div className="flex-1 bg-white rounded-[35px] p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-3 ml-1 block tracking-widest">Lưu ý sư phạm cho AI</label>
                    <div className="relative group">
                      <Sparkles size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:animate-bounce"/>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl pl-14 pr-6 py-5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all" 
                        placeholder="VD: Tập trung vào kỹ năng làm việc nhóm, nhắc học sinh viết chữ cẩn thận..." 
                        value={aiPrompt} 
                        onChange={e => setAiPrompt(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-80">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-3 ml-1 block tracking-widest">Tìm kiếm nhanh</label>
                    <div className="relative group">
                      <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl pl-14 pr-6 py-5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all" 
                        placeholder="Tìm tên học sinh..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
               </div>

               {/* Quick Stats Panel */}
               <div className="bg-indigo-900 rounded-[35px] p-8 text-white flex gap-6 items-center shadow-2xl shadow-indigo-200 min-w-[320px]">
                  <div className="flex-1">
                     <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={20} className="text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Thống kê nhanh</span>
                     </div>
                     <div className="grid grid-cols-4 gap-2">
                        {['T', 'H', 'Đ', 'C'].map(lv => (
                          <div key={lv} className="flex flex-col items-center">
                             <span className="text-[10px] font-black text-indigo-400">{lv}</span>
                             <span className="text-xl font-black">{stats[lv] || 0}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="h-full w-[1px] bg-white/10"></div>
                  <button 
                    onClick={() => setShowStats(!showStats)}
                    className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <Info size={24} />
                  </button>
               </div>
            </div>

            {/* AI Action Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
               <div className="flex items-center gap-3">
                  <button onClick={() => { setEditItem(null); setBulkInput(''); setModalType('student'); }} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-slate-200">
                    <UserPlus size={16}/> Thêm học sinh
                  </button>
                  <button onClick={exportToExcel} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl shadow-emerald-100">
                    <Download size={16}/> Xuất Excel
                  </button>
               </div>
               <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button onClick={() => setShowLevel(!showLevel)} className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-[9px] font-black uppercase ${showLevel ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><Eye size={14}/> Mức đạt</button>
                    <button onClick={() => setShowNote(!showNote)} className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-[9px] font-black uppercase ${showNote ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><FileSpreadsheet size={14}/> Ghi chú</button>
                  </div>
                  <button 
                    onClick={runAI} 
                    disabled={isGenerating || filteredStudents.length === 0} 
                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-3 uppercase shadow-2xl shadow-indigo-200 transition-all active:scale-95 group"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Wand2 className="group-hover:rotate-12 transition-transform" size={20}/>} 
                    <span>Tự động viết nhận xét AI</span>
                  </button>
               </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden mb-12">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-6 text-center text-[10px] font-black uppercase w-20 text-slate-400">STT</th>
                      <th className="p-6 text-left text-[10px] font-black uppercase w-72 text-slate-400">Họ và tên Học sinh</th>
                      {showLevel && <th className="p-6 text-center text-[10px] font-black uppercase w-48 text-slate-400">Đánh giá Mức đạt</th>}
                      {showNote && <th className="p-6 text-left text-[10px] font-black uppercase w-64 text-slate-400">Ghi chú của Thầy/Cô</th>}
                      <th className="p-6 text-left text-[10px] font-black uppercase text-slate-400">Nội dung Nhận xét chi tiết (TT27)</th>
                      <th className="p-6 w-36 text-center text-[10px] font-black uppercase text-slate-400">Liên hệ Zalo</th>
                      <th className="p-6 w-16 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.length > 0 ? filteredStudents.map((stu, idx) => (
                      <tr key={stu.id} className="group hover:bg-slate-50/80 transition-all">
                        <td className="p-6 text-center text-xs font-black text-slate-300 group-hover:text-indigo-600">{idx + 1}</td>
                        <td 
                          className="p-6 text-left relative"
                          onMouseMove={(e) => { setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                          onMouseEnter={() => { setHoveredStudent(stu.id); handleMouseEnterStudent(stu.id); }}
                          onMouseLeave={() => setHoveredStudent(null)}
                        >
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{stu.name}</span>
                            <span className="text-[9px] text-slate-300 uppercase font-black tracking-widest mt-0.5">Mã: {stu.id}</span>
                          </div>
                        </td>
                        {showLevel && (
                          <td className="p-6">
                            <div className="flex justify-center gap-2">
                              {(viewMode === ViewMode.SUBJECT ? [Level.T, Level.H, Level.C] : [Level.T, Level.D, Level.C]).map(lv => (
                                <button 
                                  key={lv} 
                                  onClick={() => handleUpdateEvaluation(stu.id, 'level', lv)} 
                                  className={`w-10 h-10 rounded-2xl font-black text-[10px] transition-all flex items-center justify-center border-2 ${evaluationMap[stu.id]?.level === lv ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-110' : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-200 hover:text-indigo-400'}`}
                                >
                                  {lv}
                                </button>
                              ))}
                            </div>
                          </td>
                        )}
                        {showNote && (
                          <td className="p-6">
                            <EditableCell 
                              value={evaluationMap[stu.id]?.note || ''} 
                              onSave={(val) => handleUpdateEvaluation(stu.id, 'note', val)} 
                              placeholder="Nhập ghi chú nhanh..."
                              className="w-full bg-transparent text-[11px] font-black uppercase text-indigo-700/60 border-none outline-none resize-none text-left placeholder:text-slate-200"
                            />
                          </td>
                        )}
                        <td className="p-6 text-left">
                          <EditableCell 
                            value={evaluationMap[stu.id]?.comment || ''} 
                            onSave={(val) => handleUpdateEvaluation(stu.id, 'comment', val)} 
                            placeholder="Nhấp để nhập tay hoặc sử dụng AI để gợi ý..."
                            className="w-full bg-transparent text-sm font-medium leading-relaxed border-none outline-none resize-none text-slate-600 text-left placeholder:text-slate-200"
                          />
                        </td>
                        <td className="p-6 text-center border-l border-slate-50">
                           <button 
                            disabled={!evaluationMap[stu.id]?.comment}
                            onClick={() => handleSendZalo(stu.id)}
                            className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center mx-auto shadow-sm border ${copySuccess === stu.id ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:grayscale'}`}
                            title="Gửi nội dung qua Zalo"
                           >
                             {copySuccess === stu.id ? <CheckCircle2 size={20} /> : <ZaloIcon size={20} />}
                           </button>
                        </td>
                        <td className="p-6 text-center">
                          <button 
                            onClick={() => setConfirmDelete({ type: 'student', id: stu.id, name: stu.name })} 
                            className="text-slate-100 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18}/>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="py-32 text-center">
                           <div className="flex flex-col items-center gap-4 opacity-20">
                              <Search size={60} />
                              <span className="font-black text-xs uppercase tracking-widest">Không tìm thấy học sinh</span>
                           </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-48 flex flex-col items-center justify-center bg-white rounded-[50px] border-4 border-dashed border-slate-100 shadow-sm animate-pulse max-w-4xl mx-auto">
            <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-8 text-indigo-600">
                <Settings size={48} className="animate-spin-slow" />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4 text-center px-12">
                Hệ thống sẵn sàng!
            </h3>
            <p className="font-bold text-slate-300 uppercase tracking-[0.2em] text-[10px] text-center max-w-md leading-relaxed px-6">
                Vui lòng chọn Năm học, Lớp, Tháng và Nội dung môn học ở các ô phía trên để bắt đầu quá trình đánh giá.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-8 py-16 mt-20 bg-white rounded-t-[60px] shadow-[0_-30px_60px_rgba(0,0,0,0.03)] border-t border-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl">
                <Copyright size={28} className="text-white" />
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1">Thiết kế bởi</span>
                <span className="text-xl font-black text-slate-900 uppercase">{AUTHOR_NAME}</span>
             </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 text-[11px] font-black uppercase text-slate-400 tracking-[0.4em]">
              <span>Made with</span>
              <Heart size={16} className="text-red-500 fill-red-500 animate-pulse" />
              <span>for Education</span>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Hệ thống TH Khánh Bình © {new Date().getFullYear()}</p>
          </div>

          <div className="flex justify-end gap-10">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Hotline Zalo</span>
                <span className="text-xl font-black text-slate-900 tracking-tighter">{AUTHOR_PHONE}</span>
             </div>
          </div>
        </div>
      </footer>

      {/* Advice Tooltip (AI) */}
      {hoveredStudent && adviceCache[hoveredStudent] && (
        <div 
          className="fixed z-[999] bg-slate-900/98 backdrop-blur-3xl text-white p-6 rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-white/10 w-96 pointer-events-none flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300"
          style={{ 
            left: Math.min(tooltipPos.x + 25, window.innerWidth - 410), 
            top: Math.min(tooltipPos.y - 220, window.innerHeight - 300) 
          }}
        >
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center"><BrainCircuit size={20}/></div>
            <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Tư vấn sư phạm AI</span>
          </div>
          <div className="space-y-6">
             <div className="flex flex-col gap-2">
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Gợi ý cho Thầy/Cô:</span>
               <p className="text-xs font-medium leading-relaxed italic text-slate-300">"{adviceCache[hoveredStudent].teacherAdvice}"</p>
             </div>
             <div className="flex flex-col gap-2">
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Lời khuyên cho Học sinh:</span>
               <p className="text-xs font-bold leading-relaxed text-white">"{adviceCache[hoveredStudent].studentAdvice}"</p>
             </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[50px] p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] p-12 opacity-[0.03] text-indigo-900">
              {modalType === 'student' ? <UserPlus size={200} /> : <Settings size={200} />}
            </div>
            
            <div className="flex justify-between items-center mb-10 relative z-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Plus size={24}/></div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{editItem ? "Cập nhật" : "Thêm mới"} {modalType}</h3>
              </div>
              <button onClick={() => setModalType(null)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={28}/></button>
            </div>

            {modalType === 'student' ? (
              <div className="relative z-10">
                <textarea 
                  autoFocus 
                  className="w-full h-72 p-8 bg-slate-50 border-2 border-slate-100 rounded-[35px] mb-8 text-sm font-bold focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200 resize-none" 
                  placeholder="Dán danh sách tên học sinh vào đây, mỗi tên một dòng..." 
                  value={bulkInput} 
                  onChange={e => setBulkInput(e.target.value)}
                />
              </div>
            ) : (
              <div className="relative z-10">
                <input 
                  autoFocus 
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[30px] font-black text-sm mb-10 focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200 uppercase tracking-widest" 
                  placeholder={`Nhập tên ${modalType} mới...`}
                  value={inputValue} 
                  onChange={e => setInputValue(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-4 relative z-10">
              <button onClick={() => setModalType(null)} className="flex-1 py-6 font-black text-slate-400 uppercase text-xs tracking-[0.3em] hover:text-slate-900 transition-colors">Hủy bỏ</button>
              <button 
                onClick={modalType === 'student' ? handleAddBulkStudents : handleSaveItem} 
                className="flex-[2] py-6 bg-indigo-600 text-white font-black rounded-[30px] uppercase text-xs tracking-[0.3em] shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Xác nhận lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[50px] p-12 text-center shadow-2xl border-b-[12px] border-red-500">
            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[40px] flex items-center justify-center mx-auto mb-8 rotate-12 shadow-inner"><ShieldAlert size={48} /></div>
            <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">Xóa dữ liệu?</h3>
            <p className="text-slate-400 text-sm mb-10 leading-relaxed font-bold uppercase tracking-widest text-[9px]">Bạn có chắc chắn muốn xóa <span className="text-red-600">"{confirmDelete.name}"</span>? Dữ liệu này sẽ mất vĩnh viễn.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-6 font-black text-slate-300 uppercase text-[10px] tracking-widest">Hủy</button>
              <button onClick={executeDelete} className="flex-[1.5] py-6 bg-red-600 text-white font-black rounded-3xl uppercase text-[10px] tracking-widest shadow-2xl shadow-red-200 active:scale-95 transition-all">Xóa ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

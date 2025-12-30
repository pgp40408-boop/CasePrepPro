import React, { useState } from 'react';
import { MOCK_CASES } from '../constants';
import { Case, Industry, CaseType, CaseStyle, Difficulty } from '../types';
import { analyzeResume } from '../services/geminiService';
import { FileText, Briefcase, Zap, Upload, ArrowRight, Info, Check, Loader2 } from 'lucide-react';

interface SetupWizardProps {
  onStartCase: (selectedCase: Case, resumeText: string | null) => void;
  onGoToDashboard: () => void;
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-1">
    <Info size={14} className="text-slate-400 hover:text-blue-500 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal min-w-[200px] max-w-[250px] z-50 pointer-events-none text-center">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

const SetupWizard: React.FC<SetupWizardProps> = ({ onStartCase, onGoToDashboard }) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'resume'>('quick');
  
  // Selection States
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [selectedCaseType, setSelectedCaseType] = useState<CaseType | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<CaseStyle | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const toggleSelection = <T,>(current: T | null, value: T, setter: (val: T | null) => void) => {
    setter(current === value ? null : value);
  };

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove "data:application/pdf;base64," prefix
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleQuickStart = () => {
    let candidates = MOCK_CASES.filter(c => 
      (!selectedIndustry || c.industry === selectedIndustry) &&
      (!selectedCaseType || c.case_type === selectedCaseType) &&
      (!selectedStyle || c.case_style === selectedStyle) &&
      (!selectedDifficulty || c.difficulty === selectedDifficulty)
    );

    if (candidates.length === 0) {
        candidates = MOCK_CASES.filter(c => 
        (!selectedIndustry || c.industry === selectedIndustry) &&
        (!selectedCaseType || c.case_type === selectedCaseType)
      );
    }
    
    const pool = candidates.length > 0 ? candidates : MOCK_CASES;
    const match = pool[Math.floor(Math.random() * pool.length)];
    const finalCase = { ...match, ...(selectedStyle && { case_style: selectedStyle }) };
    
    onStartCase(finalCase, null);
  };

  const handleResumeStart = async () => {
    if (!resumeFile) return;

    setIsAnalyzing(true);
    try {
      const base64 = await fileToBase64(resumeFile);
      const analysis = await analyzeResume(base64);
      
      console.log("Resume Analysis:", analysis);

      // Find best match based on AI suggestion
      let candidates = MOCK_CASES.filter(c => c.industry === analysis.suggested_industry);
      if (candidates.length === 0) candidates = MOCK_CASES; // Fallback
      
      // Prefer matching difficulty if possible
      const exactMatch = candidates.find(c => c.difficulty === analysis.suggested_difficulty);
      const match = exactMatch || candidates[Math.floor(Math.random() * candidates.length)];

      onStartCase(match, analysis.summary);

    } catch (error) {
      console.error("Resume analysis failed:", error);
      alert("Failed to analyze resume. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Data for Levels ---

  const industries: { val: Industry; tooltip: string }[] = [
    { val: 'Technology, Media & Telecom (TMT)', tooltip: 'SaaS, 5G launch, Streaming wars' },
    { val: 'Financial Services', tooltip: 'Banking, Fintech, Insurance, Payments' },
    { val: 'Consumer & Retail (CPG)', tooltip: 'Food & Bev, Fashion, E-commerce, Grocery' },
    { val: 'Healthcare & Life Sciences', tooltip: 'Pharma, Hospitals, Medical Devices, Biotech' },
    { val: 'Energy & Environment', tooltip: 'Oil & Gas, Renewables/EVs, Utilities, Sustainability' },
    { val: 'Industrials & Manufacturing', tooltip: 'Automotive, Aerospace, Logistics, Supply Chain' },
    { val: 'Public Sector & Social Impact', tooltip: 'Education, Government policy, NGO strategy' },
    { val: 'Private Equity (PE)', tooltip: 'Due Diligence, Portfolio optimization' },
  ];

  const caseTypes: { val: CaseType; desc: string }[] = [
    { val: 'Profitability', desc: 'Fix declining profits, Cost reduction' },
    { val: 'Market Entry', desc: 'New geography or product launch' },
    { val: 'Market Sizing (Guesstimate)', desc: 'Estimate Total Addressable Market (TAM)' },
    { val: 'Mergers & Acquisitions (M&A)', desc: 'Due diligence, Synergies' },
    { val: 'Pricing Strategy', desc: 'Optimal price setting' },
    { val: 'Growth Strategy', desc: 'Scaling revenue, Market share' },
    { val: 'Operations & Supply Chain', desc: 'Bottlenecks, Inventory' },
    { val: 'Unconventional / Brainteasers', desc: 'Abstract problems, Creativity' },
  ];

  const caseStyles: { val: CaseStyle; label: string; desc: string }[] = [
    { val: 'Interviewer-Led (McKinsey Style)', label: 'Interviewer-Led', desc: 'AI controls pace. Specific questions.' },
    { val: 'Candidate-Led (BCG/Bain Style)', label: 'Candidate-Led', desc: 'You drive. "I want to see data on..."' },
  ];

  const difficulties: { val: Difficulty; label: string; desc: string }[] = [
    { val: 'Beginner', label: 'Beginner', desc: 'Standard frameworks, Linear story.' },
    { val: 'Intermediate', label: 'Intermediate', desc: 'Major twist, Distractors.' },
    { val: 'Advanced (Partner Level)', label: 'Advanced', desc: 'Ambiguous, Second-level insights.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-7xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[800px]">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-1/4 bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-8">
              <Zap className="text-blue-400" />
              <h1 className="text-xl font-bold tracking-tight">CasePrep Pro</h1>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Master the management consulting interview with our Gemini-powered AI partner. 
              Simulate real McKinsey & BCG style cases.
            </p>
            <div className="space-y-3">
              <button 
                onClick={onGoToDashboard}
                className="text-sm text-blue-300 hover:text-white flex items-center space-x-1 transition-colors"
              >
                <span>View Analytics</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
          
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-10 -left-20 w-48 h-48 bg-purple-600 rounded-full opacity-10 blur-3xl"></div>
        </div>

        {/* Right Content */}
        <div className="w-full md:w-3/4 flex flex-col">
          <div className="flex border-b border-slate-100 bg-white sticky top-0 z-20 px-8 pt-8">
            <button
              onClick={() => setActiveTab('quick')}
              className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                activeTab === 'quick' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Quick Start (Manual)
              {activeTab === 'quick' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>}
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                activeTab === 'resume' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Resume Mode (AI Match)
              {activeTab === 'resume' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide bg-slate-50/30">
            {activeTab === 'quick' ? (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Level 1: Industry */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                    Level 1: Industry (Context)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {industries.map((item) => (
                      <button
                        key={item.val}
                        onClick={() => toggleSelection(selectedIndustry, item.val, setSelectedIndustry)}
                        className={`p-3 rounded-lg border text-left transition-all text-xs flex flex-col justify-between min-h-[60px] ${
                          selectedIndustry === item.val
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-white bg-white'
                        }`}
                      >
                         <div className="flex justify-between items-start w-full">
                           <span className={`font-semibold line-clamp-2 ${selectedIndustry === item.val ? 'text-blue-700' : 'text-slate-700'}`}>
                             {item.val.split('(')[0].trim()}
                           </span>
                           {selectedIndustry === item.val && <Check size={14} className="text-blue-500 shrink-0 ml-1" />}
                         </div>
                         <div className="flex items-center mt-1">
                            <span className="text-[10px] text-slate-400 truncate w-full">{item.tooltip}</span>
                            <Tooltip text={item.tooltip} />
                         </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Level 2: Case Type */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Level 2: Case Type (Framework)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {caseTypes.map((item) => (
                      <button
                        key={item.val}
                        onClick={() => toggleSelection(selectedCaseType, item.val, setSelectedCaseType)}
                        className={`p-3 rounded-lg border text-left transition-all text-xs flex flex-col justify-between min-h-[60px] ${
                          selectedCaseType === item.val
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-white bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                           <span className={`font-semibold ${selectedCaseType === item.val ? 'text-blue-700' : 'text-slate-700'}`}>
                             {item.val.split('(')[0].trim()}
                           </span>
                           {selectedCaseType === item.val && <Check size={14} className="text-blue-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Level 3: Case Style */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Level 3: Case Style
                    </h3>
                    <div className="space-y-2">
                      {caseStyles.map((item) => (
                        <button
                          key={item.val}
                          onClick={() => toggleSelection(selectedStyle, item.val, setSelectedStyle)}
                          className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                            selectedStyle === item.val
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-white bg-white'
                          }`}
                        >
                          <div>
                            <div className={`text-sm font-semibold ${selectedStyle === item.val ? 'text-blue-700' : 'text-slate-800'}`}>
                              {item.label}
                            </div>
                            <div className="text-xs text-slate-500">{item.desc}</div>
                          </div>
                          {selectedStyle === item.val && <Check size={16} className="text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Level 4: Difficulty */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Level 4: Difficulty
                    </h3>
                    <div className="space-y-2">
                      {difficulties.map((item) => (
                        <button
                          key={item.val}
                          onClick={() => toggleSelection(selectedDifficulty, item.val, setSelectedDifficulty)}
                          className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                            selectedDifficulty === item.val
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-white bg-white'
                          }`}
                        >
                          <div>
                            <div className={`text-sm font-semibold ${selectedDifficulty === item.val ? 'text-blue-700' : 'text-slate-800'}`}>
                              {item.label}
                            </div>
                            <div className="text-xs text-slate-500">{item.desc}</div>
                          </div>
                          {selectedDifficulty === item.val && <Check size={16} className="text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <p className="text-xs text-center text-slate-500 mb-4 italic">
                    {(!selectedIndustry && !selectedCaseType && !selectedStyle && !selectedDifficulty) 
                      ? "Configuration empty. A completely random case will be generated." 
                      : "We will select the best matching case from our database."}
                  </p>
                  <button
                    onClick={handleQuickStart}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all transform hover:translate-y-[-2px] flex items-center justify-center space-x-2 shadow-lg shadow-slate-200"
                  >
                    <Briefcase size={20} />
                    <span>
                      {(!selectedIndustry && !selectedCaseType && !selectedStyle && !selectedDifficulty) 
                        ? 'Surprise Me (Random Case)' 
                        : 'Start Custom Simulation'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer relative group bg-white">
                  <input 
                     type="file" 
                     accept="application/pdf"
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
                  />
                  <div className="p-5 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-slate-900">
                      {resumeFile ? resumeFile.name : "Upload your Resume (PDF)"}
                    </p>
                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                      Our AI will analyze your background and select the perfect case study to test your weak points.
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={handleResumeStart}
                    disabled={!resumeFile || isAnalyzing}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                  >
                    {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                    <span>{isAnalyzing ? 'Analyzing Resume...' : 'Analyze & Start'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SetupWizard;
import React, { useState } from 'react';
import { MOCK_CASES } from '../constants';
import { Case, Industry, CaseType, CaseStyle, Difficulty } from '../types';
import { analyzeResume, generateSyntheticCase, extractCaseFromTranscript } from '../services/geminiService';
import { FileText, Briefcase, Zap, Upload, ArrowRight, Check, Loader2, ChevronDown, Filter, Sparkles, MessageSquareText, PlayCircle, Key, Mic, Award } from 'lucide-react';
import { ApiKeyModal } from './ApiKeyModal';

interface SetupWizardProps {
  onStartCase: (selectedCase: Case, resumeText: string | null) => void;
  onGoToDashboard: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onStartCase, onGoToDashboard }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'resume'>('create');
  
  // Selection States
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedCaseType, setSelectedCaseType] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [useAiGenerator, setUseAiGenerator] = useState(false);
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCase, setIsGeneratingCase] = useState(false);

  // Transcript Import State
  const [transcriptText, setTranscriptText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  // API Key Modal State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const checkApiKeyAndProceed = (action: () => void) => {
    let hasEnvKey = false;
    try {
        hasEnvKey = !!process.env.API_KEY && process.env.API_KEY.length > 0;
    } catch(e) {}

    const hasSessionKey = sessionStorage.getItem("gemini_api_key");

    if (hasEnvKey || hasSessionKey) {
      action();
    } else {
      setPendingAction(() => action);
      setShowApiKeyModal(true);
    }
  };

  const handleSaveApiKey = (key: string) => {
    sessionStorage.setItem("gemini_api_key", key);
    setShowApiKeyModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleQuickStart = async () => {
    if (useAiGenerator) {
      setIsGeneratingCase(true);
      try {
        const syntheticCase = await generateSyntheticCase(
          selectedIndustry || undefined,
          selectedCaseType || undefined,
          selectedDifficulty || undefined,
          selectedStyle || undefined
        );
        onStartCase(syntheticCase, null);
      } catch (e) {
        console.error("Failed to generate case", e);
        alert("AI Generation failed. Please try again or switch to Database mode.");
      } finally {
        setIsGeneratingCase(false);
      }
      return;
    }

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
    
    const finalCase = { 
      ...match, 
      ...(selectedStyle && { case_style: selectedStyle as CaseStyle }),
      ...(selectedDifficulty && { difficulty: selectedDifficulty as Difficulty })
    };
    
    onStartCase(finalCase, null);
  };

  const handleResumeStart = async () => {
    if (!resumeFile) return;
    setIsAnalyzing(true);
    try {
      const base64 = await fileToBase64(resumeFile);
      const analysis = await analyzeResume(base64);
      let candidates = MOCK_CASES.filter(c => c.industry === analysis.suggested_industry);
      if (candidates.length === 0) candidates = MOCK_CASES;
      const exactMatch = candidates.find(c => c.difficulty === analysis.suggested_difficulty);
      const match = exactMatch || candidates[Math.floor(Math.random() * candidates.length)];
      onStartCase(match, analysis.summary);
    } catch (error) {
      console.error("Resume analysis failed:", error);
      alert("Failed to analyze resume. Please check your API key and file, then try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTranscriptStart = async () => {
    if (!transcriptText.trim()) return;
    setIsExtracting(true);
    try {
      const extractedCase = await extractCaseFromTranscript(transcriptText);
      onStartCase(extractedCase, null);
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("Failed to understand the transcript. Please try pasting a clearer conversation log.");
    } finally {
      setIsExtracting(false);
    }
  };

  const industries: Industry[] = [
    'Technology, Media & Telecom (TMT)',
    'Financial Services',
    'Consumer & Retail (CPG)',
    'Healthcare & Life Sciences',
    'Energy & Environment',
    'Industrials & Manufacturing',
    'Public Sector & Social Impact',
    'Private Equity (PE)',
    'E-commerce & Digital Marketplaces',
    'Transportation & Logistics',
    'Startups & Venture Capital'
  ];

  const caseTypes: CaseType[] = [
    'Profitability',
    'Market Entry',
    'Market Sizing (Guesstimate)',
    'Mergers & Acquisitions (M&A)',
    'Pricing Strategy',
    'Growth Strategy',
    'Operations & Supply Chain',
    'Unconventional / Brainteasers'
  ];

  const styles: CaseStyle[] = [
    'Interviewer-Led (McKinsey Style)',
    'Candidate-Led (BCG/Bain Style)'
  ];

  const difficulties: Difficulty[] = [
    'Beginner',
    'Intermediate',
    'Advanced (Partner Level)'
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-2 md:p-4">
      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onSave={handleSaveApiKey} 
        onCancel={() => {
          setShowApiKeyModal(false);
          setPendingAction(null);
        }} 
      />

      <div className="max-w-6xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-0 md:min-h-[750px]">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-1/3 bg-slate-900 text-white p-6 md:p-10 flex flex-col relative overflow-hidden shrink-0">
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center space-x-2 mb-6">
              <Zap className="text-blue-400" size={28} />
              <h1 className="text-2xl font-bold tracking-tight">CasePrep Pro</h1>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-8">
              Your AI-powered simulated interview partner. Practice real-world cases from top firms with randomized scenarios.
            </p>

            <div className="flex-1 space-y-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">How to Use</h3>
              
              <div className="flex gap-4 group">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">1</div>
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2">Configure <Briefcase size={14} className="text-slate-500"/></h4>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">
                    Select your target industry & difficulty, or generate a custom case with AI.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 group">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors">2</div>
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2">Interview <Mic size={14} className="text-slate-500"/></h4>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">
                    Speak or type to solve the case. The AI Partner plays the role of the interviewer.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 group">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-green-500 group-hover:text-white transition-colors">3</div>
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2">Feedback <Award size={14} className="text-slate-500"/></h4>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">
                    Receive instant, detailed grading on your Structure, Numeracy, and Communication.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3 pt-6 border-t border-slate-800">
              <button 
                    onClick={onGoToDashboard}
                    className="w-full flex items-center justify-between text-slate-400 hover:text-white transition-colors group p-2 rounded-lg hover:bg-slate-800"
                  >
                    <span className="text-sm font-semibold">View Performance Analytics</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                    onClick={() => setShowApiKeyModal(true)}
                    className="w-full flex items-center justify-between text-slate-400 hover:text-white transition-colors group p-2 rounded-lg hover:bg-slate-800"
                  >
                    <span className="text-sm font-semibold flex items-center gap-2"><Key size={14}/> Update API Key</span>
              </button>
            </div>
          </div>
          
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-600 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
          <div className="absolute top-10 -left-20 w-48 h-48 bg-purple-600 rounded-full opacity-10 blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Content */}
        <div className="w-full md:w-2/3 flex flex-col">
          <div className="flex border-b border-slate-100 bg-white sticky top-0 z-20 px-4 pt-6 md:px-8 md:pt-8 space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-4 text-sm font-bold tracking-wide transition-colors relative ${
                activeTab === 'create' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              PREPARE CASE
              {activeTab === 'create' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>}
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className={`pb-4 text-sm font-bold tracking-wide transition-colors relative ${
                activeTab === 'resume' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              RESUME MATCH
              {activeTab === 'resume' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>}
            </button>
          </div>

          <div className="flex-1 p-4 md:p-10 bg-slate-50/50 overflow-y-auto">
            {activeTab === 'create' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* PART 1: CONFIGURE */}
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                      <div className="flex items-center space-x-2">
                         <Filter size={20} className="text-blue-600" />
                         <h2 className="text-lg font-bold text-slate-800">Configure Parameters</h2>
                      </div>
                      
                      <div className="flex items-center self-start sm:self-auto space-x-3 bg-slate-100 p-1.5 rounded-lg">
                        <span className={`text-xs font-bold px-2 ${!useAiGenerator ? 'text-slate-600' : 'text-slate-400'}`}>Database</span>
                        <button 
                          onClick={() => setUseAiGenerator(!useAiGenerator)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${useAiGenerator ? 'bg-purple-600' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAiGenerator ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                        <span className={`text-xs font-bold px-2 flex items-center gap-1 ${useAiGenerator ? 'text-purple-600' : 'text-slate-400'}`}>
                          <Sparkles size={12} /> AI Gen
                        </span>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Industry</label>
                        <div className="relative">
                          <select 
                            value={selectedIndustry}
                            onChange={(e) => setSelectedIndustry(e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                          >
                            <option value="">Random</option>
                            {industries.map((ind) => (
                              <option key={ind} value={ind}>{ind}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Case Type</label>
                        <div className="relative">
                          <select 
                            value={selectedCaseType}
                            onChange={(e) => setSelectedCaseType(e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                          >
                            <option value="">Random</option>
                            {caseTypes.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Style</label>
                        <div className="relative">
                          <select 
                            value={selectedStyle}
                            onChange={(e) => setSelectedStyle(e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                          >
                            <option value="">Random</option>
                            {styles.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
                        <div className="relative">
                          <select 
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                          >
                            <option value="">Random</option>
                            {difficulties.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                        </div>
                      </div>
                   </div>

                   <button
                    onClick={() => checkApiKeyAndProceed(handleQuickStart)}
                    disabled={isGeneratingCase}
                    className={`w-full mt-6 py-3 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center space-x-2 shadow-lg ${useAiGenerator ? 'bg-purple-600 shadow-purple-200' : 'bg-slate-900 shadow-slate-200'}`}
                  >
                    {isGeneratingCase ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        {useAiGenerator ? <Sparkles size={18} /> : <Briefcase size={18} />}
                        <span>{useAiGenerator ? 'Generate AI Case' : 'Start Simulation'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* OR SEPARATOR */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200"></span>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                    <span className="bg-slate-50/50 px-3 tracking-widest">or</span>
                  </div>
                </div>

                {/* PART 2: TRANSCRIPT */}
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center space-x-2 mb-4 text-slate-800">
                       <MessageSquareText size={20} className="text-blue-600" />
                       <h3 className="font-bold">Import Existing Transcript</h3>
                    </div>
                    <textarea 
                      value={transcriptText}
                      onChange={(e) => setTranscriptText(e.target.value)}
                      placeholder="Paste a raw transcript here to extract its case and simulate it."
                      className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs leading-relaxed resize-none mb-4"
                    />
                    <button
                      onClick={() => checkApiKeyAndProceed(handleTranscriptStart)}
                      disabled={!transcriptText.trim() || isExtracting}
                      className="w-full py-3 bg-white border border-slate-900 text-slate-900 rounded-xl font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                    >
                      {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                      <span>{isExtracting ? 'Analyzing...' : 'Simulate From Transcript'}</span>
                    </button>
                </div>
              </div>
            )}

            {activeTab === 'resume' && (
              <div className="h-full flex flex-col justify-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4 hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer relative group">
                  <input 
                     type="file" 
                     accept="application/pdf"
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
                  />
                  <div className="p-6 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                    <Upload size={36} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {resumeFile ? resumeFile.name : "Upload Resume (PDF)"}
                    </p>
                    <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                      Gemini will analyze your background to select the perfect case study.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => checkApiKeyAndProceed(handleResumeStart)}
                    disabled={!resumeFile || isAnalyzing}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-lg"
                  >
                    {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                    <span>{isAnalyzing ? 'Analyzing Profile...' : 'Match & Start Interview'}</span>
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
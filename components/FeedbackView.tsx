import React, { useState } from 'react';
import { FeedbackReport, Case } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft, RefreshCw, Home } from 'lucide-react';

interface FeedbackViewProps {
  feedback: FeedbackReport;
  activeCase: Case;
  onGoHome: () => void;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ feedback, activeCase, onGoHome }) => {
  const [revealSolution, setRevealSolution] = useState(false);

  const chartData = [
    { subject: 'Structure', A: feedback.scores.structuring, fullMark: 10 },
    { subject: 'Numeracy', A: feedback.scores.numeracy, fullMark: 10 },
    { subject: 'Judgment', A: feedback.scores.judgment, fullMark: 10 },
    { subject: 'Communication', A: feedback.scores.communication, fullMark: 10 },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Performance Report</h1>
            <p className="text-slate-500 text-sm mt-1">{activeCase.title} • {activeCase.case_type}</p>
          </div>
          <div className="flex space-x-3 w-full sm:w-auto">
            <button onClick={onGoHome} className="flex-1 sm:flex-none justify-center flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">
              <Home size={16} />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Top Section: Charts & Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Radar Chart */}
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Skill Radar</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="md:col-span-2 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Assessment Breakdown</h3>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
              {Object.entries(feedback.scores).map(([key, value]) => {
                const score = value as number;
                return (
                  <div key={key} className={`p-4 rounded-xl border flex flex-col justify-between ${getScoreColor(score)}`}>
                    <div className="flex justify-between items-start">
                      <span className="capitalize font-semibold">{key}</span>
                      <span className="text-2xl font-bold">{score}/10</span>
                    </div>
                    <div className="w-full bg-black/10 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-current opacity-80" style={{ width: `${score * 10}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comparison Section (The Reality Check) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-500" />
              Your Recommendation
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed flex-1">
              {feedback.solution_comparison.user_recommendation_summary || "No recommendation provided."}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={16} className="text-purple-500" />
                Model Answer (Ground Truth)
              </h3>
              <button 
                onClick={() => setRevealSolution(!revealSolution)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                {revealSolution ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Reveal</>}
              </button>
            </div>
            
            <div className={`relative bg-purple-50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed flex-1 transition-all duration-500 ${revealSolution ? 'blur-0' : 'blur-md select-none'}`}>
              {feedback.solution_comparison.actual_ground_truth_summary}
            </div>
            
            {!revealSolution && (
              <div className="absolute inset-0 flex items-center justify-center z-10 top-12">
                <button 
                  onClick={() => setRevealSolution(true)}
                  className="px-4 py-2 bg-white/80 backdrop-blur-sm shadow-md rounded-lg text-sm font-semibold text-slate-900 hover:bg-white transition-all"
                >
                  Reveal Solution
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Qualitative Feedback */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Detailed Feedback</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
               <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 Strengths
               </h4>
               <ul className="space-y-2">
                 {feedback.qualitative_feedback.strengths.map((point, idx) => (
                   <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                     <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                     {point}
                   </li>
                 ))}
               </ul>
             </div>
             <div>
               <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                 Areas for Improvement
               </h4>
               <ul className="space-y-2">
                 {feedback.qualitative_feedback.areas_for_improvement.map((point, idx) => (
                   <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                     <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                     {point}
                   </li>
                 ))}
               </ul>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default FeedbackView;
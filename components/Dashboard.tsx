import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { UserMetrics } from '../types';
import { Card, Activity, CheckCircle, BookOpen } from 'lucide-react';

// Mock Metrics for Visualization
const MOCK_METRICS: UserMetrics = {
  user_id: 'u1',
  math_score_avg: 85,
  structuring_score_avg: 70,
  communication_score_avg: 90,
  cases_completed: 12
};

const data = [
  { subject: 'Math', A: MOCK_METRICS.math_score_avg, fullMark: 100 },
  { subject: 'Structure', A: MOCK_METRICS.structuring_score_avg, fullMark: 100 },
  { subject: 'Communication', A: MOCK_METRICS.communication_score_avg, fullMark: 100 },
  { subject: 'Business Sense', A: 75, fullMark: 100 },
  { subject: 'Creativity', A: 60, fullMark: 100 },
  { subject: 'Synthesis', A: 80, fullMark: 100 },
];

interface DashboardProps {
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onBack }) => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Performance Analytics</h1>
        <button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-slate-800 underline">
          Back to Menu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Cases Completed</p>
            <p className="text-2xl font-bold text-slate-900">{MOCK_METRICS.cases_completed}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-full text-green-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Avg. Math Score</p>
            <p className="text-2xl font-bold text-slate-900">{MOCK_METRICS.math_score_avg}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Focus Area</p>
            <p className="text-xl font-bold text-slate-900">Market Entry</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Skill Radar</h3>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Performance"
                dataKey="A"
                stroke="#2563eb"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Recent Sessions</h3>
          <div className="space-y-4">
             {[1, 2, 3, 4].map((i) => (
               <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer">
                 <div>
                   <h4 className="font-medium text-slate-900">Tech Profitability Case</h4>
                   <p className="text-xs text-slate-500">2 days ago • Duration: 45m</p>
                 </div>
                 <div className="text-right">
                   <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                     PASSED
                   </span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
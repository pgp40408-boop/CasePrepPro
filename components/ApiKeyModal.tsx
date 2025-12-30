import React, { useState } from 'react';
import { Key, Lock, ArrowRight, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onCancel: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onCancel }) => {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Key size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Enter Gemini API Key</h2>
          
          <div className="bg-slate-50 p-4 rounded-lg mb-6 text-sm text-slate-600 border border-slate-200">
             <p className="font-semibold mb-2 text-slate-800">How to get a free key:</p>
             <ol className="list-decimal pl-4 space-y-1.5 marker:text-slate-400">
               <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800 inline-flex items-center">Google AI Studio <ExternalLink size={10} className="ml-0.5" /></a>.</li>
               <li>Click <strong>"Create API key"</strong>.</li>
               <li>Select <strong>"Create key in new project"</strong>.</li>
               <li>Copy the key and paste it below.</li>
             </ol>
             <p className="text-xs text-slate-400 mt-3 border-t border-slate-200 pt-2">
                *The Free Tier is sufficient for practice. Your key is stored locally in your browser session.
             </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                API Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (key.trim()) onSave(key.trim());
                }}
                disabled={!key.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
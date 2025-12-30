import React, { useState } from 'react';
import { AppView, Case } from './types';
import SetupWizard from './components/SetupWizard';
import InterviewInterface from './components/InterviewInterface';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.SETUP);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [resumeSummary, setResumeSummary] = useState<string | null>(null);

  const handleStartCase = (selectedCase: Case, resumeText: string | null) => {
    setActiveCase(selectedCase);
    setResumeSummary(resumeText);
    setCurrentView(AppView.INTERVIEW);
  };

  const handleExitCase = () => {
    setActiveCase(null);
    setResumeSummary(null);
    setCurrentView(AppView.SETUP);
  };

  return (
    <div className="min-h-screen font-sans">
      {currentView === AppView.SETUP && (
        <SetupWizard 
          onStartCase={handleStartCase} 
          onGoToDashboard={() => setCurrentView(AppView.DASHBOARD)} 
        />
      )}

      {currentView === AppView.INTERVIEW && activeCase && (
        <InterviewInterface 
          activeCase={activeCase} 
          resumeSummary={resumeSummary}
          onExit={handleExitCase} 
        />
      )}

      {currentView === AppView.DASHBOARD && (
        <Dashboard onBack={() => setCurrentView(AppView.SETUP)} />
      )}
    </div>
  );
};

export default App;
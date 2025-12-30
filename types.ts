// ------------------------------------------------------------------
// DATABASE SCHEMA (Simulated for Frontend)
// ------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  resume_url?: string;
  target_firm: 'McKinsey' | 'BCG' | 'Bain' | 'Other';
}

export type Industry = 
  | 'Technology, Media & Telecom (TMT)' 
  | 'Financial Services' 
  | 'Consumer & Retail (CPG)' 
  | 'Healthcare & Life Sciences'
  | 'Energy & Environment'
  | 'Industrials & Manufacturing'
  | 'Public Sector & Social Impact'
  | 'Private Equity (PE)';

export type CaseType = 
  | 'Profitability' 
  | 'Market Entry' 
  | 'Market Sizing (Guesstimate)' 
  | 'Mergers & Acquisitions (M&A)' 
  | 'Pricing Strategy' 
  | 'Growth Strategy'
  | 'Operations & Supply Chain'
  | 'Unconventional / Brainteasers';

export type CaseStyle = 
  | 'Interviewer-Led (McKinsey Style)' 
  | 'Candidate-Led (BCG/Bain Style)';

export type Difficulty = 
  | 'Beginner' 
  | 'Intermediate' 
  | 'Advanced (Partner Level)';

export interface Case {
  id: string;
  title: string;
  industry: Industry;
  case_type: CaseType;
  case_style: CaseStyle;
  difficulty: Difficulty;
  pdf_url?: string; // Simulated path
  ground_truth_json: CaseGroundTruth;
}

export interface CaseGroundTruth {
  overview: string;
  framework_buckets: string[];
  math_data: Record<string, number | string>;
  conclusion_key_points: string[];
}

export interface Session {
  id: string;
  user_id: string;
  case_id: string;
  transcript: Message[];
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  feedback_json?: any;
}

export interface UserMetrics {
  user_id: string;
  math_score_avg: number;
  structuring_score_avg: number;
  cases_completed: number;
  communication_score_avg: number;
}

// ------------------------------------------------------------------
// APP & STATE LOGIC
// ------------------------------------------------------------------

export type InterviewPhase = 'FIT' | 'CASE_OPENING' | 'CLARIFYING' | 'FRAMEWORK' | 'MATH' | 'SYNTHESIS';

export interface InterviewState {
  current_phase: InterviewPhase;
  data_revealed: string[];
  math_status: 'CORRECT' | 'INCORRECT' | 'PENDING';
  interviewer_thought: string;
  message_content: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  state?: InterviewState; // Only assistant messages have state
  timestamp: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SETUP = 'SETUP',
  INTERVIEW = 'INTERVIEW',
}
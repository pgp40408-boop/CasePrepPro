import { Case, InterviewState } from './types';

export const MOCK_CASES: Case[] = [
  {
    id: 'c1',
    title: 'EcoDrink Profitability',
    industry: 'Consumer & Retail (CPG)',
    case_type: 'Profitability',
    case_style: 'Interviewer-Led (McKinsey Style)',
    difficulty: 'Intermediate',
    ground_truth_json: {
      overview: "EcoDrink is a manufacturer of organic juices. Profits have dropped 20% in the last year despite revenue growing 5%.",
      framework_buckets: ["Revenue Analysis (Price x Volume)", "Cost Analysis (Fixed vs Variable)", "Market Trends"],
      math_data: {
        revenue_2023: "100M",
        revenue_2024: "105M",
        costs_2023: "80M",
        costs_2024: "89M",
        sugar_price_increase: "15%",
      },
      conclusion_key_points: ["Rising variable costs due to sugar prices", "Need to renegotiate supplier contracts", "Consider slight price increase"]
    }
  },
  {
    id: 'c2',
    title: 'CloudCorp Asia Expansion',
    industry: 'Technology, Media & Telecom (TMT)',
    case_type: 'Market Entry',
    case_style: 'Candidate-Led (BCG/Bain Style)',
    difficulty: 'Advanced (Partner Level)',
    ground_truth_json: {
      overview: "CloudCorp, a US SaaS player, wants to enter the Southeast Asian market.",
      framework_buckets: ["Market Attractiveness", "Competitive Landscape", "Capabilities/Risks", "Entry Mode"],
      math_data: {
        market_size_sea: "5B",
        growth_rate: "12%",
        competitor_share: "60%",
      },
      conclusion_key_points: ["High growth market but fragmented", "Partner with local distributor", "Regulatory compliance is key risk"]
    }
  },
  {
    id: 'c3',
    title: 'AutoSteel Merger',
    industry: 'Industrials & Manufacturing',
    case_type: 'Mergers & Acquisitions (M&A)',
    case_style: 'Candidate-Led (BCG/Bain Style)',
    difficulty: 'Advanced (Partner Level)',
    ground_truth_json: {
      overview: "A leading steel manufacturer is considering acquiring a smaller, specialized auto-parts steel supplier.",
      framework_buckets: ["Strategic Rationale", "Financial Valuation", "Synergies (Cost & Revenue)", "Risks/Feasibility"],
      math_data: {
        acquisition_cost: "2B",
        projected_synergies: "150M/year",
        market_growth: "3%"
      },
      conclusion_key_points: ["Vertical integration benefits", "High acquisition premium", "Cultural integration risks"]
    }
  },
  {
    id: 'c4',
    title: 'FinTech Pricing Strategy',
    industry: 'Financial Services',
    case_type: 'Pricing Strategy',
    case_style: 'Interviewer-Led (McKinsey Style)',
    difficulty: 'Intermediate',
    ground_truth_json: {
      overview: "A neobank is launching a premium credit card. Determine the optimal annual fee.",
      framework_buckets: ["Cost-based", "Competitor-based", "Value-based pricing"],
      math_data: {
        competitor_avg_fee: "$250",
        variable_cost_per_user: "$100",
        target_margin: "40%"
      },
      conclusion_key_points: ["Value-based approach recommended", "Tiered pricing structure", "Bundling services"]
    }
  },
  {
    id: 'c5',
    title: 'National Health Policy',
    industry: 'Public Sector & Social Impact',
    case_type: 'Unconventional / Brainteasers',
    case_style: 'Candidate-Led (BCG/Bain Style)',
    difficulty: 'Beginner',
    ground_truth_json: {
      overview: "The Ministry of Health wants to reduce wait times in public hospitals by 20%.",
      framework_buckets: ["Process Efficiency", "Capacity Planning", "Demand Management"],
      math_data: {
        current_wait_time: "4 hours",
        patient_volume: "10,000/day",
        doctor_count: "500"
      },
      conclusion_key_points: ["Digitize triage", "Tele-health for minor ailments", "Shift schedule optimization"]
    }
  }
];

export const INITIAL_INTERVIEW_STATE: InterviewState = {
  current_phase: 'FIT',
  data_revealed: [],
  math_status: 'PENDING',
  interviewer_thought: "Initial state. Waiting for user introduction.",
  message_content: "Hello. I'm a Partner at the firm. Before we dive into the case, could you briefly walk me through your background?"
};
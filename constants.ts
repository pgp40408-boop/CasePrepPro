
import { Case, InterviewState } from './types';

export const MOCK_CASES: Case[] = [
  // --- EXISTING CASES ---
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
  },
  // --- NEW CASES TO REDUCE BIAS ---
  {
    id: 'c6',
    title: 'FashionCo Cart Abandonment',
    industry: 'E-commerce & Digital Marketplaces',
    case_type: 'Growth Strategy',
    case_style: 'Candidate-Led (BCG/Bain Style)',
    difficulty: 'Intermediate',
    ground_truth_json: {
      overview: "A leading online fashion retailer has seen their cart abandonment rate rise from 60% to 75%. Investigate why and fix it.",
      framework_buckets: ["User Experience (UX/UI)", "Technical Performance", "Pricing & Shipping", "Customer Demographics"],
      math_data: {
        daily_visitors: "100,000",
        avg_order_value: "$80",
        shipping_cost_threshold: "$100",
        competitor_shipping: "Free > $50"
      },
      conclusion_key_points: ["Shipping costs are the primary friction point", "Checkout page load time is too slow on mobile", "Implement free shipping threshold reduction"]
    }
  },
  {
    id: 'c7',
    title: 'LastMile Drone Delivery',
    industry: 'Transportation & Logistics',
    case_type: 'Operations & Supply Chain',
    case_style: 'Interviewer-Led (McKinsey Style)',
    difficulty: 'Advanced (Partner Level)',
    ground_truth_json: {
      overview: "A logistics giant wants to launch drone delivery for rural areas. Assess the feasibility and profitability.",
      framework_buckets: ["Regulatory Feasibility", "Technological Capabilities", "Financial Viability", "Operational Risks"],
      math_data: {
        cost_per_drone: "$5,000",
        delivery_cost_truck: "$10/package",
        delivery_cost_drone: "$2/package",
        drone_lifespan: "2 years"
      },
      conclusion_key_points: ["High upfront capex but significant opex savings", "Regulatory approval is the bottleneck", "Limit initial rollout to private lands"]
    }
  },
  {
    id: 'c8',
    title: 'RideShare Profitability Turnaround',
    industry: 'Startups & Venture Capital',
    case_type: 'Profitability',
    case_style: 'Candidate-Led (BCG/Bain Style)',
    difficulty: 'Advanced (Partner Level)',
    ground_truth_json: {
      overview: "A Series D RideShare startup is burning cash. Investors want profitability within 12 months.",
      framework_buckets: ["Revenue Drivers (Price, Frequency)", "Variable Costs (Driver Incentives)", "Fixed Costs (R&D, HQ)", "Market Exits"],
      math_data: {
        avg_ride_price: "$20",
        driver_payout: "$16",
        marketing_per_ride: "$3",
        hq_costs: "100M/year",
        total_rides: "50M/year"
      },
      conclusion_key_points: ["Cut marketing spend immediately", "Increase take-rate from 20% to 25%", "Exit unprofitable secondary markets"]
    }
  },
  {
    id: 'c9',
    title: 'StreamPlus Content Strategy',
    industry: 'Technology, Media & Telecom (TMT)',
    case_type: 'Growth Strategy',
    case_style: 'Candidate-Led (BCG/Bain Style)',
    difficulty: 'Intermediate',
    ground_truth_json: {
      overview: "A streaming service is losing subscribers to competitors. They want to know if they should invest in Sports rights or Original Movies.",
      framework_buckets: ["Customer Preferences", "Cost Benefit Analysis", "Differentiation", "Retention Impact"],
      math_data: {
        cost_sports_rights: "500M/year",
        cost_movies: "200M/year",
        projected_churn_reduction_sports: "5%",
        projected_churn_reduction_movies: "2%"
      },
      conclusion_key_points: ["Sports rights offer better retention stickiness", "High cost requires ad-tier introduction", "Focus on niche sports initially"]
    }
  },
  {
    id: 'c10',
    title: 'EV Charging Network',
    industry: 'Energy & Environment',
    case_type: 'Market Sizing (Guesstimate)',
    case_style: 'Interviewer-Led (McKinsey Style)',
    difficulty: 'Beginner',
    ground_truth_json: {
      overview: "Estimate the number of EV charging stations needed in New York City by 2030.",
      framework_buckets: ["Demand Side (Cars on road)", "Supply Side (Utilization rates)", "Geography"],
      math_data: {
        nyc_population: "8.5M",
        household_size: "2.5",
        car_ownership_rate: "40%",
        target_ev_adoption: "30%"
      },
      conclusion_key_points: ["Utilization rates vary by fast vs slow charging", "Home charging availability reduces public need", "Focus on commercial hubs"]
    }
  },
  {
    id: 'c11',
    title: 'GigaFactory Location Selection',
    industry: 'Industrials & Manufacturing',
    case_type: 'Operations & Supply Chain',
    case_style: 'Candidate-Led (BCG/Bain Style)',
    difficulty: 'Intermediate',
    ground_truth_json: {
      overview: "A battery manufacturer needs to choose between building a factory in Texas or Mexico.",
      framework_buckets: ["Labor Costs & Availability", "Logistics & Supply Chain", "Government Incentives", "Political Stability"],
      math_data: {
        labor_cost_us: "$25/hr",
        labor_cost_mx: "$6/hr",
        shipping_increase_mx: "5%",
        tax_break_us: "200M"
      },
      conclusion_key_points: ["Mexico offers opex advantage", "US offers capex incentives and lower risk", "Recommend US due to IRA tax credits"]
    }
  },
  {
    id: 'c12',
    title: 'Marketplace Fake Reviews',
    industry: 'E-commerce & Digital Marketplaces',
    case_type: 'Unconventional / Brainteasers',
    case_style: 'Candidate-Led (BCG/Bain Style)',
    difficulty: 'Advanced (Partner Level)',
    ground_truth_json: {
      overview: "A major e-commerce platform is suffering from a flood of fake reviews. How would you solve this using AI and Policy?",
      framework_buckets: ["Detection Algorithms", "User Verification", "Seller Penalties", "Incentive Alignment"],
      math_data: {
        fake_review_est: "15%",
        refund_rate_fake: "25%",
        refund_rate_real: "5%"
      },
      conclusion_key_points: ["Implement verified purchase badge", "AI text analysis for patterns", "Ban sellers participating in review rings"]
    }
  }
];

export const INITIAL_INTERVIEW_STATE: InterviewState = {
  current_phase: 'FIT',
  completion_percentage: 0,
  data_revealed: [],
  math_status: 'PENDING',
  interviewer_thought: "Initial state. Waiting for user introduction.",
  message_content: "Hello. I'm a Partner at the firm. Before we dive into the case, could you briefly walk me through your background?"
};

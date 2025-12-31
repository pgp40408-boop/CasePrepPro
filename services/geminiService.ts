import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Case, InterviewState, Message, FeedbackReport, Industry, CaseType, Difficulty, CaseStyle } from '../types';

// Helper to get key securely
const getAiClient = (): GoogleGenAI => {
  // Check session storage first (User provided via UI), then env var (Dev provided)
  const sessionKey = typeof window !== 'undefined' ? sessionStorage.getItem("gemini_api_key") : null;
  
  let envKey = null;
  try {
    envKey = process.env.API_KEY;
  } catch (e) {
    // process.env not available
  }
  
  const apiKey = sessionKey || envKey;

  if (!apiKey) {
    throw new Error("API Key missing. Please provide a key via the Settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- FALLBACK HELPER ---
// Tries the primary model, falls back to secondary if Rate Limited (429) or other errors
async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    primaryModel: string;
    fallbackModel: string;
    contents: any;
    config: any;
  }
) {
  try {
    return await ai.models.generateContent({
      model: params.primaryModel,
      contents: params.contents,
      config: params.config
    });
  } catch (error: any) {
    const errorString = JSON.stringify(error);
    const isRateLimit = 
      error.message?.includes('429') || 
      error.message?.includes('Resource has been exhausted') ||
      error.status === 429 ||
      error.code === 429 ||
      error.status === 503 ||
      errorString.includes('429') ||
      errorString.includes('RESOURCE_EXHAUSTED');

    if (isRateLimit) {
      console.warn(`[Gemini Service] Primary model ${params.primaryModel} failed (Rate Limit). Falling back to ${params.fallbackModel}.`);
      return await ai.models.generateContent({
        model: params.fallbackModel,
        contents: params.contents,
        config: params.config
      });
    }
    throw error;
  }
}

// Model Constants
const PRO_MODEL = "gemini-3-pro-preview";
const FLASH_MODEL = "gemini-3-flash-preview";

// Schema Definition for Interview State
const interviewStateSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    current_phase: {
      type: Type.STRING,
      enum: ['FIT', 'CASE_OPENING', 'CLARIFYING', 'FRAMEWORK', 'MATH', 'SYNTHESIS'],
      description: "The current phase of the case interview."
    },
    completion_percentage: {
      type: Type.INTEGER,
      description: "Estimated progress 0-100. Benchmark: FIT=10, OPENING=20, CLARIFYING=30, FRAMEWORK=50, MATH=75, SYNTHESIS=90, END=100."
    },
    data_revealed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of data points or facts explicitly revealed to the user so far."
    },
    math_status: {
      type: Type.STRING,
      enum: ['CORRECT', 'INCORRECT', 'PENDING'],
      description: "Current status of any calculation the user is performing."
    },
    interviewer_thought: {
      type: Type.STRING,
      description: "Internal monologue about the candidate's performance and what to do next."
    },
    message_content: {
      type: Type.STRING,
      description: "The actual spoken response to the candidate."
    }
  },
  required: ['current_phase', 'completion_percentage', 'data_revealed', 'math_status', 'interviewer_thought', 'message_content']
};

export const generateInterviewResponse = async (
  history: Message[],
  currentCase: Case,
  userResumeText: string | null
): Promise<InterviewState> => {

  const ai = getAiClient();
  
  // Style-specific instructions
  let styleInstruction = "";
  if (currentCase.case_style === 'Interviewer-Led (McKinsey Style)') {
    styleInstruction = "STYLE: Interviewer-Led (McKinsey). You control the pace. Ask specific questions (e.g., 'Please calculate the margin for Year 1'). Do not wait for the user to lead; guide them through the case logic step-by-step.";
  } else {
    styleInstruction = "STYLE: Candidate-Led (BCG/Bain). Sit back. Do NOT volunteer information. Wait for the user to ask for data (e.g., 'I would like to look at the revenue data'). If they are stuck, provide only minimal nudges.";
  }

  const systemInstruction = `
    You are a Senior Partner at a top consulting firm conducting a case interview. 
    You are tough but fair. Your goal is to evaluate the candidate's problem-solving skills, structure, and communication.

    CURRENT CASE CONTEXT:
    Title: ${currentCase.title}
    Industry: ${currentCase.industry}
    Type: ${currentCase.case_type}
    Difficulty: ${currentCase.difficulty}
    
    ${styleInstruction}

    GROUND TRUTH DATA (Hidden from user):
    ${JSON.stringify(currentCase.ground_truth_json, null, 2)}

    ${userResumeText ? `CANDIDATE RESUME SUMMARY: ${userResumeText}` : ''}

    INSTRUCTIONS:
    1. Maintain the "InterviewState" JSON structure at all times.
    2. Do NOT reveal data from the Ground Truth unless the user asks specific, relevant questions.
    3. If the user makes a math error, flag math_status as 'INCORRECT' and gently nudge them.
    4. Move phases logically: FIT -> OPENING -> CLARIFYING -> FRAMEWORK -> MATH -> SYNTHESIS.
    5. In 'interviewer_thought', critique the user's last response based on the selected difficulty level.
    6. Keep 'message_content' professional and conversational.
    7. Update 'completion_percentage' based on progress.
  `;

  let contents = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  if (contents.length === 0) {
    contents = [{ 
      role: 'user', 
      parts: [{ text: "The candidate has entered the room. Please start the interview with the FIT phase." }] 
    }];
  }

  try {
    const response = await generateWithFallback(ai, {
      primaryModel: PRO_MODEL,
      fallbackModel: FLASH_MODEL,
      contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: interviewStateSchema,
        temperature: 0.7,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as InterviewState;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      current_phase: 'FIT',
      completion_percentage: 0,
      data_revealed: [],
      math_status: 'PENDING',
      interviewer_thought: "System Error encountered.",
      message_content: "I apologize, but I seem to be having trouble processing that. Could you repeat?"
    };
  }
};

// --- CASE GENERATION & EXTRACTION ---

const caseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    industry: { type: Type.STRING },
    case_type: { type: Type.STRING },
    case_style: { type: Type.STRING },
    difficulty: { type: Type.STRING },
    ground_truth_json: {
      type: Type.OBJECT,
      properties: {
        overview: { type: Type.STRING },
        framework_buckets: { type: Type.ARRAY, items: { type: Type.STRING } },
        math_data_points: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT, 
            properties: {
              key: { type: Type.STRING },
              value: { type: Type.STRING }
            },
            required: ['key', 'value']
          }
        },
        conclusion_key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['overview', 'framework_buckets', 'math_data_points', 'conclusion_key_points']
    }
  },
  required: ['title', 'industry', 'case_type', 'case_style', 'difficulty', 'ground_truth_json']
};

export const generateSyntheticCase = async (
  industry?: string,
  caseType?: string,
  difficulty?: string,
  style?: string
): Promise<Case> => {
  const ai = getAiClient();

  const prompt = `
    Generate a unique, realistic Management Consulting Case Study.
    
    Constraints:
    - Industry: ${industry || "Random (Tech, EV, AI, BioTech)"}
    - Case Type: ${caseType || "Random"}
    - Difficulty: ${difficulty || "Intermediate"}
    - Style: ${style || "Random"}

    Requirements:
    - 'math_data_points' should contain 3-5 specific numbers for calculations.
    - 'overview' is the initial prompt.
  `;

  const response = await generateWithFallback(ai, {
    primaryModel: PRO_MODEL,
    fallbackModel: FLASH_MODEL,
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: caseSchema,
      temperature: 0.9, 
    }
  });

  if (response.text) {
    return parseCaseResponse(response.text);
  }

  throw new Error("Failed to generate case");
};

export const extractCaseFromTranscript = async (transcript: string): Promise<Case> => {
  const ai = getAiClient();

  const prompt = `
    Analyze the following interview transcript and extract a structured Case Study object.
    TRANSCRIPT: ${transcript.substring(0, 30000)}
  `;

  const response = await generateWithFallback(ai, {
    primaryModel: PRO_MODEL,
    fallbackModel: FLASH_MODEL,
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: caseSchema,
      temperature: 0.2,
    }
  });

  if (response.text) {
    return parseCaseResponse(response.text);
  }
  
  throw new Error("Failed to extract case from transcript");
}

const parseCaseResponse = (jsonString: string): Case => {
  const rawData = JSON.parse(jsonString);
  const math_data: Record<string, string | number> = {};
  if (rawData.ground_truth_json?.math_data_points) {
    rawData.ground_truth_json.math_data_points.forEach((item: {key: string, value: string}) => {
      math_data[item.key] = item.value;
    });
  }

  return {
    id: `generated_${Date.now()}`,
    title: rawData.title,
    industry: rawData.industry,
    case_type: rawData.case_type,
    case_style: rawData.case_style,
    difficulty: rawData.difficulty,
    ground_truth_json: {
      overview: rawData.ground_truth_json.overview,
      framework_buckets: rawData.ground_truth_json.framework_buckets,
      conclusion_key_points: rawData.ground_truth_json.conclusion_key_points,
      math_data: math_data
    }
  } as Case;
}

// --- FEEDBACK / GRADING ENGINE ---

export const generateFeedback = async (
  history: Message[],
  currentCase: Case
): Promise<FeedbackReport> => {
  const ai = getAiClient();

  const feedbackSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      scores: {
        type: Type.OBJECT,
        properties: {
          structuring: { type: Type.INTEGER },
          numeracy: { type: Type.INTEGER },
          judgment: { type: Type.INTEGER },
          communication: { type: Type.INTEGER },
        },
        required: ['structuring', 'numeracy', 'judgment', 'communication']
      },
      qualitative_feedback: {
        type: Type.OBJECT,
        properties: {
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          areas_for_improvement: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['strengths', 'areas_for_improvement']
      },
      solution_comparison: {
        type: Type.OBJECT,
        properties: {
          user_recommendation_summary: { type: Type.STRING },
          actual_ground_truth_summary: { type: Type.STRING },
        },
        required: ['user_recommendation_summary', 'actual_ground_truth_summary']
      }
    },
    required: ['scores', 'qualitative_feedback', 'solution_comparison']
  };

  const gradingPrompt = `
    You are a Grading Algorithm for Management Consulting Interviews.
    SCORING RUBRIC (1-10 Scale). Compare User vs Ground Truth.
    CASE CONTEXT: ${JSON.stringify(currentCase)}
  `;

  const transcript = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

  const response = await generateWithFallback(ai, {
    primaryModel: PRO_MODEL,
    fallbackModel: FLASH_MODEL,
    contents: { parts: [{ text: `TRANSCRIPT TO GRADE:\n${transcript}` }] },
    config: {
      systemInstruction: gradingPrompt,
      responseMimeType: "application/json",
      responseSchema: feedbackSchema,
      temperature: 0.4
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as FeedbackReport;
  }
  
  throw new Error("Failed to generate feedback");
};

export interface ResumeAnalysisResult {
  summary: string;
  suggested_industry: string;
  suggested_difficulty: string;
}

export const analyzeResume = async (base64Pdf: string): Promise<ResumeAnalysisResult> => {
  const ai = getAiClient();
  
  const textPart = {
    text: `Analyze this resume for a management consulting interview.
    1. Summarize the candidate's background in 2 sentences.
    2. Suggest Industry from: [Technology, TMT, Financial Services, CPG, Healthcare, Energy, Industrials].
    3. Suggest Difficulty: [Beginner, Intermediate, Advanced].
    Return JSON.`
  };
  
  const filePart = {
    inlineData: {
      mimeType: 'application/pdf',
      data: base64Pdf
    }
  };

  const response = await generateWithFallback(ai, {
    primaryModel: PRO_MODEL,
    fallbackModel: FLASH_MODEL,
    contents: { parts: [filePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          suggested_industry: { type: Type.STRING },
          suggested_difficulty: { type: Type.STRING }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as ResumeAnalysisResult;
  }
  
  throw new Error("Failed to analyze resume");
};

// --- AUDIO HELPERS ---

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateSpeech = async (text: string): Promise<Uint8Array> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, 
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned");

  return base64ToUint8Array(base64Audio);
};
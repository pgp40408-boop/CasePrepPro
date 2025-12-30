import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Case, InterviewState, Message, FeedbackReport } from '../types';

// Helper to get key securely
const getAiClient = (): GoogleGenAI => {
  // Check session storage first (User provided via UI), then env var (Dev provided)
  // sessionStorage is cleared when the tab is closed.
  const sessionKey = typeof window !== 'undefined' ? sessionStorage.getItem("gemini_api_key") : null;
  const envKey = process.env.API_KEY;
  
  const apiKey = sessionKey || envKey;

  if (!apiKey) {
    throw new Error("API Key missing. Please provide a key.");
  }
  return new GoogleGenAI({ apiKey });
};

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
  const model = "gemini-3-pro-preview"; // Optimized for complex text tasks (reasoning)

  // Style-specific instructions
  let styleInstruction = "";
  if (currentCase.case_style === 'Interviewer-Led (McKinsey Style)') {
    styleInstruction = "STYLE: Interviewer-Led (McKinsey). You control the pace. Ask specific questions (e.g., 'Please calculate the margin for Year 1'). Do not wait for the user to lead; guide them through the case logic step-by-step.";
  } else {
    styleInstruction = "STYLE: Candidate-Led (BCG/Bain). Sit back. Do NOT volunteer information. Wait for the user to ask for data (e.g., 'I would like to look at the revenue data'). If they are stuck, provide only minimal nudges.";
  }

  // Construct the System Instruction
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
    2. Do NOT reveal data from the Ground Truth unless the user asks specific, relevant questions (especially in Candidate-Led mode).
    3. If the user makes a math error, flag math_status as 'INCORRECT' and gently nudge them.
    4. Move phases logically: FIT -> OPENING -> CLARIFYING -> FRAMEWORK -> MATH -> SYNTHESIS.
    5. In 'interviewer_thought', critique the user's last response based on the selected difficulty level.
    6. Keep 'message_content' professional and conversational.
    7. Update 'completion_percentage' based on how close we are to the final recommendation.

    PHASE GUIDANCE:
    - FIT: Ask 1-2 questions about background.
    - CASE_OPENING: Read the case overview.
    - FRAMEWORK: Wait for the user to structure their approach.
    - MATH: Provide data only when asked. Verify calculations.
    - SYNTHESIS: Ask for a final recommendation.
  `;

  // Format history for Gemini
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
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
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

// --- FEEDBACK / GRADING ENGINE ---

export const generateFeedback = async (
  history: Message[],
  currentCase: Case
): Promise<FeedbackReport> => {
  const ai = getAiClient();
  const model = "gemini-3-pro-preview";

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
    You must evaluate the Candidate's performance in the provided transcript against the Case Ground Truth.
    
    CASE CONTEXT:
    ${JSON.stringify(currentCase)}

    SCORING RUBRIC (1-10 Scale):
    1. Structuring: Was the framework MECE (Mutually Exclusive, Collectively Exhaustive)? Did they break down the problem logically?
    2. Numeracy: Were calculations accurate? Did they perform mental math quickly? Did they sanitize the data?
    3. Judgment/Business Sense: Did they ask relevant questions? Did they drive towards the "Key Points" in the Ground Truth?
    4. Communication: Was the synthesis clear? Did they lead the conversation (if candidate-led)?

    TASK:
    - Analyze the entire conversation history below.
    - Provide strict but fair scores.
    - Compare the User's final recommendation (if any) to the Ground Truth conclusion.
    - If the user abandoned the case early, score based on what was completed, but penalize Structuring/Judgment if they missed the point.
  `;

  // Format history
  const transcript = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts: [{ text: `TRANSCRIPT TO GRADE:\n${transcript}` }] },
    config: {
      systemInstruction: gradingPrompt,
      responseMimeType: "application/json",
      responseSchema: feedbackSchema,
      temperature: 0.4 // Lower temperature for consistent grading
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as FeedbackReport;
  }
  
  throw new Error("Failed to generate feedback");
};


// Return type for analysis
export interface ResumeAnalysisResult {
  summary: string;
  suggested_industry: string;
  suggested_difficulty: string;
}

export const analyzeResume = async (base64Pdf: string): Promise<ResumeAnalysisResult> => {
  const ai = getAiClient();
  // Using gemini-3-flash-preview for fast document analysis
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf
          }
        },
        {
          text: `Analyze this resume for a management consulting interview.
          1. Summarize the candidate's background in 2 sentences.
          2. Suggest the best matching Industry from this list: [Technology, Media & Telecom (TMT), Financial Services, Consumer & Retail (CPG), Healthcare & Life Sciences, Energy & Environment, Industrials & Manufacturing].
          3. Suggest a Difficulty level based on experience: [Beginner, Intermediate, Advanced (Partner Level)].
          
          Return JSON.`
        }
      ]
    },
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

// Gemini Live/TTS returns raw PCM 24kHz Mono 16-bit
// This helper is used by the frontend to decode the raw bytes
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

// Returns raw audio bytes. Decoding happens in the UI component to use the active AudioContext.
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
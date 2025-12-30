import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, PenTool, MessageSquare, ChevronRight, Loader2, Volume2, Radio, Square, PlayCircle, X } from 'lucide-react';
import { Case, Message, InterviewState } from '../types';
import { generateInterviewResponse, generateSpeech, decodeAudioData } from '../services/geminiService';
import { INITIAL_INTERVIEW_STATE } from '../constants';

// --- Type Definitions for Web Speech API ---
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
    webkitAudioContext: typeof AudioContext;
  }
}
// -------------------------------------------

interface InterviewInterfaceProps {
  activeCase: Case;
  resumeSummary: string | null;
  onExit: () => void;
}

const InterviewInterface: React.FC<InterviewInterfaceProps> = ({ activeCase, resumeSummary, onExit }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [whiteboardContent, setWhiteboardContent] = useState('');
  
  // Audio States
  const [isListening, setIsListening] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [interviewState, setInterviewState] = useState<InterviewState>(INITIAL_INTERVIEW_STATE);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Refs for callbacks to access latest state without re-binding
  const isLiveModeRef = useRef(isLiveMode);
  const inputValueRef = useRef(inputValue);
  const handleSendMessageRef = useRef<() => Promise<void>>(async () => {});

  // Sync refs
  useEffect(() => { isLiveModeRef.current = isLiveMode; }, [isLiveMode]);
  useEffect(() => { inputValueRef.current = inputValue; }, [inputValue]);

  // --- AUDIO PLAYBACK (GEMINI TTS) ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Handle Live Mode Toggle
  const toggleLiveMode = async () => {
    const newState = !isLiveMode;
    setIsLiveMode(newState);
    
    // Resume context on user gesture (Toggle button)
    if (newState) {
       if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
       }
       if (audioContextRef.current.state === 'suspended') {
         await audioContextRef.current.resume();
       }
    } else {
      // If turning OFF, stop everything
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e) {}
      }
      setIsAiSpeaking(false);
      if (isListening) {
        recognitionRef.current?.stop();
      }
    }
  };

  const playAudioBuffer = async (buffer: AudioBuffer) => {
     if (!audioContextRef.current) {
       audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
     }
     const ctx = audioContextRef.current;
     
     // Resume if suspended (browser policy)
     if (ctx.state === 'suspended') {
       await ctx.resume();
     }

     // Stop any previous audio
     if (audioSourceRef.current) {
       try { audioSourceRef.current.stop(); } catch(e) {}
     }

     const source = ctx.createBufferSource();
     source.buffer = buffer;
     source.connect(ctx.destination);
     
     audioSourceRef.current = source;
     
     setIsAiSpeaking(true);
     source.start();

     source.onended = () => {
       setIsAiSpeaking(false);
       if (isLiveModeRef.current) {
         startListening();
       }
     };
  };

  const speakText = async (text: string) => {
    try {
      // 1. Get raw bytes from service
      const audioBytes = await generateSpeech(text);
      
      // 2. Ensure we have a context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      
      // 3. Decode in component
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
      
      // 4. Play
      await playAudioBuffer(audioBuffer);

    } catch (e) {
      console.error("TTS Failed, falling back to browser:", e);
      // Fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => {
          setIsAiSpeaking(false);
          if (isLiveModeRef.current) startListening();
        };
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Start Listening Wrapper
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech recognition start failed", e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Initialize Interview
  useEffect(() => {
    const initInterview = async () => {
      setIsLoading(true);
      // Generate opening message
      const openingState = await generateInterviewResponse([], activeCase, resumeSummary);
      setInterviewState(openingState);
      const initialMsg: Message = {
        role: 'assistant',
        content: openingState.message_content,
        timestamp: Date.now(),
        state: openingState
      };
      setMessages([initialMsg]);
      setIsLoading(false);

      // If Live Mode was somehow active (unlikely on mount, but good practice), speak
      if (isLiveModeRef.current) {
        speakText(openingState.message_content);
      }
    };
    initInterview();
    
    // Cleanup speech on unmount
    return () => {
      if (audioSourceRef.current) try { audioSourceRef.current.stop() } catch(e){}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor New Messages for TTS
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    // Only speak if it's a NEW message from assistant and Live Mode is ON
    if (lastMsg?.role === 'assistant' && isLiveMode && !isLoading) {
      speakText(lastMsg.content);
    }
  }, [messages, isLiveMode, isLoading]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiSpeaking]); 

  // Main Send Logic
  const handleSendMessage = async () => {
    const textToSend = inputValueRef.current.trim();
    if (!textToSend) return;

    // Stop listening if manually sent
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Call Gemini
    const newState = await generateInterviewResponse([...messages, userMsg], activeCase, resumeSummary);
    
    setInterviewState(newState);
    
    const aiMsg: Message = {
      role: 'assistant',
      content: newState.message_content,
      timestamp: Date.now(),
      state: newState
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  // Update ref for the closure
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  // Voice Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false; 
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
           setInputValue(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // Auto-Send Logic for Live Mode
        if (isLiveModeRef.current) {
          if (inputValueRef.current.trim().length > 0) {
            handleSendMessageRef.current();
          } 
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error", event);
        setIsListening(false);
      };
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white relative">
      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
      `}</style>

      {/* Header */}
      <header className="flex-none h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50">
        <div className="flex items-center space-x-2">
           <span className="font-bold text-slate-700">CasePrep Pro</span>
           <span className="text-slate-400">/</span>
           <span className="text-sm font-medium text-slate-600 truncate max-w-[150px] md:max-w-xs">{activeCase.title}</span>
        </div>
        <div className="flex items-center space-x-4">
           {/* Phase Indicator */}
           <div className="hidden md:flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
             <span>PHASE:</span>
             <span>{interviewState.current_phase}</span>
           </div>
           
           <div className="h-6 w-px bg-slate-300 mx-2 hidden md:block"></div>

           {/* Live Mode Toggle */}
           <button 
             onClick={toggleLiveMode}
             className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${
               isLiveMode 
                 ? 'bg-red-50 border-red-200 text-red-600 ring-2 ring-red-100' 
                 : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
             }`}
           >
             {isLiveMode ? <Square size={14} fill="currentColor" className="animate-pulse" /> : <Radio size={16} />}
             <span className="text-xs font-bold">{isLiveMode ? 'Stop Live Mode' : 'Start Live Mode'}</span>
           </button>

           <button onClick={onExit} className="text-sm text-slate-500 hover:text-red-600 font-medium ml-2">Exit</button>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left: Chat Interface */}
        <div className="w-1/2 flex flex-col border-r border-slate-200 bg-slate-50/50">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Debug: Interviewer Thought */}
                  {msg.state?.interviewer_thought && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 italic">
                      thought: {msg.state.interviewer_thought}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && !isLiveMode && (
              <div className="flex justify-start">
                 <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center space-x-2">
                    <Loader2 className="animate-spin text-blue-600" size={16} />
                    <span className="text-xs text-slate-500">Partner is thinking...</span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Area: Swaps between Input and Live UI */}
          <div className={`border-t border-slate-200 transition-all duration-500 ease-in-out ${isLiveMode ? 'bg-[#1e1e1e] h-80' : 'bg-white h-auto p-4'}`}>
            
            {isLiveMode ? (
               // --- LIVE MODE BOTTOM PANEL ---
               <div className="h-full flex flex-col relative animate-in slide-in-from-bottom-10 fade-in duration-500">
                  {/* Top Bar with Close */}
                  <div className="absolute top-2 right-2 z-10">
                    <button onClick={toggleLiveMode} className="p-2 text-white/30 hover:text-white transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  {/* Status Text */}
                  <div className="pt-6 pb-2 text-center">
                    <p className="text-xs font-medium tracking-widest text-white/50 uppercase">
                      {isLoading ? "Thinking..." : isAiSpeaking ? "Partner Speaking" : isListening ? "Listening..." : "Live Paused"}
                    </p>
                  </div>

                  {/* Main Visualizer Area */}
                  <div className="flex-1 flex items-center justify-center relative w-full">
                    
                    {/* AI Speaking Visual */}
                    {isAiSpeaking && !isLoading && (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-40 animate-pulse rounded-full w-24 h-24"></div>
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-bounce-slow flex items-center justify-center z-10">
                           <Volume2 size={24} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* Loading Spinner */}
                    {isLoading && <Loader2 size={48} className="animate-spin text-blue-400" />}

                    {/* Listening Visual (Google Bars) */}
                    {isListening && (
                      <div className="flex items-center space-x-2 h-12">
                        <div className="w-3 bg-[#4285F4] rounded-full animate-[music-bar_0.8s_ease-in-out_infinite] h-full"></div>
                        <div className="w-3 bg-[#EA4335] rounded-full animate-[music-bar_1.0s_ease-in-out_infinite_0.1s] h-full"></div>
                        <div className="w-3 bg-[#FBBC05] rounded-full animate-[music-bar_0.6s_ease-in-out_infinite_0.2s] h-full"></div>
                        <div className="w-3 bg-[#34A853] rounded-full animate-[music-bar_0.9s_ease-in-out_infinite_0.3s] h-full"></div>
                      </div>
                    )}

                    {/* Idle State */}
                    {!isListening && !isAiSpeaking && !isLoading && (
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                        <MicOff size={24} className="text-white/30" />
                      </div>
                    )}
                  </div>

                  {/* Transcript / Subtitles Area */}
                  <div className="px-8 pb-4 h-20 flex items-center justify-center text-center">
                    {isAiSpeaking ? (
                      <p className="text-sm font-light text-blue-200 line-clamp-2 leading-relaxed">
                         {messages.length > 0 && messages[messages.length-1].role === 'assistant' 
                           ? messages[messages.length-1].content 
                           : "..."}
                      </p>
                    ) : (
                      <p className={`text-lg font-medium transition-all ${isListening ? 'text-white' : 'text-white/40'}`}>
                         {inputValue || (isListening ? "" : "Tap microphone to resume")}
                      </p>
                    )}
                  </div>

                  {/* Bottom Controls */}
                  <div className="pb-6 flex justify-center">
                    <button 
                       onClick={isListening ? stopListening : startListening}
                       className={`p-4 rounded-full transition-all duration-300 transform ${
                         isListening 
                           ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-110 ring-4 ring-red-500/20' 
                           : 'bg-white/10 text-white hover:bg-white/20'
                       }`}
                    >
                      {isListening ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                    </button>
                  </div>
               </div>
            ) : (
              // --- STANDARD TEXT INPUT ---
              <div className="relative flex items-center animate-in fade-in duration-300">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your response..."
                  className="w-full pl-4 pr-14 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all"
                  disabled={isLoading}
                />
                <div className="absolute right-2 flex items-center space-x-1">
                  <button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Whiteboard */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="h-10 border-b border-slate-100 flex items-center px-4 justify-between bg-slate-50">
             <div className="flex items-center space-x-2 text-slate-500">
                <PenTool size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">Candidate Notes / Whiteboard</span>
             </div>
             <span className="text-xs text-slate-400">Auto-saved</span>
          </div>
          <div className="flex-1 p-0">
            <textarea
              value={whiteboardContent}
              onChange={(e) => setWhiteboardContent(e.target.value)}
              className="w-full h-full p-6 resize-none focus:outline-none text-slate-700 font-mono text-sm leading-relaxed"
              placeholder="# Use this space to structure your thoughts, write down equations, or take notes during the case..."
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default InterviewInterface;
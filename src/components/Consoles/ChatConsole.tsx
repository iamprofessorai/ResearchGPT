import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Search, 
  MapPin, 
  BrainCircuit, 
  Activity,
  Terminal,
  Volume2, 
  Loader2,
  Trash2,
  Plus,
  Globe,
  MoreVertical,
  X,
  FileText,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Menu,
  Cpu,
  RefreshCw,
  ChevronDown,
  Copy,
  Zap,
  History as HistoryIcon,
  Languages,
  RotateCcw,
  Quote,
  BookOpen,
  Share2,
  ExternalLink,
  Check
} from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse, ThinkingLevel, Modality } from "@google/genai";
import { auth, db } from '../../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDocs, limit, updateDoc } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { ChatMessage, ChatSession, Persona, KnowledgeBase } from '../../types';
import { cn, cleanForFirestore } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';

interface ChatConsoleProps {
  userProfile: any;
  engineMode: 'cloud' | 'offline';
  localEndpoint: string;
  onToggleMode: () => void;
  setActiveConsole: (id: string) => void;
}

const LANGUAGES = {
  international: [
    { label: 'Spanish', code: 'es' },
    { label: 'French', code: 'fr' },
    { label: 'German', code: 'de' },
    { label: 'Chinese', code: 'zh' },
    { label: 'Japanese', code: 'ja' },
  ],
  indian: [
    { label: 'Hindi', code: 'hi' },
    { label: 'Bengali', code: 'bn' },
    { label: 'Telugu', code: 'te' },
    { label: 'Marathi', code: 'mr' },
    { label: 'Tamil', code: 'ta' },
  ]
};

export function ChatConsole({ userProfile, engineMode, localEndpoint, onToggleMode, setActiveConsole }: ChatConsoleProps) {
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [useCodeExecution, setUseCodeExecution] = useState(false);
  const [sessionUrls, setSessionUrls] = useState<string[]>([]);
  const [urlContents, setUrlContents] = useState<{ [url: string]: string }>({});
  const [fetchingUrls, setFetchingUrls] = useState<string[]>([]);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<string | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [translatedMessages, setTranslatedMessages] = useState<{ [msgId: string]: string }>({});
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (auth.currentUser) {
      const q = query(
        collection(db, 'users', auth.currentUser.uid, 'chats'),
        orderBy('lastMessageAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as ChatSession))
          .filter(s => !s.deleted);
        setSessions(docs);
        if (docs.length > 0 && !activeSessionId) {
          setActiveSessionId(docs[0].id);
        }
      });

      // Fetch personas
      const pq = query(collection(db, 'users', auth.currentUser.uid, 'personas'));
      onSnapshot(pq, (snapshot) => {
        setPersonas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Persona)));
      });

      // Fetch Knowledge Bases
      const kbq = query(collection(db, 'users', auth.currentUser.uid, 'knowledgeBases'));
      onSnapshot(kbq, (snapshot) => {
        setKnowledgeBases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeBase)));
      });

      return () => unsubscribe();
    }
  }, [auth.currentUser]);

  useEffect(() => {
    if (activeSessionId && auth.currentUser) {
      const q = query(
        collection(db, 'users', auth.currentUser.uid, 'chats', activeSessionId, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      });
      return () => unsubscribe();
    }
  }, [activeSessionId, auth.currentUser]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // Auto-save feature
  useEffect(() => {
    if (activeSessionId) {
      const chatState = {
        activeSessionId,
        selectedPersona,
        selectedModel,
        useSearch,
        useMaps,
        useThinking,
        useCodeExecution,
        promptHistory,
        sessionUrls
      };
      localStorage.setItem(`nexus_chat_state_${activeSessionId}`, JSON.stringify(chatState));
    }
  }, [activeSessionId, selectedPersona, selectedModel, useSearch, useMaps, useThinking, useCodeExecution, promptHistory, sessionUrls]);

  // Load saved state
  useEffect(() => {
    const savedHistory = localStorage.getItem('nexus_prompt_history');
    if (savedHistory) {
      setPromptHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nexus_prompt_history', JSON.stringify(promptHistory));
  }, [promptHistory]);

  const createNewSession = async () => {
    if (!auth.currentUser) return;
    const newSession = {
      userId: auth.currentUser.uid,
      title: 'New Conversation',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'chats'), newSession);
    setActiveSessionId(docRef.id);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const fetchUrlContent = async (url: string) => {
    if (urlContents[url]) return;
    setFetchingUrls(prev => [...prev, url]);
    setFailedUrls(prev => prev.filter(u => u !== url));
    try {
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!response.ok) throw new Error('Failed to fetch URL');
      const data = await response.json();
      setUrlContents(prev => ({ ...prev, [url]: data.text }));
      toast.success(`URL_CONTENT_PARSED: ${data.title.slice(0, 20)}...`);
    } catch (err) {
      console.error(err);
      setFailedUrls(prev => [...prev, url]);
      toast.error(`FAILED_TO_FETCH_URL: ${url}`);
    } finally {
      setFetchingUrls(prev => prev.filter(u => u !== url));
    }
  };

  const handleAddUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!isValidUrl(url)) {
      toast.error("INVALID_URL_FORMAT");
      return;
    }
    if (sessionUrls.includes(url)) {
      toast.error("URL_ALREADY_IN_CONTEXT");
      return;
    }
    setSessionUrls(prev => [...prev, url]);
    setUrlInput('');
    await fetchUrlContent(url);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target?.result?.toString().split(',')[1];
          const previewUrl = event.target?.result?.toString();
          if (base64Data && previewUrl) {
            setAttachments(prev => [...prev, {
              name: `Voice_${new Date().getTime()}.wav`,
              type: 'audio/wav',
              data: base64Data,
              preview: previewUrl
            }]);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("RECORDING_STARTED");
    } catch (err) {
      console.error("Recording failed", err);
      toast.error("MICROPHONE_ACCESS_DENIED");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("RECORDING_CAPTURED");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'chats', id), {
        deleted: true // Soft delete or just delete the doc
      });
      // Or hard delete:
      // await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'chats', id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      toast.success("Session deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete session");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: event.target?.result?.toString().split(',')[1],
          preview: event.target?.result?.toString()
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || !auth.currentUser) return;

    let sessionId = activeSessionId;
    
    // Auto-create session if none exists
    if (!sessionId) {
      try {
        const newSession = {
          userId: auth.currentUser.uid,
          title: input.trim().slice(0, 30) || 'New Conversation',
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'chats'), cleanForFirestore(newSession));
        sessionId = docRef.id;
        setActiveSessionId(sessionId);
      } catch (err) {
        console.error("Failed to create session", err);
        toast.error("Failed to start conversation");
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      attachments: attachments.map(a => ({ type: a.type.split('/')[0], url: a.preview, mimeType: a.type }))
    };

    const currentInput = input;
    const currentAttachments = [...attachments];

    setInput('');
    setAttachments([]);
    setPromptHistory(prev => {
      const newHistory = [currentInput, ...prev.filter(p => p !== currentInput)].slice(0, 50);
      return newHistory;
    });
    setIsLoading(true);

    try {
      // Save user message
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'chats', sessionId, 'messages'), cleanForFirestore(userMessage));

      let aiResponseText = "";
      let groundingMetadata = null;

      if (engineMode === 'offline') {
        // Normalize endpoint
        let endpoint = localEndpoint.trim();
        if (!endpoint.endsWith('/v1') && !endpoint.includes('/api/')) {
          if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
          endpoint = `${endpoint}/v1`;
        }

        // Mixed Content Check
        if (window.location.protocol === 'https:' && endpoint.startsWith('http:')) {
          throw new Error("Security Block: This app is running over HTTPS and cannot connect to an insecure 'http' local IP. Please use an HTTPS tunnel (like ngrok) for your local server.");
        }

        try {
          const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              model: selectedModel.includes('flash') ? 'llama3' : 'mistral',
              messages: [
                { role: 'system', content: "You are a helpful assistant." },
                ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
                { role: 'user', content: currentInput }
              ],
              stream: false
            })
          });

          if (!response.ok) {
            // Try fallback for Ollama if /v1/chat/completions failed
            const ollamaEndpoint = localEndpoint.replace('/v1', '').replace(/\/$/, '');
            const ollamaResponse = await fetch(`${ollamaEndpoint}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: selectedModel.includes('flash') ? 'llama3' : 'mistral',
                messages: [
                  ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
                  { role: 'user', content: currentInput }
                ],
                stream: false
              })
            });

            if (!ollamaResponse.ok) throw new Error(`Local node returned ${ollamaResponse.status}`);
            const data = await ollamaResponse.json();
            aiResponseText = data.message.content;
          } else {
            const data = await response.json();
            aiResponseText = data.choices[0].message.content;
          }
        } catch (fetchErr) {
          console.error("Local fetch failed:", fetchErr);
          throw new Error("Local Neural Node unreachable. Ensure it is running and CORS is enabled.");
        }
      } else {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY is missing. Please configure it in the Settings menu.");
        }
        const ai = new GoogleGenAI({ apiKey });
        
        const currentParts: any[] = [{ text: currentInput }];
        currentAttachments.forEach(a => {
          currentParts.push({
            inlineData: {
              data: a.data,
              mimeType: a.type
            }
          });
        });

        // Build history for Gemini
        const contents = [
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          {
            role: 'user',
            parts: currentParts
          }
        ];

        const tools: any[] = [];
        if (useSearch) tools.push({ googleSearch: {} });
        if (useMaps) tools.push({ googleMaps: {} });
        if (useCodeExecution) tools.push({ codeExecution: {} });

        const persona = personas.find(p => p.id === selectedPersona);
        let systemInstruction = persona ? persona.systemInstruction : "You are a helpful AI assistant.";

        // RAG Context
        const allUrls = [...sessionUrls];
        if (selectedKB) {
          const kb = knowledgeBases.find(k => k.id === selectedKB);
          if (kb) allUrls.push(...kb.urls);
        }

        if (allUrls.length > 0) {
          const contextText = allUrls.map(url => `CONTENT FROM ${url}:\n${urlContents[url] || 'No content fetched yet.'}`).join('\n\n');
          systemInstruction += `\n\nUse the following URL content as context for your response:\n${contextText}`;
        }

        const result = await ai.models.generateContentStream({
          model: selectedModel,
          contents,
          config: {
            systemInstruction,
            tools: tools.length > 0 ? tools : undefined,
            thinkingConfig: useThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
          }
        });

        setIsThinking(true);
        let fullText = "";
        for await (const chunk of result) {
          setIsThinking(false);
          const chunkText = chunk.text;
          fullText += chunkText;
          setStreamingMessage(fullText);
          
          // If there's grounding metadata, we'll get it at the end or in chunks
          if (chunk.candidates?.[0]?.groundingMetadata) {
            groundingMetadata = chunk.candidates[0].groundingMetadata;
          }
        }
        
        aiResponseText = fullText || "I couldn't generate a response.";
        setStreamingMessage('');
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiResponseText,
        timestamp: new Date().toISOString(),
      };

      if (groundingMetadata) {
        // Firestore doesn't support undefined, so we clean the object
        aiMessage.groundingMetadata = JSON.parse(JSON.stringify(groundingMetadata));
      }

      await addDoc(collection(db, 'users', auth.currentUser.uid, 'chats', sessionId, 'messages'), cleanForFirestore(aiMessage));

      // Update session metadata
      const sessionRef = doc(db, 'users', auth.currentUser.uid, 'chats', sessionId);
      const updateData: any = {
        lastMessageAt: new Date().toISOString(),
      };
      
      // Update title if it's still the default
      const currentSession = sessions.find(s => s.id === sessionId);
      if (currentSession && (currentSession.title === 'New Conversation' || currentSession.title === 'New Command Stream')) {
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error("GEMINI_API_KEY missing");
          const ai = new GoogleGenAI({ apiKey });
          const titleResult = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a very short (max 5 words) title for a conversation that starts with: "${currentInput}". Return ONLY the title text.`
          });
          updateData.title = titleResult.text?.trim().replace(/^["']|["']$/g, '') || currentInput.slice(0, 40);
        } catch (e) {
          console.error("Failed to generate title", e);
          updateData.title = currentInput.slice(0, 40) || 'New Conversation';
        }
      }
      
      await updateDoc(sessionRef, cleanForFirestore(updateData));
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      
      if (errorMessage.includes("Local Neural Node unreachable")) {
        toast.error(errorMessage, {
          action: {
            label: "Switch to Cloud",
            onClick: () => onToggleMode()
          },
          duration: 10000
        });
      } else if (errorMessage.includes("Security Block")) {
        toast.error(errorMessage, {
          action: {
            label: "Troubleshoot",
            onClick: () => setActiveConsole('settings')
          },
          duration: 10000
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async (msgId: string, content: string, lang: string) => {
    setIsTranslating(msgId);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY missing");
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${lang}. Return ONLY the translated text:\n\n${content}`
      });
      const translated = result.text?.trim() || "Translation failed.";
      setTranslatedMessages(prev => ({ ...prev, [msgId]: translated }));
      toast.success(`Translated to ${lang}`);
    } catch (e) {
      console.error("Translation failed", e);
      toast.error("Translation failed");
    } finally {
      setIsTranslating(null);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      setInput(lastUserMsg.content);
      // Small delay to ensure state is updated if needed, though sendMessage uses closure or state
      setTimeout(() => sendMessage(), 100);
    }
  };

  const handleShare = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Nexus AI Response',
          text: text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch (e) {
      console.error("Share failed", e);
      // Fallback to clipboard
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  };

  const playTTS = async (text: string, msgId?: string) => {
    if (msgId) setIsSpeaking(msgId);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing. Please configure it in the Settings menu.");
      const ai = new GoogleGenAI({ apiKey });
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
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.onended = () => setIsSpeaking(null);
        audio.play();
      } else {
        setIsSpeaking(null);
      }
    } catch (err) {
      toast.error("TTS failed");
      setIsSpeaking(null);
    }
  };

  return (
    <div className="flex h-full bg-background relative selection:bg-primary/20 overflow-hidden">
      {/* Session Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full border-r border-border/50 bg-card/30 backdrop-blur-xl flex flex-col overflow-hidden z-40"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Neural Archives</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="h-8 w-8 rounded-none">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <Button 
                onClick={createNewSession}
                className="w-full h-10 rounded-none text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/10"
              >
                <Plus className="w-4 h-4" />
                New Command Stream
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveSessionId(session.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full text-left p-3 transition-all group relative overflow-hidden cursor-pointer outline-none",
                    activeSessionId === session.id 
                      ? "bg-primary/10 border-l-2 border-primary" 
                      : "hover:bg-secondary/50 border-l-2 border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-[10px] font-black truncate uppercase tracking-tighter",
                        activeSessionId === session.id ? "text-primary" : "text-foreground"
                      )}>
                        {session.title}
                      </p>
                      <p className="text-[8px] text-muted-foreground/50 font-mono mt-0.5">
                        {new Date(session.lastMessageAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-none opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        onClick={(e) => deleteSession(e, session.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <MessageSquare className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-colors",
                        activeSessionId === session.id ? "text-primary" : "text-muted-foreground/30 group-hover:text-muted-foreground"
                      )} />
                    </div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="py-12 text-center px-4">
                  <Activity className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">No active streams found</p>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-12 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 z-30">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="h-8 w-8 rounded-none">
                <Menu className="w-4 h-4" />
              </Button>
            )}
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[200px]">
                {sessions.find(s => s.id === activeSessionId)?.title || 'Neural Interface'}
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">Core_Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-none text-[8px] font-black uppercase tracking-widest border-border/50 bg-secondary/20">
              {engineMode === 'cloud' ? 'Cloud_Compute' : 'Edge_Compute'}
            </Badge>
            <Separator orientation="vertical" className="h-4 bg-border/50" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar relative">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-8">
            <div className="w-20 h-20 bg-primary/5 border border-primary/10 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Sparkles className="w-10 h-10 text-primary relative z-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Nexus Core Interface</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold">
                Neural network online. Awaiting data stream.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="px-3 py-1 rounded-none text-[9px] uppercase font-black tracking-widest border-border/50">Grounding</Badge>
              <Badge variant="outline" className="px-3 py-1 rounded-none text-[9px] uppercase font-black tracking-widest border-border/50">Multimodal</Badge>
              <Badge variant="outline" className="px-3 py-1 rounded-none text-[9px] uppercase font-black tracking-widest border-border/50">Reasoning</Badge>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHistory(true)}
              className="text-[9px] uppercase font-black tracking-[0.2em] text-muted-foreground hover:text-primary"
            >
              <MessageSquare className="w-3 h-3 mr-2" />
              Access Prompt Archives
            </Button>
          </div>
        )}
        
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex flex-col max-w-[90%] md:max-w-[80%] lg:max-w-[70%]",
              msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className={cn(
              "px-4 py-3 rounded-none text-sm shadow-sm relative group",
              msg.role === 'user' 
                ? "bg-primary text-primary-foreground" 
                : "bg-card border border-border/50 text-card-foreground"
            )}>
              {msg.role === 'model' && (
                <div className="absolute -left-1 top-0 bottom-0 w-1 bg-primary/30" />
              )}
              <div className="markdown-body prose prose-sm dark:prose-invert max-w-none font-medium leading-relaxed prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="relative group/code my-4">
                          <div className="absolute right-2 top-2 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="h-7 w-7 rounded-none bg-black/50 hover:bg-black"
                              onClick={() => {
                                navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                toast.success("Code copied");
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-none !bg-black/40 !m-0 border border-white/5"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className={cn("bg-primary/10 text-primary px-1 py-0.5 rounded-none font-mono text-[11px]", className)} {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-4 border border-border/50">
                          <table className="w-full text-xs border-collapse">{children}</table>
                        </div>
                      );
                    },
                    th({ children }) {
                      return <th className="border border-border/50 bg-secondary/30 p-2 text-left font-black uppercase tracking-tighter">{children}</th>;
                    },
                    td({ children }) {
                      return <td className="border border-border/50 p-2">{children}</td>;
                    }
                  }}
                >
                  {translatedMessages[msg.id] || msg.content}
                </ReactMarkdown>
                {translatedMessages[msg.id] && (
                  <div className="mt-2 pt-2 border-t border-border/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Languages className="w-3 h-3 text-primary" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-primary">Neural Translation Active</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 px-2 text-[8px] font-black uppercase tracking-widest hover:bg-primary/5"
                      onClick={() => {
                        setTranslatedMessages(prev => {
                          const next = { ...prev };
                          delete next[msg.id];
                          return next;
                        });
                      }}
                    >
                      Restore Original
                    </Button>
                  </div>
                )}
              </div>

              {msg.role === 'model' && (
                <div className="flex items-center gap-0.5 mt-3 pt-2 border-t border-border/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Translate */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none hover:bg-primary/5 text-muted-foreground hover:text-primary">
                        {isTranslating === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 rounded-none border-border/50 bg-card/95 backdrop-blur-xl z-[100]">
                      <div className="p-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/30">International</div>
                      {LANGUAGES.international.map(lang => (
                        <DropdownMenuItem key={lang.code} onClick={() => handleTranslate(msg.id, msg.content, lang.label)} className="text-[10px] uppercase font-bold rounded-none">
                          {lang.label}
                        </DropdownMenuItem>
                      ))}
                      <div className="p-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/30 border-t mt-1">Indian</div>
                      {LANGUAGES.indian.map(lang => (
                        <DropdownMenuItem key={lang.code} onClick={() => handleTranslate(msg.id, msg.content, lang.label)} className="text-[10px] uppercase font-bold rounded-none">
                          {lang.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Listen */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-7 w-7 rounded-none hover:bg-primary/5", isSpeaking === msg.id ? "text-primary" : "text-muted-foreground")}
                    onClick={() => playTTS(msg.content, msg.id)}
                  >
                    <Volume2 className={cn("w-3.5 h-3.5", isSpeaking === msg.id && "animate-pulse")} />
                  </Button>

                  {/* Regenerate (if last message) */}
                  {messages.indexOf(msg) === messages.length - 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-none hover:bg-primary/5 text-muted-foreground hover:text-primary"
                      onClick={handleRegenerate}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  {/* Citation / Source (if grounding exists) */}
                  {msg.groundingMetadata && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-none hover:bg-primary/5 text-muted-foreground hover:text-primary"
                        onClick={() => setShowSources(showSources === msg.id ? null : msg.id)}
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-none hover:bg-primary/5 text-muted-foreground hover:text-primary"
                        onClick={() => setShowSources(showSources === msg.id ? null : msg.id)}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}

                  {/* Share */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-none hover:bg-primary/5 text-muted-foreground hover:text-primary"
                    onClick={() => handleShare(msg.content)}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>

                  {/* Copy */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-none hover:bg-primary/5 text-muted-foreground hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              
              {msg.groundingMetadata?.groundingChunks && (
                <GroundingDisplay metadata={msg.groundingMetadata} forceExpand={showSources === msg.id} />
              )}
              
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {msg.attachments.map((att, i) => (
                    <Card key={i} className="overflow-hidden border border-border/50 bg-black/5 w-28 h-28 rounded-none group/att">
                      {att.type === 'image' ? (
                        <img src={att.url} className="w-full h-full object-cover transition-transform group-hover/att:scale-110" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                          <span className="text-[8px] font-black uppercase tracking-tighter truncate px-2 w-full text-center">{att.mimeType}</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                {msg.role === 'user' ? 'Client' : 'Nexus'}
              </span>
              <span className="text-[9px] text-muted-foreground/30">•</span>
              <span className="text-[9px] text-muted-foreground/50 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
        ))}
        {/* Streaming Message */}
        {streamingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col max-w-[90%] md:max-w-[80%] lg:max-w-[70%] mr-auto items-start mb-4"
          >
            <div className="px-4 py-3 rounded-none text-sm shadow-sm relative group bg-card border border-border/50 text-card-foreground">
              <div className="absolute -left-1 top-0 bottom-0 w-1 bg-primary/30" />
              <div className="markdown-body prose prose-sm dark:prose-invert max-w-none font-medium leading-relaxed prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match ? match[1] : ''}
                          PreTag="div"
                          className="rounded-none !bg-black/40 !m-0 border border-white/5"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={cn("bg-primary/10 text-primary px-1 py-0.5 rounded-none font-mono text-[11px]", className)} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {streamingMessage}
                </ReactMarkdown>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-none animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-primary">Neural Stream Active</span>
              </div>
            </div>
          </motion.div>
        )}

        {isThinking && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-none bg-primary/5 border border-primary/10 flex items-center justify-center animate-pulse">
              <BrainCircuit className="w-5 h-5 text-primary" />
            </div>
            <div className="bg-card border border-border/50 px-4 py-3 rounded-none shadow-sm space-y-2">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-none animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-none animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary rounded-none animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">Processing Neural Stream</p>
            </div>
          </div>
        )}
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-32 right-8 z-40"
            >
              <Button
                size="icon"
                className="rounded-none h-10 w-10 shadow-2xl shadow-primary/20 border border-primary/20 bg-background/80 backdrop-blur-md hover:bg-primary hover:text-primary-foreground transition-all"
                onClick={scrollToBottom}
              >
                <ChevronDown className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-background/50 backdrop-blur-xl border-t border-border/50">
        <AnimatePresence>
          {isContextOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-w-5xl mx-auto mb-4 overflow-hidden"
            >
              <Card className="rounded-none border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Neural Context Sources</h4>
                    <Button variant="ghost" size="icon" onClick={() => setIsContextOpen(false)} className="h-6 w-6 rounded-none">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input 
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                        placeholder="Enter source URL (https://...)"
                        className="w-full bg-secondary/20 border border-border/50 rounded-none pl-9 pr-4 py-2 text-[10px] uppercase font-bold tracking-widest focus:outline-none focus:border-primary/30"
                      />
                    </div>
                    <Button 
                      onClick={handleAddUrl} 
                      disabled={fetchingUrls.length > 0 || !urlInput}
                      className="rounded-none h-9 px-4 text-[10px] font-black uppercase tracking-widest"
                    >
                      {fetchingUrls.length > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                      Inject
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sessionUrls.map((url, i) => {
                      const isFetching = fetchingUrls.includes(url);
                      const isFailed = failedUrls.includes(url);
                      const isSuccess = !!urlContents[url];

                      return (
                        <div key={i} className={cn(
                          "flex items-center justify-between p-2 border transition-all group relative overflow-hidden",
                          isFailed ? "bg-destructive/10 border-destructive/30" : 
                          isSuccess ? "bg-green-500/10 border-green-500/30" : 
                          "bg-secondary/10 border-border/50",
                          isFetching && "animate-pulse"
                        )}>
                          {isFetching && (
                            <motion.div 
                              className="absolute inset-0 bg-primary/5"
                              animate={{ opacity: [0.2, 0.5, 0.2] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          )}
                          <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
                            <div className="flex items-center justify-center w-5 h-5 shrink-0">
                              {isFetching ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              ) : isFailed ? (
                                <div className="w-2.5 h-2.5 bg-destructive rounded-none shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                              ) : isSuccess ? (
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-none shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                              ) : (
                                <div className="w-2 h-2 bg-muted rounded-none shrink-0" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn(
                                "text-[10px] font-black truncate uppercase tracking-tighter",
                                isFailed ? "text-destructive" : isSuccess ? "text-green-600" : ""
                              )}>
                                {url}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn(
                                  "text-[7px] font-black uppercase tracking-widest px-1 py-0.5",
                                  isFetching ? "bg-primary/20 text-primary" :
                                  isFailed ? "bg-destructive/20 text-destructive" :
                                  isSuccess ? "bg-green-500/20 text-green-600" :
                                  "bg-muted text-muted-foreground"
                                )}>
                                  {isFetching ? "Fetching" : isFailed ? "Failed" : isSuccess ? "Active" : "Pending"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 relative z-10">
                            {isFailed && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => fetchUrlContent(url)}
                                className="h-7 w-7 rounded-none hover:bg-destructive/10"
                                title="Retry fetch"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setSessionUrls(prev => prev.filter(u => u !== url));
                                setFailedUrls(prev => prev.filter(u => u !== url));
                                setFetchingUrls(prev => prev.filter(u => u !== url));
                              }}
                              className="h-7 w-7 rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {sessionUrls.length === 0 && (
                      <div className="col-span-full py-4 text-center border border-dashed border-border/50">
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">No external data injected</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-w-5xl mx-auto mb-4 overflow-hidden"
            >
              <Card className="rounded-none border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Neural Command History</h4>
                    <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="h-6 w-6 rounded-none">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input 
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search archives..."
                      className="w-full bg-secondary/20 border border-border/50 rounded-none pl-9 pr-4 py-2 text-[10px] uppercase font-bold tracking-widest focus:outline-none focus:border-primary/30"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {promptHistory
                      .filter(p => p.toLowerCase().includes(historySearch.toLowerCase()))
                      .map((prompt, i) => (
                        <div 
                          key={i}
                          className="group flex items-center justify-between p-2 bg-secondary/10 border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer"
                          onClick={() => {
                            setInput(prompt);
                            setShowHistory(false);
                          }}
                        >
                          <p className="text-[10px] font-medium truncate flex-1 pr-4">{prompt}</p>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInput(prompt);
                                sendMessage();
                                setShowHistory(false);
                              }}
                            >
                              <Send className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-none text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPromptHistory(prev => prev.filter((_, idx) => idx !== i));
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    {promptHistory.length === 0 && (
                      <div className="col-span-full py-8 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">No archives found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-5xl mx-auto space-y-4">
          {/* Quick Tools - Mission Control Style */}
          <div className="relative border border-border/30 bg-secondary/5 backdrop-blur-md overflow-hidden transition-all duration-500">
            {/* Header / Toggle */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-secondary/10">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">System Control Panel</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className="h-5 w-5 rounded-none hover:bg-primary/5"
              >
                <motion.div animate={{ rotate: isToolsOpen ? 0 : 180 }}>
                  <ChevronDown className="w-3 h-3" />
                </motion.div>
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {isToolsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30">
                    {/* Top Section: Primary Tools */}
                    <div className="p-2 flex items-center justify-center gap-1 flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap">
                      {[
                        { id: 'search', icon: Search, active: useSearch, setter: setUseSearch, label: 'Search', color: 'text-blue-500' },
                        { id: 'maps', icon: MapPin, active: useMaps, setter: setUseMaps, label: 'Maps', color: 'text-green-500' },
                        { id: 'code', icon: Terminal, active: useCodeExecution, setter: setUseCodeExecution, label: 'Code', color: 'text-purple-500' },
                        { id: 'think', icon: BrainCircuit, active: useThinking, setter: setUseThinking, label: 'Think', color: 'text-primary' },
                        { id: 'context', icon: Globe, active: isContextOpen, setter: setIsContextOpen, label: 'Context', color: 'text-cyan-500' },
                      ].map((tool) => {
                        const ToolIcon = tool.icon;
                        return (
                          <Button 
                            key={tool.id}
                            variant="ghost" 
                            size="sm" 
                            onClick={() => tool.setter(!tool.active)}
                            className={cn(
                              "rounded-none h-9 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 transition-all relative group flex-1 min-w-0 sm:min-w-[80px]",
                              tool.active ? "bg-primary/5 " + tool.color : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                            )}
                          >
                            <ToolIcon className={cn("w-4 h-4 transition-transform group-hover:scale-110", tool.active && "animate-pulse")} />
                            <span className="text-[8px] uppercase font-black tracking-widest hidden sm:inline">{tool.label}</span>
                            {tool.active && (
                              <motion.div 
                                layoutId={`active-led-${tool.id}`}
                                className={cn("absolute bottom-0 left-0 right-0 h-0.5", tool.color.replace('text-', 'bg-'))}
                              />
                            )}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Bottom Section: System Nodes */}
                    <div className="p-2 flex items-center justify-center gap-1 flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap bg-secondary/5">
                      {/* Engine Toggle */}
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={onToggleMode}
                        className={cn(
                          "rounded-none h-9 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 transition-all group flex-1 min-w-0 sm:min-w-[100px]",
                          engineMode === 'offline' ? "text-amber-500 bg-amber-500/5" : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          engineMode === 'cloud' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                        )} />
                        {engineMode === 'cloud' ? <Globe className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
                        <span className="text-[8px] uppercase font-black tracking-widest hidden sm:inline">
                          {engineMode === 'cloud' ? 'Cloud Node' : 'Neural Node'}
                        </span>
                      </Button>

                      {/* History Toggle */}
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn(
                          "rounded-none h-9 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 transition-all group flex-1 min-w-0 sm:min-w-[80px]",
                          showHistory ? "text-orange-500 bg-orange-500/5" : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                        )}
                      >
                        <HistoryIcon className="w-3.5 h-3.5" />
                        <span className="text-[8px] uppercase font-black tracking-widest hidden sm:inline">Archives</span>
                      </Button>

                      {/* Model Selector */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-none h-9 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 flex-1 min-w-0 sm:min-w-[80px]"
                          >
                            <Zap className={cn("w-3.5 h-3.5 transition-all", selectedModel.includes('flash') ? "text-yellow-500 fill-yellow-500/20" : "")} />
                            <span className="text-[8px] uppercase font-black tracking-widest hidden sm:inline">
                              {selectedModel.includes('flash') ? 'Flash' : 'Pro'}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-none border-border/50 bg-card/95 backdrop-blur-xl">
                          <DropdownMenuItem onClick={() => setSelectedModel('gemini-3-flash-preview')} className="text-[10px] uppercase font-black tracking-widest p-3 focus:bg-primary focus:text-primary-foreground">Flash 3.0</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedModel('gemini-3.1-pro-preview')} className="text-[10px] uppercase font-black tracking-widest p-3 focus:bg-primary focus:text-primary-foreground">Pro 3.1</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="relative group">
                  <img src={att.preview} className="w-12 h-12 rounded-xl object-cover border shadow-sm" />
                  <button 
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative group">
            {/* Smart Mode Indicators */}
            <div className="absolute -top-2.5 left-4 flex gap-1 z-10">
              {useSearch && <div className="px-1.5 py-0.5 bg-blue-500 text-white text-[6px] font-black uppercase tracking-widest shadow-lg">Search Active</div>}
              {useThinking && <div className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[6px] font-black uppercase tracking-widest shadow-lg">Neural Logic</div>}
              {useCodeExecution && <div className="px-1.5 py-0.5 bg-purple-500 text-white text-[6px] font-black uppercase tracking-widest shadow-lg">Sandbox Ready</div>}
            </div>

            <div className={cn(
              "relative flex items-end gap-3 bg-secondary/10 rounded-none p-2 pl-4 border border-border/30 transition-all duration-500",
              "focus-within:border-primary/50 focus-within:bg-card/80 focus-within:shadow-[0_0_30px_rgba(var(--primary),0.05)]",
              "hover:border-border/60"
            )}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-muted-foreground hover:text-primary transition-all rounded-none hover:bg-primary/5 mb-1 group/btn"
              >
                <Paperclip className="w-5 h-5 transition-transform group-hover/btn:-rotate-12" />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Enter neural command..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 resize-none max-h-60 min-h-[44px] outline-none font-medium placeholder:text-muted-foreground/30"
                rows={1}
              />

              <div className="flex items-center gap-1.5 mb-1 pr-1">
                <button 
                  onClick={toggleRecording}
                  className={cn(
                    "p-2 rounded-none transition-all relative overflow-hidden",
                    isRecording ? "text-destructive" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                >
                  <Mic className={cn("w-5 h-5 relative z-10", isRecording && "animate-pulse")} />
                  {isRecording && (
                    <motion.div 
                      layoutId="recording-bg"
                      className="absolute inset-0 bg-destructive/10"
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </button>

                <Button 
                  onClick={sendMessage}
                  disabled={isLoading || (!input.trim() && attachments.length === 0)}
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-none transition-all duration-500",
                    input.trim() || attachments.length > 0 
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]" 
                      : "bg-secondary/30 text-muted-foreground"
                  )}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={cn("w-4 h-4 transition-all", input.trim() && "translate-x-0.5 -translate-y-0.5 rotate-12")} />}
                </Button>
              </div>
            </div>
            
            {/* Bottom Status Bar */}
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Neural Link Stable</span>
                </div>
                <Separator orientation="vertical" className="h-2 bg-border/30" />
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Latency: 24ms</span>
              </div>
              <div className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                Nexus OS v4.2.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

function GroundingDisplay({ metadata, forceExpand }: { metadata: any, forceExpand?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const chunks = metadata.groundingChunks || [];

  useEffect(() => {
    if (forceExpand) setIsExpanded(true);
  }, [forceExpand]);

  const webLinks = chunks.filter((c: any) => c.web).map((c: any) => c.web);
  const mapLinks = chunks.filter((c: any) => c.maps).map((c: any) => c.maps);

  if (webLinks.length === 0 && mapLinks.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline transition-all"
      >
        <Globe className="w-3.5 h-3.5" /> 
        <span>Sources ({webLinks.length + mapLinks.length})</span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="ml-auto text-muted-foreground"
        >
          <Menu className="w-3 h-3" />
        </motion.span>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-1"
          >
            {webLinks.length > 0 && (
              <div className="grid grid-cols-1 gap-1">
                {webLinks.map((link: any, i: number) => (
                  <a 
                    key={i} 
                    href={link.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-secondary/30 rounded-none hover:bg-secondary/50 transition-all border border-transparent hover:border-border"
                  >
                    <div className="w-6 h-6 bg-background rounded-none flex items-center justify-center shrink-0 shadow-sm">
                      <Globe className="w-3 h-3 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate uppercase tracking-tighter">
                        {link.title || 'Source'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">
                        {new URL(link.uri).hostname}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
            {mapLinks.length > 0 && (
              <div className="grid grid-cols-1 gap-1">
                {mapLinks.map((link: any, i: number) => (
                  <a 
                    key={i} 
                    href={link.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-secondary/30 rounded-none hover:bg-secondary/50 transition-all border border-transparent hover:border-border"
                  >
                    <div className="w-6 h-6 bg-background rounded-none flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin className="w-3 h-3 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate uppercase tracking-tighter">
                        {link.title || 'Location'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">
                        Google Maps
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

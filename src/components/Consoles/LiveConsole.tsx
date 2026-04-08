import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  BrainCircuit, 
  Sparkles, 
  Loader2,
  Activity,
  Zap,
  FileText,
  Power,
  Waves,
  History,
  Settings2
} from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

export function LiveConsole() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const startSession = async () => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing. Please configure it in the Settings menu.");
      const ai = new GoogleGenAI({ apiKey });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            startAudioCapture();
            toast.success("Live session connected");
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const binaryString = atob(base64Audio);
              const bytes = new Int16Array(binaryString.length / 2);
              for (let i = 0; i < bytes.length; i++) {
                bytes[i] = (binaryString.charCodeAt(i * 2) & 0xFF) | (binaryString.charCodeAt(i * 2 + 1) << 8);
              }
              audioQueueRef.current.push(bytes);
              if (!isPlayingRef.current) playNextChunk();
            }

            if (message.serverContent?.modelTurn?.parts[0]?.text) {
              setTranscript(prev => [...prev, { role: 'model', text: message.serverContent!.modelTurn!.parts[0].text! }]);
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopAudioCapture();
            toast.info("Live session closed");
          },
          onerror: (err) => {
            console.error(err);
            toast.error("Live session error");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful, real-time AI assistant. Keep responses concise and natural.",
        },
      });

      sessionRef.current = session;
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to Live API");
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsConnected(false);
    stopAudioCapture();
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (isMuted) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate audio level for visualization
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        setAudioLevel(Math.sqrt(sum / inputData.length));

        // Convert to PCM 16-bit
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }

        // Send to Gemini
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        if (sessionRef.current) {
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      toast.error("Microphone access denied");
    }
  };

  const stopAudioCapture = () => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
  };

  const playNextChunk = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    
    if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    
    const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < chunk.length; i++) {
      channelData[i] = chunk[i] / 0x7FFF;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = playNextChunk;
    source.start();
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full p-4 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Live Voice</h1>
            <p className="text-muted-foreground">Real-time conversational AI with ultra-low latency.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="rounded-none px-3 py-1 gap-2 text-[10px] font-bold uppercase tracking-widest">
              <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-white animate-pulse" : "bg-muted-foreground")} />
              {isConnected ? "Live" : "Offline"}
            </Badge>
            <Button variant="outline" size="icon" className="rounded-none h-8 w-8">
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Interaction Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-none border-none shadow-xl shadow-primary/5 bg-secondary/20 overflow-hidden min-h-[400px] flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.05)_0%,transparent_70%)]" />
              
              {/* Visualizer */}
              <div className="relative z-10 flex flex-col items-center gap-8">
                <div className="relative flex items-center justify-center">
                  <AnimatePresence>
                    {isConnected && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1 + audioLevel * 2, opacity: 1 }}
                        className="absolute w-48 h-48 bg-primary/10 rounded-none blur-3xl"
                      />
                    )}
                  </AnimatePresence>
                  
                  <div className={cn(
                    "w-48 h-48 rounded-none border-2 flex items-center justify-center transition-all duration-700 relative overflow-hidden",
                    isConnected ? "border-primary bg-primary/5 shadow-[0_0_50px_rgba(var(--primary),0.2)]" : "border-muted bg-muted/20"
                  )}>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5">
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [8, 30 + Math.random() * 60, 8] }}
                            transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }}
                            className="w-1.5 bg-primary rounded-none"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <MicOff className="w-12 h-12" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Standby</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-widest">
                    {isConnected ? "Listening" : "Ready"}
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    {isConnected ? "Neural link active" : "Initialize conversation"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="icon"
                    className="w-12 h-12 rounded-none shadow-lg"
                    onClick={() => setIsMuted(!isMuted)}
                    disabled={!isConnected}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>

                  <Button
                    size="lg"
                    className={cn(
                      "h-16 px-10 rounded-none text-xs font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95",
                      isConnected ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
                    )}
                    onClick={isConnected ? stopSession : startSession}
                  >
                    {isConnected ? (
                      <div className="flex items-center gap-2">
                        <Power className="w-5 h-5" />
                        End
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Start
                      </div>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="w-12 h-12 rounded-none shadow-lg"
                  >
                    <BrainCircuit className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Transcript Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="rounded-none border-none bg-secondary/30 shadow-none h-full flex flex-col">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Transcript
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="rounded-none h-7 w-7">
                    <History className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <CardDescription className="text-[10px] uppercase tracking-tighter">Live conversation log</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[300px] lg:h-[400px] px-4">
                  <div className="space-y-2 py-4">
                    {transcript.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center opacity-20">
                        <Activity className="w-8 h-8 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Input</p>
                      </div>
                    )}
                    {transcript.map((t, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-3 rounded-none text-xs leading-relaxed",
                          t.role === 'user' 
                            ? "bg-background border border-border text-muted-foreground" 
                            : "bg-primary/10 border border-primary/20 text-foreground font-medium"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1 opacity-50">
                          <span className="text-[8px] font-black uppercase tracking-wider">{t.role}</span>
                        </div>
                        {t.text}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

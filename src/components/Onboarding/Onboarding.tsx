import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Cpu, Globe, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { toast } from 'sonner';

interface OnboardingProps {
  onComplete: (config: { mode: 'cloud' | 'offline'; endpoint?: string }) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'cloud' | 'offline'>('cloud');
  const [endpoint, setEndpoint] = useState('http://localhost:11434/v1');
  const [isTesting, setIsTesting] = useState(false);

  const handleModeSelect = (selectedMode: 'cloud' | 'offline') => {
    setMode(selectedMode);
    if (selectedMode === 'cloud') {
      onComplete({ mode: 'cloud' });
    } else {
      setStep(1);
    }
  };

  const testEndpoint = async () => {
    setIsTesting(true);
    try {
      // Simple health check for Ollama/LM Studio
      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        toast.success("Local node connected successfully!");
        onComplete({ mode: 'offline', endpoint });
      } else {
        throw new Error("Node returned an error");
      }
    } catch (err) {
      toast.error("Could not connect to local node. Ensure it's running and CORS is enabled.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4 selection:bg-primary/20">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl font-black uppercase tracking-tighter">Select Neural Node</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold">
                Choose your primary intelligence engine
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className={`rounded-none border-2 transition-all cursor-pointer group hover:border-primary/50 ${mode === 'cloud' ? 'border-primary bg-primary/5 shadow-[0_0_30px_-12px_rgba(var(--primary),0.3)]' : 'border-border bg-card/30'}`}
                onClick={() => handleModeSelect('cloud')}
              >
                <CardHeader className="space-y-4">
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Cloud Engine</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                      Powered by Gemini 3.1
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    High-performance, multi-modal reasoning with real-time web grounding and massive context windows.
                  </p>
                  <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-primary">
                    <Check className="w-3 h-3" />
                    <span>Always Available</span>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`rounded-none border-2 transition-all cursor-pointer group hover:border-primary/50 ${mode === 'offline' ? 'border-primary bg-primary/5 shadow-[0_0_30px_-12px_rgba(var(--primary),0.3)]' : 'border-border bg-card/30'}`}
                onClick={() => handleModeSelect('offline')}
              >
                <CardHeader className="space-y-4">
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                    <Cpu className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Offline Node</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                      Local LLM Integration
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect to your local Ollama, LM Studio, or LocalAI instances. Maximum privacy and zero latency.
                  </p>
                  <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-primary">
                    <Check className="w-3 h-3" />
                    <span>100% Private</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md"
          >
            <Card className="rounded-none border-2 border-primary bg-card/30 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)]">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="text-[10px] uppercase font-black tracking-widest">Back</Button>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black uppercase tracking-tighter">Configure Node</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold tracking-widest">
                    Enter your local API endpoint
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Server Endpoint</label>
                  <Input 
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="rounded-none border-border/50 bg-background/50 font-mono text-xs h-12"
                  />
                  <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">
                    Default: Ollama (11434), LM Studio (1234)
                  </p>
                </div>

                <Button 
                  onClick={testEndpoint}
                  disabled={isTesting}
                  className="w-full h-12 rounded-none uppercase font-black tracking-widest shadow-xl shadow-primary/20"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Initialize Connection
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

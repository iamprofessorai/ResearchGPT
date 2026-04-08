import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Zap, Cpu } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 2500),
      setTimeout(() => setStep(3), 4000),
      setTimeout(() => onFinish(), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden selection:bg-primary/20">
      {/* Background Grid Animation */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="relative"
          >
            <div className="w-24 h-24 bg-primary flex items-center justify-center shadow-[0_0_50px_-12px_rgba(var(--primary),0.5)]">
              <Shield className="w-12 h-12 text-primary-foreground" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 border border-primary/20 border-dashed rounded-none"
            />
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-3">
              <Zap className="w-6 h-6 text-primary animate-pulse" />
              <h1 className="text-4xl font-black uppercase tracking-tighter">Nexus OS</h1>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.5em] font-bold animate-pulse">
              Initializing Neural Core
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center space-y-6"
          >
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-none border border-border flex items-center justify-center bg-secondary/30">
                  <Cpu className="w-6 h-6 text-primary" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest">Local</span>
              </div>
              <div className="w-12 h-[1px] bg-border relative">
                <motion.div
                  animate={{ left: ['0%', '100%'] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full blur-sm"
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-none border border-border flex items-center justify-center bg-secondary/30">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest">Cloud</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold">
              Synchronizing Hybrid Nodes
            </p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-64 h-1 bg-secondary overflow-hidden relative">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Ready</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Elements */}
      <div className="absolute bottom-10 left-10 text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest">
        Nexus Command v3.1 // Build 2026.03.30
      </div>
      <div className="absolute top-10 right-10 text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest">
        Neural Interface Status: Nominal
      </div>
    </div>
  );
}

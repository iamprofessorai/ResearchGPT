import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, onSnapshot, collection } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ChatConsole } from './components/Consoles/ChatConsole';
import { MediaConsole } from './components/Consoles/MediaConsole';
import { LiveConsole } from './components/Consoles/LiveConsole';
import { AdminConsole } from './components/Consoles/AdminConsole';
import { SettingsConsole } from './components/Consoles/SettingsConsole';
import { SplashScreen } from './components/Onboarding/SplashScreen';
import { Onboarding } from './components/Onboarding/Onboarding';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  MessageSquare, 
  Image as ImageIcon, 
  Mic, 
  Shield, 
  Settings, 
  LogOut,
  Menu,
  User,
  Bell,
  Search,
  Plus,
  Moon,
  Sun,
  Cpu,
  Globe
} from 'lucide-react';
import { UserProfile } from './types';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Separator } from './components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, loading] = useAuthState(auth);
  const [activeConsole, setActiveConsole] = useState('chat');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem('onboarding_complete') === 'true';
  });
  const [engineMode, setEngineMode] = useState<'cloud' | 'offline'>(() => {
    return (localStorage.getItem('engine_mode') as 'cloud' | 'offline') || 'cloud';
  });
  const [localEndpoint, setLocalEndpoint] = useState(() => {
    return localStorage.getItem('local_endpoint') || 'http://localhost:11434/v1';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setFirebaseError(null);
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          const msg = "Firebase connection failed. Please check your configuration and ensure the database is provisioned.";
          console.error(msg);
          setFirebaseError(msg);
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const path = `users/${user.uid}`;
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || '',
              role: user.email === 'vapionline123@gmail.com' ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
            };
            await setDoc(docRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      };
      fetchProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleOnboardingComplete = (config: { mode: 'cloud' | 'offline'; endpoint?: string }) => {
    setEngineMode(config.mode);
    if (config.endpoint) setLocalEndpoint(config.endpoint);
    localStorage.setItem('engine_mode', config.mode);
    if (config.endpoint) localStorage.setItem('local_endpoint', config.endpoint);
    localStorage.setItem('onboarding_complete', 'true');
    setOnboardingComplete(true);
  };

  if (firebaseError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive font-black uppercase tracking-tighter">System Error</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest">Firebase Configuration Failure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {firebaseError}
            </p>
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-none font-mono text-[10px] break-all">
              Check firebase-applet-config.json and ensure your Firestore database is active.
            </div>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full rounded-none uppercase text-[10px] font-black tracking-widest"
            >
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4"
        />
        <p className="text-muted-foreground font-medium animate-pulse">Loading Nexus...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="m3-card overflow-hidden border-none shadow-none bg-card/30 backdrop-blur-xl border border-border/50">
            <div className="h-24 bg-primary flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:20px_20px] opacity-10" />
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-none flex items-center justify-center border border-white/20 relative z-10">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardHeader className="text-center pt-6">
              <CardTitle className="text-2xl font-black tracking-tighter uppercase">Nexus AI</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Intelligent Orchestration Platform
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-4">
              <Button 
                onClick={handleLogin}
                className="w-full h-12 text-xs font-black rounded-none shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all uppercase tracking-widest"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign in with Google
              </Button>
              <p className="text-center text-[8px] text-muted-foreground uppercase tracking-widest font-bold">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const navItems = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'media', icon: ImageIcon, label: 'Media' },
    { id: 'live', icon: Mic, label: 'Live' },
    { id: 'admin', icon: Shield, label: 'Admin' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden font-sans selection:bg-primary/20">
      {/* Navigation Rail (Desktop/Tablet) */}
      <aside className="hidden md:flex w-16 lg:w-64 flex-col border-r bg-card/30 backdrop-blur-xl transition-all duration-300 group/nav">
        <div className="h-12 flex items-center px-4 border-b">
          <div className="w-8 h-8 bg-primary flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="ml-3 text-sm font-black tracking-tighter uppercase hidden lg:block overflow-hidden whitespace-nowrap">Nexus AI</span>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col items-center lg:items-stretch px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveConsole(item.id)}
              className={cn(
                "w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 transition-all duration-200 group text-[10px] uppercase font-bold tracking-widest relative",
                activeConsole === item.id 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", activeConsole === item.id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="hidden lg:block overflow-hidden whitespace-nowrap">{item.label}</span>
              {activeConsole === item.id && (
                <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-full bg-primary-foreground/50 lg:hidden" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-2 mt-auto border-t">
          <div className="flex flex-col items-center lg:items-stretch gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-full lg:w-auto lg:justify-start lg:px-3 rounded-none h-10 gap-3"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden lg:block text-[10px] font-bold uppercase">Theme</span>
            </Button>
            <Separator className="bg-border/50 hidden lg:block" />
            <div className="flex items-center gap-3 p-1 lg:p-2">
              <Avatar className="h-8 w-8 rounded-none border border-border/50 shrink-0">
                <AvatarImage src={userProfile?.photoURL} />
                <AvatarFallback className="rounded-none">{userProfile?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block flex-1 min-w-0">
                <p className="text-[10px] font-black truncate uppercase tracking-tighter">{userProfile?.displayName}</p>
                <p className="text-[8px] text-muted-foreground truncate">{userProfile?.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden lg:flex h-8 w-8 rounded-none hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top App Bar */}
        <header className="h-12 border-b bg-background/50 backdrop-blur-md flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {navItems.find(i => i.id === activeConsole)?.label} Studio
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-secondary/30 border border-border/50">
              {engineMode === 'cloud' ? (
                <Globe className="w-3 h-3 text-primary" />
              ) : (
                <Cpu className="w-3 h-3 text-primary" />
              )}
              <span className="text-[8px] font-black uppercase tracking-widest">
                {engineMode === 'cloud' ? 'Cloud' : 'Offline'}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-border/50 hidden sm:block" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-none h-8 w-8">
                <Search className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-none h-8 w-8">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeConsole}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full w-full"
            >
              {activeConsole === 'chat' && (
                <ChatConsole 
                  userProfile={userProfile} 
                  engineMode={engineMode} 
                  localEndpoint={localEndpoint}
                  setActiveConsole={setActiveConsole}
                  onToggleMode={() => {
                    const newMode = engineMode === 'cloud' ? 'offline' : 'cloud';
                    setEngineMode(newMode);
                    localStorage.setItem('engine_mode', newMode);
                  }}
                />
              )}
              {activeConsole === 'media' && <MediaConsole />}
              {activeConsole === 'live' && <LiveConsole />}
              {activeConsole === 'admin' && <AdminConsole userProfile={userProfile} />}
              {activeConsole === 'settings' && (
                <SettingsConsole 
                  engineMode={engineMode}
                  localEndpoint={localEndpoint}
                  onToggleMode={() => {
                    const newMode = engineMode === 'cloud' ? 'offline' : 'cloud';
                    setEngineMode(newMode);
                    localStorage.setItem('engine_mode', newMode);
                  }}
                  onUpdateEndpoint={(url) => {
                    setLocalEndpoint(url);
                    localStorage.setItem('local_endpoint', url);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden h-14 border-t bg-card/80 backdrop-blur-xl flex items-center justify-around px-2 pb-safe">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveConsole(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300 relative",
                activeConsole === item.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeConsole === item.id ? "fill-primary/10" : "")} />
              <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
              {activeConsole === item.id && (
                <motion.div 
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </nav>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}

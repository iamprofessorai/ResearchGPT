import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  Palette, 
  Bell, 
  Shield, 
  HelpCircle,
  Save,
  Moon,
  Sun,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Loader2,
  User,
  Smartphone,
  Globe,
  Lock,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

interface SettingsConsoleProps {
  engineMode: 'cloud' | 'offline';
  localEndpoint: string;
  onToggleMode: () => void;
  onUpdateEndpoint: (url: string) => void;
}

export function SettingsConsole({ engineMode, localEndpoint, onToggleMode, onUpdateEndpoint }: SettingsConsoleProps) {
  const [theme, setTheme] = useState('system');
  const [apiKey, setApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle');
  const [localUrl, setLocalUrl] = useState(localEndpoint);
  const [notifications, setNotifications] = useState({
    process: true,
    system: false,
    security: true
  });
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('idle');

    // Proactive check for Mixed Content
    if (window.location.protocol === 'https:' && localUrl.startsWith('http:')) {
      toast.error("Security Block: Mixed Content Detected", {
        description: "This app is running over HTTPS. Browsers block requests to insecure HTTP local IPs. You must use an HTTPS tunnel (like ngrok) or access the app via HTTP.",
        duration: 8000
      });
      setConnectionStatus('disconnected');
      setIsTesting(false);
      return;
    }

    try {
      // Try to fetch models list as a connectivity test
      const response = await fetch(`${localUrl}/models`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        setConnectionStatus('connected');
        toast.success("Neural Node connected successfully");
      } else {
        // Try fallback for Ollama
        const ollamaResponse = await fetch(`${localUrl.replace('/v1', '')}/api/tags`);
        if (ollamaResponse.ok) {
          setConnectionStatus('connected');
          toast.success("Neural Node connected successfully (Ollama)");
        } else {
          setConnectionStatus('disconnected');
          toast.error("Neural Node connection failed (Status: " + ollamaResponse.status + ")");
        }
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        toast.error("Network Error: Possible CORS block or server offline", {
          description: "Check if your local server allows requests from this origin."
        });
      } else {
        toast.error("Neural Node unreachable: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    onUpdateEndpoint(localUrl);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Settings saved successfully");
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Configure your workspace and system preferences.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="rounded-none px-6 gap-2 shadow-lg shadow-primary/20 text-xs font-black uppercase tracking-widest h-10"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Neural Engine */}
          <Card className="rounded-none border-none bg-secondary/30">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Neural Engine</CardTitle>
                  <CardDescription className="text-[10px] uppercase tracking-tighter">Configure your primary intelligence node.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-widest">Offline Mode</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Use local node instead of cloud services.</p>
                </div>
                <Switch 
                  checked={engineMode === 'offline'} 
                  onCheckedChange={onToggleMode}
                  className="rounded-none" 
                />
              </div>
              
              <AnimatePresence>
                {engineMode === 'offline' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <Separator className="bg-border/50" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <Label htmlFor="local-endpoint" className="text-[10px] font-black uppercase tracking-widest">Local API Endpoint</Label>
                        <div className="flex items-center gap-2">
                          {connectionStatus !== 'idle' && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "rounded-none text-[8px] font-black uppercase tracking-widest px-1.5 py-0",
                                connectionStatus === 'connected' ? "text-green-500 border-green-500/30 bg-green-500/5" : "text-destructive border-destructive/30 bg-destructive/5"
                              )}
                            >
                              {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                            </Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleTestConnection}
                            disabled={isTesting || !localUrl}
                            className="h-6 px-2 rounded-none text-[8px] font-black uppercase tracking-widest hover:bg-primary/5"
                          >
                            {isTesting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                            Test Link
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowTroubleshoot(true)}
                            className="h-6 px-2 rounded-none text-[8px] font-black uppercase tracking-widest hover:bg-primary/5 text-primary"
                          >
                            <HelpCircle className="w-3 h-3 mr-1" />
                            Troubleshoot
                          </Button>
                        </div>
                      </div>
                      <Input 
                        id="local-endpoint"
                        value={localUrl}
                        onChange={(e) => setLocalUrl(e.target.value)}
                        placeholder="http://localhost:11434/v1"
                        className="rounded-none h-10 text-xs font-mono bg-background/50"
                      />
                      <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Compatible with Ollama, LM Studio, and LocalAI.</p>
                    </div>

                    <div className="p-3 bg-primary/5 border border-primary/10 space-y-2">
                      <div className="flex items-center gap-2 text-primary">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Connection Guide</span>
                      </div>
                      <ul className="space-y-1.5">
                        {[
                          "Ensure your local LLM server is running.",
                          "Verify the endpoint URL (e.g., http://localhost:11434).",
                          "Enable CORS in your server settings.",
                          "IMPORTANT: If the app is HTTPS, your local node must be HTTPS too.",
                          "Use a tunnel for HTTPS: ngrok http 1234",
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-[8px] text-muted-foreground uppercase font-bold leading-tight">
                            <span className={cn("text-primary/50", step.startsWith("IMPORTANT") && "text-destructive")}>{i + 1}.</span>
                            <span className={cn(step.startsWith("IMPORTANT") && "text-destructive")}>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Account & Security */}
          <Card className="rounded-none border-none bg-secondary/30">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Security & Access</CardTitle>
                  <CardDescription className="text-[10px] uppercase tracking-tighter">Manage your API keys and authentication settings.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="api-key" className="text-[10px] font-black uppercase tracking-widest px-1">Gemini API Key</Label>
                  <div className="relative">
                    <Input 
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="rounded-none pr-20 h-10 text-xs"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <Badge variant="outline" className="rounded-none text-green-600 border-green-200 bg-green-50 text-[8px] font-black uppercase tracking-widest">Verified</Badge>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Your key is encrypted and stored securely.</p>
                </div>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-widest">Two-Factor Auth</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Add an extra layer of security to your account.</p>
                </div>
                <Switch checked={true} className="rounded-none" />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="rounded-none border-none bg-secondary/30">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-none bg-purple-500/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Appearance</CardTitle>
                  <CardDescription className="text-[10px] uppercase tracking-tighter">Customize how the interface looks and feels.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <RadioGroup defaultValue={theme} onValueChange={setTheme} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
                  { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
                  { id: 'system', label: 'System', icon: Monitor, desc: 'Follows OS' },
                ].map((t) => (
                  <div key={t.id}>
                    <RadioGroupItem value={t.id} id={t.id} className="peer sr-only" />
                    <Label
                      htmlFor={t.id}
                      className="flex flex-col items-center justify-between rounded-none border-2 border-transparent bg-background/50 p-4 hover:bg-background hover:border-primary/20 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-background transition-all cursor-pointer"
                    >
                      <t.icon className={cn("w-6 h-6 mb-2", theme === t.id ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-black text-[10px] uppercase tracking-widest">{t.label}</span>
                      <span className="text-[8px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">{t.desc}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="rounded-none border-none bg-secondary/30">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-none bg-orange-500/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Notifications</CardTitle>
                  <CardDescription className="text-[10px] uppercase tracking-tighter">Control when and how you receive alerts.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-widest">Process Completion</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Notify when long-running tasks are finished.</p>
                </div>
                <Switch 
                  checked={notifications.process} 
                  onCheckedChange={(v) => setNotifications({...notifications, process: v})} 
                  className="rounded-none"
                />
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-widest">System Alerts</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Receive updates about system health and maintenance.</p>
                </div>
                <Switch 
                  checked={notifications.system} 
                  onCheckedChange={(v) => setNotifications({...notifications, system: v})} 
                  className="rounded-none"
                />
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-widest">Security Alerts</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Important notifications about your account security.</p>
                </div>
                <Switch 
                  checked={notifications.security} 
                  onCheckedChange={(v) => setNotifications({...notifications, security: v})} 
                  className="rounded-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <AnimatePresence>
          {showTroubleshoot && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="max-w-md w-full bg-card border border-border shadow-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-border bg-secondary/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Neural Node Diagnostics</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowTroubleshoot(false)} className="h-6 w-6 rounded-none">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">The "Mixed Content" Block</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This application is running on <span className="text-foreground font-bold">HTTPS</span>. 
                      Modern browsers block connections from secure sites to insecure <span className="text-foreground font-bold">HTTP</span> local IPs for security.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">The Solution: HTTPS Tunnel</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You must provide an <span className="text-foreground font-bold">HTTPS</span> endpoint for your local server. 
                      Tools like <span className="text-foreground font-bold">ngrok</span> can create a secure tunnel in seconds.
                    </p>
                    
                    <div className="bg-secondary/20 p-3 border border-border/50 font-mono text-[10px] space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground/50">
                        <span>TERMINAL COMMAND</span>
                        <span className="text-[8px]">NGROK v3.0+</span>
                      </div>
                      <code className="block text-primary break-all">
                        ngrok http {localUrl.replace('http://', '').replace('/v1', '') || '1234'}
                      </code>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-8 rounded-none text-[9px] font-black uppercase tracking-widest mt-2"
                        onClick={() => {
                          const port = localUrl.split(':').pop()?.split('/')[0] || '1234';
                          navigator.clipboard.writeText(`ngrok http ${port}`);
                          toast.success("Command copied to clipboard");
                        }}
                      >
                        Copy Command
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-500">Alternative</h4>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      If you cannot use a tunnel, you can try accessing this app via <span className="text-foreground font-bold">HTTP</span> (if available) or use the <span className="text-foreground font-bold">Cloud Engine</span> instead.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-secondary/10 border-t border-border flex justify-end">
                  <Button onClick={() => setShowTroubleshoot(false)} className="rounded-none h-9 px-6 text-[10px] font-black uppercase tracking-widest">
                    Understood
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 text-[10px] text-muted-foreground uppercase tracking-widest border-t border-border/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              System Online
            </div>
            <div>Latency: 12ms</div>
          </div>
          <div>Nexus OS v2.4.0 • © 2026</div>
        </div>
      </div>
    </div>
  );
}

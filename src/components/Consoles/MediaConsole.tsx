import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Sparkles, 
  Download, 
  Maximize2, 
  Loader2,
  Settings2,
  Play,
  Upload,
  X,
  ChevronRight,
  History,
  Terminal
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

export function MediaConsole() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState<{ type: 'image' | 'video', url: string, prompt: string }[]>([]);
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [resolution, setResolution] = useState('1080p');
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [uploadImageMimeType, setUploadImageMimeType] = useState<string>('image/png');
  const [hasKey, setHasKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKey = async () => {
    // @ts-ignore
    if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
      setHasKey(true);
      return true;
    } else {
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasKey(true);
        return true;
      }
    }
    return false;
  };

  const handleModeChange = (newMode: 'image' | 'video') => {
    setMode(newMode);
    if (newMode === 'video') {
      if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
        setAspectRatio('16:9');
      }
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      await checkApiKey();
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing. Please configure it in the Settings menu.");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedMedia(prev => [{ type: 'image', url: imageUrl, prompt }, ...prev]);
        toast.success("Image generated successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim() && !uploadImage) {
      toast.error("Please provide a prompt or an image");
      return;
    }
    setIsGenerating(true);
    try {
      await checkApiKey();
      // Use API_KEY if available (for Veo), fallback to GEMINI_API_KEY
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API_KEY or GEMINI_API_KEY is missing. Please configure it in the Settings menu.");
      const ai = new GoogleGenAI({ apiKey });
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || undefined,
        image: uploadImage ? {
          imageBytes: uploadImage.split(',')[1],
          mimeType: uploadImageMimeType
        } : undefined,
        config: {
          numberOfVideos: 1,
          resolution: resolution as any,
          aspectRatio: aspectRatio as any
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}`, {
          method: 'GET',
          headers: { 'x-goog-api-key': apiKey! },
        });
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        setGeneratedMedia(prev => [{ type: 'video', url: videoUrl, prompt: prompt || 'Image to Video' }, ...prev]);
        toast.success("Video generated successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadImage(event.target?.result?.toString() || null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto custom-scrollbar selection:bg-primary/20">
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-primary" />
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Media Studio</h1>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">Neural Visualization & Motion Synthesis</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="rounded-none h-8 px-3 text-[10px] uppercase font-black gap-2 border-border/50 hover:bg-primary/5 transition-all">
              <History className="w-3.5 h-3.5" />
              History
            </Button>
            <Button variant="outline" size="sm" className="rounded-none h-8 px-3 text-[10px] uppercase font-black gap-2 border-border/50 hover:bg-primary/5 transition-all">
              <Settings2 className="w-3.5 h-3.5" />
              Config
            </Button>
          </div>
        </div>

        <Tabs defaultValue="image" className="w-full" onValueChange={(v) => handleModeChange(v as any)}>
          <TabsList className="bg-secondary/30 p-1 rounded-none h-11 mb-8 border border-border/50 w-full sm:w-auto">
            <TabsTrigger value="image" className="rounded-none h-full px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 text-[10px] uppercase font-black tracking-widest transition-all">
              <ImageIcon className="w-3.5 h-3.5" />
              Image
            </TabsTrigger>
            <TabsTrigger value="video" className="rounded-none h-full px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 text-[10px] uppercase font-black tracking-widest transition-all">
              <VideoIcon className="w-3.5 h-3.5" />
              Video
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10">
            {/* Controls Column */}
            <div className="md:col-span-4 lg:col-span-3 space-y-6">
              <Card className="rounded-none border border-border/50 bg-secondary/10 shadow-none">
                <CardHeader className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Parameters</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Maximize2 className="w-3 h-3" />
                      Aspect Ratio
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(mode === 'image' ? ['1:1', '16:9', '9:16', '4:3'] : ['16:9', '9:16']).map((ratio) => (
                        <Button
                          key={ratio}
                          variant={aspectRatio === ratio ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAspectRatio(ratio)}
                          className={cn(
                            "rounded-none h-9 text-[10px] font-black transition-all border-border/50",
                            aspectRatio === ratio ? "shadow-lg shadow-primary/20" : "hover:bg-primary/5"
                          )}
                        >
                          {ratio}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border/30" />

                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      {mode === 'image' ? 'Neural Quality' : 'Resolution'}
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {mode === 'image' ? (
                        ['1K', '2K', '4K'].map((size) => (
                          <Button
                            key={size}
                            variant={imageSize === size ? "default" : "outline"}
                            size="sm"
                            onClick={() => setImageSize(size)}
                            className={cn(
                              "rounded-none h-9 justify-between px-4 text-[10px] font-black transition-all border-border/50",
                              imageSize === size ? "shadow-lg shadow-primary/20" : "hover:bg-primary/5"
                            )}
                          >
                            <span>{size}</span>
                            {imageSize === size && <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-pulse" />}
                          </Button>
                        ))
                      ) : (
                        ['720p', '1080p'].map((res) => (
                          <Button
                            key={res}
                            variant={resolution === res ? "default" : "outline"}
                            size="sm"
                            onClick={() => setResolution(res)}
                            className={cn(
                              "rounded-none h-9 justify-between px-4 text-[10px] font-black transition-all border-border/50",
                              resolution === res ? "shadow-lg shadow-primary/20" : "hover:bg-primary/5"
                            )}
                          >
                            <span>{res}</span>
                            {resolution === res && <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-pulse" />}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {uploadImage && (
                <Card className="rounded-none border border-primary/20 bg-primary/5 overflow-hidden group">
                  <div className="relative aspect-video">
                    <img src={uploadImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 rounded-none h-7 w-7 shadow-xl"
                      onClick={() => setUploadImage(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardContent className="p-3 border-t border-primary/20 flex items-center justify-between">
                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Source Active</p>
                    <Badge variant="outline" className="rounded-none text-[8px] border-primary/30 text-primary uppercase font-black">Ready</Badge>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Prompt Column */}
            <div className="md:col-span-8 lg:col-span-9 space-y-8">
              <Card className="rounded-none border border-border/30 shadow-2xl shadow-primary/5 overflow-hidden bg-card/50 backdrop-blur-md relative group">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="p-6 lg:p-8 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                          <Terminal className="w-3.5 h-3.5" />
                          Neural Command
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-none text-[8px] border-border/50 text-muted-foreground uppercase font-black tracking-widest">
                          {mode === 'image' ? 'Imagen 3' : 'Veo 2'}
                        </Badge>
                        <Badge variant="secondary" className="rounded-none text-[9px] font-black uppercase tracking-widest px-2">v3.1 Engine</Badge>
                      </div>
                    </div>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        mode === 'image' 
                          ? "Describe your vision in detail..." 
                          : uploadImage 
                            ? "Describe how this image should move..." 
                            : "Describe the cinematic motion..."
                      }
                      className="w-full bg-secondary/10 border border-border/30 rounded-none p-5 text-sm md:text-base focus:border-primary/50 focus:bg-secondary/20 min-h-[160px] resize-none outline-none transition-all font-mono placeholder:text-muted-foreground/30"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="rounded-none h-14 flex-1 gap-3 text-[10px] font-black uppercase tracking-[0.2em] border-border/30 hover:bg-primary/5 transition-all group/btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" />
                      {mode === 'image' ? 'Ref Image' : 'Source Image'}
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    </Button>
                    <Button 
                      size="lg" 
                      className={cn(
                        "rounded-none h-14 flex-1 gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                        prompt.trim() || uploadImage 
                          ? "bg-primary text-primary-foreground shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:scale-[1.01]" 
                          : "bg-secondary/30 text-muted-foreground"
                      )}
                      onClick={mode === 'image' ? generateImage : generateVideo}
                      disabled={isGenerating || (!prompt.trim() && !uploadImage)}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-current" />
                          Execute Synthesis
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Bottom Status Bar */}
                <div className="px-6 py-2 bg-secondary/10 border-t border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 bg-green-500 rounded-full" />
                      <span className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Core Sync: Active</span>
                    </div>
                    <Separator orientation="vertical" className="h-2 bg-border/30" />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Buffer: 0.0s</span>
                  </div>
                  <div className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                    Nexus Media Engine v2.4
                  </div>
                </div>
              </Card>

              {/* Results Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-4 bg-primary" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Output History</h3>
                  </div>
                  <Badge variant="outline" className="rounded-none text-[10px] font-black border-border/50 px-3">{generatedMedia.length} Units</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {isGenerating && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="aspect-square rounded-none bg-secondary/20 flex flex-col items-center justify-center gap-4 border border-dashed border-primary/30 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent animate-pulse" />
                        <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
                        <div className="space-y-1 text-center relative z-10">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] animate-pulse">Synthesizing</p>
                          <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Neural Network Active</p>
                        </div>
                      </motion.div>
                    )}
                    {generatedMedia.map((media, i) => (
                      <motion.div
                        key={i}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group relative rounded-none overflow-hidden aspect-square bg-secondary/30 border border-border/50 hover:border-primary/50 transition-all duration-500"
                      >
                        {media.type === 'image' ? (
                          <img src={media.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <video src={media.url} className="w-full h-full object-cover" controls />
                        )}
                        
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 p-6 text-center backdrop-blur-sm">
                          <p className="text-[9px] text-white/70 line-clamp-3 font-mono uppercase tracking-tighter leading-relaxed">
                            {media.prompt}
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="rounded-none h-10 w-10 hover:bg-primary hover:text-primary-foreground transition-all"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = media.url;
                                link.download = `nexus-${media.type}-${Date.now()}.${media.type === 'image' ? 'png' : 'mp4'}`;
                                link.click();
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="rounded-none h-10 w-10 hover:bg-primary hover:text-primary-foreground transition-all"
                              onClick={() => window.open(media.url, '_blank')}
                            >
                              <Maximize2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="absolute top-2 left-2">
                          <Badge className="rounded-none text-[8px] font-black uppercase tracking-widest bg-black/50 backdrop-blur-md border-white/10">
                            {media.type}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {generatedMedia.length === 0 && !isGenerating && (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-border/50 bg-secondary/5">
                    <div className="w-12 h-12 rounded-none border border-border/50 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">No Output Detected</p>
                      <p className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest">Awaiting Neural Command</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

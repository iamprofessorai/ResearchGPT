import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Globe, 
  ShieldCheck, 
  Users, 
  Database, 
  Cpu, 
  Search,
  ExternalLink,
  Save,
  X,
  Loader2,
  FileText,
  Link as LinkIcon,
  MoreVertical,
  Settings2,
  LayoutGrid,
  List
} from 'lucide-react';
import { auth, db } from '../../firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Persona, KnowledgeBase, MCPConfig, UserProfile } from '../../types';
import { cn, cleanForFirestore } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';

interface AdminConsoleProps {
  userProfile: UserProfile | null;
}

export function AdminConsole({ userProfile }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'personas' | 'knowledge' | 'mcp' | 'users'>('personas');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [mcpConfigs, setMcpConfigs] = useState<MCPConfig[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [personaForm, setPersonaForm] = useState({ name: '', systemInstruction: '', isPublic: false });
  const [kbForm, setKbForm] = useState({ name: '', urls: '', description: '' });
  const [mcpForm, setMcpForm] = useState({ name: '', endpoint: '', apiKey: '', type: 'remote' as 'local' | 'remote' });

  useEffect(() => {
    if (auth.currentUser) {
      const pq = query(collection(db, 'users', auth.currentUser.uid, 'personas'));
      const unsubscribeP = onSnapshot(pq, (snapshot) => {
        setPersonas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Persona)));
      });

      const kbq = query(collection(db, 'users', auth.currentUser.uid, 'knowledgeBases'));
      const unsubscribeKB = onSnapshot(kbq, (snapshot) => {
        setKnowledgeBases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeBase)));
      });

      const mcpq = query(collection(db, 'users', auth.currentUser.uid, 'mcpConfigs'));
      const unsubscribeMCP = onSnapshot(mcpq, (snapshot) => {
        setMcpConfigs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MCPConfig)));
      });

      if (userProfile?.role === 'admin') {
        const uq = query(collection(db, 'users'));
        const unsubscribeU = onSnapshot(uq, (snapshot) => {
          setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as UserProfile)));
        });
        return () => { unsubscribeP(); unsubscribeKB(); unsubscribeMCP(); unsubscribeU(); };
      }

      return () => { unsubscribeP(); unsubscribeKB(); unsubscribeMCP(); };
    }
  }, [auth.currentUser, userProfile]);

  const handleCreatePersona = async () => {
    if (!auth.currentUser || !personaForm.name || !personaForm.systemInstruction) return;
    setIsLoading(true);
    try {
      if (editingPersona) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'personas', editingPersona.id), cleanForFirestore({
          ...personaForm,
          updatedAt: new Date().toISOString()
        }));
        toast.success("Persona updated");
      } else {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'personas'), cleanForFirestore({
          ...personaForm,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        }));
        toast.success("Persona created");
      }
      setPersonaForm({ name: '', systemInstruction: '', isPublic: false });
      setEditingPersona(null);
      setIsModalOpen(false);
    } catch (err) {
      toast.error(editingPersona ? "Failed to update persona" : "Failed to create persona");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setPersonaForm({
      name: persona.name,
      systemInstruction: persona.systemInstruction,
      isPublic: persona.isPublic
    });
    setActiveTab('personas');
    setIsModalOpen(true);
  };

  const handleCreateKB = async () => {
    if (!auth.currentUser || !kbForm.name || !kbForm.urls) return;
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'knowledgeBases'), cleanForFirestore({
        name: kbForm.name,
        description: kbForm.description,
        urls: kbForm.urls.split(',').map(u => u.trim()),
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      }));
      setKbForm({ name: '', urls: '', description: '' });
      setIsModalOpen(false);
      toast.success("Knowledge Base created");
    } catch (err) {
      toast.error("Failed to create KB");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMCP = async () => {
    if (!auth.currentUser || !mcpForm.name || !mcpForm.endpoint) return;
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'mcpConfigs'), cleanForFirestore({
        ...mcpForm,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      }));
      setMcpForm({ name: '', endpoint: '', apiKey: '', type: 'remote' });
      setIsModalOpen(false);
      toast.success("MCP Config created");
    } catch (err) {
      toast.error("Failed to create MCP");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, collectionName, id));
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full p-4 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Admin Hub</h1>
            <p className="text-muted-foreground">Manage personas, knowledge bases, and system configurations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsModalOpen(true)} className="rounded-none gap-2 shadow-lg shadow-primary/20 text-xs font-bold uppercase tracking-widest h-9 px-4">
              <Plus className="w-4 h-4" />
              New Entry
            </Button>
          </div>
        </div>

        <Tabs defaultValue="personas" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-secondary/50 p-0.5 rounded-none h-10 mb-6 overflow-x-auto no-scrollbar justify-start">
            <TabsTrigger value="personas" className="rounded-none h-full px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-[10px] uppercase font-bold">
              <Users className="w-3.5 h-3.5" />
              Personas
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="rounded-none h-full px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-[10px] uppercase font-bold">
              <Database className="w-3.5 h-3.5" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="mcp" className="rounded-none h-full px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-[10px] uppercase font-bold">
              <Cpu className="w-3.5 h-3.5" />
              MCP
            </TabsTrigger>
            {userProfile?.role === 'admin' && (
              <TabsTrigger value="users" className="rounded-none h-full px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-[10px] uppercase font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Users
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="personas" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personas.map(p => (
                <Card key={p.id} className="rounded-none border-none bg-secondary/30 hover:bg-secondary/50 transition-all group">
                  <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                    <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-none h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEditPersona(p)}
                      >
                        <Settings2 className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-none h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteItem('personas', p.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{p.name}</h3>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 font-medium">{p.systemInstruction}</p>
                    </div>
                    <Badge variant={p.isPublic ? "default" : "outline"} className="rounded-none text-[8px] font-black uppercase tracking-widest">
                      {p.isPublic ? "Public" : "Private"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="knowledge" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {knowledgeBases.map(kb => (
                <Card key={kb.id} className="rounded-none border-none bg-secondary/30 hover:bg-secondary/50 transition-all group">
                  <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                    <div className="w-10 h-10 rounded-none bg-green-500/10 flex items-center justify-center">
                      <Database className="w-5 h-5 text-green-600" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-none h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteItem('knowledgeBases', kb.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{kb.name}</h3>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 font-medium">{kb.description}</p>
                    </div>
                    <div className="space-y-1">
                      {kb.urls.slice(0, 2).map((url, i) => (
                        <div key={i} className="flex items-center gap-2 text-[9px] text-green-600 truncate font-bold uppercase tracking-tighter">
                          <LinkIcon className="w-3 h-3" />
                          {url}
                        </div>
                      ))}
                      {kb.urls.length > 2 && (
                        <p className="text-[8px] text-muted-foreground uppercase font-black">+{kb.urls.length - 2} more</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mcp" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mcpConfigs.map(mcp => (
                <Card key={mcp.id} className="rounded-none border-none bg-secondary/30 hover:bg-secondary/50 transition-all group">
                  <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                    <div className="w-10 h-10 rounded-none bg-purple-500/10 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-purple-600" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-none h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteItem('mcpConfigs', mcp.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{mcp.name}</h3>
                      <p className="text-[9px] text-muted-foreground truncate mt-1 font-mono">{mcp.endpoint}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="rounded-none uppercase text-[8px] font-black tracking-widest">{mcp.type}</Badge>
                      <Badge variant="outline" className="rounded-none text-green-600 border-green-200 bg-green-50 text-[8px] font-black uppercase tracking-widest">Online</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <Card className="rounded-none border-none bg-secondary/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="px-4 text-[10px] font-black uppercase tracking-widest">User</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Role</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Joined</TableHead>
                    <TableHead className="text-right px-4 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map(u => (
                    <TableRow key={u.uid} className="hover:bg-background/50 border-border/50 transition-colors">
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-none">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback className="rounded-none">{u.displayName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-black text-xs uppercase tracking-tight">{u.displayName}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? "default" : "secondary"} className="rounded-none uppercase text-[8px] font-black tracking-widest">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right px-4">
                        <Button variant="ghost" size="icon" className="rounded-none h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Entry Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-none p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-secondary/30">
            <DialogTitle className="text-lg font-black uppercase tracking-widest">
              {editingPersona ? 'Edit Persona' : `New ${activeTab === 'personas' ? 'Persona' : activeTab === 'knowledge' ? 'Knowledge' : 'MCP'}`}
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold tracking-tighter">
              {editingPersona ? 'Modify existing system parameters.' : 'Initialize new system parameters.'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {activeTab === 'personas' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">Name</label>
                  <Input 
                    value={personaForm.name}
                    onChange={e => setPersonaForm({ ...personaForm, name: e.target.value })}
                    placeholder="e.g. Creative Assistant"
                    className="rounded-none h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">System Instruction</label>
                  <Textarea 
                    value={personaForm.systemInstruction}
                    onChange={e => setPersonaForm({ ...personaForm, systemInstruction: e.target.value })}
                    placeholder="Define behavioral parameters..."
                    className="rounded-none min-h-[100px] text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="isPublic"
                    checked={personaForm.isPublic}
                    onChange={e => setPersonaForm({ ...personaForm, isPublic: e.target.checked })}
                    className="rounded-none border-muted"
                  />
                  <label htmlFor="isPublic" className="text-[10px] font-black uppercase tracking-widest">Public Access</label>
                </div>
              </div>
            )}

            {activeTab === 'knowledge' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">Name</label>
                  <Input 
                    value={kbForm.name}
                    onChange={e => setKbForm({ ...kbForm, name: e.target.value })}
                    placeholder="e.g. Project Documentation"
                    className="rounded-none h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">Source URLs (CSV)</label>
                  <Textarea 
                    value={kbForm.urls}
                    onChange={e => setKbForm({ ...kbForm, urls: e.target.value })}
                    placeholder="https://source1.com, https://source2.com"
                    className="rounded-none min-h-[60px] text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">Description</label>
                  <Input 
                    value={kbForm.description}
                    onChange={e => setKbForm({ ...kbForm, description: e.target.value })}
                    placeholder="Brief context summary..."
                    className="rounded-none h-9 text-xs"
                  />
                </div>
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">Node Name</label>
                  <Input 
                    value={mcpForm.name}
                    onChange={e => setMcpForm({ ...mcpForm, name: e.target.value })}
                    placeholder="e.g. Local Ollama"
                    className="rounded-none h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">Endpoint URI</label>
                  <Input 
                    value={mcpForm.endpoint}
                    onChange={e => setMcpForm({ ...mcpForm, endpoint: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="rounded-none h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">API Key (Optional)</label>
                  <Input 
                    type="password"
                    value={mcpForm.apiKey}
                    onChange={e => setMcpForm({ ...mcpForm, apiKey: e.target.value })}
                    placeholder="••••••••"
                    className="rounded-none h-9 text-xs"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={mcpForm.type === 'local'} 
                      onChange={() => setMcpForm({ ...mcpForm, type: 'local' })}
                      className="rounded-none"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest">Local Node</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={mcpForm.type === 'remote'} 
                      onChange={() => setMcpForm({ ...mcpForm, type: 'remote' })}
                      className="rounded-none"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest">Remote Node</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-secondary/10">
            <Button variant="ghost" onClick={() => {
              setIsModalOpen(false);
              setEditingPersona(null);
              setPersonaForm({ name: '', systemInstruction: '', isPublic: false });
            }} className="rounded-none text-[10px] font-black uppercase tracking-widest">Cancel</Button>
            <Button 
              onClick={activeTab === 'personas' ? handleCreatePersona : activeTab === 'knowledge' ? handleCreateKB : handleCreateMCP}
              disabled={isLoading}
              className="rounded-none px-6 gap-2 text-[10px] font-black uppercase tracking-widest h-10"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingPersona ? 'Update Entry' : 'Save Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

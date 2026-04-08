import React from 'react';
import { cn } from '../lib/utils';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Mic2, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Sparkles,
  Menu
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion } from 'motion/react';

interface SidebarProps {
  activeConsole: string;
  setActiveConsole: (id: string) => void;
  user: any;
}

export function Sidebar({ activeConsole, setActiveConsole, user }: SidebarProps) {
  const navItems = [
    { id: 'chat', label: 'Chat Engine', icon: MessageSquare },
    { id: 'media', label: 'Media Studio', icon: ImageIcon },
    { id: 'live', label: 'Live Audio', icon: Mic2 },
    { id: 'admin', label: 'Admin Hub', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#111112]/80 backdrop-blur-xl border-r border-white/5 flex flex-col h-full z-20">
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center cyber-glow">
          <Sparkles className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white tracking-tighter uppercase text-lg">Nexus AI</span>
          <span className="text-[8px] text-cyan-500/50 font-mono tracking-[0.2em]">OS_V2.5_CORE</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveConsole(item.id)}
            className={cn(
              "w-full flex items-center gap-4 px-5 py-4 rounded-none text-xs font-bold uppercase tracking-widest transition-all relative group overflow-hidden",
              activeConsole === item.id
                ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400"
                : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
            )}
          >
            <item.icon className={cn("w-4 h-4", activeConsole === item.id ? "text-cyan-400" : "text-gray-500 group-hover:text-gray-300")} />
            {item.label}
            {activeConsole === item.id && (
              <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-cyan-400/20" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-4 p-2 mb-4">
          <div className="relative">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              alt="User" 
              className="w-10 h-10 rounded-none border border-white/10 cyber-glow"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-lime-500 border-2 border-[#111112] rounded-none" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate uppercase tracking-tight">{user.displayName}</p>
            <p className="text-[9px] text-gray-500 truncate font-mono">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-none text-[10px] font-bold uppercase tracking-widest text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all border border-transparent hover:border-red-400/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          Terminate_Session
        </button>
      </div>
    </aside>
  );
}

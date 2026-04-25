import { Home, Calendar, Mail, Users, FileText, Bell, Megaphone, MessageSquare, Settings, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import OrgSwitcher from "./OrgSwitcher";
import type { User } from "firebase/auth";

interface SidebarProps {
  user: User;
  activeOrgId: string;
  activePage: string;
  setActivePage: (page: string) => void;
}

export default function Sidebar({ user, activeOrgId, activePage, setActivePage }: SidebarProps) {
  const navItems = [
    { icon: Home, label: "Dashboard" },
    { icon: Calendar, label: "Meetings" },
    { icon: Mail, label: "Google Mails" },
    { icon: FileText, label: "Screening" },
    { icon: Users, label: "Stakeholders" },
    { icon: Users, label: "Groups" },
    { icon: Bell, label: "Notifications" },
    { icon: Megaphone, label: "Announcements" },
    { icon: MessageSquare, label: "Chats" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto z-40">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-8 h-8 bg-linear-to-tr from-indigo-500 to-purple-500 rounded-lg shrink-0"></div>
          <span className="text-xl font-bold text-gray-900">Portfoliomate</span>
        </div>
        
        <OrgSwitcher user={user} activeOrgId={activeOrgId} />

        <nav className="flex-1 px-4 space-y-1 mt-2">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActivePage(item.label)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                activePage === item.label ? "bg-[#4338CA] text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 mt-4">
          <button onClick={() => signOut(auth)} className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 px-4 py-2 w-full">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navbar */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-3 z-50">
        <button onClick={() => setActivePage("Dashboard")} className={`p-2 rounded-full ${activePage === "Dashboard" ? "bg-[#4338CA] text-white" : "text-gray-600"}`}><Home size={24} /></button>
        <button onClick={() => setActivePage("Meetings")} className={`p-2 rounded-full ${activePage === "Meetings" ? "bg-[#4338CA] text-white" : "text-gray-600"}`}><Calendar size={24} /></button>
        <button onClick={() => setActivePage("Announcements")} className={`p-2 rounded-full ${activePage === "Announcements" ? "bg-[#4338CA] text-white" : "text-gray-600"}`}><Megaphone size={24} /></button>
        <button onClick={() => setActivePage("Chats")} className={`p-2 rounded-full ${activePage === "Chats" ? "bg-[#4338CA] text-white" : "text-gray-600"}`}><MessageSquare size={24} /></button>
        <button onClick={() => signOut(auth)} className="p-2 text-gray-600"><LogOut size={24} /></button>
      </nav>
    </>
  );
}
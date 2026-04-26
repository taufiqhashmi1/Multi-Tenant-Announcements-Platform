import { useState, useEffect, useMemo } from "react";
import type { User } from "firebase/auth";
import { collection, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Search, Image as ImageIcon, Paperclip } from "lucide-react";
import AnnouncementCard from "./AnnouncementCard";
import CreateAnnouncementModal from "./CreateAnnouncementModal";
import DocumentChat from "./DocumentChat";

interface FeedProps {
  user: User;
  activeOrgId: string;
}

export default function AnnouncementsFeed({ user, activeOrgId }: FeedProps) {
  const [rawAnnouncements, setRawAnnouncements] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // AI Chat State
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState("Everyone");
  const [sortOrder, setSortOrder] = useState("Newest First");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  useEffect(() => {
    if (!activeOrgId) return;
    
    setLoading(true);
    // STAMPED QUERY: This completely stops the bleeding between workspaces
    const q = query(
      collection(db, "announcements"), 
      where("orgId", "==", activeOrgId), 
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRawAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false); 
    });
    return () => unsubscribe();
  }, [activeOrgId]);

  // Extract unique authors for the dropdown
  const uniqueAuthors = useMemo(() => {
    const authors = new Set(rawAnnouncements.map(a => a.authorName));
    return ["Everyone", ...Array.from(authors)];
  }, [rawAnnouncements]);

  // Apply filters and sorting
  const processedAnnouncements = useMemo(() => {
    let result = [...rawAnnouncements];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.title?.toLowerCase().includes(lowerQuery) || 
        a.content?.toLowerCase().includes(lowerQuery)
      );
    }

    if (authorFilter !== "Everyone") {
      result = result.filter(a => a.authorName === authorFilter);
    }

    if (showPinnedOnly) {
      result = result.filter(a => a.isPinned);
    }

    if (sortOrder === "Oldest First") {
      result.sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
    } else {
      result.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    }

    // Always bubble pinned items to the top regardless of sort order if we aren't filtering purely by pinned
    if (!showPinnedOnly) {
        result.sort((a, b) => (b.isPinned === true ? 1 : 0) - (a.isPinned === true ? 1 : 0));
    }

    return result;
  }, [rawAnnouncements, searchQuery, authorFilter, sortOrder, showPinnedOnly]);

  return (
    <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-500 mt-1">Get the latest news, updates, and events from exactly who matters.</p>
          </div>
          <div className="hidden lg:flex items-center space-x-3 bg-white px-4 py-2 rounded-full border border-gray-200">
             <Search size={18} className="text-gray-400" />
             <input 
               type="text" 
               placeholder="Search..." 
               className="outline-none bg-transparent text-sm w-48"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
        </header>

        {/* Quick Post Box */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-4">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="User" className="w-10 h-10 rounded-full" />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 bg-gray-50 text-left px-4 py-3 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          >
            What's on your mind?
          </button>
          <div className="flex space-x-2">
            <button onClick={() => setIsModalOpen(true)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"><ImageIcon size={20} /></button>
            <button onClick={() => setIsModalOpen(true)} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg"><Paperclip size={20} /></button>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {loading ? (
             Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                   <div className="flex items-center space-x-3 mb-4">
                     <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                     <div className="space-y-2">
                       <div className="h-4 bg-gray-200 rounded w-32"></div>
                       <div className="h-3 bg-gray-200 rounded w-20"></div>
                     </div>
                   </div>
                   <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                   <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                   <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
             ))
          ) : (
            <>
              {processedAnnouncements.map((post) => (
                <AnnouncementCard 
                  key={post.id} 
                  post={post} 
                  currentUser={user} 
                  onOpenChat={() => setActiveChatId(post.id)} 
                />
              ))}
              {processedAnnouncements.length === 0 && (
                <div className="text-center py-12 text-gray-500">No announcements found matching your criteria.</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar Filters (Desktop) */}
      <div className="hidden lg:block w-72 space-y-6">
         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 sticky top-6">
            <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter By Author</label>
                <select 
                  className="w-full mt-2 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4338CA] text-sm"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                >
                    {uniqueAuthors.map(author => (
                        <option key={author} value={author}>{author}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort Order</label>
                <select 
                  className="w-full mt-2 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4338CA] text-sm"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                    <option>Newest First</option>
                    <option>Oldest First</option>
                </select>
            </div>
            <div className="mt-6 flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Show Pinned Only</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={showPinnedOnly} onChange={() => setShowPinnedOnly(!showPinnedOnly)} />
                  <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-o.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4338CA]"></div>
                </label>
            </div>
         </div>
      </div>

      {isModalOpen && (
        <CreateAnnouncementModal 
          user={user} 
          activeOrgId={activeOrgId} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {/* AI Document Chat Modal */}
      {activeChatId && (
        <DocumentChat
          orgId={activeOrgId}
          announcementId={activeChatId}
          isOpen={!!activeChatId}
          onClose={() => setActiveChatId(null)}
        />
      )}
    </div>
  );
}
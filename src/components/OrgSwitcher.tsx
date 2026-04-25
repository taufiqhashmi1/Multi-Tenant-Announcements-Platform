import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ChevronDown, Building } from "lucide-react";
import type { User } from "firebase/auth";

export default function OrgSwitcher({ user, activeOrgId }: { user: User, activeOrgId: string }) {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = onSnapshot(collection(db, "users", user.uid, "memberships"), async (snap) => {
      const fetchedWorkspaces = await Promise.all(
        snap.docs.map(async (membershipDoc) => {
          const data = membershipDoc.data();
          const orgId = data.orgId;
          let orgName = `${user.displayName || 'User'}'s Organization`;

          if (orgId) {
            try {
              const orgRef = doc(db, "organizations", orgId);
              const orgSnap = await getDoc(orgRef);
              if (orgSnap.exists() && orgSnap.data().name) {
                orgName = orgSnap.data().name;
              }
            } catch (error) {
              console.error("Failed to fetch org name:", error);
            }
          }

          return { id: membershipDoc.id, orgId, name: orgName, ...data };
        })
      );
      
      setWorkspaces(fetchedWorkspaces);
    });
    
    return () => unsubscribe();
  }, [user.uid]);

  const handleSwitch = async (orgId: string) => {
    await updateDoc(doc(db, "users", user.uid), { activeOrgId: orgId });
    setIsOpen(false);
  };

  const activeWorkspace = workspaces.find(w => w.orgId === activeOrgId);
  const activeOrgName = activeWorkspace ? activeWorkspace.name : (user.displayName ? `${user.displayName}'s Organization` : 'Select Organization');

  return (
    <div className="relative px-4 mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition"
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 bg-indigo-100 text-[#4338CA] rounded flex items-center justify-center shrink-0">
             <Building size={18} />
          </div>
          <span className="font-bold text-gray-900 truncate">{activeOrgName}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
          <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your Workspaces</p>
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => handleSwitch(w.orgId)}
              className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 hover:text-[#4338CA] transition ${w.orgId === activeOrgId ? 'text-[#4338CA] bg-indigo-50/50' : 'text-gray-600'}`}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
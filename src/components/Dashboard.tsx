import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, collectionGroup, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { User } from "firebase/auth";
import GenerateInvite from "./GenerateInvite";
import DirectAssign from "./DirectAssign";

interface DashboardProps {
  user: User;
  activeOrgId: string;
}

export default function Dashboard({ user, activeOrgId }: DashboardProps) {
  const [role, setRole] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("Loading...");
  const [stats, setStats] = useState({ posts: 0, members: 0 });

  useEffect(() => {
    if (!user?.uid || !activeOrgId) return;

    const fetchOrgName = async () => {
      const orgRef = doc(db, "organizations", activeOrgId);
      const orgSnap = await getDoc(orgRef);
      if (orgSnap.exists()) {
        setOrgName(orgSnap.data().name);
      }
    };
    fetchOrgName();

    const roleQ = query(collection(db, "users", user.uid, "memberships"), where("orgId", "==", activeOrgId));
    const unsubRole = onSnapshot(roleQ, (snap) => {
      if (!snap.empty) setRole(snap.docs[0].data().role);
    });

    const postsQ = query(collection(db, "announcements"), where("orgId", "==", activeOrgId));
    const unsubPosts = onSnapshot(postsQ, (snap) => {
      setStats(prev => ({ ...prev, posts: snap.size }));
    });

    const membersQ = query(collectionGroup(db, "memberships"), where("orgId", "==", activeOrgId));
    const unsubMembers = onSnapshot(membersQ, (snap) => {
      setStats(prev => ({ ...prev, members: snap.size }));
    });

    return () => { unsubRole(); unsubPosts(); unsubMembers(); };
  }, [user.uid, activeOrgId]);

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">Overview of your workspace in <span className="font-bold">{orgName}</span></p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200">
           <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Announcements</h3>
           <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{stats.posts}</p>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200">
           <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Members</h3>
           <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{stats.members}</p>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200 sm:col-span-2 lg:col-span-1">
           <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Your Role</h3>
           <p className="text-xl md:text-2xl font-bold text-[#4338CA] mt-2 uppercase tracking-wide">{role || '...'}</p>
        </div>
      </div>

      {role === "admin" && (
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Admin Controls</h2>
            <p className="text-sm md:text-base text-gray-500">Manage your workspace invitations.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <GenerateInvite activeOrgId={activeOrgId} />
            <DirectAssign activeOrgId={activeOrgId} />
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { collectionGroup, query, where, getDocs, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import toast from "react-hot-toast";

export default function Stakeholders({ activeOrgId, currentUserRole }: { activeOrgId: string, currentUserRole: string | null }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Find all membership documents for this org
      const q = query(collectionGroup(db, "memberships"), where("orgId", "==", activeOrgId));
      const membershipSnaps = await getDocs(q);
      
      const memberData = await Promise.all(membershipSnaps.docs.map(async (mDoc) => {
        const memData = mDoc.data();
        // The parent of the 'memberships' collection is the user document
        const userRef = mDoc.ref.parent.parent; 
        if (!userRef) return null;
        
        const userSnap = await getDoc(userRef);
        return { uid: userSnap.id, ...userSnap.data(), role: memData.role, joinedAt: memData.joinedAt };
      }));
      
      setMembers(memberData.filter(m => m !== null));
    } catch (error: any) {
      // NOTE: Firebase will log a URL in the console here on first run. Click it to create the required Index!
      console.error(error);
      toast.error("Failed to load members. Check console for Index creation link.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOrgId) fetchMembers();
  }, [activeOrgId]);

  const handleRoleChange = async (targetUid: string, newRole: string) => {
    const loadingToast = toast.loading("Updating role...");
    try {
      const updateRoleFunc = httpsCallable(functions, "updateMemberRole");
      await updateRoleFunc({ targetUid, orgId: activeOrgId, newRole });
      toast.success("Role updated", { id: loadingToast });
      fetchMembers(); // Refresh list
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleRemove = async (targetUid: string) => {
    if (!window.confirm("Remove this user from the workspace?")) return;
    const loadingToast = toast.loading("Removing user...");
    try {
      const removeFunc = httpsCallable(functions, "removeMember");
      await removeFunc({ targetUid, orgId: activeOrgId });
      toast.success("User removed", { id: loadingToast });
      fetchMembers(); // Refresh list
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  if (loading) return <div className="p-8 animate-pulse font-bold text-gray-500">Loading Stakeholders...</div>;

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Stakeholders</h1>
        <p className="text-gray-500">Manage directory for {activeOrgId.toUpperCase()}</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <th className="p-4 font-bold">User</th>
              <th className="p-4 font-bold">Department</th>
              <th className="p-4 font-bold">Role</th>
              {currentUserRole === "admin" && <th className="p-4 font-bold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map(member => (
              <tr key={member.uid} className="hover:bg-gray-50 transition">
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[#4338CA] font-bold">
                      {member.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-600">{member.department || 'N/A'}</td>
                <td className="p-4">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide ${member.role === 'admin' ? 'bg-red-100 text-red-700' : member.role === 'lp' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {member.role}
                  </span>
                </td>
                {currentUserRole === "admin" && (
                  <td className="p-4 text-right space-x-2">
                     <select 
                        onChange={(e) => handleRoleChange(member.uid, e.target.value)}
                        value={member.role}
                        className="text-xs border border-gray-200 rounded p-1 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500"
                     >
                        <option value="employee">Employee</option>
                        <option value="lp">LP</option>
                        <option value="admin">Admin</option>
                     </select>
                     <button onClick={() => handleRemove(member.uid)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition font-bold">
                       Remove
                     </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
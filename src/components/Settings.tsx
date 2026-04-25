import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";

export default function Settings({ user, profile }: { user: any, profile: any }) {
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const activeOrgId = profile?.activeOrgId;

  useEffect(() => {
    const fetchOrg = async () => {
      if (!activeOrgId) return;
      const snap = await getDoc(doc(db, "organizations", activeOrgId));
      if (snap.exists()) setOrgName(snap.data().name);
    };
    fetchOrg();
  }, [activeOrgId]);

  const handleOrgUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    
    setSavingOrg(true);
    const loadingToast = toast.loading("Renaming workspace...");
    try {
      await updateDoc(doc(db, "organizations", activeOrgId), {
        name: orgName
      });
      toast.success("Workspace renamed successfully!", { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersonal(true);
    const loadingToast = toast.loading("Saving profile...");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        jobTitle,
        department,
        bio,
        updatedAt: new Date()
      });
      toast.success("Profile updated successfully!", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to update profile.", { id: loadingToast });
    } finally {
      setSavingPersonal(false);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 md:space-y-8 px-4 sm:px-0">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">Manage your workspace and personal profile.</p>
      </header>

      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-base md:text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 md:mb-6">Workspace Settings</h3>
        <form onSubmit={handleOrgUpdate}>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Workspace Name</label>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-2">
            <input 
              type="text" 
              className="flex-1 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base" 
              value={orgName} 
              onChange={e => setOrgName(e.target.value)} 
              required 
            />
            <button 
              type="submit" 
              disabled={savingOrg} 
              className="bg-black text-white px-6 py-2.5 md:py-3 rounded-lg font-bold shadow-md hover:bg-gray-800 transition disabled:opacity-50 text-sm md:text-base whitespace-nowrap"
            >
              {savingOrg ? "Saving..." : "Rename"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">This changes the display name for all members. The underlying database ID remains secure.</p>
        </form>
      </div>

      <form onSubmit={handleUpdate} className="bg-white p-5 sm:p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-5 md:space-y-6">
        <h3 className="text-base md:text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Public Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Job Title</label>
            <input type="text" className="w-full mt-2 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base" value={jobTitle} onChange={e => setJobTitle(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Department</label>
            <select className="w-full mt-2 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none bg-white text-sm md:text-base" value={department} onChange={e => setDepartment(e.target.value)} required>
                <option value="Investment">Investment Team</option>
                <option value="Operations">Operations</option>
                <option value="Legal">Legal & Compliance</option>
                <option value="Executive">Executive</option>
                <option value="External">External Partner / LP</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Short Bio</label>
          <textarea className="w-full mt-2 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none h-24 resize-none text-sm md:text-base" value={bio} onChange={e => setBio(e.target.value)} />
        </div>
        <button type="submit" disabled={savingPersonal} className="w-full sm:w-auto bg-[#4338CA] text-white px-6 py-2.5 md:py-3 rounded-lg font-bold shadow-md hover:bg-[#3730A3] transition disabled:opacity-50 text-sm md:text-base mt-2">
          {savingPersonal ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
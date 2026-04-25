import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { User } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";

interface OnboardingProps {
  user: User;
  profile: any;
}

export default function Onboarding({ user, profile }: OnboardingProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !department) return;
    setSaving(true);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        jobTitle,
        department,
        bio,
        onboardingCompleted: true,
        updatedAt: new Date()
      });
      // Note: No redirect needed. App.tsx listens to this document and will re-render automatically.
      toast.success("Profile completed!");
    } catch (error: any) {
      toast.error("Failed to save profile details.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4 font-sans text-gray-900">
      <Toaster position="top-right" />
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl shadow-indigo-100 border border-gray-100 w-full max-w-xl">
        <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome, {profile.name.split(' ')[0]} 👋</h1>
            <p className="text-gray-500">Let's set up your Portfoliomate profile so your team knows who you are.</p>
        </div>

        <form onSubmit={handleCompleteOnboarding} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Job Title *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Senior Analyst" 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4338CA] outline-none transition"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Department *</label>
                <select 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4338CA] outline-none transition bg-white"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Department</option>
                  <option value="Investment">Investment Team</option>
                  <option value="Operations">Operations</option>
                  <option value="Legal">Legal & Compliance</option>
                  <option value="Executive">Executive</option>
                  <option value="External">External Partner / LP</option>
                </select>
              </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Short Bio (Optional)</label>
            <textarea 
              placeholder="A brief overview of your background and focus..." 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4338CA] outline-none transition min-h-25 resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
             <button 
                type="submit" 
                disabled={saving || !jobTitle || !department}
                className="px-8 py-3 bg-[#4338CA] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-[#3730A3] transition disabled:opacity-50 flex items-center space-x-2"
             >
               {saving ? "Saving Profile..." : "Complete Setup"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
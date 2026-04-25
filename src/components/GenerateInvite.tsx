import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import toast from "react-hot-toast";

export default function GenerateInvite({
  activeOrgId,
}: {
  activeOrgId: string;
}) {
  const [role, setRole] = useState("employee");
  const [generating, setGenerating] = useState(false);

  const handleGenerateLink = async () => {
    setGenerating(true);
    const generateInviteCloudFunc = httpsCallable(functions, "generateInvite");

    try {
      const result = await generateInviteCloudFunc({
        orgId: activeOrgId,
        role,
      });
      const data = result.data as { inviteCode: string };

      const inviteUrl = `${window.location.origin}/?inviteCode=${data.inviteCode}`;
      await navigator.clipboard.writeText(inviteUrl);

      toast.success("Secure invite link copied to clipboard!");
    } catch (error: any) {
      toast.error(
        error.message || "Failed to generate invite. Are you an admin?",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 w-full max-w-md shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Invite New User
      </h3>
      <div className="mb-4">
        <p className="text-xs text-gray-500 mt-1">
          Generate a secure link for people who <strong>do not</strong> have a
          Portfoliomate account yet.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Assign Role
          </label>
          <select
            className="w-full mt-2 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none transition bg-white"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="employee">Employee</option>
            <option value="lp">Limited Partner (Read Only)</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={handleGenerateLink}
          disabled={generating || !activeOrgId}
          className="w-full bg-[#4338CA] text-white py-3 rounded-lg font-bold shadow-md shadow-indigo-100 hover:bg-[#3730A3] transition disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate & Copy Link"}
        </button>
      </div>
    </div>
  );
}

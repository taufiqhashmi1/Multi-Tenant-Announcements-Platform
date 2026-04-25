import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import toast from "react-hot-toast";

export default function DirectAssign({ activeOrgId }: { activeOrgId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !activeOrgId) return;

    setAssigning(true);
    const directAssignCloudFunc = httpsCallable(functions, "directAssignUser");

    try {
      const result = await directAssignCloudFunc({
        email: email.toLowerCase(),
        orgId: activeOrgId,
        role,
      });
      const data = result.data as { message: string };

      toast.success(data.message);
      setEmail(""); // Reset field on success
    } catch (error: any) {
      toast.error(error.message || "Failed to assign user. Check permissions.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <form
      onSubmit={handleAssign}
      className="bg-white p-6 rounded-xl border border-gray-200 w-full max-w-md shadow-sm"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Direct Add Existing User
      </h3>
      <div className="mb-4">
        <p className="text-xs text-gray-500 mt-1">
          Instantly add someone to this workspace. They <strong>must</strong>{" "}
          already have a Portfoliomate account.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            User Email
          </label>
          <input
            type="email"
            placeholder="user@example.com"
            required
            className="w-full mt-2 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
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
          type="submit"
          disabled={assigning || !email || !activeOrgId}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition disabled:opacity-50 shadow-md"
        >
          {assigning ? "Assigning..." : "Add to Organization"}
        </button>
      </div>
    </form>
  );
}

import { auth } from "../lib/firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { Mail, RefreshCw, LogOut } from "lucide-react";

export default function VerifyEmail({ email }: { email: string | null }) {
  const handleResend = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-indigo-50 text-[#4338CA] rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 mb-8">
          We sent a verification link to <span className="font-semibold text-gray-900">{email}</span>. 
          Please click the link to activate your account.
        </p>

        <div className="space-y-3">
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-[#4338CA] text-white p-3 rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-[#3730A3] transition flex justify-center items-center space-x-2"
          >
            <RefreshCw size={18} />
            <span>I have verified my email</span>
          </button>
          
          <button 
            onClick={handleResend} 
            className="w-full bg-white text-gray-700 border border-gray-200 p-3 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Resend Email
          </button>

          <button 
            onClick={() => signOut(auth)} 
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center w-full space-x-1"
          >
            <LogOut size={14} />
            <span>Sign out and use a different account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
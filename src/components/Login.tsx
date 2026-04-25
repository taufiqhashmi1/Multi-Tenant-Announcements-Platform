import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, signOut, getAdditionalUserInfo } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { auth, googleProvider, functions, db } from "../lib/firebase"; 
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import toast from "react-hot-toast";

export default function Login({ onToggle }: { onToggle: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const loadingToast = toast.loading("Securing connection...");
    
    try {
      if (!executeRecaptcha) {
        throw new Error("Captcha is not ready yet. Please wait a moment.");
      }

      const token = await executeRecaptcha("login");
      const verifyCaptcha = httpsCallable(functions, "verifyCaptcha");
      await verifyCaptcha({ token });

      toast.loading("Verifying credentials...", { id: loadingToast });
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      if (!user.emailVerified) {
         toast.error("Please verify your email before logging in. Check your inbox.", { id: loadingToast, duration: 5000 });
         await signOut(auth);
         setIsLoading(false);
         return;
      }

      toast.success("Welcome back!", { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || "Login failed or bot detected.", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading("Connecting to Google...");
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const { user } = userCredential;
      const details = getAdditionalUserInfo(userCredential);

      if (details?.isNewUser) {
        toast.loading("Setting up your workspace...", { id: loadingToast });
        
        const newOrgRef = doc(collection(db, "organizations"));
        const orgId = newOrgRef.id;
        const orgName = `${user.displayName || 'User'}'s Workspace`;

        await setDoc(newOrgRef, { name: orgName, createdAt: new Date() });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: user.displayName || "Google User",
          email: user.email,
          activeOrgId: orgId,
          onboardingCompleted: false,
          createdAt: new Date()
        });

        await addDoc(collection(db, "users", user.uid, "memberships"), {
          orgId,
          role: "admin",
          joinedAt: new Date()
        });
        
        toast.success("Account created successfully!", { id: loadingToast });
      } else {
        toast.success("Welcome back!", { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed.", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-gray-900">Welcome Back</h2>
      <p className="text-gray-500 mb-6 text-sm">Sign in to continue to Portfoliomate.</p>
      
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
            <input
              type="email"
              disabled={isLoading}
              className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4338CA] transition text-sm md:text-base disabled:bg-gray-100 disabled:text-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
            <input
              type="password"
              disabled={isLoading}
              autoComplete="current-password"
              className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4338CA] transition text-sm md:text-base disabled:bg-gray-100 disabled:text-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-[#4338CA] text-white p-3 rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-[#3730A3] transition disabled:opacity-70 flex justify-center items-center h-12"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          type="button"
          disabled={isLoading}
          className="mt-4 w-full bg-white border border-gray-200 text-gray-700 p-3 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center space-x-2 disabled:opacity-50 h-12"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          <span>Google</span>
        </button>
      </div>

      <button 
        onClick={onToggle} 
        disabled={isLoading}
        className="mt-8 text-sm text-gray-500 hover:text-[#4338CA] w-full text-center font-medium transition disabled:opacity-50"
      >
        Don't have an account? <span className="text-[#4338CA]">Sign up</span>
      </button>
    </div>
  );
}
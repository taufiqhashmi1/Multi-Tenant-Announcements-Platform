import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithPopup, getAdditionalUserInfo, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, googleProvider } from "../lib/firebase";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import toast from "react-hot-toast";

export default function SignUp({ onToggle, initialInviteCode }: { onToggle: () => void, initialInviteCode: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInviteCode || "");
  const [isLoading, setIsLoading] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const validatePassword = (pass: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pass);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!validatePassword(password)) {
      toast.error("Password must be 8+ chars and include uppercase, lowercase, number, and special character.");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Securing connection...");

    try {
      if (!executeRecaptcha) {
        throw new Error("Captcha is not ready yet. Please wait a moment.");
      }

      const token = await executeRecaptcha("signup");
      const verifyCaptcha = httpsCallable(functions, "verifyCaptcha");
      await verifyCaptcha({ token });

      toast.loading("Building your workspace...", { id: loadingToast });

      let orgId = "";
      let role = "admin";
      let orgName = `${name}'s Workspace`; 
      let isNewOrg = false;

      // 1. Check Invite Code FIRST (Read-only, allowed by rules)
      if (inviteCode && inviteCode.trim() !== "") {
        const inviteRef = doc(db, "invites", inviteCode.trim());
        const inviteSnap = await getDoc(inviteRef);

        if (inviteSnap.exists()) {
          const data = inviteSnap.data();
          orgId = data.orgId;
          role = data.role;
        } else {
          toast.error("Invalid invite link. Leave blank to create a new workspace.", { id: loadingToast });
          setIsLoading(false);
          return;
        }
      } else {
        // Just generate the ID, do not write to DB yet
        const newOrgRef = doc(collection(db, "organizations"));
        orgId = newOrgRef.id;
        isNewOrg = true;
      }

      // 2. Create Authentication Account (User is now signed in)
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user);

      // 3. Perform Secure Database Writes
      if (isNewOrg) {
        await setDoc(doc(db, "organizations", orgId), { name: orgName, createdAt: new Date() });
      }

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        activeOrgId: orgId,
        onboardingCompleted: false,
        createdAt: new Date()
      });

      await addDoc(collection(db, "users", user.uid, "memberships"), {
        orgId,
        role,
        joinedAt: new Date()
      });

      // 4. Force Sign Out immediately to drop the session lock and prevent premature routing
      await signOut(auth);

      toast.success("Account created! Please check your email to verify before logging in.", { id: loadingToast, duration: 6000 });
      onToggle();

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Account exists. Ask your workspace Admin to 'Direct Assign' your email.", { id: loadingToast });
      } else {
        toast.error(error.message || "Sign up failed or bot detected.", { id: loadingToast });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading("Connecting to Google...");
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const { user } = userCredential;
      const details = getAdditionalUserInfo(userCredential);

      if (details?.isNewUser) {
        toast.loading("Setting up your workspace...", { id: loadingToast });
        
        let orgId = "";
        let role = "admin";
        let orgName = `${user.displayName || 'User'}'s Workspace`;
        let isNewOrg = false;

        if (inviteCode && inviteCode.trim() !== "") {
          const inviteRef = doc(db, "invites", inviteCode.trim());
          const inviteSnap = await getDoc(inviteRef);

          if (inviteSnap.exists()) {
            const data = inviteSnap.data();
            orgId = data.orgId;
            role = data.role;
          } else {
            toast.error("Invalid invite link. Creating a personal workspace instead.", { id: loadingToast, duration: 4000 });
            const newOrgRef = doc(collection(db, "organizations"));
            orgId = newOrgRef.id;
            isNewOrg = true;
          }
        } else {
          const newOrgRef = doc(collection(db, "organizations"));
          orgId = newOrgRef.id;
          isNewOrg = true;
        }

        // Database Writes
        if (isNewOrg) {
          await setDoc(doc(db, "organizations", orgId), { name: orgName, createdAt: new Date() });
        }

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
          role,
          joinedAt: new Date()
        });
        
        toast.success("Account created successfully!", { id: loadingToast });
      } else {
        toast.success("Account already exists. Welcome back!", { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(error.message || "Google sign-up failed.", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-md mx-4 sm:mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">Get Started</h2>
      <p className="text-gray-500 mb-6 text-xs md:text-sm">Create your professional account today.</p>
      
      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
            <input type="text" disabled={isLoading} className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base disabled:bg-gray-100 disabled:text-gray-400" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
            <input type="email" disabled={isLoading} className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base disabled:bg-gray-100 disabled:text-gray-400" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
            <input type="password" disabled={isLoading} placeholder="Min 8 chars, 1 uppercase, 1 special" className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base disabled:bg-gray-100 disabled:text-gray-400" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Confirm Password</label>
            <input type="password" disabled={isLoading} placeholder="Repeat your password" className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base disabled:bg-gray-100 disabled:text-gray-400" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Workspace Invite Code</label>
            <input type="text" disabled={isLoading} className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm md:text-base disabled:text-gray-400" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Optional" />
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-[#4338CA] text-white p-2.5 md:p-3 rounded-lg font-bold shadow-indigo-200 shadow-lg hover:bg-[#3730A3] transition text-sm md:text-base mt-2 disabled:opacity-70 flex justify-center items-center h-12"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Create Account"
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
          onClick={handleGoogleSignUp} 
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
        className="mt-6 text-sm text-gray-500 hover:text-[#4338CA] w-full text-center font-medium disabled:opacity-50"
      >
        Already have an account? <span className="text-[#4338CA]">Sign in</span>
      </button>
    </div>
  );
}
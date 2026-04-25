import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithPopup, getAdditionalUserInfo } from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, googleProvider } from "../lib/firebase";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import toast from "react-hot-toast";

export default function SignUp({ onToggle, initialInviteCode }: { onToggle: () => void, initialInviteCode: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInviteCode || "");
  const { executeRecaptcha } = useGoogleReCaptcha();

  const validatePassword = (pass: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pass);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(password)) {
      toast.error("Password must be 8+ chars and include uppercase, lowercase, number, and special character.");
      return;
    }

    const loadingToast = toast.loading("Securing connection...");

    try {
      if (!executeRecaptcha) {
        toast.error("Captcha is not ready yet.", { id: loadingToast });
        return;
      }

      // 1. Generate v3 Token silently
      const token = await executeRecaptcha("signup");

      // 2. Verify Token with Cloud Function
      const verifyCaptcha = httpsCallable(functions, "verifyCaptcha");
      await verifyCaptcha({ token });

      toast.loading("Processing...", { id: loadingToast });

      let orgId = "";
      let role = "admin";
      let orgName = `${name}'s Workspace`; 

      // 3. Organization Logic
      if (inviteCode && inviteCode.trim() !== "") {
        const inviteRef = doc(db, "invites", inviteCode.trim());
        const inviteSnap = await getDoc(inviteRef);

        if (inviteSnap.exists()) {
          const data = inviteSnap.data();
          orgId = data.orgId;
          role = data.role;
        } else {
          toast.error("Invalid invite link. Leave blank to create a new workspace.", { id: loadingToast });
          return;
        }
      } else {
        // Create a BRAND NEW organization document with a unique ID
        const newOrgRef = doc(collection(db, "organizations"));
        orgId = newOrgRef.id;
        
        await setDoc(newOrgRef, {
          name: orgName,
          createdAt: new Date()
        });
      }

      // 4. Create Authentication Account
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      
      // 5. Send Verification Email
      await sendEmailVerification(user);

      // 6. Create User Profile
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        activeOrgId: orgId,
        onboardingCompleted: false,
        createdAt: new Date()
      });

      // 7. Create Membership Record
      await addDoc(collection(db, "users", user.uid, "memberships"), {
        orgId,
        role,
        joinedAt: new Date()
      });

      toast.success("Account created! Please check your email to verify.", { id: loadingToast, duration: 5000 });
      onToggle();

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Account exists. Ask your workspace Admin to 'Direct Assign' your email.", { id: loadingToast });
      } else {
        toast.error(error.message || "Sign up failed or bot detected.", { id: loadingToast });
      }
    }
  };

  const handleGoogleSignUp = async () => {
    const loadingToast = toast.loading("Connecting to Google...");
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const { user } = userCredential;
      const details = getAdditionalUserInfo(userCredential);

      // Only run setup if they are a brand new user
      if (details?.isNewUser) {
        toast.loading("Setting up your workspace...", { id: loadingToast });
        
        let orgId = "";
        let role = "admin";
        let orgName = `${user.displayName || 'User'}'s Workspace`;

        // Check Invite Code for Google Signups too
        if (inviteCode && inviteCode.trim() !== "") {
          const inviteRef = doc(db, "invites", inviteCode.trim());
          const inviteSnap = await getDoc(inviteRef);

          if (inviteSnap.exists()) {
            const data = inviteSnap.data();
            orgId = data.orgId;
            role = data.role;
          } else {
            // Fallback: If invite is invalid but Auth is already created via Google, just create a new workspace
            toast.error("Invalid invite link. Creating a personal workspace instead.", { id: loadingToast, duration: 4000 });
            const newOrgRef = doc(collection(db, "organizations"));
            orgId = newOrgRef.id;
            await setDoc(newOrgRef, { name: orgName, createdAt: new Date() });
          }
        } else {
          const newOrgRef = doc(collection(db, "organizations"));
          orgId = newOrgRef.id;
          await setDoc(newOrgRef, { name: orgName, createdAt: new Date() });
        }

        // Create User Profile
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: user.displayName || "Google User",
          email: user.email,
          activeOrgId: orgId,
          onboardingCompleted: false,
          createdAt: new Date()
        });

        // Create Membership Record
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
    }
  };
  
  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-md mx-4 sm:mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">Get Started</h2>
      <p className="text-gray-500 mb-6 text-xs md:text-sm">Create your professional account today.</p>
      
      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
            <input type="text" className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
            <input type="email" className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
            <input type="password" placeholder="Min 8 chars, 1 uppercase, 1 special" className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4338CA] outline-none text-sm md:text-base" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Workspace Invite Code</label>
            <input type="text" className="w-full mt-1 p-2.5 md:p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm md:text-base" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Optional" />
        </div>
        
        <button type="submit" className="w-full bg-[#4338CA] text-white p-2.5 md:p-3 rounded-lg font-bold shadow-indigo-200 shadow-lg hover:bg-[#3730A3] transition text-sm md:text-base mt-2">
          Create Account
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
          className="mt-4 w-full bg-white border border-gray-200 text-gray-700 p-3 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center space-x-2"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          <span>Google</span>
        </button>
      </div>

      <button onClick={onToggle} className="mt-6 text-sm text-gray-500 hover:text-[#4338CA] w-full text-center font-medium">
        Already have an account? <span className="text-[#4338CA]">Sign in</span>
      </button>
    </div>
  );
}
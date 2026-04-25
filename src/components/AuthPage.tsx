import { useState, useEffect } from "react";
import Login from "./Login";
import SignUp from "./SignUp";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("inviteCode");
    if (code) {
      setInviteCode(code);
      setIsLogin(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      {isLogin ? (
        <Login onToggle={() => setIsLogin(false)} />
      ) : (
        <SignUp onToggle={() => setIsLogin(true)} initialInviteCode={inviteCode} />
      )}
    </div>
  );
}
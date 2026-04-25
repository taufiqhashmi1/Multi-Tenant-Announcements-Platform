import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./lib/firebase"; // Adjust to "./lib/firebase" if needed
import { Toaster } from "react-hot-toast";
import AuthPage from "./components/AuthPage";
import Onboarding from "./components/Onboarding";
import Sidebar from "./components/Sidebar";
import AnnouncementsFeed from "./components/AnnouncementsFeed";
import Dashboard from "./components/Dashboard";
import DummyPage from "./components/DummyPage";
import Stakeholders from "./components/Stakeholders";
import Settings from "./components/Settings";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("Announcements");

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Listen to the Firestore profile to check onboarding and active org
        unsubscribeProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        // Kill the profile listener immediately upon logout
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
      }
    });

    // Cleanup both listeners if the App unmounts
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-[#4338CA] animate-pulse font-bold text-xl">
        Loading Portfoliomate...
      </div>
    );
  }
  
  // 1. Not authenticated -> Show Login/Signup
  if (!user) return <AuthPage />;
  
  // 2. Authenticated but onboarding incomplete -> Show Onboarding
  if (userProfile && userProfile.onboardingCompleted === false) {
    return <Onboarding user={user} profile={userProfile} />;
  }

  // 3. Page Router
  const renderContent = () => {
    // Helper to get role (You can abstract this or just fetch it inside Stakeholders)
    const currentRole = userProfile?.role || "employee"; // Assuming you fetch role into profile or Stakeholders fetches it

    switch (activePage) {
      case "Dashboard":
        return <Dashboard user={user} activeOrgId={userProfile?.activeOrgId} />;
      case "Announcements":
        return <AnnouncementsFeed user={user} activeOrgId={userProfile?.activeOrgId} />;
      case "Stakeholders":
        return <Stakeholders activeOrgId={userProfile?.activeOrgId} currentUserRole={currentRole} />;
      case "Settings":
        return <Settings user={user} profile={userProfile} />;
      default:
        return <DummyPage title={activePage} />;
    }
  };

  // 4. Fully authenticated and onboarded -> Show Main App
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F8F9FA] text-gray-900 font-sans">
      <Toaster position="top-right" />
      <Sidebar 
        user={user} 
        activeOrgId={userProfile?.activeOrgId} 
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <main className="flex-1 p-4 md:p-8 ml-0 md:ml-64 mb-16 md:mb-0">
        {renderContent()}
      </main>
    </div>
  );
}
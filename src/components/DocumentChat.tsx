import { useState, useRef, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase"; // Adjust path to your firebase config
import toast from "react-hot-toast";
import ReactMarkdown from 'react-markdown';


interface Message {
  role: "user" | "ai";
  text: string;
}

interface DocumentChatProps {
  orgId: string;
  announcementId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentChat({ orgId, announcementId, isOpen, onClose }: DocumentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! I've read this document. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsLoading(true);

    try {
      const askQuestion = httpsCallable(functions, "askDocumentQuestion");
      const result = await askQuestion({
        orgId,
        announcementId,
        question: userText,
      });

      const data = result.data as { answer: string };
      setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);

    } catch (error: any) {
      console.error("Chat Error:", error);
      toast.error("Failed to get an answer. Check console for details.");
      setMessages((prev) => [...prev, { role: "ai", text: "Sorry, I ran into an error processing that." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900">Document Q&A</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === "user" 
                    ? "bg-indigo-600 text-white rounded-tr-sm" 
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.role === "user" ? (
                  msg.text
                ) : (
                  /* ReactMarkdown wrapper with custom Tailwind styling for Markdown elements */
                  <div className="[&>h3]:font-bold [&>h3]:text-base [&>h3]:mt-3 [&>h3]:mb-1 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-2 [&>p]:mb-2 [&>p:last-child]:mb-0 [&>strong]:font-semibold">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-sm shadow-sm flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSend} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this document..."
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
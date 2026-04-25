import { useState, useEffect, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Download, ThumbsUp, MessageCircle, Bot, Send, Trash2 } from "lucide-react";
import DOMPurify from "dompurify";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import type { User } from "firebase/auth";
import toast from "react-hot-toast";

interface AnnouncementCardProps {
  post: any;
  currentUser: User;
}

export default function AnnouncementCard({ post, currentUser }: AnnouncementCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  
  const isLiked = post.likedBy?.includes(currentUser.uid);
  const likesCount = post.likedBy?.length || 0;
  const isOwner = currentUser.uid === post.authorId;

  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, "announcements", post.id, "comments"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [showComments, post.id]);

  const handleToggleLike = async () => {
    const postRef = doc(db, "announcements", post.id);
    if (isLiked) {
      await updateDoc(postRef, { likedBy: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(postRef, { likedBy: arrayUnion(currentUser.uid) });
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      await addDoc(collection(db, "announcements", post.id, "comments"), {
        text: newComment,
        authorName: currentUser.displayName || currentUser.email?.split('@')[0],
        authorPhoto: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}`,
        authorId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      setNewComment("");
    } catch (error) {
      toast.error("Failed to post comment");
    }
  };

  const handleDeletePost = async () => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        await deleteDoc(doc(db, "announcements", post.id));
        toast.success("Announcement deleted");
      } catch (error) {
        toast.error("Failed to delete announcement");
      }
    }
  };

  const sanitizedContent = DOMPurify.sanitize(post.content);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {post.isPinned && (
        <div className="bg-[#4338CA] text-white text-xs font-bold uppercase px-4 py-1.5 flex items-center tracking-wider">
          ★ Pinned Announcement
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <img src={post.authorPhoto} alt="Author" className="w-10 h-10 rounded-full" />
              <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{post.authorName}</h4>
                    {post.authorName?.includes('Navya') ? (
                       <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Limited Partner</span>
                    ) : (
                       <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">Employee</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "Just now"}
                  </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
                {post.tags && (
                    <div className="hidden sm:flex gap-2">
                        {post.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                    </div>
                )}
                {isOwner && (
                   <button onClick={handleDeletePost} className="text-gray-400 hover:text-red-500 transition p-2 bg-gray-50 rounded-full">
                       <Trash2 size={16} />
                   </button>
                )}
            </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h3>
        
        <div className="text-gray-600 mb-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />

        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className={`grid gap-2 mb-4 ${post.imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {post.imageUrls.map((url: string, index: number) => (
                <img key={index} src={url} alt={`Attachment ${index + 1}`} className="w-full rounded-lg object-cover max-h-96 border border-gray-100" />
            ))}
          </div>
        )}

        {post.fileAttachments && post.fileAttachments.length > 0 && (
          <div className="space-y-2 mt-4">
             {post.fileAttachments.map((file: {url: string, name: string}, index: number) => {
                 const isPdf = file.name.toLowerCase().endsWith('.pdf');
                 return (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg gap-3">
                        <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2 bg-white rounded shadow-sm shrink-0">
                            <Download size={20} className="text-gray-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                            <a href={file.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-full transition">
                                Open
                            </a>
                            {isPdf && (
                            <button className="flex items-center space-x-2 text-sm font-semibold text-[#4338CA] bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition border border-indigo-100">
                                <Bot size={16} />
                                <span>Ask Donna</span>
                            </button>
                            )}
                        </div>
                    </div>
                 )
             })}
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-gray-100 flex items-center space-x-6 text-sm bg-gray-50/50">
        <button onClick={handleToggleLike} className={`flex items-center space-x-2 transition ${isLiked ? 'text-[#4338CA] font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
          <ThumbsUp size={18} className={isLiked ? "fill-current" : ""} /> 
          <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition">
          <MessageCircle size={18} /> <span>Comment</span>
        </button>
      </div>

      {showComments && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-4">
           {comments.length > 0 ? (
              <div className="space-y-4 mb-4 max-h-64 overflow-y-auto pr-2">
                 {comments.map(comment => (
                    <div key={comment.id} className="flex space-x-3">
                       <img src={comment.authorPhoto} alt="User" className="w-8 h-8 rounded-full" />
                       <div className="flex-1 bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                          <h5 className="font-semibold text-xs text-gray-900">{comment.authorName}</h5>
                          <p className="text-sm text-gray-600 mt-1">{comment.text}</p>
                       </div>
                    </div>
                 ))}
              </div>
           ) : (
             <p className="text-xs text-gray-500 mb-4">Be the first to comment...</p>
           )}
           
           <form onSubmit={handleAddComment} className="flex items-center space-x-3">
              <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}`} alt="You" className="w-8 h-8 rounded-full" />
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Write a comment..." 
                  className="w-full pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1.5 p-1 text-[#4338CA] disabled:text-gray-300">
                  <Send size={16} />
                </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
}
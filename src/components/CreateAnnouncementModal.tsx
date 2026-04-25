import { useState, type KeyboardEvent } from "react";
import type { User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { X, Image as ImageIcon, Paperclip, Megaphone, Bold, Italic, Strikethrough, List, ListOrdered } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface ModalProps {
  user: User;
  onClose: () => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center space-x-1 border-b border-gray-200 p-2 bg-gray-50/50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1.5 rounded-lg transition ${editor.isActive('bold') ? 'bg-indigo-100 text-[#4338CA]' : 'text-gray-500 hover:bg-gray-200'}`}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded-lg transition ${editor.isActive('italic') ? 'bg-indigo-100 text-[#4338CA]' : 'text-gray-500 hover:bg-gray-200'}`}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded-lg transition ${editor.isActive('strike') ? 'bg-indigo-100 text-[#4338CA]' : 'text-gray-500 hover:bg-gray-200'}`}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </button>
      <div className="w-px h-5 bg-gray-300 mx-1"></div>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded-lg transition ${editor.isActive('bulletList') ? 'bg-indigo-100 text-[#4338CA]' : 'text-gray-500 hover:bg-gray-200'}`}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded-lg transition ${editor.isActive('orderedList') ? 'bg-indigo-100 text-[#4338CA]' : 'text-gray-500 hover:bg-gray-200'}`}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
    </div>
  );
};

export default function CreateAnnouncementModal({ user, onClose }: ModalProps) {
  const [title, setTitle] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'What would you like to share?',
        emptyEditorClass: 'cursor-text before:content-[attr(data-placeholder)] before:text-gray-400 before:absolute before:pointer-events-none',
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 text-gray-700',
      },
    },
  });

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handlePublish = async () => {
    const htmlContent = editor?.getHTML() || "";
    if (!title || htmlContent === "<p></p>") return;
    setUploading(true);

    try {
      const imageUrls: string[] = [];
      const fileAttachments: { url: string; name: string }[] = [];

      if (images.length > 0) {
        const imageUploads = images.map(async (image) => {
          const imageRef = ref(storage, `announcements/images/${Date.now()}_${image.name}`);
          await uploadBytes(imageRef, image);
          return getDownloadURL(imageRef);
        });
        imageUrls.push(...(await Promise.all(imageUploads)));
      }

      if (files.length > 0) {
        const fileUploads = files.map(async (file) => {
          const fileRef = ref(storage, `announcements/files/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          return { url, name: file.name };
        });
        fileAttachments.push(...(await Promise.all(fileUploads)));
      }

      await addDoc(collection(db, "announcements"), {
        title,
        content: htmlContent,
        tags,
        authorName: user.displayName || user.email?.split('@')[0],
        authorPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        isPinned,
        imageUrls,
        fileAttachments,
        likedBy: []
      });

      onClose();
    } catch (error) {
      console.error("Error posting:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-indigo-100 text-[#4338CA] rounded-lg">
                 <Megaphone size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-900">New Announcement</h2>
                <p className="text-xs text-gray-500">Broadcast an update to your organization</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <input
              type="text"
              placeholder="Enter a compelling title..."
              className="w-full text-2xl font-bold border-none outline-none placeholder-gray-300"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex space-x-4 border-b border-gray-100 pb-4">
            <label className="flex items-center space-x-2 text-sm text-[#4338CA] cursor-pointer font-medium hover:bg-indigo-50 px-3 py-2 rounded-lg transition">
              <ImageIcon size={18} />
              <span>Add Images</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setImages(Array.from(e.target.files || []))} />
            </label>
            <label className="flex items-center space-x-2 text-sm text-[#4338CA] cursor-pointer font-medium hover:bg-indigo-50 px-3 py-2 rounded-lg transition">
              <Paperclip size={18} />
              <span>Attach Files</span>
              <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </label>
          </div>

          {(images.length > 0 || files.length > 0) && (
              <div className="flex flex-col space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {images.map((img, i) => <span key={i}>🖼️ {img.name}</span>)}
                  {files.map((file, i) => <span key={i}>📄 {file.name}</span>)}
              </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Message Content</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
               <MenuBar editor={editor} />
               <EditorContent editor={editor} className="cursor-text" onClick={() => editor?.commands.focus()} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Classification Tags</label>
               <div className="flex flex-wrap gap-2 mb-2">
                 {tags.map(tag => (
                   <span key={tag} className="flex items-center space-x-1 bg-white border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                     <span>{tag}</span>
                     <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-gray-900"><X size={12}/></button>
                   </span>
                 ))}
               </div>
               <input
                 type="text"
                 placeholder="Add tags and press enter"
                 className="w-full bg-transparent border-none outline-none text-sm placeholder-gray-400"
                 value={tagInput}
                 onChange={(e) => setTagInput(e.target.value)}
                 onKeyDown={handleTagKeyDown}
               />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Pin Announcement</h4>
                    <p className="text-xs text-gray-500">Keep at the top of organization feed</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isPinned} onChange={() => setIsPinned(!isPinned)} />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4338CA]"></div>
                </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
          <button onClick={onClose} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition">Cancel</button>
          <button 
            onClick={handlePublish}
            disabled={uploading || !title}
            className="px-6 py-2 bg-[#4338CA] text-white font-medium rounded-lg disabled:opacity-50 hover:bg-[#3730A3] transition shadow-sm"
          >
            {uploading ? "Publishing..." : "Publish Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
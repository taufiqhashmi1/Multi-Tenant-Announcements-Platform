# Portfoliomate: AI-Powered Multi-Tenant Announcement Platform

Portfoliomate is a secure, multi-tenant workspace platform designed for VC firms and organizations to manage announcements and interact with complex documents via **Donna**, a specialized RAG (Retrieval-Augmented Generation) AI assistant.

**Live URL:** [https://portfoliomate-bc6de.web.app/](https://portfoliomate-bc6de.web.app/)  
**GitHub Repository:** [https://github.com/taufiqhashmi1/Multi-Tenant-Announcements-Platform](https://github.com/taufiqhashmi1/Multi-Tenant-Announcements-Platform)

---

## 🛠 Tech Stack
* **Frontend:** React (Vite), TypeScript, Tailwind CSS, Lucide Icons, React Markdown.
* **Backend:** Firebase Cloud Functions (Node.js/TypeScript).
* **Database:** Firestore (NoSQL) with Native Vector Search.
* **AI Engine:** Google Gemini (3-preview) & Gemini Text Embeddings (001).
* **Storage:** Firebase Cloud Storage.
* **Security:** Google reCAPTCHA v3.

---

## 🔐 Industry-Grade Security & Authentication

Portfoliomate isn't just a prototype; it's built with the security rigors required for financial and venture capital environments.

### 1. Multi-Tenant Architecture (Isolation by Design)
Data isolation is handled at the **database path level**. Each organization resides in its own document tree. 
* **Path-Based Segmentation:** Announcements are sub-collections of an Organization. This ensures that a query for "all announcements" is physically impossible without specifying a valid `orgId`.
* **The "Last Line of Defense":** Firestore Security Rules perform a server-side check on every request. Even if a user intercepts a valid `orgId`, the rule `exists(/databases/.../memberships/$(request.auth.uid))` ensures only verified members can read the data.

### 2. Robust Authentication
* **Firebase Auth:** Implemented secure Email/Password and Google OAuth providers.
* **JWT Validation:** Every call to the backend Cloud Functions is gated by Firebase ID Tokens, ensuring only authenticated users can trigger AI processing or member management.

### 3. Bot Defense (reCAPTCHA v3)
To prevent automated spam or brute-force account creation, we implemented **reCAPTCHA v3**. 
* **Score-Based Verification:** Every critical action (like account creation or document queries) is verified via a Cloud Function that checks the user's reCAPTCHA score against Google’s site-verify API.

### 4. Secret Management
* **Google Cloud Secret Manager:** Sensitive keys like the `GEMINI_API_KEY` and `RECAPTCHA_SECRET_KEY` are never stored in the source code or local `.env` files for production. They are injected into the environment at runtime using encrypted secret vaults.

---

## 🤖 AI Implementation (The "Donna" Pipeline)

I built a custom RAG (Retrieval-Augmented Generation) pipeline from scratch:

1.  **Ingestion:** When a PDF is uploaded, a Storage Trigger fires a Cloud Function.
2.  **Processing:** Using `pdfjs-dist`, text is extracted page-by-page.
3.  **Vectorization:** Text is chunked (1000 characters with 200-character overlap) and converted into 768-dimensional vectors.
4.  **Retrieval:** When a user asks a question, the question is vectorized, and Firestore performs a **Cosine Similarity** search to find the 5 most relevant context chunks.
5.  **Generation:** Gemini 1.5-Flash uses the retrieved context to provide a grounded, accurate answer.

---

## 📊 Database Schema

### Organization Document
`organizations/{orgId}`
```json
{
  "name": "Sequoia Capital",
  "createdAt": "2026-04-26T12:00:00Z",
  "adminUid": "user_abc_123"
}
```

### Announcement Document
`organizations/{orgId}/announcements/{announcementId}`
```json
{
  "title": "Quarterly Forensic Report",
  "content": "Summary text...",
  "pdfUrl": "https://firebasestorage...",
  "status": "ready"
}
```

---

## 🚀 Challenges Faced & Lessons Learned

* **PDF Parsing Module Issues:** Resolved interop issues between CommonJS and ESM by switching to `pdfjs-dist` (v3) and using `@ts-ignore` for deep path resolution in Node.js.
* **Firestore Batch Limits:** Implemented safety truncation at 499 chunks to respect Firestore's atomic batch limits.
* **Vector Dimensionality:** Learned to slice 3072-dimension Gemini embeddings to 768 dimensions to fit within Firestore's native vector search constraints.

---

## 🔮 Future Scope

1.  **Conversational Memory:** Currently, Donna treats each question as a new session. Future updates will include passing a `chatHistory` array to allow for follow-up questions.
2.  **OCR Support:** Integrating Google Vision API to allow Donna to read scanned PDF documents and images.
3.  **Granular RBAC (Role-Based Access Control):** Adding specific roles (Viewer, Editor, Analyst) within a single VC firm.
4.  **Automated Summarization:** Implementing "Option A" to auto-extract funding amounts, startup names, and executive summaries immediately upon upload.
5.  **Analytics Dashboard:** Tracking which announcements or pitch decks are getting the most interaction from firm members.

---

## 🛠 Installation & Deployment

1.  **Clone:** `git clone [repo-url]`
2.  **Install:** `npm install` (in root and functions folders).
3.  **Build:** `npm run build`
4.  **Deploy:** `firebase deploy`

---

### **Submission Checklist Check**
* [x] **MVP:** Responsive UI, Auth, Firestore real-time feed, Storage.
* [x] **Bonus AI:** Document Q&A (Donna).
* [x] **Architecture Document:** Schema and Multi-tenant security rules documented.
* [x] **Deployment:** Live URL provided.
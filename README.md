# Portfoliomate: AI-Powered Multi-Tenant Announcement Platform

Portfoliomate is a secure, multi-tenant workspace platform designed for VC firms and organizations to manage announcements and interact with complex documents via **Donna**, a specialized RAG (Retrieval-Augmented Generation) AI assistant.

**Live URL:** https://portfoliomate-bc6de.web.app/  
**GitHub Repository:** https://github.com/taufiqhashmi1/Multi-Tenant-Announcements-Platform

---

## 🛠 Tech Stack
* **Frontend:** React (Vite), TypeScript, Tailwind CSS, React Markdown.
* **Backend:** Firebase Cloud Functions (Node.js), Firebase Auth.
* **Database:** Firestore (NoSQL) with Vector Search.
* **AI Engine:** Google Gemini (gemini-1.5-flash) & Gemini Embeddings.
* **Storage:** Firebase Cloud Storage.

---

## 📊 Database Schema

Portfoliomate follows a nested sub-collection hierarchy to ensure data isolation.

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
  "content": "Summary text of the announcement...",
  "pdfUrl": "https://firebasestorage...",
  "authorId": "user_xyz_789",
  "createdAt": "2026-04-26T14:30:00Z",
  "status": "ready"
}
```

### Document Chunks (For Vector Search)
`organizations/{orgId}/announcements/{announcementId}/chunks/{chunkId}`
```json
{
  "text": "Extracted paragraph from PDF...",
  "embedding": [0.123, -0.456, 0.789, "..."], // 768-dimension vector
  "chunkIndex": 0,
  "createdAt": "2026-04-26T14:35:00Z"
}
```

---

## 🔒 Multi-Tenant Security

### Architectural Strategy
Data isolation is achieved through **Path-Based Segmentation**. By nesting announcements under a specific `orgId`, we create a physical boundary for every request. An employee's access is validated against their `memberships` sub-collection in their user profile.

### Firestore Security Rules
To guarantee that an employee at **Firm A** can never fetch an announcement from **Firm B**, we use the following rules:

```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper to check if user belongs to the organization
    function isMember(orgId) {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid)/memberships/$(orgId));
    }

    match /organizations/{orgId} {
      // Users can only read org details if they are members
      allow read: if isMember(orgId);

      match /announcements/{announcementId} {
        // Strict isolation: Access granted only if orgId exists in user's memberships
        allow read, write: if isMember(orgId);

        match /chunks/{chunkId} {
          allow read: if isMember(orgId);
        }
      }
    }
  }
}
```

---

## 🤖 AI Usage & Implementation

I utilized AI (Gemini/ChatGPT) as a **collaborative architect and debugger**. 

**How I used AI:**
1.  **RAG Pipeline Design:** Prompted for the most efficient way to slice PDF text into embeddings and store them for "Donna."
2.  **Complex Debugging:** Resolved deep module interop issues between CommonJS (pdf-parse) and ESM (Vite/TypeScript) that occurred during Cloud Function deployment.
3.  **UI Components:** Generated the initial skeleton for the `DocumentChat.tsx` modal and adjusted Tailwind animations for a "slide-in" effect.

---

## 🚀 Challenges Faced & Lessons Learned

### 1. The PDF Parsing "Mangle"
**Problem:** Initially, using `pdf-parse` caused the Cloud Function to crash because the TypeScript bundler was wrapping the library in an unusable object during deployment.
**Lesson:** I learned the importance of **Module Interoperability**. I ultimately pivoted to Mozilla’s `pdfjs-dist` (v3), a more modern and stable library, and used `@ts-ignore` to handle deep-path imports that the TypeScript compiler couldn't resolve statically.

### 2. Firestore Batch Limits
**Problem:** When processing a 6MB PDF, the system generated over 800 text chunks. Firestore has a hard limit of 500 operations per batch write.
**Lesson:** I implemented a **Hard Truncation** (499 chunks) as a safety measure and learned that for production-scale apps, I would need to implement a recursive loop to commit multiple batches for larger files.

### 3. Vector Dimensionality
**Problem:** The `gemini-embedding-001` model produces 3072 dimensions, but Firestore Vector Search supports a maximum of 2048.
**Lesson:** I learned about **Matryoshka Embeddings**. By slicing the vector to 768 dimensions, I maintained search accuracy while fitting within the database constraints.

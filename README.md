# Portfoliomate Announcements Feed

This React + TypeScript + Vite project is a complete announcements feed for a multi-tenant private equity collaboration platform.

## What is included

- Firebase Authentication with Google sign-in and email/password.
- Firestore-backed real-time announcements feed.
- File attachments uploaded to Firebase Storage.
- Automatic AI summarization of PDF attachments when a PDF is uploaded.
- Tenant isolation by email domain.
- Tailwind CSS for responsive UI styling.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Add Firebase and AI configuration in a `.env` file at the project root.

3. Start the dev server:

```bash
npm run dev
```

## Required environment variables

Create a `.env` file with:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_DATABASE_URL=
VITE_GEMINI_API_KEY=
```

If `VITE_GEMINI_API_KEY` is not configured, the app will still work and the announcement will save normally, but AI PDF summarization will return a placeholder note.

## Announcement schema

Each Firestore document in the `posts` collection follows this structure:

```json
{
  "text": "Announcement message text",
  "tenantId": "firm.com",
  "authorId": "uid123",
  "attachments": ["https://..."],
  "aiSummary": {
    "startupName": "Example LLC",
    "fundingAmount": "$3M",
    "summary": "Two-sentence summary of the attached PDF."
  },
  "createdAt": "serverTimestamp"
}
```

## Multi-tenant security

Tenant isolation is enforced by deriving `tenantId` from the authenticated user's email domain.

Example security rules:

- Firestore: only allow reads and writes for posts where `tenantId` matches the user's email domain.
- Storage: only allow file uploads to the tenant-specific storage path.

### Example Firestore rule

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function tenantIdFromAuth() {
      return request.auth.token.email.split("@")[1];
    }

    match /posts/{postId} {
      allow read, update, delete: if request.auth != null
        && resource.data.tenantId == tenantIdFromAuth();
      allow create: if request.auth != null
        && request.resource.data.tenantId == tenantIdFromAuth();
    }
  }
}
```

### Example Storage rule

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tenants/{tenantId}/announcements/{allPaths=**} {
      allow read, write: if request.auth != null
        && request.auth.token.email.split("@")[1] == tenantId;
    }
  }
}
```

## Notes

- File attachments can be images or PDFs.
- The AI integration reads attached PDFs and automatically extracts startup name, funding amount, and a short summary.
- The feed updates in real time via Firestore snapshot listeners.

## Next steps

- Deploy to Firebase Hosting, Vercel, or Netlify.
- Add richer attachment metadata to preserve file names and types.
- Expand AI support to include document Q&A.

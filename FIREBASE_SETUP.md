# Firebase Setup Instructions

## Fixing "auth/unauthorized-domain" Error

This error occurs because the preview domain is not authorized in Firebase. Follow these steps:

### 1. Get Your Preview Domain
Your app is running on a v0.dev preview URL like: `https://[your-project-id].v0.app`

### 2. Add Domain to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **cicloturismo-35fd8**
3. Navigate to **Authentication** > **Settings** > **Authorized domains**
4. Click **Add domain**
5. Add these domains:
   - `localhost` (for local development)
   - `v0.app` (for v0 preview)
   - Your specific preview URL (e.g., `abc123.v0.app`)
   - Your production domain (when deploying)

### 3. Update Firestore Security Rules

The current rules block ALL access. You need to update them:

1. Go to **Firestore Database** > **Rules**
2. Replace the rules with the content from `scripts/firestore-rules.sql`
3. Click **Publish**

## Current Firebase Configuration

- **Project ID**: cicloturismo-35fd8
- **Auth Domain**: cicloturismo-35fd8.firebaseapp.com
- **Storage Bucket**: cicloturismo-35fd8.firebasestorage.app

## Security Rules Explanation

**Inscripciones (Registrations)**:
- ✅ Anyone can create (public registration form)
- ✅ Authenticated users can read (admin dashboard)
- ✅ Authenticated users can update (approve/reject)
- ❌ Public cannot read/update without auth

**Important**: In production, add an `admins` collection with authorized user IDs and verify admin role before allowing updates.

## Testing

After updating:
1. Try Google sign-in again
2. Submit a test registration
3. Log in as admin and verify you can see/approve registrations

## Production Deployment

When deploying to production:
1. Add your production domain to authorized domains
2. Consider adding admin role verification
3. Set up proper environment variables
4. Enable email notifications (currently commented out)

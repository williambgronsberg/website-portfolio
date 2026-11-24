# website-portfolio

My portfolio at [williambgronsberg.no](https://williambgronsberg.no), with a built-in publish system.

**Cost:** 0 NOK/month
**Platform:** GitHub Pages + Firebase free tier (Spark), with Cloudinary's free tier optional
**Stack:** Vue 3 + Vite + TypeScript, set up the same way as `pc_loaner`

Log in at `/admin` to add, edit, reorder, hide or publish **projects**, **mockups** and **articles**. Changes show up on the site right away with no redeploy. Code changes deploy automatically when you push to `main`.

---

## How it works

| Part | What it does |
|---|---|
| `src/views/HomeView.vue` | Home page. Shows published items marked "Show on home page" |
| `src/views/AllProjectsView.vue` | `/projects`, every published project, with tag filters |
| `src/views/ItemView.vue` | `/p/<slug>`, the detail page (same layout as the Edge report) |
| `src/views/AdminView.vue` | `/admin`, the publish panel |
| `src/composables/useContent.ts` | Reads from and writes to Firestore |
| `firestore.rules` | Anyone can read published items. Only admins can see drafts or write |
| `public/` | Static files copied as-is (images, the old `project-side-edge` pages, CNAME) |

Without a Firebase config, the site still runs and shows the content from `src/seed/seed.ts`.

---

## Setup (once)

### 1. Create a Firebase project (free)
1. Go to the [Firebase Console](https://console.firebase.google.com) and click **Add project**.
2. Stay on the **Spark (free)** plan. Don't upgrade, and don't enable Storage, because it needs the paid plan.

### 2. Firestore
1. Go to **Firestore Database**, then **Create database**, and pick the region `europe-west1`.
2. Under **Rules**, paste in the contents of `firestore.rules` and click **Publish**.

### 3. Login
1. Go to **Authentication**, then **Get started**, and enable **Email/Password**.
2. Under **Users**, click **Add user** and enter your email and a strong password.
3. Copy the user's **User UID**.
4. In **Firestore**, create a collection `admins` with a document whose **ID is your UID**. It needs no fields (add a dummy field if the console insists).

Only users with a document in `admins` can publish. Anyone else who signs in is turned away.

### 4. Web config
1. Go to **Project settings**, then **Your apps**, then **Web**, and register an app. Don't tick Hosting.
2. Put the `VITE_FIREBASE_*` values in `.env.production`, which is committed and used by the GitHub Actions build, and in `.env` for local development (see `.env.example`). The web config isn't secret: it ships in the site's JavaScript anyway, and `firestore.rules` controls access.

### 5. Media (pick one)
- **Free, no extra account:** put images and videos in `public/assets/…`, push, then in the admin panel enter the path, for example `/assets/img/photo.jpg`. Any image URL works too.
- **Upload from the admin panel (free Cloudinary account, no card):**
  1. Create an account at [cloudinary.com](https://cloudinary.com).
  2. Go to **Settings → Upload → Add upload preset** and set **Signing mode: Unsigned**. Restrict it to images and videos and set a max file size.
  3. Add `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` to `.env` and `.env.production`.

  An unsigned preset lets anyone who finds it upload to your Cloudinary account. The free plan has hard limits, so the worst case is hitting the quota, not a bill.

### 6. GitHub Pages
1. Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Check that the custom domain is still `williambgronsberg.no`.
3. In Firebase, go to **Authentication → Settings → Authorized domains** and add `williambgronsberg.no`.

### 7. Import the existing content
Log in at `/admin` and click **Import existing content**. It adds the 11 cards from the old site.

---

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build to dist/
npm run preview    # serve dist/ like GitHub Pages
```

## Firebase free tier limits

| Resource | Limit |
|---|---|
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| Firestore storage | 1 GB |

A portfolio uses a tiny fraction of this. On the Spark plan, Firebase stops serving when a limit is hit. It never bills you.

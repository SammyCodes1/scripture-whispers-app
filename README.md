# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Bible versions: AMP, NIV and NKJV (API.Bible)

HolyWord can show the **Amplified Bible (AMP)**, **NIV (2011)** and **New King James Version (NKJV)**
through [API.Bible](https://scripture.api.bible). These texts are copyrighted: they are fetched live,
never bundled in this repo, and never offered for offline download.

**How it works**

- `supabase/functions/bible-versions` is a server-side proxy (`https://rest.api.bible/v1`, header `api-key`).
  The key is the edge function secret `API_BIBLE_KEY` and never reaches the browser.
- Chapters are cached server-side in the `bible_chapter_cache` table, refreshed after 7 days and purged at 14
  (API.Bible allows at most 14). In the browser, licensed text is held in memory only (30 min), not in IndexedDB.
- Simple per-IP rate limit: 60 requests/minute (in-memory, per function instance).
- Bible IDs: AMP `a81b73293d3080c9-01`, NIV 2011 `78a9f6124f344018-01`, NKJV `63097d2a0a2f7db3-01`.
- If a licensed version fails (key missing, quota used up, API down, offline) the reader automatically shows the
  public-domain **Berean Standard Bible (BSB)** and tells the reader why. BSB comes from
  [helloao.org](https://bible.helloao.org) and needs no key.
- The exact copyright notice is shown under every passage (AMP and NKJV use the fixed publisher text, with
  www.Lockman.org linked for AMP; NIV uses the `copyright` field returned by the API).
- **FUMS** usage reporting (v3): requests use `fums-version=3`, the `fumsV3.min.js` tracker is loaded in
  `index.html`, and each displayed passage reports its `fumsToken` (falls back to the manual
  `https://fums.api.bible/f3` pixel if the script is blocked).
- Keyword search is not available for AMP/NIV/NKJV/BSB (switch to KJV/WEB to search).

**Setup**

1. Create an API.Bible account and an app, then under the app's *Plan* tab use *Edit Bible Licenses* to add
   **AMP, NIV 2011 and NKJV** (the free Starter plan allows 3 copyrighted Bibles).
2. Set the secret: `supabase secrets set API_BIBLE_KEY=... --project-ref <ref>` (or Dashboard -> Edge Functions -> Secrets).
   See `.env.example`.
3. Apply the migration `supabase/migrations/20261024120000_bible_chapter_cache.sql` (`supabase db push`).
4. Deploy: `supabase functions deploy bible-versions` (config sets `verify_jwt = false`; the function is rate limited).

**Licence limits to know**

- The free **Starter plan is non-commercial only**: no ads, paywalls or monetising the app.
- Commercial use needs API.Bible's paid plan, and **NIV commercial use is not available through API.Bible: it
  needs permission from Biblica directly.**
- Do not copy AMP/NIV/NKJV text into the repo or ship it as offline data.
- The existing `bible-msg` function (The Message) also uses `API_BIBLE_KEY` and is a licensed text too.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

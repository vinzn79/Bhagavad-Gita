# Shrimad Bhagavad Gita app: hosting and installing

This folder is the whole app. To install it on phones and computers, put it on a free website once. After that, anyone can open the link and install the app, and it works offline.

## Step 1: Put it online (one time, free)

**Option A: Netlify Drop (easiest, no coding)**
1. Unzip this file so you have the `gita-app` folder.
2. Open https://app.netlify.com/drop in a browser and sign up for a free account.
3. Drag the whole `gita-app` folder onto the page.
4. You get a link such as `https://something.netlify.app`. In Site settings you can change the name, for example `my-gita.netlify.app`.

**Option B: GitHub Pages**
1. Create a free GitHub account and a new public repository, for example `gita`.
2. Upload every file and folder from `gita-app`, keeping the folders as they are.
3. In the repository, go to Settings → Pages → Branch: `main`, folder `/ (root)` → Save.
4. Your app will be at `https://<your-username>.github.io/gita/`.

The link must start with `https://` for installing and offline use to work. Both options above give you that automatically.

## Step 2: Install on each device

**Android (Chrome)**
Open the link → tap the ⋮ menu → **Install app** or **Add to Home screen**.

**iPhone / iPad (Safari)**
Open the link in Safari → tap the **Share** button → **Add to Home Screen** → Add.

**Windows (Microsoft Edge or Google Chrome)**
Open the link → click the install icon at the right of the address bar, or open the menu → **Apps** → **Install this site as an app**. It then appears in the Start menu like any other program.

The first time you open the app it saves everything on the device. After that it works without internet.

## Updating later
Replace the files on Netlify (drag the new folder again) or on GitHub (upload the new files). Installed apps pick up the update the next time they're opened with internet, and you may need to close and reopen the app once.

## What's inside
- All 700 shlokas (plus the opening verse of Chapter 13 that some editions include), in chapter order.
- Sanskrit in Devanagari, plus automatic conversion into 13 other scripts.
- English and Hindi translation, meaning and "connects to" themes for every shloka.
- AI translations of the verses for Chapters 1–2 in Assamese, Bengali, Dogri, Gujarati, Kannada, Konkani, Maithili, Malayalam, Marathi, Nepali, Odia, Punjabi, Tamil, Telugu and Urdu. In every other case (Chapters 3–18 in these languages, plus Bodo, Kashmiri, Sindhi, Manipuri and Santali) the app shows the Sanskrit in the reader's script with the Hindi, Urdu or English text, and says which it is showing.
- Search, filter by theme, verse of the day, and adjustable text size.

## Sources and credits
- Sanskrit text: public-domain text from the open-source `gita/gita` project (Unlicense), renumbered to the standard 700-verse numbering.
- English and Hindi translations and meanings were written fresh for this app from the Sanskrit, following the traditional understanding. They are not copied from any published edition.
- Script conversion: Aksharamukha.
- Fonts: Noto, Tiro Devanagari Sanskrit and Cormorant Garamond, all under the SIL Open Font License.
- Illustrations: original artwork made for this app.

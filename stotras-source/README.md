# Stotras for All — gitaforall.in/stotras

Sahasranamas, stotras and mantras in Devanagari, English letters and Malayalam
script, with meanings in English, Hindi and Malayalam. Installable on Android,
iPhone/iPad and Windows, and works offline after the first visit.

## What is in this folder

| Folder / file | What it is |
|---|---|
| `stotras/` | **The finished website.** This is what goes on GitHub. |
| `data/` | One text file per prayer — edit these to fix text or meanings. See `data/HOW-TO-EDIT.md`. |
| `static/` | Design files: colours and layout (`css/style.css`), lotus pictures, app icons, offline support. |
| `build.py` | Turns `data/` + `static/` into the `stotras/` website. |

## Putting it on gitaforall.in (GitHub website upload)

1. Open your Gita repository on github.com.
2. Click **Add file → Upload files**.
3. Drag the whole **`stotras`** folder into the upload box (keep the folder — do not drag the files inside it one by one).
4. Click **Commit changes**.
5. After a minute or two, open **https://gitaforall.in/stotras/**

Your existing domain setting (CNAME) is not touched, so nothing else changes.

Optional: also upload this whole source folder (e.g. as `stotras-source/`) so the
editable text files are saved with your project.

## Link from the Gita home page

Add this anywhere in your Gita `index.html` (e.g. near the top or in the footer):

```html
<a href="stotras/">🪷 Stotras &amp; Mantras</a>
```

## Making changes later

```
pip install indic_transliteration
python build.py
```

Then upload the new `stotras` folder again (GitHub will replace the changed files).
Each build gets a new version number, so phones that installed the app pick up
the update automatically on their next visit.

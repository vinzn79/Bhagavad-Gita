HOW THE PRAYER FILES WORK
=========================

Each .txt file in this folder is one prayer page. To fix a word or a meaning,
edit the file in any text editor (Notepad is fine; save as UTF-8), then run
  python build.py
from the folder above. The finished website is written into the "stotras" folder.

You only type the Devanagari text and the meanings. The English letters
(Shuklaambaradharam ...) and the Malayalam script are produced automatically.

FILE LAYOUT
-----------
The top part (before the line "===") describes the page:

  slug: vishnu-sahasranamam        -> page address: gitaforall.in/stotras/vishnu-sahasranamam.html
  order: 1                         -> position within its group on the home page
  category: sahasranama            -> sahasranama | stotra | mantra | daily
  lang: hi                         -> only for Hindi/Awadhi texts like Hanuman Chalisa
                                      (drops the silent "a": "raj" not "raja")
  numbers: no                      -> optional: don't add verse numbers ॥ १ ॥
  title_en / title_hi / title_ml   -> page title in each language
  sub_en / sub_hi / sub_ml         -> short line under the title
  intro_en / intro_hi / intro_ml   -> introduction paragraph

After "===" come the verses. Leave ONE BLANK LINE between verses.

  # Dhyanam | ध्यानम् | ധ്യാനം      <- a section heading: English | Hindi | Malayalam

  ~श्रीभगवानुवाच                     <- a line starting with ~ is a small speaker/note line
  शुक्लाम्बरधरं विष्णुं शशिवर्णं चतुर्भुजम् ।
  प्रसन्नवदनं ध्यायेत् सर्वविघ्नोपशान्तये ॥   <- end with a bare ॥ and the number is added for you
  en: meaning in English
  hi: हिन्दी में अर्थ
  ml: മലയാളത്തിൽ അർത്ഥം

ADDING A NEW PRAYER
-------------------
Copy any existing file, give it a new name and a new "slug", change the text,
and run build.py. It appears on the home page automatically.

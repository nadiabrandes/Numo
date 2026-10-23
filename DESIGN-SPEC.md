# NUMO design notes

The four supplied mobile references define the visual system: white/light-blue surfaces; navy Hebrew headings; bold blue primary actions; purple secondary celebration accents; rounded cards and fields; soft corner decorations; and a small yellow round mascot with a star wand. The welcome view centers branding and configuration, the worksheet prioritizes a readable LTR expression beside an answer field, checking uses green/red/yellow backgrounds plus status icons, and completion uses a restrained celebration with corrected worksheet totals.

| Token | Value | Use |
|---|---|---|
| Primary blue | `#1677F2` | Main actions and progress |
| Deep blue | `#102C68` | Text and math expressions |
| Purple | `#7C4DFF` | Accent and completion |
| Cyan | `#25C6E8` | Logo accent |
| Yellow | `#FFC83D` | Mascot and unanswered state |
| Success | `#22C55E` | Correct answers |
| Error | `#EF4444` | Incorrect answers |
| Background | `#F8FAFF` | Page background |

Use a Hebrew-capable system font stack (no network fonts), logical RTL page flow, `dir="ltr"` on equations, generous touch targets, and a centered desktop shell that retains the mobile composition.

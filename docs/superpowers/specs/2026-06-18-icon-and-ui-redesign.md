# Redmine Focus — Icon & UI Redesign

## Scope

Dva nezávislé okruhy změn:
1. Nová app ikona + tray ikona s podporou light/dark mode
2. UI redesign: taby, kontrast, nastavitelná velikost písma, filtr "přiřazeno mně"

---

## 1. App ikona

### Tvar
Zaoblený čtverec (macOS styl, `rx="14"` na 64×64 viewBox) s:
- Indigo pozadí (`#4F46E5`)
- Bílý kruh uprostřed
- 3 diagonální bílé čáry procházející kruhem (styl Linear.app)
- Badge — malé indigo kolečko v pravém dolním rohu s bílou fajfkou (checkmark)

### Tray ikona
- Samostatný soubor: `src-tauri/icons/tray-icon.png` (32×32 a 64×64 @2x)
- Monochromatická černá PNG — macOS ji automaticky invertuje v dark mode (**template image**)
- Stejný motiv: kruh s diagonálními čarami + badge checkmark, ale celé černé bez pozadí
- V Tauri 2: nastavit jako template image pomocí `.icon_as_template(true)` na `TrayIconBuilder` v `main.rs`

### Výstup
- `src-tauri/icons/icon.svg` — master SVG pro generování všech formátů
- Vygenerovat `icon.png`, `icon.icns`, `icon.ico`, `32x32.png`, `128x128.png`, `128x128@2x.png` pomocí `npm run tauri icon`
- `src-tauri/icons/tray-icon.png` + `tray-icon@2x.png` — monochromatická template image

---

## 2. UI redesign

### Taby místo sidebaru

**Odebrat:** sidebar s projekty (levý panel)

**Přidat:** tři taby v horní části okna:
| Tab | Obsah |
|-----|-------|
| Moje tasky | Issues s `assigned_to_id = me` — výchozí tab |
| Urgentní | Issues s prioritou Urgent/High bez ohledu na přiřazení |
| Vše | Všechny otevřené issues (stávající chování) |

Aktivní tab vizuálně odlišen spodní čarou barvy `#818cf8` (indigo-400).

### Kontrast
- Primární text tasků: `#ffffff` (bylo `rgba(255,255,255,0.7)` nebo podobně slabé)
- Sekundární text (projekt · číslo): `rgba(255,255,255,0.5)`
- Sekce headers (URGENTNÍ, VYSOKÁ…): zachovat barevné kódování, zvýšit font-weight na 700
- Pozadí karet tasků: `rgba(255,255,255,0.04)`, hover `rgba(255,255,255,0.08)`
- Urgentní karty: `rgba(248,113,113,0.08)` (lehké červené podbarvení)

### Nastavitelná velikost písma
- Přidat do `store/config.ts` pole `fontSize: number` (výchozí: 14)
- Rozsah: 12–18px, krok 1px
- Ovládání: tlačítka `−` / `+` v patičce okna (Aa −/+)
- Aplikovat jako CSS variable `--task-font-size` na root element
- Hodnota se persistuje přes `save_config_cmd`

### Filtr "přiřazeno mně"
- Polling vždy fetchuje **všechny** issues (`fetch_now` bez filtru) — stávající chování
- Tab "Moje tasky": frontend filtruje store na `assignedTo.id == currentUserId`; `currentUserId` se načte jednou při startu z `/users/current.json` a uloží do config store
- Tab "Urgentní": frontend filtruje store na `priority.name in ["Urgent", "High", "Urgentní", "Vysoká"]`
- Tab "Vše": zobrazí celý store bez filtru

---

## Technické poznámky

- Tray ikona: změnit `main.rs` — místo `app.default_window_icon()` načíst dedikovaný tray soubor přes `Image::from_path` nebo `include_bytes!`
- Template image: volat `.set_icon_as_template(true)` na `TrayIconBuilder` pro macOS
- Sidebar component (`Sidebar.tsx`) se odebere, `App.tsx` dostane nový `activeTab` state
- `TaskList.tsx` přijme `filter: 'mine' | 'urgent' | 'all'` prop
- Zustand store (`store/tasks.ts`) může cachovat výsledky pro každý tab zvlášť

---

## Co se nemění

- Slide-in detail panel (`TaskDetail.tsx`) — beze změny
- Tlačítka Vyřeším / Předat v detailu — beze změny
- Polling interval — beze změny
- Settings formulář — přidat jen fontSize slider/input

# Integrated Systems — React + Tailwind SPA (эхлэл scaffold)

Олон СөХ-д (multi-tenant) зориулсан HOA удирдлагын систем. "suh" гэдэг нь ерөнхий ангиллын нэр (Сууц өмчлөгчдийн Холбоо) — брэнд БИШ. Feature-үүдийн код нэр (жиш: Cosmo=AI туслах) сансрын биетүүдийн цувралаас өгөгдөнө.

`projectcosmo.html` дизайны mockup-аас React+Tailwind бүтэцтэй scaffold болгож хөрвүүлсэн.

## Юуг аудит хийж, цэвэрлэсэн (эх HTML-ээс)

1. **`generateStaticOwnersRows()` устгав** — эх кодонд индексээс (`i`) хамаарсан modulo арифметикаар 60 "жинхэнэ мэт" мөр үүсгэдэг функц байсан (`bair=101+(i%10)`, `hasBalance=i>18` гэх мэт). Энэ нь бодит өгөгдөл БИШ, зөвхөн mockup-д зориулсан algorithmic placeholder байв. `src/pages/Residents.jsx`-д ЦЭВЭР ГАРААР бичсэн 4 жишээ мөр (`EXAMPLE_RESIDENTS`) тавьсан, `TODO` тэмдэглэлтэй — backend холбогдоход `useEffect`+fetch логикоор солино.
2. **Theme persistence нэмэв** — эх код `localStorage`-д хадгалдаггүй, дахин ачаалахад үргэлж hardcode `class="dark"` руу буцдаг байв. `src/hooks/useTheme.js`-д `localStorage.getItem/setItem('suh_theme')` нэмж, dark/light сонголт хадгалагдана (Playwright-аар баталгаажуулсан).
3. **Хогийн код устгав** — эх кодны `sidebar.classList.collapsed = ...` гэсэн үр дүнгүй мөр (classList-д property assign хийж болдоггүй, юу ч хийдэггүй байсан) `src/hooks/useSidebar.js`-д ортоогүй.
4. **Tailwind CDN → npm build** — эх код `<script src="https://cdn.tailwindcss.com">` ашигладаг байсан (Tailwind-ийн өөрсдийнх нь баримт бичигт "production-д зориулагдаагүй" гэж заасан арга). Одоо `tailwindcss`+`postcss`+`autoprefixer` npm package-аар бүтээгдэнэ (`npm run build` → 16KB CSS, tree-shake хийгдсэн).

## Файлын бүтэц

```
src/
  config/menu.js          — sidebar цэсний ганц эх сурвалж (3 бүлэг)
  hooks/useTheme.js        — dark/light + localStorage
  hooks/useSidebar.js      — collapse/1000px auto-collapse
  components/Sidebar.jsx
  components/Topbar.jsx
  pages/Dashboard.jsx      — бүрэн бүтээгдсэн
  pages/Residents.jsx      — бүрэн бүтээгдсэн (жишээ дата, TODO тэмдэглэлтэй)
  pages/PageInProgress.jsx — цэсний бусад бүх линк үүнийг ашиглана
```

## Ашиглах

```bash
npm install
npm run dev      # хөгжүүлэлт
npm run build    # production build → dist/
```

Шинэ хуудас нэмэхдээ:
1. `src/config/menu.js`-д route нэмэх (эсвэл байгаа `path`-ыг ашиглах)
2. `src/pages/`-д компонент бичих
3. `src/App.jsx`-ийн `<Routes>`-д PageInProgress-ийн оронд шинэ компонентоо холбох

## Theme tokens (tailwind.config.js)

Бүх өнгө (`appbg`, `sidebg`, `bordercol`, `customRed/Blue/Green` гэх мэт) нэг л газар (`tailwind.config.js`) тодорхойлогдсон — хуудас бүрт pixel утга давтахгүй.

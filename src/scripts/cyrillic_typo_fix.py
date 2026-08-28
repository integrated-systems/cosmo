#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cyrillic_typo_fix.py — Монгол Кирилл (ө/ү) бичлэгийн 2 төрлийн алдааг засах
бэлэн, дахин ашиглах скрипт.

АШИГЛАХ:
    python3 cyrillic_typo_fix.py <файлын_зам> [<файлын_зам2> ...]
    python3 cyrillic_typo_fix.py --scan-only <файлын_зам>

2 ТӨРЛИЙН АЛДАА:
  1) Латин v/V -> Кирилл ү/Ү (автоматаар найдвартай засагдана — Кирилл
     үсгийн дунд орсон Латин v/V regex-ээр 100% олдоно).
  2) Жинхэнэ Кирилл "в" бичих ёстой байснаа "ө" гэж бичсэн (АВТОМАТААР
     засаж БОЛОХГҮЙ) — "в" бол өөрөө хүчинтэй үсэг тул зөвхөн тодорхой
     мэдэгдэж буй хэвшмэл алдааны үгсийг (WORD_FIXES) л орлуулна.
     Мэдэгдээгүй сэжигтэй үгсийг scan_suspicious_words() олж хэвлэнэ.
"""

import re
import sys

U = "\u04af"    # ү
UB = "\u04ae"   # Ү
O = "\u04e9"    # ө
OB = "\u04e8"   # Ө
V = "\u0432"    # в (жинхэнэ Кирилл үсэг)

CYR_RANGE = "а-яёА-ЯЁ" + U + UB + O + OB


def fix_latin_v(text: str) -> str:
    def repl(m: re.Match) -> str:
        run = m.group(0)
        return (UB if run[0] == "V" else U) * len(run)

    prev = None
    while prev != text:
        prev = text
        text = re.sub(rf"(?<=[{CYR_RANGE}])[vV]+(?=[{CYR_RANGE}])", repl, text)
        text = re.sub(rf"(?<=[{CYR_RANGE}])[vV]+\b", repl, text)
        text = re.sub(rf"\b[vV]+(?=[{CYR_RANGE}])", repl, text)
    return text.replace("θ", O).replace("Θ", OB)


# (буруу, зөв) хос жагсаалт — гараар баталгаажуулсан, dictionary биш
# зөвхөн ЭНЭ ХЭЛБЭРЭЭР давтагдах эрсдэлтэй үгсийг л орлуулна.
FIX_PAIRS = [
    ("б" + U + "рм" + V + "с" + U + "н", "б" + U + "рм" + O + "с" + O + "н"),  # бvрмвсvн -> бvрмөсөн
    ("б" + U + "рм" + V + "с" + V + "н", "б" + U + "рм" + O + "с" + O + "н"),  # бvрмвсвн -> бvрмөсөн
    ("Б" + U + "рм" + V + "с" + V + "н", "Б" + U + "рм" + O + "с" + O + "н"),  # Бvрмвсвн -> Бvрмөсөн (том vсэг)
    (V + V + "рчл" + V + "лт", O + O + "рчл" + O + "лт"),   # өөрчлөлт (бvтэн vг)
    (V + V + "рчл" + V + "х", O + O + "рчл" + O + "х"),                # өөрчлөх (бvтэн vг)
    (V + V + "рчл", O + O + "рчл"),                          # өөрчл (vлдэгдэл vг: өөрчлөх г.м)
    (V + V + "рцл" + V + "гд" + V + V + "г", O + O + "рцл" + O + "гд" + O + O + "г"),  # өөрцлөгдөөг
    (V + V + "рцл" + V + "гдд" + V + "г", O + O + "рцл" + O + "гдд" + O + "г"),  # өөрцлөгддөг
    (V + V + "рцл", O + O + "рцл"),                          # өөрцл (vлдэгдэл vг)
    ("з" + V + V + "ш" + V + V + "р", "з" + O + V + "ш" + O + O + "р"),   # зөвшөөр (язгуур)
    ("ер" + V + V + "нхий", "ер" + O + "нхий"),                          # ерөнхий
    (V + "мчл" + V + "гч", O + "мчл" + O + "гч"),                        # өмчлөгч
    ("з" + V + V + "ч", "з" + O + V),                                    # зөв (зввч -> зөв)
    ("з" + V + V + " ", "з" + O + V + " "),                              # зөв (өөрөөр орсон)
    ("Т" + V + "лб" + V + "р", "Т" + O + "лб" + O + "р"),                # Төлбөр
    ("т" + V + "лб" + V + "р", "т" + O + "лб" + O + "р"),                # төлбөр (жижиг үсгээр)
    (V + V + "рийг" + V + V, O + V + "рийг" + O + O),                    # өврийгөө
    (V + V + "рийн", O + V + "рийн"),                                    # өврийн
    (V + "г" + V + "х", O + "г" + O + "х"),                              # өгөх
    (V + "мн" + V, O + "мн" + O),                                        # өмнө
    (V + "сс" + V + "н", O + "сс" + O + "н"),                            # өссөн
    ("н" + V + "хцл" + V + V + "р", "н" + O + "хцл" + O + O + "р"),      # нөхцлөөр
    ("З" + V + V + "л" + V + "л", "З" + O + V + "л" + O + "л"),          # Зөвлөл
    ("С" + V + "Х", "С" + OB + "Х"),                                     # СӨХ
    ("С" + U + "Х", "С" + OB + "Х"),                                     # СӨХ (Ү-ээр буруу бичсэн хувилбар)
    ("з" + V + V + "л" + V + "л", "з" + O + V + "л" + O + "л"),          # зөвлөл (жижиг үсэг, "Удирдах/Хяналтын зөвлөл")
    ("З" + V + "В" + "Х" + V + "Н", "З" + OB + "В" + "Х" + OB + "Н"),    # ЗӨВХӨН (том үсгээр, 2026-08-20 Voting аудитаас олдов)
    ("з" + V + V + "х" + V + "н", "з" + O + V + "х" + O + "н"),          # зөвхөн (жижиг үсгээр, төслийн Key learnings-д давтагдсан гэж тэмдэглэсэн алдаа)
    ("х" + V + "нд" + V + "гд" + V + V + "гүй", "х" + O + "нд" + O + "гд" + O + O + "гүй"),  # хөндөгдөөгүй
    ("з" + O + "вш" + O + O + "рс" + V + "н", "з" + O + "вш" + O + O + "рс" + O + "н"),      # зөвшөөрсөн
]


def fix_known_words(text: str) -> str:
    for old, new in FIX_PAIRS:
        text = text.replace(old, new)
    return text


def scan_suspicious_words(text: str) -> list[str]:
    words = re.findall(rf"[{CYR_RANGE}]+", text)
    return sorted(set(w for w in words if w.count(V) >= 2))


def hex_dump(word: str) -> str:
    return " ".join(f"{c}:{hex(ord(c))}" for c in word)


def process_file(path: str, scan_only: bool = False) -> None:
    with open(path, encoding="utf-8") as f:
        original = f.read()

    text = fix_latin_v(original)
    if not scan_only:
        text = fix_known_words(text)

    suspicious = scan_suspicious_words(text)
    changed = text != original

    if changed and not scan_only:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"[FIXED]  {path}")
    elif changed and scan_only:
        print(f"[SCAN]   {path}  (өөрчлөлт олдсон ч --scan-only тул хадгалаагүй)")
    else:
        print(f"[CLEAN]  {path}")

    if suspicious:
        print(f"  \u26a0  {len(suspicious)} эргэлзээтэй үг (2+ 'в') олдлоо — ГАРААР шалгаж үз:")
        for w in suspicious:
            print(f"      {w!r:30}  {hex_dump(w)}")
    else:
        print("  \u2705 Эргэлзээтэй үг олдсонгүй.")


def main():
    args = sys.argv[1:]
    scan_only = "--scan-only" in args
    paths = [a for a in args if a != "--scan-only"]
    if not paths:
        print(__doc__)
        sys.exit(1)
    for path in paths:
        process_file(path, scan_only=scan_only)


if __name__ == "__main__":
    main()

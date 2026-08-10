const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// TODO: backend холбогдоход эдгээрийг useEffect+API дуудлагаар сольно.
// Энэ бол зδвхδн дизайны жишээ мδр (projectcosmo.html-ийн эх дизайнтай
// ижил, algorithmic биш, гараар бичсэн 5 мөр).
const DEBTORS_EXAMPLE = [
  { name: 'Tous Les Jours', type: 'Аж ахуйн нэгж', months: '2 сар', amount: '4,400,000.00₮' },
  { name: 'Эрхий Мэргэн Цэцэрлэг', type: 'Аж ахуйн нэгж', months: '2 сар', amount: '4,000,000.00₮' },
  { name: 'BlackBull carwash', type: 'Аж ахуйн нэгж', months: '2 сар', amount: '1,800,000.00₮' },
  { name: 'Ace Esport', type: 'Аж ахуйн нэгж', months: '2 сар', amount: '1,400,000.00₮' },
  { name: 'Cafe Fonte', type: 'Аж ахуйн нэгж', months: '2 сар', amount: '1,260,000.00₮' },
];

function StatCard({ label, value, valueColor, detail }) {
  return (
    <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4 flex flex-col justify-between">
      <div className="text-slate-500 dark:text-[#8a99ad] text-[11px] font-medium uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold my-1 ${valueColor}`}>{value}</div>
      <div className="text-[11px] text-slate-500 dark:text-[#8a99ad] space-y-0.5">
        {detail.map((d) => <div key={d}>{d}</div>)}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <>
      {/* 1. Дээд талын 4 үндсэн мэдээллийн карт */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
        <StatCard label="ЭНЭ САРД НЭХЭМЖИЛСЭН" value="14,385,000.00₮" valueColor="text-customBlue"
          detail={['Сууц өмчлөгч - 1,510,000.00₮', 'Аж ахуйн нэгж - 12,875,000.00₮']} />
        <StatCard label="ЭНЭ САРЫН ОРЛОГО" value="0.00₮" valueColor="text-customGreen"
          detail={['Сууц өмчлөгч - 0/18', 'Аж ахуйн нэгж - 0/36']} />
        <StatCard label="НИЙТ ӨР АВЛАГА" value="28,770,000.00₮" valueColor="text-customRed"
          detail={['Сууц өмчлөгч - 18/18', 'Аж ахуйн нэгж - 36/36']} />
        <StatCard label="НИЙТ ОРШИН СУУГЧ" value="65" valueColor="text-slate-900 dark:text-[#e2e8f0]"
          detail={['0-6 насны хүүхэд - 13', '6-18 насны хүүхэд - 16']} />
      </div>

      {/* 2. Орлого/Зарлага график + Төлбөрийн явц */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Сарын орлого / зарлага</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#8a99ad]">
                <span className="w-2.5 h-2.5 rounded-full bg-customBlue inline-block" /> Орлого
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#8a99ad]">
                <span className="w-2.5 h-2.5 rounded-full bg-customGreen inline-block" /> Зарлага
              </div>
              <select className="bg-slate-50 dark:bg-[#0b132b] border border-slate-200 dark:border-[#1a2642] text-slate-900 dark:text-white text-xs rounded px-2 py-1 outline-none">
                <option>2026</option>
              </select>
            </div>
          </div>
          <div className="h-36 flex items-end justify-between gap-1 pt-4 px-2 border-b border-slate-200 dark:border-[#1a2642]">
            {MONTHS.map((m) => (
              <div key={m} className="w-full bg-slate-100 dark:bg-[#1a2642]/30 h-full rounded-t flex items-end justify-center pb-1">
                <span className="text-[9px] text-[#5c6c84]">{m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Төлбөрийн явц</div>
            <select className="bg-slate-50 dark:bg-[#0b132b] border border-slate-200 dark:border-[#1a2642] text-slate-900 dark:text-white text-xs rounded px-2 py-1 outline-none">
              <option>Энэ сар</option>
            </select>
          </div>
          <div className="space-y-3 text-xs text-slate-500 dark:text-[#8a99ad]">
            <div className="flex justify-between items-center"><span>Нийт төлбөр төлөгч тоо</span><span className="text-slate-900 dark:text-white font-medium">54</span></div>
            <div className="flex justify-between items-center"><span>Төлбөр төлсөн</span><span className="text-customGreen font-medium">0</span></div>
            <div className="flex justify-between items-center"><span>Хүлээлттэй</span><span className="text-slate-900 dark:text-white font-medium">0</span></div>
            <div className="flex justify-between items-center"><span>Хугацаа хэтэрсэн</span><span className="text-customRed font-medium">54</span></div>
            <div className="flex justify-between items-center"><span>Эрсдэлтэй</span><span className="text-slate-900 dark:text-white font-medium">0</span></div>
            <div className="border-t border-slate-200 dark:border-[#1a2642] pt-2 flex justify-between items-center"><span>Энэ сарын төлбөрийн явц</span><span className="text-slate-900 dark:text-white font-medium">0%</span></div>
            <div className="flex justify-between items-center"><span>Энэ сарын өр авлагын харьцаа</span><span className="text-slate-900 dark:text-white font-medium">0%</span></div>
          </div>
        </div>
      </div>

      {/* 3. Сүүлийн гүйлгээ + Төлбөрийн өртэй */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Сүүлийн гүйлгээ</div>
            <a href="#" className="text-xs text-blue-500 hover:underline">Бүгдийг харах →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-[#8a99ad]">
              <thead className="border-b border-slate-200 dark:border-[#1a2642] text-[#5c6c84] uppercase text-[10px]">
                <tr>
                  <th className="pb-2">ТООТ/НЭР</th><th className="pb-2">ДүН</th>
                  <th className="pb-2">ТөЛБөРИЙН ХЭЛБЭР</th><th className="pb-2 text-right">ОГНОО</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={4} className="py-8 text-center text-[#5c6c84]">Мэдээлэл олдсонгүй</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Төлбөрийн өртэй</div>
            <select className="bg-slate-50 dark:bg-[#0b132b] border border-slate-200 dark:border-[#1a2642] text-slate-900 dark:text-white text-xs rounded px-2 py-1 outline-none">
              <option>Дүнгээр</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-[#8a99ad]">
              <thead className="border-b border-slate-200 dark:border-[#1a2642] text-[#5c6c84] uppercase text-[10px]">
                <tr>
                  <th className="pb-2">ТООТ/НЭР</th><th className="pb-2">ТөРөЛ</th>
                  <th className="pb-2">ХУГАЦАА</th><th className="pb-2 text-right">ДүН</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1a2642]/50">
                {DEBTORS_EXAMPLE.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2 text-slate-900 dark:text-white font-medium">{d.name}</td>
                    <td className="py-2">{d.type}</td>
                    <td className="py-2">{d.months}</td>
                    <td className="py-2 text-right text-customRed font-medium">{d.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Ашиглалтаас хугацаа дуусч буй Үндсэн хөрөнгө */}
      <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Ашиглалтаас хугацаа дуусч буй Үндсэн хөрөнгө</div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 dark:text-[#8a99ad]">Хогооны машин газар</span>
          <a href="#" className="text-xs text-blue-500 hover:underline">Бүгдийг харах → <span className="text-slate-900 dark:text-white ml-1">0%</span></a>
        </div>
      </div>

      {/* 5. Доод талын том график картууд */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4 flex flex-col justify-between h-72">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Хотхоны зах зээлийн бодит үнэлгээ (Сүүлийн 12 сар)</div>
            <div className="text-xs text-slate-500 dark:text-[#8a99ad] mt-1">Орон сууцны борлуулалтын үнэ (₮/м²)</div>
            <div className="text-xl font-bold text-customBlue mt-1">7,250,000.00₮ <span className="text-xs text-customGreen font-normal">▲ 0.7%</span></div>
          </div>
          <div className="flex-1 flex items-end pt-4">
            <div className="w-full h-24 border-b border-l border-slate-200 dark:border-[#1a2642] relative flex items-end">
              <div className="absolute inset-0 flex items-center justify-center text-[#5c6c84] text-xs">График зураглал</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4 flex flex-col justify-between h-72">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Орон сууцны түрээсийн үнэ (1-6 өрөө, ₮/сар)</div>
          </div>
          <div className="flex-1 flex items-end pt-4">
            <div className="w-full h-24 border-b border-l border-slate-200 dark:border-[#1a2642] relative flex items-end">
              <div className="absolute inset-0 flex items-center justify-center text-[#5c6c84] text-xs">График зураглал</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4 flex flex-col justify-between h-72">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулах, Зогсоолын борлуулалтын үнэ (₮/сар)</div>
            <div className="flex gap-4 text-[11px] text-slate-500 dark:text-[#8a99ad] mt-1">
              <span><span className="text-customBlue font-bold">■</span> Агуулах</span>
              <span><span className="text-customGreen font-bold">■</span> Зогсоол</span>
            </div>
          </div>
          <div className="flex-1 flex items-end pt-4">
            <div className="w-full h-24 border-b border-l border-slate-200 dark:border-[#1a2642] relative flex items-end">
              <div className="absolute inset-0 flex items-center justify-center text-[#5c6c84] text-xs">График зураглал</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-4 flex flex-col justify-between h-72">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулах, Зогсоолын түрээслэх үнэ (₮/сар)</div>
            <div className="flex gap-4 text-[11px] text-slate-500 dark:text-[#8a99ad] mt-1">
              <span><span className="text-customBlue font-bold">■</span> Агуулах</span>
              <span><span className="text-customGreen font-bold">■</span> Зогсоол</span>
            </div>
          </div>
          <div className="flex-1 flex items-end pt-4">
            <div className="w-full h-24 border-b border-l border-slate-200 dark:border-[#1a2642] relative flex items-end">
              <div className="absolute inset-0 flex items-center justify-center text-[#5c6c84] text-xs">График зураглал</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

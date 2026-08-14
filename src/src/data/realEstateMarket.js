// "Real Estate market" (СИСАДМИН → restmarket, /restmarket) хуудасны зах
// зээлийн бодит үнэлгээний өгөгдөл. Энэ модулийг Dashboard.jsx-ийн
// "Хотхоны зах зээлийн бодит үнэлгээ" 4 чарт БОЛОН RealEstateMarket.jsx
// (/restmarket) хуудас хоёулаа НЭГ ЭХ СУРВАЛЖ болгон ашиглана — дата хоёр
// газар давхар бичигдэхгүй.
//
// Мөр (сар) тус бүрийг НЭГ объект болгож зохион байгуулсан — RealEstateMarket
// хуудасны "Сар нэмэх"/Засах модаль НЭГ сарын бүх (орон сууц/агуулах/
// зогсоол) үнийг нэг дор засдаг тул дата бүтэц ч мөр-төвтэй (row-oriented).
// ЦЭВЭР ГАРААР бичсэн 14 сарын жишээ мөр (algorithmic placeholder биш).
//
// TODO: Backend (Supabase/API) холбогдоход энэ массивыг useEffect+fetch
// логикоор сольж, restmarket модулийн жинхэнэ түүхэн үнийн датаг татна.

export const RENTAL_LABELS = ['1 өрөө', '2 өрөө', '3 өрөө', '4 өрөө', '5 өрөө', '6 өрөө'];
export const RENTAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef5555', '#8b5cf6', '#ec4899'];

export const MARKET_ROWS = [
  { month: '2025/06', residentialSale: 6950000, rental: [2230000, 2390000, 2460000, 2580000, 2640000, 2680000], storageSale: 13800000, storageRental: 300000, parkingSale: 53000000, parkingRental: 250000 },
  { month: '2025/07', residentialSale: 6980000, rental: [2260000, 2410000, 2530000, 2590000, 2620000, 2680000], storageSale: 13850000, storageRental: 305000, parkingSale: 53400000, parkingRental: 253000 },
  { month: '2025/08', residentialSale: 7020000, rental: [2300000, 2510000, 2520000, 2570000, 2630000, 2730000], storageSale: 13950000, storageRental: 310000, parkingSale: 53200000, parkingRental: 251000 },
  { month: '2025/09', residentialSale: 7050000, rental: [2340000, 2500000, 2600000, 2650000, 2750000, 2730000], storageSale: 14000000, storageRental: 315000, parkingSale: 53800000, parkingRental: 256000 },
  { month: '2025/10', residentialSale: 7080000, rental: [2350000, 2480000, 2570000, 2680000, 2720000, 2740000], storageSale: 14100000, storageRental: 320000, parkingSale: 54200000, parkingRental: 260000 },
  { month: '2025/11', residentialSale: 7060000, rental: [2370000, 2570000, 2590000, 2680000, 2750000, 2800000], storageSale: 14050000, storageRental: 318000, parkingSale: 54000000, parkingRental: 258000 },
  { month: '2025/12', residentialSale: 7100000, rental: [2380000, 2550000, 2620000, 2690000, 2835000, 2860000], storageSale: 14200000, storageRental: 325000, parkingSale: 54600000, parkingRental: 263000 },
  { month: '2026/01', residentialSale: 7140000, rental: [2430000, 2570000, 2680000, 2730000, 2830000, 2890000], storageSale: 14150000, storageRental: 330000, parkingSale: 55000000, parkingRental: 265000 },
  { month: '2026/02', residentialSale: 7130000, rental: [2430000, 2590000, 2720000, 2820000, 2840000, 2820000], storageSale: 14300000, storageRental: 328000, parkingSale: 54800000, parkingRental: 262000 },
  { month: '2026/03', residentialSale: 7170000, rental: [2460000, 2680000, 2750000, 2820000, 2850000, 2920000], storageSale: 14400000, storageRental: 335000, parkingSale: 55500000, parkingRental: 268000 },
  { month: '2026/04', residentialSale: 7190000, rental: [2530000, 2680000, 2760000, 2840000, 2910000, 2930000], storageSale: 14350000, storageRental: 340000, parkingSale: 56000000, parkingRental: 270000 },
  { month: '2026/05', residentialSale: 7210000, rental: [2600000, 2720000, 2830000, 2870000, 2910000, 2930000], storageSale: 14500000, storageRental: 338000, parkingSale: 55800000, parkingRental: 267000 },
  { month: '2026/06', residentialSale: 7200000, rental: [2500000, 2600000, 2800000, 2900000, 3000000, 3100000], storageSale: 14600000, storageRental: 345000, parkingSale: 56500000, parkingRental: 275000 },
  { month: '2026/07', residentialSale: 7250000, rental: [2500000, 2650000, 2750000, 2870000, 2960000, 3040000], storageSale: 14700000, storageRental: 349000, parkingSale: 57000000, parkingRental: 280000 },
];

// Мөр-төвтэй (row-oriented) MARKET_ROWS-ыг MarketValuationChart компонентын
// хүлээж авдаг багана-төвтэй (column-oriented) series бүтэц рүү хөрвүүлнэ.
// Dashboard.jsx болон RealEstateMarket.jsx хоёулаа ЭНЭ функцээр дамжуулж
// чартынхаа датаг гаргаж авдаг тул НЭГ дата эх сурвалж хадгалагдана.
export function deriveMarketSeries(rows) {
  return {
    residentialSalePrice: {
      label: 'Орон сууцны борлуулалтын үнэ',
      unit: '₮/м²',
      color: '#3b82f6',
      data: rows.map((r) => r.residentialSale),
    },
    residentialRentalPrice: {
      unit: '₮/сар',
      series: RENTAL_LABELS.map((label, i) => ({
        label,
        color: RENTAL_COLORS[i],
        data: rows.map((r) => r.rental[i]),
      })),
    },
    storageParkingSalePrice: {
      unit: '₮',
      series: [
        { label: 'Агуулах', color: '#3b82f6', data: rows.map((r) => r.storageSale) },
        { label: 'Зогсоол', color: '#10b981', data: rows.map((r) => r.parkingSale) },
      ],
    },
    storageParkingRentalPrice: {
      unit: '₮/сар',
      series: [
        { label: 'Агуулах', color: '#3b82f6', data: rows.map((r) => r.storageRental) },
        { label: 'Зогсоол', color: '#10b981', data: rows.map((r) => r.parkingRental) },
      ],
    },
  };
}

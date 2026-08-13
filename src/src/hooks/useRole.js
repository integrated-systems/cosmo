// TODO: Supabase auth+JWT custom claims холбогдоход, session-оос бодит
// role (uz/hz/gz/nb/mn/ot/supersysadmin) уншина. Одоогоор UI урсгал
// шалгах зорилготой, hardcode анхдагч утга.
export function useRole() {
  return { role: 'supersysadmin' };
}

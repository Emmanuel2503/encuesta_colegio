//Convertir una cadena local "YYYY-MM-DD" a una cadena ISO UTC
export function localToUTC(localDateTime) {
  if (!localDateTime) return null;
  const [year, month, day, hour, minute] = localDateTime
    .split(/[-T:]/)
    .map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute);
  return localDate.toISOString();
}

//Convertir una cadena ISO UTC a una cadena local "YYYY-MM-DDTHH:mm" local
export function utcToLocal(utcISO) {
  if (!utcISO) return " ";
  const utcString = utcISO.endsWith("Z") ? utcISO : utcISO + "Z";
  const date = new Date(utcString);
  //  const date = new Date(utcISO);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

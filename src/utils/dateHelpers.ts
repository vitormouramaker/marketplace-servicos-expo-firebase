export const getNextMondayMidnight = (): Date => {
  const now = new Date();
  const nextMonday = new Date(now.getTime());
  
  // Encontra a próxima segunda-feira (1 = segunda-feira)
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  
  // Define o horário para meia-noite
  nextMonday.setHours(0, 0, 0, 0);

  return nextMonday;
};
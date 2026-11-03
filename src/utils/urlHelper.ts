export const getUsernameFromUrl = (url: string | undefined): string => {
  if (!url) return '';
  try {
    // Remove "https://", "www.", e a barra final para simplificar
    const cleanedUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    // Pega a última parte da URL
    const parts = cleanedUrl.split('/');
    return parts[parts.length - 1];
  } catch {
    return url; // Retorna a URL original em caso de erro
  }
};
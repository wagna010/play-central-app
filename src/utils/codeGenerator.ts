/**
 * Gera um código de dispositivo único no formato: 2 letras + 8 números
 * Exemplo: AB12345678
 */
export const generateDeviceCode = (): string => {
  // Gerar 2 letras aleatórias (A-Z)
  const letters = Array.from({ length: 2 }, () => 
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  
  // Gerar 8 números aleatórios (0-9)
  const numbers = Array.from({ length: 8 }, () => 
    Math.floor(Math.random() * 10)
  ).join('');
  
  return letters + numbers;
};

/**
 * Valida formato do código: 2 letras + 8 números
 */
export const validateDeviceCode = (code: string): boolean => {
  const regex = /^[A-Za-z]{2}\d{8}$/;
  return regex.test(code);
};

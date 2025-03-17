/**
 * Valida se o email está em formato válido
 * @param {string} email - Email para validar
 * @returns {boolean} - true se o email for válido
 */
export const isValidEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Verifica se o email é corporativo (não é de domínio gratuito)
 * @param {string} email - Email para verificar
 * @returns {boolean} - true se o email for corporativo
 */
export const isEmailCorporate = (email) => {
  if (!isValidEmail(email)) return false;
  
  const freeDomains = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 
    'aol.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com', 
    'gmx.com', 'live.com', 'msn.com', 'me.com', 'mac.com', 'googlemail.com'
  ];
  
  const domain = email.split('@')[1].toLowerCase();
  return !freeDomains.includes(domain);
};

/**
 * Valida se a senha atende aos requisitos de segurança
 * @param {string} password - Senha para validar
 * @returns {boolean} - true se a senha for válida
 */
export const isValidPassword = (password) => {
  // Pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return re.test(password);
};

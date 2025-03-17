/**
 * Verifica se o email é corporativo (não é de domínio gratuito)
 * @param {string} email - Email para verificar
 * @returns {boolean} - true se o email for corporativo
 */
exports.isEmailCorporate = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const freeDomains = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 
    'aol.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com', 
    'gmx.com', 'live.com', 'msn.com', 'me.com', 'mac.com', 'googlemail.com'
  ];
  
  try {
    const domain = email.split('@')[1].toLowerCase();
    return !freeDomains.includes(domain);
  } catch (e) {
    return false;
  }
};

// Sécurité - blocage après tentatives échouées
export const LOGIN_MAX_ATTEMPTS = 6;
export const LOGIN_LOCKOUT_SECONDS = 30;

// Règles du mot de passe
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

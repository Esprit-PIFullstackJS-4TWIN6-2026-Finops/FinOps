/**
 * Messages d'erreur conviviaux pour guider l'utilisateur
 */

export function getErrorMessage(err: unknown): { message: string; solution?: string } {
  const extractMessage = (input: unknown): string => {
    if (input instanceof Error) {
      return input.message;
    }
    if (typeof input === 'string') {
      return input;
    }
    if (input && typeof input === 'object') {
      const asRecord = input as Record<string, unknown>;
      const message = asRecord.message;
      if (Array.isArray(message)) {
        return message.map((item) => String(item)).join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
      if (message && typeof message === 'object') {
        return JSON.stringify(message);
      }
      const detail = asRecord.detail;
      if (Array.isArray(detail)) {
        return detail.map((item) => String(item)).join(', ');
      }
      if (typeof detail === 'string') {
        return detail;
      }
      return JSON.stringify(asRecord);
    }
    return String(input);
  };

  let msg = extractMessage(err);
  if (msg.startsWith('NETWORK_ERROR:')) msg = msg.replace('NETWORK_ERROR:', '');
  if (/^\d+:/.test(msg)) msg = msg.replace(/^\d+:\s*/, '');
  const lower = msg.toLowerCase();

  // Erreur réseau / serveur inaccessible
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('connection refused') ||
    lower.includes('err_connection_refused') ||
    lower.includes('net::err')
  ) {
    return {
      message: 'Impossible de contacter le serveur.',
      solution:
        'Vérifiez que le backend est démarré : ouvrez un terminal, allez dans le dossier "backend", puis exécutez "npm run start:dev". Le serveur doit tourner sur http://localhost:3000',
    };
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      message: 'La requête a pris trop de temps.',
      solution: 'Vérifiez votre connexion internet et que le serveur backend est bien démarré.',
    };
  }

  // 401 - Non autorisé
  if (msg.includes('401') || lower.includes('unauthorized')) {
    return {
      message: 'Email ou mot de passe incorrect.',
      solution: 'Vérifiez vos identifiants. Utilisez admin@finops.com / Admin123! pour l\'administrateur.',
    };
  }

  // Compte bloqué
  if (lower.includes('bloqué') || lower.includes('bloque')) {
    return {
      message: msg,
      solution: 'Attendez quelques secondes puis réessayez.',
    };
  }

  // Erreur de validation
  if (msg.includes('400') || lower.includes('validation') || lower.includes('invalid')) {
    return {
      message: msg,
      solution: 'Vérifiez que tous les champs sont correctement remplis.',
    };
  }

  // Email invalide / domaine inexistant
  if (
    lower.includes('domaine') ||
    lower.includes('domain') ||
    lower.includes('mx') ||
    lower.includes("n'existe pas") ||
    lower.includes("n'est pas valide") ||
    lower.includes('vouliez écrire') ||
    lower.includes('temporaire/jetable') ||
    lower.includes('disposable')
  ) {
    return {
      message: msg,
      solution: 'Vérifiez que votre adresse email est correcte et existe réellement (ex: nom@gmail.com, nom@outlook.com).',
    };
  }

  // Conflit (ex: email déjà utilisé)
  if (lower.includes('409') || lower.includes('conflict') || lower.includes('existe déjà')) {
    return {
      message: msg,
      solution: 'Utilisez un autre email ou connectez-vous avec votre compte existant.',
    };
  }

  // Mot de passe actuel incorrect
  if (lower.includes('mot de passe actuel') || lower.includes('current password')) {
    return {
      message: 'Le mot de passe temporaire est incorrect.',
      solution: 'Vérifiez l\'email que vous avez reçu et copiez le mot de passe exactement.',
    };
  }

  // Message par défaut
  return {
    message: msg || 'Une erreur est survenue.',
    solution: 'Réessayez. Si le problème persiste, vérifiez que le backend est démarré.',
  };
}

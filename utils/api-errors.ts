/**
 * Messages d'erreur conviviaux pour guider l'utilisateur
 */

export function getErrorMessage(
  err: unknown,
): { message: string; solution?: string } {
  const extractMessageFromJsonString = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return value;
    }

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const nestedMessage = parsed.message;
      if (Array.isArray(nestedMessage)) {
        return nestedMessage.map((item) => String(item)).join(', ');
      }
      if (typeof nestedMessage === 'string') {
        return nestedMessage;
      }
    } catch {
      return value;
    }

    return value;
  };

  const extractMessage = (input: unknown): string => {
    if (input instanceof Error) {
      return extractMessageFromJsonString(input.message);
    }
    if (typeof input === 'string') {
      return extractMessageFromJsonString(input);
    }
    if (input && typeof input === 'object') {
      const asRecord = input as Record<string, unknown>;
      const message = asRecord.message;
      if (Array.isArray(message)) {
        return message.map((item) => String(item)).join(', ');
      }
      if (typeof message === 'string') {
        return extractMessageFromJsonString(message);
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
  msg = extractMessageFromJsonString(msg);
  const lower = msg.toLowerCase();

  // Erreur reseau / serveur inaccessible
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
        'Verifiez que le backend est demarre : ouvrez un terminal, allez dans le dossier "backend", puis executez "npm run start:dev". Le serveur doit tourner sur http://localhost:3000',
    };
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      message: 'La requete a pris trop de temps.',
      solution:
        'Verifiez votre connexion internet et que le serveur backend est bien demarre.',
    };
  }

  // Compte bloque
  if (
    lower.includes('bloque') ||
    lower.includes('bloqu') ||
    lower.includes('verrouille') ||
    lower.includes('verrouill')
  ) {
    const adminMatch = msg.match(
      /administrateur\s+[aà]\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
    );
    const ownerMatch = msg.match(
      /proprietaire de l'entreprise\s+[aà]\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
    );

    if (adminMatch?.[1] && ownerMatch?.[1] && adminMatch[1] !== ownerMatch[1]) {
      return {
        message: `Contactez l'administrateur a ${adminMatch[1]} ou le proprietaire de l'entreprise a ${ownerMatch[1]} pour faire debloquer le compte.`,
      };
    }

    if (adminMatch?.[1]) {
      return {
        message: `Contactez l'administrateur a ${adminMatch[1]} pour faire debloquer le compte.`,
      };
    }

    if (ownerMatch?.[1]) {
      return {
        message: `Contactez le proprietaire de l'entreprise a ${ownerMatch[1]} pour faire debloquer le compte.`,
      };
    }

    const emailMatch = msg.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return {
      message: emailMatch
        ? `Contactez l'administrateur a ${emailMatch[0]} pour faire debloquer le compte.`
        : "Contactez l'administrateur pour faire debloquer le compte.",
    };
  }

  // 401 - Non autorise
  if (msg.includes('401') || lower.includes('unauthorized')) {
    return {
      message: 'Email ou mot de passe incorrect.',
      solution:
        "Verifiez vos identifiants. Utilisez admin@finops.com / Admin123! pour l'administrateur.",
    };
  }

  // Erreur de validation
  if (
    msg.includes('400') ||
    lower.includes('validation') ||
    lower.includes('invalid')
  ) {
    return {
      message: msg,
      solution: 'Verifiez que tous les champs sont correctement remplis.',
    };
  }

  // Email invalide / domaine inexistant
  if (
    lower.includes('domaine') ||
    lower.includes('domain') ||
    lower.includes('mx') ||
    lower.includes("n'existe pas") ||
    lower.includes("n'est pas valide") ||
    lower.includes('vouliez ecrire') ||
    lower.includes('temporaire/jetable') ||
    lower.includes('disposable')
  ) {
    return {
      message: msg,
      solution:
        'Verifiez que votre adresse email est correcte et existe reellement (ex: nom@gmail.com, nom@outlook.com).',
    };
  }

  // Conflit (ex: email deja utilise)
  if (
    lower.includes('409') ||
    lower.includes('conflict') ||
    lower.includes('existe deja')
  ) {
    return {
      message: msg,
      solution:
        'Utilisez un autre email ou connectez-vous avec votre compte existant.',
    };
  }

  // Mot de passe actuel incorrect
  if (
    lower.includes('mot de passe actuel') ||
    lower.includes('current password')
  ) {
    return {
      message: 'Le mot de passe temporaire est incorrect.',
      solution:
        "Verifiez l'email que vous avez recu et copiez le mot de passe exactement.",
    };
  }

  // Message par defaut
  return {
    message: msg || 'Une erreur est survenue.',
    solution:
      'Reessayez. Si le probleme persiste, verifiez que le backend est demarre.',
  };
}

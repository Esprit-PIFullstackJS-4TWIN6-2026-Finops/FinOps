import { Injectable } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
}

@Injectable()
export class EmailValidatorService {
  /**
   * Vérifie qu'une adresse email est réelle :
   * 1. Format valide
   * 2. Le domaine existe (MX records)
   * 3. Le domaine peut recevoir des emails
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    const trimmed = email.trim().toLowerCase();

    // 1. Vérifier le format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return {
        valid: false,
        reason:
          "Le format de l'email est invalide. Exemple : nom@gmail.com",
      };
    }

    // 2. Extraire le domaine
    const domain = trimmed.split('@')[1];
    if (!domain) {
      return {
        valid: false,
        reason: "Le domaine de l'email est manquant.",
      };
    }

    // 3. Vérifier les fautes de frappe courantes (AVANT le MX check)
    const commonDomains: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gnail.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmil.com': 'gmail.com',
      'gmsil.com': 'gmail.com',
      'hotmal.com': 'hotmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'hotamil.com': 'hotmail.com',
      'outloo.com': 'outlook.com',
      'outlok.com': 'outlook.com',
      'outllok.com': 'outlook.com',
      'oultook.com': 'outlook.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'yahho.com': 'yahoo.com',
      'yhaoo.com': 'yahoo.com',
    };

    if (commonDomains[domain]) {
      return {
        valid: false,
        reason: `Il semble que vous vouliez écrire "@${commonDomains[domain]}" au lieu de "@${domain}". Corrigez votre adresse email.`,
      };
    }

    // 4. Liste noire de domaines jetables / temporaires connus
    const disposableDomains = [
      'mailinator.com',
      'guerrillamail.com',
      'tempmail.com',
      'throwaway.email',
      'temp-mail.org',
      'fakeinbox.com',
      'sharklasers.com',
      'guerrillamailblock.com',
      'grr.la',
      'dispostable.com',
      'yopmail.com',
      'trashmail.com',
      'maildrop.cc',
      'mailnesia.com',
      'tempail.com',
      'tempr.email',
      '10minutemail.com',
      'minutemail.com',
    ];

    if (disposableDomains.includes(domain)) {
      return {
        valid: false,
        reason: `L'email utilise un domaine temporaire/jetable (${domain}). Veuillez utiliser une adresse email permanente (Gmail, Outlook, Yahoo, etc.).`,
      };
    }

    // 5. Vérifier les enregistrements MX du domaine (le domaine peut-il recevoir des emails ?)
    try {
      const mxRecords = await resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return {
          valid: false,
          reason: `Le domaine "${domain}" ne peut pas recevoir d'emails. Vérifiez que vous avez bien saisi votre adresse email.`,
        };
      }
    } catch (err: any) {
      // ENOTFOUND = le domaine n'existe pas du tout
      if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
        return {
          valid: false,
          reason: `Le domaine "${domain}" n'existe pas. Vérifiez votre adresse email (ex: @gmail.com, @outlook.com, @yahoo.com).`,
        };
      }
      // ETIMEOUT, ESERVFAIL = problème DNS temporaire, on laisse passer
      console.warn(
        `[EmailValidator] Erreur DNS pour ${domain}: ${err.code || err.message} — on laisse passer.`,
      );
      return { valid: true };
    }

    return { valid: true };
  }
}

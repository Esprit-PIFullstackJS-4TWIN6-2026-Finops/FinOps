import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  sent: boolean;
  previewUrl?: string;
  provider: 'gmail' | 'smtp' | 'ethereal' | 'console';
}

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private ready = false;
  private provider: 'gmail' | 'smtp' | 'ethereal' | 'console' = 'console';

  async onModuleInit() {
    const gmailUser = process.env.GMAIL_USER?.trim();
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
    const gmailRequested = !!(gmailUser || gmailAppPassword);

    if (gmailUser && !gmailAppPassword) {
      this.ready = false;
      this.provider = 'console';
      console.warn('⚠ Gmail configure partiellement: GMAIL_APP_PASSWORD est manquant.');
      console.warn('⚠ Generez un App Password Google et ajoutez-le dans backend/.env.');
      return;
    }

    // Option 1: Gmail SMTP (envoi réel vers des boites Gmail/Outlook/etc.)
    if (gmailUser && gmailAppPassword) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      try {
        await this.transporter.verify();
        this.ready = true;
        this.provider = 'gmail';
        console.log('═══════════════════════════════════════════');
        console.log('  📧 EMAIL : Gmail SMTP configuré');
        console.log(`  User : ${gmailUser}`);
        console.log('  Mode : envoi réel');
        console.log('═══════════════════════════════════════════');
        return;
      } catch (error) {
        this.ready = false;
        this.provider = 'console';
        console.warn('⚠ Gmail SMTP non valide. Vérifiez GMAIL_USER/GMAIL_APP_PASSWORD.');
        console.warn(error);
        // Si l'utilisateur a demandé Gmail, ne pas basculer silencieusement vers Ethereal
        if (gmailRequested) {
          console.warn('⚠ Gmail requis: aucun email réel ne sera envoyé tant que la configuration Gmail est invalide.');
          return;
        }
      }
    }

    // Mode Gmail-only: si pas de configuration Gmail, on n'utilise pas Ethereal
    if (process.env.MAIL_PROVIDER === 'gmail') {
      this.ready = false;
      this.provider = 'console';
      console.warn('⚠ Gmail-only actif: GMAIL_USER/GMAIL_APP_PASSWORD manquants.');
      console.warn('⚠ Aucun email ne sera envoyé tant que Gmail n\'est pas configuré.');
      return;
    }

    // Si SMTP configuré manuellement (Gmail, etc.), on l'utilise
    if (process.env.MAIL_HOST && process.env.MAIL_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT || '587', 10),
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });
      try {
        await this.transporter.verify();
        this.ready = true;
        this.provider = 'smtp';
        console.log('═══════════════════════════════════════════');
        console.log('  📧 EMAIL : SMTP configuré manuellement');
        console.log(`  Host : ${process.env.MAIL_HOST}`);
        console.log(`  User : ${process.env.MAIL_USER}`);
        console.log('  Mode : envoi réel');
        console.log('═══════════════════════════════════════════');
        return;
      } catch (error) {
        this.ready = false;
        this.provider = 'console';
        console.warn('⚠ SMTP invalide. Vérifiez MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS.');
        console.warn(error);
      }
    }

    // Fallback dev: Ethereal (emails capturés avec URL de preview)
    if (process.env.MAIL_DISABLE_ETHEREAL !== 'true') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        await this.transporter.verify();
        this.ready = true;
        this.provider = 'ethereal';
        console.log('═══════════════════════════════════════════');
        console.log('  📧 EMAIL : Ethereal de dev activé');
        console.log('  Mode : capture avec preview URL');
        console.log('═══════════════════════════════════════════');
        return;
      } catch (error) {
        this.ready = false;
        this.provider = 'console';
        console.warn('⚠ Impossible d\'initialiser Ethereal.');
        console.warn(error);
      }
    }

    // Aucun provider email configure
    this.ready = false;
    this.provider = 'console';
    console.warn('⚠ Aucun provider email configure.');
    console.warn('⚠ Configurez Gmail (GMAIL_USER/GMAIL_APP_PASSWORD) ou activez Ethereal.');
  }

  async sendMail(options: MailOptions): Promise<SendMailResult> {
    const from =
      process.env.MAIL_FROM ||
      (this.provider === 'gmail' && process.env.GMAIL_USER
        ? `"FinOps Platform" <${process.env.GMAIL_USER}>`
        : '"FinOps Platform" <noreply@finops.com>');

    if (!this.ready || !this.transporter) {
      // Fallback : afficher dans la console
      console.log('');
      console.log('┌─────────────────────────────────────────┐');
      console.log('│  📧 EMAIL (console uniquement)          │');
      console.log('├─────────────────────────────────────────┤');
      console.log(`│  Provider : ${this.provider}`);
      console.log(`│  À : ${options.to}`);
      console.log(`│  Sujet : ${options.subject}`);
      console.log('│  Contenu :');
      // Strip HTML tags for console display
      const textContent = options.html
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
      console.log(`│  ${textContent}`);
      console.log('└─────────────────────────────────────────┘');
      console.log('');
      return { sent: false, provider: this.provider };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      // Générer le lien de prévisualisation Ethereal
      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log('');
      console.log('┌─────────────────────────────────────────┐');
      console.log('│  ✅ EMAIL ENVOYÉ AVEC SUCCÈS            │');
      console.log('├─────────────────────────────────────────┤');
      console.log(`│  Provider : ${this.provider}`);
      console.log(`│  À : ${options.to}`);
      console.log(`│  Sujet : ${options.subject}`);
      if (previewUrl) {
        console.log('│');
        console.log(`│  👁️  VOIR L'EMAIL : ${previewUrl}`);
        console.log('│  (Ouvrez ce lien dans votre navigateur)');
      }
      console.log('└─────────────────────────────────────────┘');
      console.log('');

      return { sent: true, previewUrl: previewUrl || undefined, provider: this.provider };
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      return { sent: false, provider: this.provider };
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<SendMailResult> {
    try {
      return await this.sendMail({
        to,
        subject,
        text,
        html: html || `<p>${text}</p>`,
      });
    } catch (error) {
      console.error('❌ sendEmail error:', error);
      return { sent: false, provider: this.provider };
    }
  }

  async sendEmailVerification(
    to: string,
    userName: string,
    code: string,
    purpose: 'verify_email' | 'change_email' = 'verify_email',
  ): Promise<SendMailResult> {
    const title =
      purpose === 'change_email'
        ? 'Confirmez votre nouvelle adresse email'
        : 'Verifiez votre adresse email';

    const intro =
      purpose === 'change_email'
        ? "Vous avez demande la mise a jour de votre adresse email sur FinOps."
        : 'Merci de verifier votre adresse email sur FinOps.';

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${title}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${userName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">${intro}</p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Code de verification</p>
            <p style="margin: 12px 0 0; color: #1d4ed8; font-size: 34px; font-weight: 700; letter-spacing: 10px;">${code}</p>
          </div>
          <p style="color: #6b7280; line-height: 1.6;">Ce code expire dans <strong>15 minutes</strong>.</p>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.</p>
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject:
        purpose === 'change_email'
          ? '[FinOps] Confirmez votre nouvelle adresse email'
          : '[FinOps] Verification de votre adresse email',
      html,
      text: `${title}. Votre code de verification est : ${code}. Il expire dans 15 minutes.`,
    });
  }

  async sendRegistrationAccepted(
    email: string,
    ownerName: string,
    tempPassword: string,
  ): Promise<{ sent: boolean; previewUrl?: string }> {
    const loginUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Bienvenue sur FinOps !</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin-top: 0;">Félicitations ${ownerName} !</h2>
          <p style="color: #4b5563; line-height: 1.6;">Votre demande d'inscription a été <strong style="color: #059669;">acceptée</strong> par l'administrateur de la plateforme FinOps.</p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #166534; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">🔐 Vos identifiants de connexion</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email :</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937; font-size: 14px;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Mot de passe :</td>
                <td style="padding: 8px 0; font-weight: bold; color: #2563eb; font-family: monospace; font-size: 16px; letter-spacing: 1px;">${tempPassword}</td>
              </tr>
            </table>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #bbf7d0;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">Adresse de connexion :</p>
              <p style="margin: 4px 0 0; color: #1d4ed8; font-size: 14px; font-weight: 600;">${loginUrl}</p>
            </div>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              ⚠️ <strong>Important :</strong> Lors de votre première connexion, vous devrez obligatoirement changer ce mot de passe temporaire.
            </p>
            <p style="color: #92400e; margin: 8px 0 0; font-size: 13px;">
              Le nouveau mot de passe doit contenir : au moins <strong>8 caractères</strong>, <strong>1 majuscule</strong>, <strong>1 minuscule</strong> et <strong>1 chiffre</strong>.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
              Accéder à la plateforme →
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">Cordialement, L'équipe FinOps</p>
        </div>
      </div>
    `;
    return this.sendMail({
      to: email,
      subject: '✅ [FinOps] Votre inscription a été acceptée',
      html,
    });
  }

  async sendRegistrationRejected(
    email: string,
    ownerName: string,
    rejectionReason: string,
  ): Promise<{ sent: boolean; previewUrl?: string }> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Réponse à votre demande</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${ownerName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">Nous vous informons que votre demande d'inscription à la plateforme FinOps <strong style="color: #dc2626;">n'a pas été acceptée</strong>.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #991b1b; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Motif du rejet</h3>
            <p style="color: #7f1d1d; margin: 0; font-size: 14px; line-height: 1.6;">${rejectionReason}</p>
          </div>

          <p style="color: #4b5563; line-height: 1.6;">Si vous pensez qu'il s'agit d'une erreur ou si vous avez des questions, n'hésitez pas à nous contacter.</p>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">Cordialement, L'équipe FinOps</p>
        </div>
      </div>
    `;
    return this.sendMail({
      to: email,
      subject: '❌ [FinOps] Réponse à votre demande d\'inscription',
      html,
    });
  }

  async sendPasswordReset(
    email: string,
    userName: string,
    tempPassword: string,
  ): Promise<{ sent: boolean; previewUrl?: string; provider: SendMailResult['provider'] }> {
    const loginUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔑 Réinitialisation du mot de passe</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${userName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">Vous avez demandé la réinitialisation de votre mot de passe sur la plateforme FinOps.</p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #166534; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">🔐 Nouveau mot de passe temporaire</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email :</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937; font-size: 14px;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Mot de passe :</td>
                <td style="padding: 8px 0; font-weight: bold; color: #2563eb; font-family: monospace; font-size: 16px; letter-spacing: 1px;">${tempPassword}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              ⚠️ <strong>Important :</strong> Lors de votre prochaine connexion, vous devrez obligatoirement changer ce mot de passe temporaire.
            </p>
            <p style="color: #92400e; margin: 8px 0 0; font-size: 13px;">
              Le nouveau mot de passe doit contenir : au moins <strong>8 caractères</strong>, <strong>1 majuscule</strong>, <strong>1 minuscule</strong> et <strong>1 chiffre</strong>.
            </p>
          </div>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 13px;">
              🚫 Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement l'administrateur de la plateforme.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
              Se connecter →
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">Cordialement, L'équipe FinOps</p>
        </div>
      </div>
    `;
    return this.sendMail({
      to: email,
      subject: '🔑 [FinOps] Réinitialisation de votre mot de passe',
      html,
    });
  }

  async sendEmployeeInvite(
    email: string,
    employeeName: string,
    role: string,
    companyName: string,
    tempPassword: string,
  ): Promise<{ sent: boolean; previewUrl?: string }> {
    const loginUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">👋 Invitation - ${companyName}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin-top: 0;">Bienvenue ${employeeName} !</h2>
          <p style="color: #4b5563; line-height: 1.6;">Vous avez été ajouté à l'entreprise <strong>${companyName}</strong> sur la plateforme FinOps.</p>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 13px;">Votre rôle</p>
            <p style="color: #1d4ed8; margin: 4px 0 0; font-size: 18px; font-weight: bold;">${role}</p>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #166534; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">🔐 Vos identifiants de connexion</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email :</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1f2937; font-size: 14px;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Mot de passe :</td>
                <td style="padding: 8px 0; font-weight: bold; color: #2563eb; font-family: monospace; font-size: 16px; letter-spacing: 1px;">${tempPassword}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              ⚠️ <strong>Important :</strong> Lors de votre première connexion, vous devrez obligatoirement changer ce mot de passe temporaire.
            </p>
            <p style="color: #92400e; margin: 8px 0 0; font-size: 13px;">
              Le nouveau mot de passe doit contenir : <strong>8 caractères min.</strong>, <strong>1 majuscule</strong>, <strong>1 minuscule</strong> et <strong>1 chiffre</strong>.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
              Se connecter →
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">Cordialement, L'équipe FinOps</p>
        </div>
      </div>
    `;
    return this.sendMail({
      to: email,
      subject: `📩 [FinOps] Invitation - ${companyName}`,
      html,
    });
  }

  async sendAdminRegistrationNotification(
    email: string,
    payload: {
      companyName: string;
      companyCategory: string;
      ownerName: string;
      ownerEmail: string;
      phone?: string;
    },
  ): Promise<{ sent: boolean; previewUrl?: string }> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🆕 Nouvelle demande d'inscription</h1>
        </div>
        <div style="padding: 24px;">
          <p style="color: #374151; margin-top: 0;">Un propriétaire vient de soumettre une demande. Veuillez la traiter dans le tableau de bord administrateur.</p>
          <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Entreprise</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.companyName}</td></tr>
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Catégorie</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.companyCategory}</td></tr>
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Propriétaire</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.ownerName}</td></tr>
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Email</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.ownerEmail}</td></tr>
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Téléphone</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.phone || '-'}</td></tr>
          </table>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.APP_URL || 'http://localhost:4200'}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Ouvrir le dashboard admin</a>
          </div>
        </div>
      </div>
    `;
    return this.sendMail({
      to: email,
      subject: `🆕 [FinOps] Nouvelle demande - ${payload.companyName}`,
      html,
    });
  }

  async sendAdminEmployeeAccessRequestNotification(
    email: string,
    payload: {
      fullName: string;
      email: string;
      companyName: string;
      desiredRole: string;
    },
  ): Promise<{ sent: boolean; previewUrl?: string }> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">👤 Nouvelle demande d'accès employé</h1>
        </div>
        <div style="padding: 24px;">
          <p style="color: #374151; margin-top: 0;">Un utilisateur a demandé un compte employé. Validez ou rejetez la demande dans le tableau de bord admin.</p>
          <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Nom complet</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.fullName}</td></tr>
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Email</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.email}</td></tr>
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Entreprise</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.companyName}</td></tr>
            <tr><td style="padding: 10px; color: #6b7280; font-size: 13px;">Rôle demandé</td><td style="padding: 10px; color: #111827; font-weight: 600;">${payload.desiredRole}</td></tr>
          </table>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.APP_URL || 'http://localhost:4200'}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Ouvrir le dashboard admin</a>
          </div>
        </div>
      </div>
    `;
    return this.sendMail({
      to: email,
      subject: `👤 [FinOps] Demande employé - ${payload.companyName}`,
      html,
    });
  }

  async sendEmployeeAccessRequestRejected(
    email: string,
    fullName: string,
    companyName: string,
    rejectionReason: string,
  ): Promise<{ sent: boolean; previewUrl?: string }> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Réponse à votre demande employé</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${fullName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">Votre demande d'accès à l'entreprise <strong>${companyName}</strong> n'a pas été acceptée.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #991b1b; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Motif du rejet</h3>
            <p style="color: #7f1d1d; margin: 0; font-size: 14px; line-height: 1.6;">${rejectionReason}</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">Cordialement, L'équipe FinOps</p>
        </div>
      </div>
    `;
    return this.sendMail({
      to: email,
      subject: '❌ [FinOps] Demande employé rejetée',
      html,
    });
  }
}

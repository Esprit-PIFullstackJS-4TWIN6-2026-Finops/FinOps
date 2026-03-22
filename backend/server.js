const http = require('http');
const dotenv = require('dotenv');
const { sendEmail } = require('./emailService');

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/send-email') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        // Protection simple contre les payloads trop grands
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const { to, subject, text, html } = parsed;

        const result = await sendEmail(to, subject, text, html);

        if (result.success) {
          sendJson(res, 200, {
            success: true,
            message: 'Email envoye avec succes',
            messageId: result.messageId,
          });
          return;
        }

        sendJson(res, 500, {
          success: false,
          message: "Erreur lors de l'envoi de l'email",
          error: result.error,
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          message: 'Erreur serveur',
          error: error.message,
        });
      }
    });

    req.on('error', (error) => {
      sendJson(res, 500, {
        success: false,
        message: 'Erreur de lecture de la requete',
        error: error.message,
      });
    });

    return;
  }

  sendJson(res, 404, {
    success: false,
    message: 'Route non trouvee',
  });
});

server.listen(PORT, () => {
  console.log(`Mail API running on http://localhost:${PORT}`);
  console.log('Endpoint: POST /api/send-email');
});

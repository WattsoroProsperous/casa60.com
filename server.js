const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration WhatsApp API Meta
const WHATSAPP_CONFIG = {
  phoneNumberId: '941400289045871',
  accessToken: 'EAAWdZCWjwF6QBQKCMO8jvksmDNmXcvf4rhodQv7a0Vnfipi4ZB8fdvx8VH4ZAbYRaPLSal84VdKVTNZAe3enagLwGZBWKXDtpS1iuc19NXHZAPfBpo7c2riq5FvnNAHm6ZCfnBlFuZAdw2rPmqsezhadw4DKPwJsuSvbZC8ZCW4ZCpm4rB1AEUAjOpgg3YJkZBGw6uBY4wZDZD',
  recipientPhone: '2250586000041' // Numéro CASA 60
};

const PORT = 3000;

// MIME types for serving static files
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoint for sending WhatsApp messages via Meta API
  if (req.method === 'POST' && req.url === '/api/send-whatsapp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        sendWhatsAppMessage(data, res);
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Decode URL and handle query strings
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Default to index.html
  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  // Build file path
  const filePath = path.join(__dirname, urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Get file extension
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Read and serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found - serve index.html for SPA routing
        if (!ext || ext === '.html') {
          fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
            if (err2) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('404 Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(data2);
            }
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    // Set caching headers for static assets
    const cacheHeaders = {};
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.webp') {
      cacheHeaders['Cache-Control'] = 'public, max-age=86400'; // 1 day
    } else if (ext === '.css' || ext === '.js') {
      cacheHeaders['Cache-Control'] = 'public, max-age=3600'; // 1 hour
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      ...cacheHeaders
    });
    res.end(data);
  });
});

// Function to send WhatsApp message via Meta API
function sendWhatsAppMessage(orderData, res) {
  // Build text message
  let messageText = `🍽️ *NOUVELLE COMMANDE CASA 60*\n`;
  messageText += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  messageText += `👤 *Client:* ${orderData.clientName || 'Non fourni'}\n`;
  messageText += `📞 *Téléphone:* ${orderData.clientPhone || 'Non fourni'}\n`;
  messageText += `📦 *Type:* ${orderData.orderType || 'Non spécifié'}\n`;

  if (orderData.address) {
    messageText += `📍 *Adresse:* ${orderData.address}\n`;
  }

  messageText += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  messageText += `🛒 *COMMANDE:*\n\n`;
  messageText += orderData.items || 'Aucun article';
  messageText += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  messageText += `💰 *TOTAL: ${orderData.total || '0 F'}*\n`;

  if (orderData.notes) {
    messageText += `\n📝 *Notes:* ${orderData.notes}\n`;
  }

  const postData = JSON.stringify({
    messaging_product: 'whatsapp',
    to: WHATSAPP_CONFIG.recipientPhone,
    type: 'text',
    text: {
      body: messageText
    }
  });

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/v18.0/${WHATSAPP_CONFIG.phoneNumberId}/messages`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      console.log('WhatsApp API Response:', data);
      res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  });

  apiReq.on('error', (error) => {
    console.error('WhatsApp API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  });

  apiReq.write(postData);
  apiReq.end();
}

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🍽️  CASA 60 - Restaurant & Lounge               ║
║                                                    ║
║   Serveur démarré sur:                             ║
║   → http://localhost:${PORT}                         ║
║                                                    ║
║   API WhatsApp: /api/send-whatsapp                 ║
║                                                    ║
║   Appuyez sur Ctrl+C pour arrêter                  ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Le port ${PORT} est déjà utilisé. Essayez un autre port.`);
  } else {
    console.error('❌ Erreur serveur:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

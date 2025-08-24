import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const loggedOut = statusCode === DisconnectReason.loggedOut;

            if (loggedOut) {
                console.log('Sessão desconectada permanentemente. Gere um novo QR Code.');
            } else {
                console.log('Conexão fechada inesperadamente. Reconectando...');
                connectToWhatsApp();
            }
        }

        if (connection === 'open') {
            console.log('Conexão aberta com sucesso!');
        }

        if (qr) {
            console.log('QR Code gerado, escaneie com o WhatsApp.');
            qrcode.generate(qr, { small: true });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        for (let index = 0; index < m.messages.length; index++) {
            const message = m.messages[index];
            const content = message.message?.conversation || message.message?.extendedTextMessage?.text;

            if (content === "Olá") {
                // @ts-ignore
                await sock.sendMessage(message.key.remoteJid, { text: "Hello World" });
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

connectToWhatsApp();
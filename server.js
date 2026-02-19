// ============================================
// Twilio OTP Verification Server
// WhatsApp + SMS support
// ============================================

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const bodyParser = require('body-parser');
const crypto = require('crypto');
try { require('dotenv').config(); } catch (_) { /* dotenv optional - use .env when available */ }

// Generate cryptographically secure random 6-digit OTP (100000-999999)
function generateOTP() {
    return crypto.randomInt(100000, 1000000).toString();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files

// ============================================
// TWILIO CONFIGURATION
// ============================================
const TWILIO_CONFIG = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN',
    twilioPhone: process.env.TWILIO_PHONE || '+1234567890',
    // WhatsApp: Sandbox number + Verification Codes template Content SID
    whatsappFrom: process.env.WHATSAPP_FROM || 'whatsapp:+14155238886',
    whatsappVerificationContentSid: process.env.WHATSAPP_VERIFICATION_CONTENT_SID || null,
    countryCode: process.env.COUNTRY_CODE || '91'
};

// OTP Storage (In production, use Redis or database)
const otpStore = new Map();

// ============================================
// API ROUTES
// ============================================

// Generate and send OTP via WhatsApp (preferred) or SMS
app.post('/api/send-otp', async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile || mobile.length !== 10) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number. Enter 10 digits.'
            });
        }

        const otp = generateOTP();

        otpStore.set(mobile, {
            otp: otp,
            expiresAt: Date.now() + 5 * 60 * 1000,
            attempts: 0
        });

        const toNumber = `${TWILIO_CONFIG.countryCode}${mobile}`;
        const isConfigured = TWILIO_CONFIG.accountSid && !TWILIO_CONFIG.accountSid.startsWith('YOUR_');

        if (!isConfigured) {
            console.log(`OTP for ${mobile}: ${otp} (configure Twilio in .env for real delivery)`);
            return res.json({
                success: true,
                message: 'OTP generated (configure Twilio for real delivery)',
                devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
            });
        }

        const client = twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);

        // Try WhatsApp first if template is configured
        if (TWILIO_CONFIG.whatsappVerificationContentSid) {
            try {
                const message = await client.messages.create({
                    from: TWILIO_CONFIG.whatsappFrom,
                    to: `whatsapp:+${toNumber}`,
                    contentSid: TWILIO_CONFIG.whatsappVerificationContentSid,
                    contentVariables: JSON.stringify({
                        '1': otp
                    })
                });
                console.log(`✅ WhatsApp OTP sent to ${mobile}. SID: ${message.sid}`);
                return res.json({
                    success: true,
                    message: 'OTP sent via WhatsApp'
                });
            } catch (waError) {
                console.warn('WhatsApp send failed, falling back to SMS:', waError.message);
            }
        }

        // Fallback: SMS
        try {
            const message = await client.messages.create({
                body: `Your OTP for Secure Document Portal is: ${otp}. Valid for 5 minutes.`,
                from: TWILIO_CONFIG.twilioPhone,
                to: `+${toNumber}`
            });
            console.log(`✅ SMS OTP sent to ${mobile}. SID: ${message.sid}`);
            res.json({
                success: true,
                message: 'OTP sent via SMS'
            });
        } catch (smsError) {
            console.error('Twilio Error:', smsError);
            if (process.env.NODE_ENV === 'development') {
                console.log(`Fallback OTP for ${mobile}: ${otp}`);
                res.json({ success: true, message: 'OTP sent (Twilio failed - use dev OTP)', devOtp: otp });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to send OTP. Please try again.'
                });
            }
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and OTP required'
            });
        }

        const otpData = otpStore.get(mobile);

        if (!otpData) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not requested'
            });
        }

        // Check expiry
        if (Date.now() > otpData.expiresAt) {
            otpStore.delete(mobile);
            return res.status(400).json({
                success: false,
                message: 'OTP has expired'
            });
        }

        // Check attempts
        if (otpData.attempts >= 3) {
            otpStore.delete(mobile);
            return res.status(400).json({
                success: false,
                message: 'Too many incorrect attempts. Please request new OTP'
            });
        }

        // Verify OTP (ensure string comparison)
        if (String(otpData.otp) === String(otp)) {
            otpStore.delete(mobile); // Remove after successful verification
            
            res.json({
                success: true,
                message: 'OTP verified successfully'
            });
        } else {
            otpData.attempts++;
            otpStore.set(mobile, otpData);
            
            res.status(400).json({
                success: false,
                message: 'Invalid OTP',
                remainingAttempts: 3 - otpData.attempts
            });
        }

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server running', timestamp: new Date() });
});

// Get client IP (for activity logging)
app.get('/api/client-ip', (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || req.connection?.remoteAddress
        || 'Unknown';
    res.json({ ip });
});

// Start server with port fallback if port is in use
function startServer(port) {
    const portNum = parseInt(port, 10) || 3000;
    if (portNum >= 65536) {
        console.error('No available port found. Kill existing processes: kill $(lsof -i :3000 -t)');
        process.exit(1);
    }
    const isTwilioConfigured = process.env.TWILIO_ACCOUNT_SID && !String(process.env.TWILIO_ACCOUNT_SID).startsWith('YOUR_');
    const server = app.listen(portNum, () => {
        console.log(`
╔════════════════════════════════════════════════════╗
║     Twilio OTP Server Running                     ║
║                                                    ║
║     Server: http://localhost:${portNum}               ║
║     Open:   http://localhost:${portNum}/user.html     ║
║                                                    ║
║     Send OTP: POST /api/send-otp                   ║
║     Verify OTP: POST /api/verify-otp               ║
║                                                    ║
║     Twilio: ${isTwilioConfigured ? 'Configured' : 'Not configured (OTP shown for testing)'}           ║
╚════════════════════════════════════════════════════╝
        `);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${portNum} in use. Trying port ${portNum + 1}...`);
            startServer(portNum + 1);
        } else {
            throw err;
        }
    });
}

startServer(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Server shutting down...');
    process.exit(0);
});


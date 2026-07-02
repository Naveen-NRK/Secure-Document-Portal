# Secure Document Portal

A secure document access portal created for college use.  
It allows admins to upload and manage documents, while users must verify themselves using OTP before viewing protected files.

## Features

- User OTP verification using Twilio SMS / WhatsApp
- Admin dashboard for managing documents
- User activity logging
- Session-based access after successful verification
- Screenshot and download prevention controls
- Mobile number based authentication
- Simple local setup using Node.js and Express

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- Twilio API

## How to Run

1. Clone the repository:
git clone https://github.com/Naveen-NRK/Secure-Document-Portal.git

2. Open the project folder:
cd Secure-Document-Portal

3. Install dependencies:
npm install

4. Create a .env file using .env.example:
   cp .env.example .env

5. Add your Twilio credentials in .env.

6. Start the server:
   npm start
   
7. Open in browser:
   open uesr.html
   
9. Admin page:
   open admin.html

10. Environment Variables
   - TWILIO_ACCOUNT_SID=your_twilio_account_sid
   - TWILIO_AUTH_TOKEN=your_twilio_auth_token
   - TWILIO_PHONE=your_twilio_phone_number
   - WHATSAPP_FROM=whatsapp:+14155238886
   - WHATSAPP_VERIFICATION_CONTENT_SID=your_content_sid
   - COUNTRY_CODE=91
   - PORT=3000

## Project Purpose
This project was created to improve secure document sharing in a college environment.
It helps admins know who accessed documents, when they accessed them, and what activity was performed.

*Author*
Naveen R

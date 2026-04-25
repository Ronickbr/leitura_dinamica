const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#6366f1" rx="32"/>
  <text x="96" y="120" font-family="Arial" font-size="100" fill="white" text-anchor="middle">📖</text>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#6366f1" rx="64"/>
  <text x="256" y="320" font-family="Arial" font-size="260" fill="white" text-anchor="middle">📖</text>
</svg>`;

async function generateIcons() {
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  await sharp(Buffer.from(svg192)).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(Buffer.from(svg512)).png().toFile(path.join(publicDir, 'icon-512.png'));
  
  console.log('Ícones gerados: icon-192.png, icon-512.png');
}

generateIcons().catch(console.error);
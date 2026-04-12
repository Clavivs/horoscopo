import OpenAI from 'openai';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const apiKey = process.env.GROQ_API_KEY; 
const MODEL_NAME = "llama-3.3-70b-versatile"; 

if (!apiKey) {
  throw new Error("GROQ_API_KEY no está configurada en los Secrets de GitHub.");
}

const groq = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

const SIGNS = [
  { name: "Aries", symbol: "♈", slug: "aries" }, 
  { name: "Tauro", symbol: "♉", slug: "tauro" },
  { name: "Géminis", symbol: "♊", slug: "geminis" }, 
  { name: "Cáncer", symbol: "♋", slug: "cancer" },
  { name: "Leo", symbol: "♌", slug: "leo" }, 
  { name: "Virgo", symbol: "♍", slug: "virgo" },
  { name: "Libra", symbol: "♎", slug: "libra" }, 
  { name: "Escorpio", symbol: "♏", slug: "escorpio" },
  { name: "Sagitario", symbol: "♐", slug: "sagitario" }, 
  { name: "Capricornio", symbol: "♑", slug: "capricornio" },
  { name: "Acuario", symbol: "♒", slug: "acuario" }, 
  { name: "Piscis", symbol: "♓", slug: "piscis" }
];

async function generateAllHoroscopes() {
  const prompt = `Actúa como un astrólogo experto. Genera un horóscopo diario corto (2 frases) para cada uno de los 12 signos en español. Devuelve SOLO un objeto JSON: {"Aries": "...", "Tauro": "..."}. Sin texto extra.`;
  try {
    const response = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "Eres un astrólogo que solo responde en JSON puro." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" } 
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    const fallback = {};
    for (const sign of SIGNS) fallback[sign.name] = "Las estrellas están alineándose...";
    return fallback;
  }
}

async function updateIndexHtml() {
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const horoscopes = await generateAllHoroscopes();

  let horoscopeHtml = "";
  for (const sign of SIGNS) {
    horoscopeHtml += `
      <div class="sign">
        <h2>${sign.name} ${sign.symbol}</h2>
        <p>${horoscopes[sign.name] || "No disponible."}</p>
      </div>`;
  }

  // GENERADOR AUTOMÁTICO DE MENÚ ANIDADO
  let menuHtml = "";
  for (const s1 of SIGNS) {
  menuHtml += `
    <div class="submenu-container">
      <a href="#">${s1.symbol} ${s1.name} <span>&rsaquo;</span></a>
      <div class="submenu-content">`;
  for (const s2 of SIGNS) {
    // Lógica para que el nombre del archivo sea siempre alfabético
    // Ejemplo: Si es Tauro y Aries, el archivo será aries-tauro.html
    const pair = [s1.slug, s2.slug].sort(); 
    const fileName = `${pair[0]}-${pair[1]}.html`;
    
    menuHtml += `<a href="${fileName}">${s1.name} + ${s2.name}</a>`;
  }
  menuHtml += `</div></div>`;
}

  const newContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Horóscopo Diario Gratis</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; background-color: #0f0c29; color: #eee; }
    .container { max-width: 800px; margin: 30px auto; padding: 25px; background: #1a1a2e; border-radius: 15px; border: 1px solid #333; }
    h1 { color: #f0ad4e; text-align: center; margin-bottom: 10px; }
    .date { color: #5bc0de; text-align: center; font-weight: bold; margin-bottom: 20px; }
    
    /* --- Estilos Menú Multinivel --- */
    .nav-menu { display: flex; justify-content: center; margin-bottom: 30px; border-bottom: 1px solid #444; padding-bottom: 15px; }
    .dropdown { position: relative; display: inline-block; }
    .dropbtn { background-color: #f0ad4e; color: #1a1a2e; padding: 12px 24px; font-size: 16px; font-weight: bold; border: none; border-radius: 5px; cursor: pointer; }
    
    /* Primer nivel: Lista de signos */
    .dropdown-content { display: none; position: absolute; background-color: #222; min-width: 180px; box-shadow: 0 8px 16px rgba(0,0,0,0.5); z-index: 10; border-radius: 5px; }
    .dropdown:hover .dropdown-content { display: block; }
    
    .submenu-container { position: relative; }
    .dropdown-content a { color: #eee; padding: 12px 16px; text-decoration: none; display: flex; justify-content: space-between; border-bottom: 1px solid #333; }
    .dropdown-content a:hover { background-color: #333; color: #f0ad4e; }

    /* Segundo nivel: Combinaciones (Submenú lateral) */
    .submenu-content { display: none; position: absolute; left: 100%; top: 0; background-color: #282828; min-width: 200px; box-shadow: 4px 8px 16px rgba(0,0,0,0.5); border-radius: 5px; }
    .submenu-container:hover .submenu-content { display: block; }
    /* ------------------------------ */

    .sign { margin-top: 20px; padding: 15px; border-bottom: 1px dashed #444; }
    .sign h2 { color: #f0ad4e; margin: 0; }
    .footer { margin-top: 30px; font-size: 0.8em; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <nav class="nav-menu">
      <div class="dropdown">
        <button class="dropbtn">Compatibilidades ▾</button>
        <div class="dropdown-content">
          ${menuHtml}
        </div>
      </div>
    </nav>

    <h1>Horóscopo Diario</h1>
    <p class="date">${date}</p>
    ${horoscopeHtml}
    <p class="footer">IA en tiempo real • ${new Date().toLocaleTimeString('es-ES')}</p>
  </div>
</body>
</html>`;

  await fs.writeFile('index.html', newContent);
  
  try {
    await execAsync('git config user.name "github-actions[bot]"');
    await execAsync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    await execAsync('git add index.html');
    await execAsync('git commit -m "Menú multinivel actualizado [skip ci]"');
    await execAsync('git push origin main');
  } catch (e) { console.log('Sin cambios.'); }
}

updateIndexHtml();

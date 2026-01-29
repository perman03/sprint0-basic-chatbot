import "./style.css";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { callCompletionApi, generateText, streamText } from "ai";
import { marked } from "marked";
import {QAGema} from './gemaPrompt'

const app = document.querySelector("#app");
const submitBtn = document.querySelector("#submit");
const form = document.querySelector("form");


const openrouter = createOpenRouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
});

// escuchamos mediante el submit y tomamos el evento para prevenirlo
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.querySelector("#prompt");
  const prompt = input.value;

  if (prompt.trim() === "") {
    alert("No has consultado nada");
    return;
  }

  input.value = "";
  submitBtn.disabled = true;

  const userDiv = document.createElement("div");
  userDiv.className = "flex justify-end";
  userDiv.innerHTML = `
    <div class="bg-yellow-700 text-white px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%] shadow-md">
        ${prompt}
    </div>
`;
  app.appendChild(userDiv);

  const aiDiv = document.createElement("div");
  aiDiv.className = "flex justify-start";
  const aiContent = document.createElement("div");
  aiContent.className =
    "bg-slate-800 text-slate-100 px-4 py-2 rounded-2xl rounded-tl-none max-w-[80%] shadow-md border border-slate-700";
  aiDiv.appendChild(aiContent);
  app.appendChild(aiDiv);

  // Scroll al fondo
  app.scrollTop = app.scrollHeight;

  const result = streamText({
    model: openrouter("mistralai/ministral-8b-2512"),
    prompt,
    system: QAGema,
    //system: 'Eres un estudiante de informática',
    temperature: 0.5, //deterministico vs random
  });

  let fullResponse = ''
  for await (const text of result.textStream) {
    fullResponse += text;
    aiContent.innerHTML = marked.parse(fullResponse);
    app.scrollTop = app.scrollHeight;
  }

  if (aiContent.querySelector('table')) {
    const copyBtn = document.createElement('button');
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
      </svg> Copiar Tabla para Excel
    `;
    copyBtn.className = "mt-3 bg-slate-700 hover:bg-slate-600 text-xs text-white px-3 py-1.5 rounded-lg transition-all flex items-center";
    
    copyBtn.onclick = () => {
      const table = aiContent.querySelector('table');
      navigator.clipboard.writeText(table.innerText);
      
      copyBtn.innerText = "¡Copiado!";
      setTimeout(() => { copyBtn.innerText = "Copiar Tabla"; }, 2000);
    };

    aiContent.appendChild(copyBtn);
  }

  submitBtn.disabled = false;
});

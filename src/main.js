import "./style.css";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { callCompletionApi, generateText, streamText } from "ai";
import { marked } from "marked";

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

  // 2. Crear burbuja de la IA (vacía al inicio)
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
    model: openrouter("nvidia/nemotron-3-nano-30b-a3b:free"),
    prompt,
    system: "Eres un niño de 3 años",
    //system: 'Eres un estudiante de informática',
    temperature: 0.5, //deterministico vs random
  });

  let fullResponse = ''
  for await (const text of result.textStream) {
    fullResponse += text;
    aiContent.innerHTML = marked.parse(fullResponse);
    app.scrollTop = app.scrollHeight;
  }
  submitBtn.disabled = false;
});

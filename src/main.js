import "./style.css";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { marked } from "marked";
import { QAGema } from "./gemaPrompt";

const app = document.querySelector("#app");
const submitBtn = document.querySelector("#submit");
const form = document.querySelector("#form");

const openrouter = createOpenRouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
});

let inFlight = false;
let abortCtrl = null;

function isAbortError(err) {
  return (
    err?.name === "AbortError" ||
    /abort/i.test(err?.message || "") ||
    /aborted/i.test(err?.message || "")
  );
}

if (!window.__TMG_SUBMIT_BOUND__) {
  window.__TMG_SUBMIT_BOUND__ = true;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const input = document.querySelector("#prompt");
    const prompt = input.value;

    // ✅ valida antes de lock/abort
    if (!prompt || prompt.trim() === "") return;
console.count("submit fired");

    if (inFlight) return;
    inFlight = true;

    abortCtrl?.abort();
    abortCtrl = new AbortController();

    submitBtn.disabled = true;
    input.value = "";

    // Render user
    const userDiv = document.createElement("div");
    userDiv.className = "flex justify-end mb-4";
    userDiv.innerHTML = `
      <div class="bg-yellow-700 text-white px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%] shadow-md">
        ${prompt}
      </div>
    `;
    app.appendChild(userDiv);

    // Render AI bubble
    const aiDiv = document.createElement("div");
    aiDiv.className = "flex justify-start mb-4";
    const aiContent = document.createElement("div");
    aiContent.className =
      "bg-slate-800 text-slate-100 px-4 py-2 rounded-2xl rounded-tl-none max-w-[80%] shadow-md border border-slate-700 overflow-x-auto";
    aiDiv.appendChild(aiContent);
    app.appendChild(aiDiv);
    app.scrollTop = app.scrollHeight;

    let fullResponse = "";

    try {
      const result = streamText({
        model: openrouter("z-ai/glm-4.5-air:free"),
        //model: openrouter("meta-llama/llama-3.3-70b-instruct:free"),
        prompt,
        system: QAGema,
        temperature: 0.3,
        abortSignal: abortCtrl.signal, // si tu versión usa `signal`, cámbialo a `signal`
      });

      for await (const text of result.textStream) {
        fullResponse += text;
        aiContent.innerHTML = marked.parse(fullResponse);
        app.scrollTop = app.scrollHeight;
      }

      const table = aiContent.querySelector("table");
      if (table) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className =
          "mt-3 bg-slate-700 hover:bg-slate-600 text-xs text-white px-3 py-1.5 rounded-lg transition-all flex items-center";
        copyBtn.textContent = "Copiar Tabla para Excel";

        copyBtn.onclick = async () => {
          await navigator.clipboard.writeText(table.innerText);
          copyBtn.textContent = "¡Copiado!";
          setTimeout(
            () => (copyBtn.textContent = "Copiar Tabla para Excel"),
            2000
          );
        };

        aiContent.appendChild(copyBtn);
      }
    } catch (err) {
      // Si abortaste por enviar un segundo mensaje, esto puede pasar: lo ignoramos.
      if (!isAbortError(err)) {
        console.error(err);
        aiContent.innerHTML =
          '<div class="text-sm text-red-300">Ocurrió un error al generar la respuesta.</div>';
      }
    } finally {
      submitBtn.disabled = false;
      inFlight = false;
    }
  });

  // ✅ opcional: limpieza HMR
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.__TMG_SUBMIT_BOUND__ = false;
      abortCtrl?.abort();
    });
  }
}

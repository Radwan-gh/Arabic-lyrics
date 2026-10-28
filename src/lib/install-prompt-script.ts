// مفتاح window الذي يحفظ فيه السكربت المضمَّن حدث beforeinstallprompt — منفصل عن
// use-install-prompt.ts ("use client") ليُستورَد من layout (مكوّن خادم).
export const INSTALL_PROMPT_KEY = "__installPrompt";

/** يُضمَّن في <head> قبل أي JS آخر ليلتقط الحدث حتى لو سبق الـ hydration. */
export const INSTALL_PROMPT_CAPTURE_SCRIPT = `(function(){window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.${INSTALL_PROMPT_KEY}=e;});window.addEventListener("appinstalled",function(){window.${INSTALL_PROMPT_KEY}=null;});})();`;

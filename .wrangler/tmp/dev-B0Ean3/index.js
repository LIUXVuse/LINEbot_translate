var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-h9nEE4/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/handlers/cloudflareTranslateHandler.ts
async function detectLanguage(text, env) {
  try {
    const response = await env.AI.run("@cf/huggingface/microsoft/infoxlm-large-language-detection", {
      text
    });
    if (!response.result?.detectedLanguage) {
      throw new Error("\u672A\u6536\u5230\u8A9E\u8A00\u6AA2\u6E2C\u7D50\u679C");
    }
    return response.result.detectedLanguage;
  } catch (error) {
    console.error("\u8A9E\u8A00\u6AA2\u6E2C\u932F\u8AA4:", error);
    throw error;
  }
}
__name(detectLanguage, "detectLanguage");
async function translate(text, sourceLang, targetLang, env) {
  try {
    console.log(`\u6E96\u5099\u7FFB\u8B6F\u6587\u672C: "${text}" \u5F9E ${sourceLang} \u5230 ${targetLang}`);
    if (sourceLang === targetLang) {
      return text;
    }
    const response = await env.AI.run("@cf/meta/m2m100-1.2b", {
      text,
      source_lang: sourceLang === "auto" ? void 0 : sourceLang,
      target_lang: targetLang
    });
    if (!response.result?.translated_text) {
      throw new Error("\u672A\u6536\u5230\u7FFB\u8B6F\u7D50\u679C");
    }
    return response.result.translated_text;
  } catch (error) {
    console.error("\u7FFB\u8B6F\u932F\u8AA4:", error);
    throw error;
  }
}
__name(translate, "translate");
async function translateWithSecondary(text, primaryLang, secondaryLang, env) {
  try {
    const detectedLang = await detectLanguage(text, env);
    console.log("\u4F7F\u7528\u8A9E\u8A00\u4EE3\u78BC:", `\u4F86\u6E90=${detectedLang}`);
    const translations = [];
    if (detectedLang === primaryLang) {
      translations.push({ lang: primaryLang, text });
      if (secondaryLang) {
        const secondaryTranslation = await translate(text, detectedLang, secondaryLang, env);
        translations.push({ lang: secondaryLang, text: secondaryTranslation });
      }
      return translations;
    }
    const primaryTranslation = await translate(text, detectedLang, primaryLang, env);
    translations.push({ lang: primaryLang, text: primaryTranslation });
    if (secondaryLang && secondaryLang !== detectedLang) {
      const secondaryTranslation = await translate(text, detectedLang, secondaryLang, env);
      translations.push({ lang: secondaryLang, text: secondaryTranslation });
    }
    return translations;
  } catch (error) {
    console.error("\u7FFB\u8B6F\u904E\u7A0B\u4E2D\u767C\u751F\u932F\u8AA4:", error);
    throw error;
  }
}
__name(translateWithSecondary, "translateWithSecondary");

// src/services/languageSettingService.ts
async function getLanguageSetting(contextId, contextType, db) {
  try {
    const result = await db.prepare(
      "SELECT * FROM language_settings WHERE context_id = ? AND context_type = ?"
    ).bind(contextId, contextType).first();
    return result || null;
  } catch (error) {
    console.error("\u7372\u53D6\u8A9E\u8A00\u8A2D\u5B9A\u6642\u767C\u751F\u932F\u8AA4:", error);
    return null;
  }
}
__name(getLanguageSetting, "getLanguageSetting");
async function updateLanguageSetting(setting, db) {
  try {
    await db.prepare(
      `INSERT INTO language_settings 
                (context_id, context_type, primary_lang, secondary_lang, is_translating)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(context_id, context_type) DO UPDATE SET
                primary_lang = excluded.primary_lang,
                secondary_lang = excluded.secondary_lang,
                is_translating = excluded.is_translating`
    ).bind(
      setting.context_id,
      setting.context_type,
      setting.primary_lang,
      setting.secondary_lang,
      setting.is_translating ? 1 : 0
    ).run();
    return true;
  } catch (error) {
    console.error("\u66F4\u65B0\u8A9E\u8A00\u8A2D\u5B9A\u6642\u767C\u751F\u932F\u8AA4:", error);
    return false;
  }
}
__name(updateLanguageSetting, "updateLanguageSetting");

// src/handlers/messageHandler.ts
async function handleMessage(event, env) {
  try {
    const text = event.message.text;
    console.log("\u6536\u5230\u8A0A\u606F:", text);
    if (text.startsWith("/")) {
      const command = text.toLowerCase();
      switch (command) {
        case "/\u8AAA\u660E":
        case "/help":
          return [{
            type: "text",
            text: `\u{1F4D6} LINE\u7FFB\u8B6F\u6A5F\u5668\u4EBA\u4F7F\u7528\u8AAA\u660E

1\uFE0F\u20E3 \u57FA\u672C\u6307\u4EE4\uFF1A
\u2022 /\u7FFB\u8B6F - \u958B\u59CB\u8A2D\u5B9A\u7FFB\u8B6F\u8A9E\u8A00
\u2022 /\u8A2D\u5B9A - \u8A2D\u5B9A\u7FFB\u8B6F\u8A9E\u8A00
\u2022 /\u72C0\u614B - \u67E5\u770B\u76EE\u524D\u7FFB\u8B6F\u8A2D\u5B9A
\u2022 /\u8AAA\u660E - \u986F\u793A\u6B64\u8AAA\u660E

2\uFE0F\u20E3 \u4F7F\u7528\u65B9\u5F0F\uFF1A
\u2022 \u8A2D\u5B9A\u5B8C\u8A9E\u8A00\u5F8C\uFF0C\u6A5F\u5668\u4EBA\u6703\u81EA\u52D5\u7FFB\u8B6F\u7FA4\u7D44\u5167\u7684\u8A0A\u606F
\u2022 \u53EF\u4EE5\u8A2D\u5B9A\u4E3B\u8981\u548C\u6B21\u8981\u7FFB\u8B6F\u8A9E\u8A00
\u2022 \u652F\u63F4\u591A\u570B\u8A9E\u8A00\u4E92\u8B6F

3\uFE0F\u20E3 \u6CE8\u610F\u4E8B\u9805\uFF1A
\u2022 \u7FFB\u8B6F\u529F\u80FD\u9810\u8A2D\u70BA\u958B\u555F\u72C0\u614B
\u2022 \u53EF\u96A8\u6642\u66F4\u6539\u8A9E\u8A00\u8A2D\u5B9A
\u2022 \u5982\u6709\u554F\u984C\u8ACB\u4F7F\u7528 /\u8AAA\u660E \u67E5\u770B\u8AAA\u660E`
          }];
        case "/\u7FFB\u8B6F":
        case "/translate":
        case "/\u8A2D\u5B9A":
        case "/settings":
          return [{
            type: "flex",
            altText: "\u9078\u64C7\u7FFB\u8B6F\u8A9E\u8A00",
            contents: {
              type: "bubble",
              body: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "\u{1F4DD} \u9078\u64C7\u7FFB\u8B6F\u8A9E\u8A00",
                    weight: "bold",
                    size: "xl",
                    align: "center",
                    color: "#1DB446"
                  },
                  {
                    type: "text",
                    text: "\u8ACB\u9078\u64C7\u8981\u8A2D\u5B9A\u7684\u9805\u76EE\uFF1A",
                    size: "md",
                    align: "center",
                    margin: "md"
                  },
                  {
                    type: "button",
                    action: {
                      type: "postback",
                      label: "\u8A2D\u5B9A\u4E3B\u8981\u7FFB\u8B6F\u8A9E\u8A00",
                      data: "action=show_primary_langs",
                      displayText: "\u8A2D\u5B9A\u4E3B\u8981\u7FFB\u8B6F\u8A9E\u8A00"
                    },
                    style: "primary",
                    margin: "md"
                  },
                  {
                    type: "button",
                    action: {
                      type: "postback",
                      label: "\u8A2D\u5B9A\u6B21\u8981\u7FFB\u8B6F\u8A9E\u8A00",
                      data: "action=show_secondary_langs",
                      displayText: "\u8A2D\u5B9A\u6B21\u8981\u7FFB\u8B6F\u8A9E\u8A00"
                    },
                    style: "secondary",
                    margin: "md"
                  }
                ]
              }
            }
          }];
        case "/\u72C0\u614B":
        case "/status":
          const contextId2 = event.source.groupId || event.source.userId || event.source.roomId;
          if (!contextId2) {
            throw new Error("\u7121\u6CD5\u7372\u53D6\u4E0A\u4E0B\u6587 ID");
          }
          const setting2 = await getLanguageSetting(contextId2, event.source.type, env.DB);
          if (setting2) {
            return [{
              type: "text",
              text: `\u{1F4CA} \u7576\u524D\u7FFB\u8B6F\u8A2D\u5B9A\uFF1A
\u4E3B\u8981\u8A9E\u8A00\uFF1A${getLanguageDisplayName(setting2.primary_lang)}
\u6B21\u8981\u8A9E\u8A00\uFF1A${setting2.secondary_lang ? getLanguageDisplayName(setting2.secondary_lang) : "\u672A\u8A2D\u5B9A"}
\u81EA\u52D5\u7FFB\u8B6F\uFF1A${setting2.is_translating ? "\u958B\u555F \u2705" : "\u95DC\u9589 \u274C"}`
            }];
          } else {
            return [{
              type: "text",
              text: "\u2757 \u5C1A\u672A\u8A2D\u5B9A\u7FFB\u8B6F\u8A9E\u8A00\uFF0C\u8ACB\u4F7F\u7528 /\u7FFB\u8B6F \u6216 /\u8A2D\u5B9A \u4F86\u8A2D\u5B9A\u8A9E\u8A00\u3002"
            }];
          }
      }
      return [];
    }
    const contextId = event.source.groupId || event.source.userId || event.source.roomId;
    const contextType = event.source.type;
    if (!contextId) {
      throw new Error("\u7121\u6CD5\u7372\u53D6\u4E0A\u4E0B\u6587 ID");
    }
    const setting = await getLanguageSetting(contextId, contextType, env.DB);
    if (!setting || !setting.is_translating) {
      return [];
    }
    console.log("\u958B\u59CB\u7FFB\u8B6F\u8A0A\u606F:", { text, primaryLang: setting.primary_lang, secondaryLang: setting.secondary_lang });
    const translations = await translateWithSecondary(
      text,
      setting.primary_lang || "ja",
      // 如果沒有設定，預設使用日文
      setting.secondary_lang || null,
      env
    );
    const messages = [
      {
        type: "text",
        text: `\u{1F310} \u539F\u6587\uFF1A
${text}`
      }
    ];
    if (translations.length >= 2) {
      messages.push({
        type: "text",
        text: `\u7FFB\u8B6F (${getLanguageDisplayName(translations[0].lang)})\uFF1A
${translations[0].text}`
      });
      messages.push({
        type: "text",
        text: `\u7FFB\u8B6F (${getLanguageDisplayName(translations[1].lang)})\uFF1A
${translations[1].text}`
      });
    }
    return messages;
  } catch (error) {
    console.error("\u8655\u7406\u8A0A\u606F\u6642\u767C\u751F\u932F\u8AA4:", error);
    return [{
      type: "text",
      text: `\u7FFB\u8B6F\u767C\u751F\u932F\u8AA4\uFF1A${error.message}`
    }];
  }
}
__name(handleMessage, "handleMessage");
function getLanguageDisplayName(langCode) {
  const langMap = {
    "en": "\u82F1\u6587",
    "ja": "\u65E5\u6587",
    "ko": "\u97D3\u6587",
    "vi": "\u8D8A\u5357\u6587",
    "th": "\u6CF0\u6587",
    "zh-TW": "\u7E41\u9AD4\u4E2D\u6587",
    "zh-CN": "\u7C21\u9AD4\u4E2D\u6587"
  };
  return langMap[langCode] || langCode;
}
__name(getLanguageDisplayName, "getLanguageDisplayName");

// src/handlers/postbackHandler.ts
async function handlePostback(event, env) {
  try {
    const contextId = event.source.groupId || event.source.userId || event.source.roomId;
    const contextType = event.source.type;
    if (!contextId) {
      throw new Error("\u7121\u6CD5\u7372\u53D6\u4E0A\u4E0B\u6587 ID");
    }
    const data = new URLSearchParams(event.postback.data);
    const action = data.get("action");
    switch (action) {
      case "set_primary_lang":
        const primaryLang = data.get("lang");
        if (primaryLang) {
          await updateLanguageSetting({
            context_id: contextId,
            context_type: contextType,
            primary_lang: primaryLang,
            is_translating: true
          }, env.DB);
          return [{
            type: "text",
            text: `\u5DF2\u8A2D\u5B9A\u4E3B\u8981\u7FFB\u8B6F\u8A9E\u8A00\u70BA\uFF1A${getLanguageDisplayName2(primaryLang)}`
          }];
        }
        break;
      case "set_secondary_lang":
        const secondaryLang = data.get("lang");
        if (secondaryLang) {
          await updateLanguageSetting({
            context_id: contextId,
            context_type: contextType,
            primary_lang: "ja",
            // 預設主要語言為日文
            secondary_lang: secondaryLang,
            is_translating: true
          }, env.DB);
          return [{
            type: "text",
            text: `\u5DF2\u8A2D\u5B9A\u6B21\u8981\u7FFB\u8B6F\u8A9E\u8A00\u70BA\uFF1A${getLanguageDisplayName2(secondaryLang)}`
          }];
        }
        break;
      case "toggle_translation":
        const isTranslating = data.get("enable") === "true";
        await updateLanguageSetting({
          context_id: contextId,
          context_type: contextType,
          primary_lang: "ja",
          // 預設主要語言為日文
          is_translating: isTranslating
        }, env.DB);
        return [{
          type: "text",
          text: isTranslating ? "\u5DF2\u958B\u555F\u7FFB\u8B6F\u529F\u80FD" : "\u5DF2\u95DC\u9589\u7FFB\u8B6F\u529F\u80FD"
        }];
    }
    return [];
  } catch (error) {
    console.error("\u8655\u7406 postback \u6642\u767C\u751F\u932F\u8AA4:", error);
    return [{
      type: "text",
      text: `\u8A2D\u5B9A\u767C\u751F\u932F\u8AA4\uFF1A${error.message}`
    }];
  }
}
__name(handlePostback, "handlePostback");
function getLanguageDisplayName2(langCode) {
  const langMap = {
    "en": "\u82F1\u6587",
    "ja": "\u65E5\u6587",
    "ko": "\u97D3\u6587",
    "vi": "\u8D8A\u5357\u6587",
    "th": "\u6CF0\u6587",
    "zh-TW": "\u7E41\u9AD4\u4E2D\u6587",
    "zh-CN": "\u7C21\u9AD4\u4E2D\u6587"
  };
  return langMap[langCode] || langCode;
}
__name(getLanguageDisplayName2, "getLanguageDisplayName");

// src/utils/lineSignature.ts
async function verifySignature(body, signature, channelSecret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bodyBuffer = encoder.encode(body);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, bodyBuffer);
  const calculatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  return calculatedSignature === signature;
}
__name(verifySignature, "verifySignature");

// src/index.ts
var src_default = {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    try {
      const signature = request.headers.get("x-line-signature");
      if (!signature) {
        return new Response("Signature required", { status: 401 });
      }
      const body = await request.text();
      console.log("\u6536\u5230\u7684\u8ACB\u6C42\u5167\u5BB9:", body);
      const isValid = await verifySignature(body, signature, env.LINE_CHANNEL_SECRET);
      console.log("\u8A08\u7B97\u7684\u7C3D\u540D:", isValid);
      console.log("\u6536\u5230\u7684\u7C3D\u540D:", signature);
      if (!isValid) {
        return new Response("Invalid signature", { status: 401 });
      }
      const data = JSON.parse(body);
      const events = data.events;
      if (!events || events.length === 0) {
        return new Response("No events", { status: 200 });
      }
      const responses = await Promise.all(
        events.map(async (event) => {
          console.log("\u8655\u7406\u4E8B\u4EF6:", event.type);
          let messages;
          if (event.type === "message") {
            messages = await handleMessage(event, env);
          } else if (event.type === "postback") {
            messages = await handlePostback(event, env);
          }
          if (messages && messages.length > 0) {
            console.log("\u6E96\u5099\u767C\u9001\u7FFB\u8B6F\u7D50\u679C:", messages);
            await fetch("https://api.line.me/v2/bot/message/reply", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
              },
              body: JSON.stringify({
                replyToken: event.replyToken,
                messages
              })
            });
          }
        })
      );
      return new Response("Ok", { status: 200 });
    } catch (error) {
      console.error("\u8655\u7406\u8ACB\u6C42\u6642\u767C\u751F\u932F\u8AA4:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-h9nEE4/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-h9nEE4/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map

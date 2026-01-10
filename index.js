require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(bodyParser.json());

const { PAGE_ACCESS_TOKEN, VERIFY_TOKEN, DISCORD_WEBHOOK_URL, PAGE_ID, GEMINI_API_KEY } =
  process.env;

// Initialize Gemini AI
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }) : null;

// --- CONVERSATION STATE MANAGEMENT ---
// Tracks which conversations are in admin mode (bot disabled)
const conversationStates = new Map();

// Conversation state structure:
// {
//   psid: {
//     mode: 'bot' | 'admin',        // Current conversation mode
//     lastBotMessage: timestamp,     // Last time bot sent message
//     lastUserMessage: timestamp,    // Last time user sent message
//     adminTakeoverTime: timestamp,  // When admin took over
//   }
// }

function getConversationState(psid) {
  if (!conversationStates.has(psid)) {
    conversationStates.set(psid, {
      mode: 'bot',
      lastBotMessage: null,
      lastUserMessage: Date.now(),
      adminTakeoverTime: null,
    });
  }
  return conversationStates.get(psid);
}

function setAdminMode(psid) {
  const state = getConversationState(psid);
  state.mode = 'admin';
  state.adminTakeoverTime = Date.now();
  conversationStates.set(psid, state);
}

function setBotMode(psid) {
  const state = getConversationState(psid);
  state.mode = 'bot';
  state.adminTakeoverTime = null;
  conversationStates.set(psid, state);
}

function isAdminMode(psid) {
  const state = getConversationState(psid);
  return state.mode === 'admin';
}

// --- GEMINI AI INTEGRATION ---
async function getGeminiResponse(userMessage, userLanguage = 'mn') {
  if (!geminiModel) {
    return null; // Gemini not configured
  }

  try {
    // System prompt with guardrails and school context
    const systemPrompt = `You are an AI assistant for Oyunlag School in Ulaanbaatar, Mongolia.

IMPORTANT RULES:
1. ALWAYS respond in ${userLanguage === 'en' ? 'English' : 'Mongolian'} language
2. Be professional but friendly - use emojis sparingly (🏫, 📚, ✅)
3. Keep responses SHORT and CONCISE (2-4 sentences max) - users are on mobile
4. NEVER invent information - if you don't know, say "Би тэр мэдээлэлтэй танил биш байна. Манай багтай холбогдоно уу: 7575 5050"
5. ONLY answer questions about Oyunlag School
6. If question is off-topic (weather, jokes, unrelated topics), politely redirect: "Би Оюунлаг сургуулийн мэдээллээр тусламж үзүүлдэг. Манай хөтөлбөр, төлбөр, элсэлтийн талаар асуугаарай 📚"
7. If user is rude or inappropriate, respond politely: "Би танд хүндэтгэлтэйгээр тусламж үзүүлэхэд бэлэн байна. Хэрхэн тусалж чадах вэ?"

SCHOOL INFORMATION YOU CAN USE:
- Tuition: Prep 1,200,000₮, Grades 1-12: 12,500,000₮
- 68 clubs FREE
- Food: 10,000-12,000₮/day
- Bus: 6,000₮ (one-way), 12,000₮ (round-trip)
- Contact: 7575 5050, info@oyunlag.edu.mn, www.oyunlag.edu.mn
- Location: 2 buildings in БЗД district
- Curriculum: National + International (Pearson Edexcel), STEAM, IELTS/TOEFL prep
- Provider: Нью Армстронг ХХК for bus service

For ENROLLMENT/ADMISSION questions:
- Say requirements are on the website (www.oyunlag.edu.mn)
- Suggest they visit in person or call 7575 5050
- Don't make up requirements

Now answer this user question:
"${userMessage}"`;

    const result = await geminiModel.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error("Gemini AI Error:", error.message);
    return null;
  }
}

// Detect language from user message
function detectLanguage(text) {
  // Simple heuristic: if contains Cyrillic, it's Mongolian
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text) ? 'mn' : 'en';
}

// --- QUICK REPLIES (Shown above message input) ---
const defaultQuickReplies = [
  { content_type: "text", title: "📚 Сургалтын хөтөлбөр", payload: "CURRICULUM" },
  { content_type: "text", title: "💰 Төлбөр", payload: "TUITION" },
  { content_type: "text", title: "📝 Элсэлт", payload: "ADMISSION" },
  { content_type: "text", title: "📍 Хаяг байршил", payload: "LOCATION" },
];

const extendedQuickReplies = [
  { content_type: "text", title: "🍽️ Хоол", payload: "SCHOOL_FOOD" },
  { content_type: "text", title: "🚌 Автобус", payload: "SCHOOL_BUS" },
  { content_type: "text", title: "☎️ Холбоо барих", payload: "CONTACT" },
  { content_type: "text", title: "🏠 Үндсэн цэс", payload: "GET_STARTED" },
];

// --- CAROUSEL CARDS FOR MAIN MENU ---
const mainMenuCarousel = [
  {
    title: "📚 Сургалтын хөтөлбөр",
    subtitle: "Үндэсний болон олон улсын хөтөлбөр, 68 дугуйлан",
    image_url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Дэлгэрэнгүй", payload: "CURRICULUM" }],
  },
  {
    title: "💰 Сургалтын төлбөр",
    subtitle: "Бэлтгэл: 1.2сая₮, 1-12анги: 12.5сая₮",
    image_url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Дэлгэрэнгүй", payload: "TUITION" }],
  },
  {
    title: "📝 Элсэлт",
    subtitle: "Элсэлтийн бүртгэл, шаардлага",
    image_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Дэлгэрэнгүй", payload: "ADMISSION" }],
  },
  {
    title: "📍 Хаяг байршил",
    subtitle: "2 байрны хаяг, газрын зураг",
    image_url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Дэлгэрэнгүй", payload: "LOCATION" }],
  },
  {
    title: "🍽️ Сургуулийн хоол",
    subtitle: "Өдрийн хоолны үнэ: 10,000-12,000₮",
    image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Дэлгэрэнгүй", payload: "SCHOOL_FOOD" }],
  },
  {
    title: "🚌 Сургуулийн автобус",
    subtitle: "Чиглэл, төлбөр: 6,000-12,000₮",
    image_url: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Дэлгэрэнгүй", payload: "SCHOOL_BUS" }],
  },
  {
    title: "☎️ Холбоо барих",
    subtitle: "Утас: 7575 5050, И-мэйл, Facebook",
    image_url: "https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Дэлгэрэнгүй", payload: "CONTACT" }],
  },
  {
    title: "🆘 Тусламж авах",
    subtitle: "Манай багтай шууд холбогдох",
    image_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Холбогдох", payload: "CONTACT_SUPPORT" }],
  },
];

// --- YOUR DATA (THE BRAIN) ---
const content = {
  GET_STARTED: {
    type: "carousel",
    text: "Сайн байна у|у! Та 'Оюунлаг сургууль'-тай холбогдлоо.",
    quickReplies: defaultQuickReplies,
  },
  CURRICULUM: {
    type: "text_with_quick_replies",
    text: "📖 Оюунлаг сургуулийн хөтөлбөр\n\n🏛️ Үндэсний хөтөлбөр\n• МУ-ын цөм хөтөлбөр бүрэн хэрэгжүүлдэг\n\n🌍 Олон улсын - Pearson Edexcel\n• iPrimary, iLowerSecondary, IGCSE, A Level\n\n🚀 Дотоод хөтөлбөр\n• STEAM, Smart Math, AR/VR\n• Хятад хэл, Информатик, Дизайн\n• SAT, IELTS, TOEFL бэлтгэл\n\n🧠 Нийгмийн хөгжил\n• Positive Action Second Step\n\n🎭🎨🎵 68 дугуйлан ҮНЭГҮЙ!",
    quickReplies: [
      { content_type: "text", title: "💰 Төлбөр", payload: "TUITION" },
      { content_type: "text", title: "📝 Элсэлт", payload: "ADMISSION" },
      { content_type: "text", title: "🌐 Вэбсайт", payload: "WEBSITE" },
      { content_type: "text", title: "🏠 Үндсэн цэс", payload: "GET_STARTED" },
    ],
  },
  ADMISSION: {
    type: "button",
    text: "📝 Элсэлтийн мэдээлэл\n\nОюунлаг сургуульд элсэх тухай дэлгэрэнгүй мэдээллийг манай вэбсайтаас авна уу.\n\nАсуух зүйл байвал холбогдоно уу!",
    buttons: [
      { type: "web_url", title: "🌐 Вэбсайт", url: "http://www.oyunlag.edu.mn" },
      { type: "postback", title: "☎️ Холбоо барих", payload: "CONTACT" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
    quickReplies: extendedQuickReplies,
  },
  TUITION: {
    type: "text_with_quick_replies",
    text: "💰 Сургалтын төлбөр 2025-2026\n\n📚 Бэлтгэл ангийн төлбөр:\n💵 1,200,000₮\n\n📚 1-12-р ангийн төлбөр:\n💵 12,500,000₮\n\n🎭🎨🎵 68 төрлийн дугуйлан ҮНЭГҮЙ! ✨",
    quickReplies: [
      { content_type: "text", title: "📚 Хөтөлбөр", payload: "CURRICULUM" },
      { content_type: "text", title: "🍽️ Хоол", payload: "SCHOOL_FOOD" },
      { content_type: "text", title: "🚌 Автобус", payload: "SCHOOL_BUS" },
      { content_type: "text", title: "🏠 Үндсэн цэс", payload: "GET_STARTED" },
    ],
  },
  SCHOOL_FOOD: {
    type: "text_with_quick_replies",
    text: "🍽️ Сургуулийн хоолны үнэ\n\n🥗 Бага анги: 10,000₮\n🍕 Дунд анги: 11,000₮\n🍕🥗 Ахлах анги: 12,000₮\n\nЦэсийн мэдээллийг вэбсайтаас авна уу.",
    quickReplies: [
      { content_type: "text", title: "🚌 Автобус", payload: "SCHOOL_BUS" },
      { content_type: "text", title: "💰 Төлбөр", payload: "TUITION" },
      { content_type: "text", title: "☎️ Холбоо барих", payload: "CONTACT" },
      { content_type: "text", title: "🏠 Үндсэн цэс", payload: "GET_STARTED" },
    ],
  },
  SCHOOL_BUS: {
    type: "text_with_quick_replies",
    text: "🚌 Автобусны үйлчилгээ\n\n📅 'Нью Армстронг' ХХК хариуцдаг\n\n👨‍👩‍👧 2-12-р анги ✅ (1-р анги ⛔)\n\n💰 Төлбөр:\n• 1 талдаа: 6,000₮/өдөр\n• 2 талдаа: 12,000₮/өдөр\n\n⏰ Авах: 07:00-07:30\n🏫 Хүргэх: 15:40",
    quickReplies: [
      { content_type: "text", title: "💰 Төлбөр", payload: "TUITION" },
      { content_type: "text", title: "🍽️ Хоол", payload: "SCHOOL_FOOD" },
      { content_type: "text", title: "📍 Байршил", payload: "LOCATION" },
      { content_type: "text", title: "🏠 Үндсэн цэс", payload: "GET_STARTED" },
    ],
  },
  LOCATION: {
    type: "button",
    text: "📍 Хаяг байршил\n\nОюунлаг сургууль 2 байртай:",
    buttons: [
      { type: "postback", title: "🏢 1-р байр", payload: "LOCATION_1" },
      { type: "postback", title: "🏢 2-р байр", payload: "LOCATION_2" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
    quickReplies: extendedQuickReplies,
  },
  LOCATION_1: {
    type: "button",
    text: "🏢 1-р байр\n\n📍 БЗД 15-р хороо, 13-р хороолол, 43-3\nБөхийн өргөөний зүүн урд\n\n📱 7575 5050",
    buttons: [
      { type: "web_url", title: "🗺️ Google Maps", url: "https://maps.google.com/?q=Oyunlag+School+Building+1+Ulaanbaatar" },
      { type: "web_url", title: "🌐 Вэбсайт", url: "http://www.oyunlag.edu.mn" },
      { type: "postback", title: "◀️ Буцах", payload: "LOCATION" },
    ],
  },
  LOCATION_2: {
    type: "button",
    text: "🏢 2-р байр\n\n📍 БЗД 18-р хороо, 13-р хороолол 47/1\n\n📱 7575 5050",
    buttons: [
      { type: "web_url", title: "🗺️ Google Maps", url: "https://maps.google.com/?q=Oyunlag+School+Building+2+Ulaanbaatar" },
      { type: "web_url", title: "🌐 Вэбсайт", url: "http://www.oyunlag.edu.mn" },
      { type: "postback", title: "◀️ Буцах", payload: "LOCATION" },
    ],
  },
  CONTACT: {
    type: "button",
    text: "☎️ Холбоо барих\n\n📞 7575 5050\n📱 88113096, 88113097\n🌐 www.oyunlag.edu.mn\n📧 info@oyunlag.edu.mn",
    buttons: [
      { type: "phone_number", title: "📞 Залгах", payload: "+97675755050" },
      { type: "web_url", title: "🌐 Вэбсайт", url: "http://www.oyunlag.edu.mn" },
      { type: "web_url", title: "📘 Facebook", url: "https://www.facebook.com/oyunlag.edu.mn" },
    ],
    quickReplies: [
      { content_type: "text", title: "🆘 Тусламж", payload: "CONTACT_SUPPORT" },
      { content_type: "text", title: "📍 Байршил", payload: "LOCATION" },
      { content_type: "text", title: "🏠 Үндсэн цэс", payload: "GET_STARTED" },
    ],
  },
  CONTACT_SUPPORT: {
    type: "text_with_quick_replies",
    text: "👋 Та манай багтай холбогдох хүсэлт илгээлээ.\n\nМанай зөвлөх танд удахгүй хариу өгнө!",
    quickReplies: [
      { content_type: "text", title: "☎️ Холбоо барих", payload: "CONTACT" },
      { content_type: "text", title: "📍 Байршил", payload: "LOCATION" },
      { content_type: "text", title: "🏠 Үндсэн цэс", payload: "GET_STARTED" },
    ],
  },
  WEBSITE: {
    type: "button",
    text: "🌐 Оюунлаг сургуулийн вэбсайт:",
    buttons: [
      { type: "web_url", title: "🌐 Вэбсайт нээх", url: "http://www.oyunlag.edu.mn" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
  },
};

// --- WEBHOOK VERIFICATION ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// --- MESSAGE HANDLER ---
app.post("/webhook", async (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      // Update last user message timestamp
      const state = getConversationState(sender_psid);
      state.lastUserMessage = Date.now();

      // 1. Handle BUTTON CLICKS (Postback)
      if (webhook_event.postback) {
        const payload = webhook_event.postback.payload;

        // Special handling for CONTACT_SUPPORT - switch to admin mode
        if (payload === "CONTACT_SUPPORT") {
          notifyAdmin(sender_psid);
          setAdminMode(sender_psid);
          await handleResponse(sender_psid, payload);
          res.status(200).send("EVENT_RECEIVED");
          continue;
        }

        // Check for special commands to re-enable bot
        if (payload === "ENABLE_BOT") {
          setBotMode(sender_psid);
          await sendTextWithQuickReplies(sender_psid, "✅ Бот дахин идэвхтэй боллоо!", defaultQuickReplies);
          res.status(200).send("EVENT_RECEIVED");
          continue;
        }

        // Skip bot response if in admin mode
        if (isAdminMode(sender_psid)) {
          res.status(200).send("EVENT_RECEIVED");
          continue;
        }

        await handleResponse(sender_psid, payload);
      }

      // 2. Handle QUICK REPLY clicks
      else if (webhook_event.message && webhook_event.message.quick_reply) {
        const payload = webhook_event.message.quick_reply.payload;

        if (payload === "CONTACT_SUPPORT") {
          notifyAdmin(sender_psid);
          setAdminMode(sender_psid);
        }

        // Skip bot response if in admin mode
        if (isAdminMode(sender_psid)) {
          res.status(200).send("EVENT_RECEIVED");
          continue;
        }

        await handleResponse(sender_psid, payload);
      }

      // 3. Handle TYPED TEXT (Message)
      else if (webhook_event.message && webhook_event.message.text) {
        const text = webhook_event.message.text.toLowerCase();
        const originalText = webhook_event.message.text;

        // Skip bot response if in admin mode
        if (isAdminMode(sender_psid)) {
          res.status(200).send("EVENT_RECEIVED");
          continue;
        }

        // Check for bot re-enable command
        if (text.includes("enable bot") || text.includes("бот асаа")) {
          setBotMode(sender_psid);
          await sendTextWithQuickReplies(sender_psid, "✅ Бот дахин идэвхтэй боллоо!", defaultQuickReplies);
          res.status(200).send("EVENT_RECEIVED");
          continue;
        }

        // Check for specific keywords
        let matched = false;

        if (
          text.includes("hi") ||
          text.includes("hello") ||
          text.includes("сайн") ||
          text.includes("сайнуу") ||
          text.includes("menu") ||
          text.includes("цэс") ||
          text.includes("start") ||
          text.includes("эхлэх") ||
          text.includes("мэдээлэл")
        ) {
          await handleResponse(sender_psid, "GET_STARTED");
          matched = true;
        }
        // Keyword shortcuts for quick navigation
        else if (text.includes("төлбөр") || text.includes("үнэ")) {
          await handleResponse(sender_psid, "TUITION");
          matched = true;
        }
        else if (text.includes("хөтөлбөр") || text.includes("сургалт")) {
          await handleResponse(sender_psid, "CURRICULUM");
          matched = true;
        }
        else if (text.includes("элсэлт") || text.includes("бүртгэл")) {
          await handleResponse(sender_psid, "ADMISSION");
          matched = true;
        }
        else if (text.includes("хаяг") || text.includes("байршил") || text.includes("газар")) {
          await handleResponse(sender_psid, "LOCATION");
          matched = true;
        }
        else if (text.includes("хоол") || text.includes("хоолны")) {
          await handleResponse(sender_psid, "SCHOOL_FOOD");
          matched = true;
        }
        else if (text.includes("автобус") || text.includes("bus")) {
          await handleResponse(sender_psid, "SCHOOL_BUS");
          matched = true;
        }
        else if (text.includes("холбоо") || text.includes("утас") || text.includes("contact")) {
          await handleResponse(sender_psid, "CONTACT");
          matched = true;
        }

        // If no keywords matched, use Gemini AI as fallback
        if (!matched) {
          const language = detectLanguage(originalText);
          const geminiResponse = await getGeminiResponse(originalText, language);

          if (geminiResponse) {
            // Send AI response with quick replies
            await sendTextWithQuickReplies(sender_psid, geminiResponse, defaultQuickReplies);
          } else {
            // Fallback if Gemini fails or not configured
            const fallbackMessage = language === 'en'
              ? "I can help you with information about Oyunlag School. Please use the menu or ask about our programs, tuition, or admission."
              : "Би Оюунлаг сургуулийн мэдээллээр тусалж чадна. Цэс ашиглана уу эсвэл хөтөлбөр, төлбөр, элсэлтийн талаар асуугаарай.";
            await sendTextWithQuickReplies(sender_psid, fallbackMessage, defaultQuickReplies);
          }
        }
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// --- RESPONSE HANDLER ---
async function handleResponse(senderPsid, payload) {
  const data = content[payload] || content["GET_STARTED"];

  // Handle different response types
  switch (data.type) {
    case "carousel":
      // First send greeting text
      await sendTextWithQuickReplies(senderPsid, data.text, data.quickReplies);
      // Then send carousel
      await sendCarousel(senderPsid, mainMenuCarousel);
      break;

    case "text_with_quick_replies":
      await sendTextWithQuickReplies(senderPsid, data.text, data.quickReplies);
      break;

    case "button":
      await sendButtonTemplate(senderPsid, data.text, data.buttons, data.quickReplies);
      break;

    default:
      // Fallback to button template
      await sendButtonTemplate(senderPsid, data.text, data.buttons, data.quickReplies);
  }
}

// --- SEND TEXT WITH QUICK REPLIES ---
async function sendTextWithQuickReplies(senderPsid, text, quickReplies) {
  const message = {
    text: text,
  };

  if (quickReplies && quickReplies.length > 0) {
    message.quick_replies = quickReplies;
  }

  await callSendAPI(senderPsid, message);
}

// --- SEND CAROUSEL (Generic Template) ---
async function sendCarousel(senderPsid, cards) {
  const message = {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: cards.map(card => ({
          title: card.title,
          subtitle: card.subtitle,
          image_url: card.image_url,
          buttons: card.buttons,
        })),
      },
    },
  };

  await callSendAPI(senderPsid, message);
}

// --- SEND BUTTON TEMPLATE ---
async function sendButtonTemplate(senderPsid, text, buttons, quickReplies) {
  const message = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: text,
        buttons: buttons,
      },
    },
  };

  // Note: Quick replies can't be sent with button template in same message
  // So we send button template first, then quick replies in separate message if needed
  await callSendAPI(senderPsid, message);

  // If quick replies are specified, send them in a follow-up message
  if (quickReplies && quickReplies.length > 0) {
    await sendTextWithQuickReplies(senderPsid, "Та доорх сонголтоос сонгоно уу:", quickReplies);
  }
}

// --- SEND API ---
async function callSendAPI(senderPsid, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      { recipient: { id: senderPsid }, message: message }
    );
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response ? error.response.data : error.message
    );
  }
}

// --- NOTIFICATION SYSTEM ---
async function notifyAdmin(senderPsid) {
  if (!DISCORD_WEBHOOK_URL) return;

  const inboxLink = PAGE_ID
    ? `https://business.facebook.com/latest/inbox/messenger?asset_id=${PAGE_ID}`
    : "https://business.facebook.com/latest/inbox";

  const message = {
    embeds: [
      {
        title: "🚨 Шинэ тусламжийн хүсэлт - Оюунлаг сургууль",
        description: `Хэрэглэгч (PSID: ${senderPsid}) тусламж хүссэн байна.`,
        color: 3447003,
        fields: [
          {
            name: "⚙️ Системийн статус",
            value: "✅ Бот унтраагдсан - админ горим идэвхтэй\n🤖 Бот хариулахгүй хүртэл та хариулна",
          },
          {
            name: "📋 Үйлдэл шаардлагатай",
            value: `[📨 Facebook Inbox-руу очих](${inboxLink})`,
          },
          {
            name: "ℹ️ Анхааруулга",
            value: "Таны хариулсны дараа хэрэглэгч дахин асуулт асуувал бот хариулахгүй. Хэрэглэгч 'enable bot' эсвэл 'бот асаа' гэвэл бот дахин идэвхжинэ.",
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, message);
    console.log(`Admin notification sent for PSID: ${senderPsid}`);
  } catch (error) {
    console.error("Failed to send Discord notification:", error.message);
  }
}

// Keep app.listen for local testing
if (process.env.NODE_ENV !== "production") {
  app.listen(3000, () => console.log("Local server running on port 3000"));
}

// Export for Vercel
module.exports = app;

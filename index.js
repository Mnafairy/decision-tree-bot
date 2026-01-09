require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const { PAGE_ACCESS_TOKEN, VERIFY_TOKEN, DISCORD_WEBHOOK_URL, PAGE_ID } =
  process.env;

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

      // 1. Handle BUTTON CLICKS (Postback)
      if (webhook_event.postback) {
        const payload = webhook_event.postback.payload;

        if (payload === "CONTACT_SUPPORT") {
          notifyAdmin(sender_psid);
        }

        await handleResponse(sender_psid, payload);
      }

      // 2. Handle QUICK REPLY clicks
      else if (webhook_event.message && webhook_event.message.quick_reply) {
        const payload = webhook_event.message.quick_reply.payload;

        if (payload === "CONTACT_SUPPORT") {
          notifyAdmin(sender_psid);
        }

        await handleResponse(sender_psid, payload);
      }

      // 3. Handle TYPED TEXT (Message)
      else if (webhook_event.message && webhook_event.message.text) {
        const text = webhook_event.message.text.toLowerCase();

        // Check for specific keywords
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
        }
        // Keyword shortcuts for quick navigation
        else if (text.includes("төлбөр") || text.includes("үнэ")) {
          await handleResponse(sender_psid, "TUITION");
        }
        else if (text.includes("хөтөлбөр") || text.includes("сургалт")) {
          await handleResponse(sender_psid, "CURRICULUM");
        }
        else if (text.includes("элсэлт") || text.includes("бүртгэл")) {
          await handleResponse(sender_psid, "ADMISSION");
        }
        else if (text.includes("хаяг") || text.includes("байршил") || text.includes("газар")) {
          await handleResponse(sender_psid, "LOCATION");
        }
        else if (text.includes("хоол") || text.includes("хоолны")) {
          await handleResponse(sender_psid, "SCHOOL_FOOD");
        }
        else if (text.includes("автобус") || text.includes("bus")) {
          await handleResponse(sender_psid, "SCHOOL_BUS");
        }
        else if (text.includes("холбоо") || text.includes("утас") || text.includes("contact")) {
          await handleResponse(sender_psid, "CONTACT");
        }
        // If no keywords match, do nothing (so admin can reply manually)
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
            name: "Үйлдэл шаардлагатай",
            value: `[Энд дарж хариу өгнө үү](${inboxLink})`,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, message);
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

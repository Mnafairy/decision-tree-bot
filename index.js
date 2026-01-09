require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const { PAGE_ACCESS_TOKEN, VERIFY_TOKEN, DISCORD_WEBHOOK_URL, PAGE_ID } =
  process.env;

// --- YOUR DATA (THE BRAIN) ---
const content = {
  GET_STARTED: {
    text: "Сайн байна уу. Та 'Оюунлаг сургууль'-тай холбогдлоо. Та доорх сонголтоос сонгож мэдээлэл авна уу!",
    buttons: [
      { type: "postback", title: "📚 Сургалтын хөтөлбөр", payload: "CURRICULUM" },
      { type: "postback", title: "💰 Төлбөр", payload: "TUITION" },
      { type: "postback", title: "➕ Бусад сонголт", payload: "MORE_OPTIONS" },
    ],
  },
  MORE_OPTIONS: {
    text: "Бусад мэдээлэл:\n\nТа сонирхож буй мэдээллээ доорх товчлуураас сонгоно уу.",
    buttons: [
      { type: "postback", title: "📝 Элсэлт", payload: "ADMISSION" },
      { type: "postback", title: "📍 Хаяг байршил", payload: "LOCATION" },
      { type: "postback", title: "➕ Цааш үзэх", payload: "MORE_OPTIONS_2" },
    ],
  },
  MORE_OPTIONS_2: {
    text: "Нэмэлт мэдээлэл:\n\nТа сонирхож буй мэдээллээ доорх товчлуураас сонгоно уу.",
    buttons: [
      { type: "postback", title: "🍽️ Сургуулийн хоол", payload: "SCHOOL_FOOD" },
      { type: "postback", title: "🚌 Сургуулийн автобус", payload: "SCHOOL_BUS" },
      { type: "postback", title: "☎️ Холбоо барих", payload: "CONTACT" },
    ],
  },
  CURRICULUM: {
    text: "📖 Оюунлаг сургуулийн сургалтын хөтөлбөр (Товч хураангуй)\n\n🏛️ Үндэсний хөтөлбөр\n• Монгол Улсын цөм хөтөлбөрийг бүх түвшинд бүрэн хэрэгжүүлдэг.\n\n🌍 Олон улсын хөтөлбөр - Pearson Edexcel\n• English /1-р ангиас /\n• Бага, сууриь, бүрэн дунд боловсролд Английн олон улсын хөтөлбөрийг хэрэгжүүлдэг.\n• iPrimary, iLowerSecondary, IGCSE, A Level түвшнүүдтэй.\n\n🚀 Сургуулийн дотоод хөтөлбөр\n• STEAM\n• Smart Math\n• AR/VR технологи\n• Хятад хэл /5-р ангиас /\n• Информатик\n• График дизайн\n• SAT, IELTS, TOEFL-ийн бэлтгэл хичээлүүд\n🧠 Нийгмийн хөгжил\n• 'Positive Action Second Step' хөтөлбөрөөр сурагчдын ёс зүй, харилцаа, сэтгэлзүйн хөгжилд анхаардаг.\n• 🎭🎨🎵 68 нэр төрлийн дугуйлан үнэ төлбөргүй хичээллэнэ! ✨\n\n🎯 Зорилго\n• Үндэсний болон олон улсын тавцанд өрсөлдөх чадвартай, бүтээлч сэтгэлгээтэй, ёс зүйтэй, олон талт чадвартай иргэн бэлтгэх.",
    buttons: [
      { type: "postback", title: "💰 Төлбөр", payload: "TUITION" },
      { type: "postback", title: "🍽️ Хоол", payload: "SCHOOL_FOOD" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
  },
  ADMISSION: {
    text: "📝 Элсэлтийн мэдээлэл\n\nОюунлаг сургуульд элсэх тухай дэлгэрэнгүй мэдээллийг манай вэбсайт болон холбоо барих хэсгээс авна уу.\n\nТа элсэлтийн талаар асуух зүйл байвал 'Холбоо барих' хэсгээс шууд холбогдоно уу.",
    buttons: [
      {
        type: "web_url",
        title: "🌐 Вэбсайт",
        url: "http://www.oyunlag.edu.mn",
      },
      { type: "postback", title: "☎️ Холбоо барих", payload: "CONTACT" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
  },
  TUITION: {
    text: "💰 Сургалтын төлбөр\n\n2025-2026 оны 1-р ангид элсэн сурах сурагчдын Бэлтгэл ангийн сургалтын төлбөр:\n💵 1,200,000₮\n\n2025-2026 оны хичээлийн жилийн 1-12-р ангийн сургалтын төлбөр:\n💵 12,500,000₮\n\n🎭🎨🎵 68 нэр төрлийн дугуйлан үнэ төлбөргүй хичээллэнэ! 🎪✨",
    buttons: [
      { type: "postback", title: "📚 Сургалтын хөтөлбөр", payload: "CURRICULUM" },
      { type: "postback", title: "🍽️ Хоол", payload: "SCHOOL_FOOD" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
  },
  SCHOOL_FOOD: {
    text: "🍽️ Сургуулийн өдрийн хоолны үнэ 🍴✨\n\n🥗 Бага анги: 10,000₮ 🧒\n🍕 Дунд анги: 11,000₮ 🧑\n🍕🥗 Ахлах анги: 12,000₮ 🧑\n\nХоолны цэсийн мэдээлэл авах бол доорх холбоосоор орно уу.\nhttp://www.oyunlag.edu.mn",
    buttons: [
      { type: "postback", title: "🚌 Автобус", payload: "SCHOOL_BUS" },
      { type: "postback", title: "☎️ Холбоо барих", payload: "CONTACT" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
  },
  SCHOOL_BUS: {
    text: "🚌 Оюунлаг сургуулийн сурагчдад зориулсан автобусны үйлчилгээ 🚍🚎\n\n📅 2021 оноос эхлэн 'Нью Армстронг' ХХК хариуцан явуулж байна.\n\n👨‍👩‍👧 Хамрагдах боломжтой сурагчид: 2-12-р анги ✅\n(1-р ангийн сурагчид хамрагдах боломжгүй ⛔)\n\n💰 Төлбөр:\n💵 1 талдаа: Өдрийн 6,000₮\n💵 2 талдаа: Өдрийн 12,000₮\n🔑 Төлбөрийг тухайн хичээлийн жилийн улирлаар урьдчилан төлнө.\n\n🌅 Сурагчдыг гэрээс авах цаг: Байршлаас хамаарч 07:00-07:30 хооронд\n🏫 Сургуулиас хөдлөх цаг: 15:40 ⏰\n\nЧиглэлийн мэдээлэл авах бол доорх холбоосоор орно уу.",
    buttons: [
      {
        type: "web_url",
        title: "🌐 Дэлгэрэнгүй",
        url: "http://www.oyunlag.edu.mn",
      },
      { type: "postback", title: "💰 Төлбөр", payload: "TUITION" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
  },
  LOCATION: {
    text: "📍 Хаяг байршил\n\nОюунлаг сургууль 2 байр дээр үйл ажиллагаа явуулдаг. Дэлгэрэнгүй мэдээллийг доорх товчлуураас сонгоно уу:",
    buttons: [
      { type: "postback", title: "🏢 1-р байр", payload: "LOCATION_1" },
      { type: "postback", title: "🏢 2-р байр", payload: "LOCATION_2" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
  },
  LOCATION_1: {
    text: "🏢 Сургуулийн нэг дүгээр байр\n\n📍 Хичээлийн 1-р байр:\nБЗДҮүрэг 15-р хороо, 13-р хороолол, 43-3, Бөхийн өргөөний зүүн урд Оюунлаг сургууль\n\n🌐 Вэбсайт: www.oyunlag.edu.mn\n📱 Утас: 7575 5050",
    buttons: [
      {
        type: "web_url",
        title: "🗺️ Google Maps",
        url: "https://maps.google.com/?q=Oyunlag+School+Building+1+Ulaanbaatar",
      },
      {
        type: "web_url",
        title: "🌐 Вэбсайт",
        url: "http://www.oyunlag.edu.mn",
      },
      { type: "postback", title: "◀️ Буцах", payload: "LOCATION" },
    ],
  },
  LOCATION_2: {
    text: "🏢 Сургуулийн хоёр дугаар байр\n\n📍 Хичээлийн 2-р байр:\nБЗДҮүрэг 18-р хороо, 13-р хороолол 47/1\n\n🌐 Вэбсайт: www.oyunlag.edu.mn\n📱 Утас: 7575 5050",
    buttons: [
      {
        type: "web_url",
        title: "🗺️ Google Maps",
        url: "https://maps.google.com/?q=Oyunlag+School+Building+2+Ulaanbaatar",
      },
      {
        type: "web_url",
        title: "🌐 Вэбсайт",
        url: "http://www.oyunlag.edu.mn",
      },
      { type: "postback", title: "◀️ Буцах", payload: "LOCATION" },
    ],
  },
  CONTACT: {
    text: "☎️ Холбоо барих\n\n📞 Утас: 7575 5050\n📱 88113096, 88113097\n🌐 Вэбсайт: www.oyunlag.edu.mn\n📧 И-мэйл: info@oyunlag.edu.mn\n📘 Facebook: facebook.com/oyunlag.edu.mn\n\nТанд туслахад бэлэн байна!",
    buttons: [
      {
        type: "phone_number",
        title: "📞 Залгах",
        payload: "+97675755050",
      },
      {
        type: "web_url",
        title: "🌐 Вэбсайт",
        url: "http://www.oyunlag.edu.mn",
      },
      {
        type: "web_url",
        title: "📘 Facebook",
        url: "https://www.facebook.com/oyunlag.edu.mn",
      },
    ],
  },
  CONTACT_SUPPORT: {
    text: "👋 Та манай багтай шууд холбогдох хүсэлтээ илгээлээ. Манай зөвлөх танд удахгүй хариу өгөх болно.\n\nХүсвэл доорх холбоо барих хэсгээс шууд холбогдож болно.",
    buttons: [
      { type: "postback", title: "☎️ Холбоо барих", payload: "CONTACT" },
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

// --- MESSAGE HANDLER (FIXED) ---
app.post("/webhook", async (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    // SINGLE LOOP to prevent double replies
    for (const entry of body.entry) {
      // Get the message event
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      // 1. Handle BUTTON CLICKS (Postback)
      if (webhook_event.postback) {
        const payload = webhook_event.postback.payload;

        // Notification Check
        if (payload === "CONTACT_SUPPORT") {
          notifyAdmin(sender_psid); // Send alert silently
        }

        await handleResponse(sender_psid, payload);
      }

      // 2. Handle TYPED TEXT (Message)
      else if (webhook_event.message && webhook_event.message.text) {
        const text = webhook_event.message.text.toLowerCase();

        // STRICT FILTER: Only answer if they say specific words (Mongolian & English)
        if (
          text.includes("hi") ||
          text.includes("hello") ||
          text.includes("сайн") ||
          text.includes("сайн байна уу") ||
          text.includes("сайнуу") ||
          text.includes("menu") ||
          text.includes("цэс") ||
          text.includes("start") ||
          text.includes("эхлэх") ||
          text.includes("мэдээлэл")
        ) {
          await handleResponse(sender_psid, "GET_STARTED");
        }
        // If they type anything else, we do NOTHING (so you can reply manually)
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// --- LOGIC HELPER ---
async function handleResponse(senderPsid, payload) {
  const data = content[payload] || content["GET_STARTED"];

  const response = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: data.text,
        buttons: data.buttons,
      },
    },
  };

  await callSendAPI(senderPsid, response);
}

// --- SEND API ---
async function callSendAPI(senderPsid, response) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      { recipient: { id: senderPsid }, message: response }
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
        color: 3447003, // Blue color
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
  app.listen(3000, () => console.log("Local server running"));
}

// Export for Vercel
module.exports = app;

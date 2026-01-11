require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const ua = require("universal-analytics");
const faqDatabase = require("./faq-database");

const app = express();
app.use(bodyParser.json());

const {
  PAGE_ACCESS_TOKEN,
  VERIFY_TOKEN,
  DISCORD_WEBHOOK_URL,
  PAGE_ID,
  GEMINI_API_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_DATABASE_URL,
  GA_TRACKING_ID,
} = process.env;

// Initialize Gemini AI
// Using gemini-1.5-flash instead of gemini-2.0-flash-exp for better free tier quotas
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

// Initialize Firebase Admin
let db = null;
if (FIREBASE_PROJECT_ID && FIREBASE_PRIVATE_KEY && FIREBASE_CLIENT_EMAIL) {
  try {
    // Handle both regular newlines and escaped newlines in private key
    let privateKey = FIREBASE_PRIVATE_KEY;

    // If the key doesn't contain actual newlines, try replacing escaped ones
    if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Verify the key starts with the proper PEM header
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Private key missing PEM header. Make sure your .env file has the complete private key including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: FIREBASE_DATABASE_URL,
    });
    db = admin.database();
    console.log("✅ Firebase initialized successfully");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error.message);
    console.error("💡 TIP: Make sure your FIREBASE_PRIVATE_KEY in .env includes the full key with -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----");
    console.error("💡 TIP: In .env file, the private key should have \\n for line breaks, like: FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n\"");
  }
}

// Initialize Google Analytics
const analyticsEnabled = !!GA_TRACKING_ID;
const analytics = analyticsEnabled ? ua(GA_TRACKING_ID) : null;

// Helper function to track events in Google Analytics
function trackEvent(category, action, label, value, userId) {
  if (!analyticsEnabled || !analytics) return;

  try {
    const event = analytics.event(category, action, label, value);
    if (userId) {
      event.set("uid", userId);
    }
    event.send();
  } catch (error) {
    console.error("Analytics tracking error:", error.message);
  }
}

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

  // Auto-reset admin mode if it's been more than 24 hours
  if (state.mode === 'admin' && state.adminTakeoverTime) {
    const hoursSinceAdminMode = (Date.now() - state.adminTakeoverTime) / (1000 * 60 * 60);
    if (hoursSinceAdminMode > 24) {
      console.log(`⚠️ Auto-resetting admin mode for PSID ${psid} (been ${hoursSinceAdminMode.toFixed(1)} hours)`);
      setBotMode(psid);
      return false;
    }
  }

  return state.mode === 'admin';
}

// --- GEMINI AI INTEGRATION ---
async function getGeminiResponse(userMessage, userLanguage = 'mn') {
  if (!geminiModel) {
    console.log("⚠️ Gemini AI not configured - GEMINI_API_KEY missing");
    return null; // Gemini not configured
  }

  try {
    console.log(`🤖 Gemini AI request: "${userMessage}" (lang: ${userLanguage})`);

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

    console.log(`✅ Gemini AI response: "${text.substring(0, 100)}..."`);
    return text.trim();
  } catch (error) {
    console.error("❌ Gemini AI Error:", error.message);
    console.error("Error details:", error);
    return null;
  }
}

// Detect language from user message
function detectLanguage(text) {
  // Simple heuristic: if contains Cyrillic, it's Mongolian
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text) ? 'mn' : 'en';
}

// --- FAQ SEARCH FUNCTIONALITY ---

// Search FAQ database with keyword matching
function searchFAQ(query) {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const matches = [];

  for (const faq of faqDatabase) {
    let score = 0;

    // Check if query matches question directly
    if (faq.question.toLowerCase().includes(normalizedQuery)) {
      score += 50;
    }

    // Check if query matches answer
    if (faq.answer.toLowerCase().includes(normalizedQuery)) {
      score += 20;
    }

    // Check keywords
    for (const keyword of faq.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(normalizedQuery)) {
        score += 10;
      }
    }

    // If we have a match, add to results
    if (score > 0) {
      matches.push({ ...faq, score });
    }
  }

  // Sort by score (highest first) and return top 3
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Get FAQ quick replies for "Was this helpful?" feedback
function getFAQFeedbackQuickReplies(faqId) {
  return [
    { content_type: "text", title: "✅ Тийм, тусалсан", payload: `FAQ_HELPFUL_${faqId}` },
    { content_type: "text", title: "❌ Үгүй, туслаагүй", payload: `FAQ_NOT_HELPFUL_${faqId}` },
    { content_type: "text", title: "🏠 Үндсэн цэс", payload: "GET_STARTED" },
  ];
}

// Track FAQ feedback
async function trackFAQFeedback(psid, faqId, helpful) {
  if (!db) {
    console.log("⚠️ Firebase not configured, skipping FAQ feedback tracking");
    // Still track in analytics if available
    trackEvent(
      "FAQ Feedback",
      helpful ? "Helpful" : "Not Helpful",
      faqId,
      1,
      psid
    );
    return;
  }

  try {
    const feedbackRef = db.ref(`faq_feedback/${faqId}`);
    const snapshot = await feedbackRef.once('value');
    const currentData = snapshot.val() || { helpful: 0, notHelpful: 0 };

    if (helpful) {
      currentData.helpful = (currentData.helpful || 0) + 1;
    } else {
      currentData.notHelpful = (currentData.notHelpful || 0) + 1;
    }

    await feedbackRef.set(currentData);

    // Also track in user data
    await updateUserData(psid, {
      [`faqFeedback/${faqId}`]: helpful,
    });

    // Track in analytics
    trackEvent(
      "FAQ Feedback",
      helpful ? "Helpful" : "Not Helpful",
      faqId,
      1,
      psid
    );
  } catch (error) {
    console.error("❌ Error tracking FAQ feedback (continuing anyway):", error.message);
    // Don't throw - Firebase errors shouldn't stop the bot
  }
}

// --- USER DATA MANAGEMENT (Firebase) ---

// Get user profile from Facebook
async function getUserProfile(psid) {
  if (!PAGE_ACCESS_TOKEN) {
    console.log("⚠️ PAGE_ACCESS_TOKEN not configured, cannot fetch user profile");
    return null;
  }

  try {
    console.log(`📱 Fetching Facebook profile for PSID: ${psid}`);
    const response = await axios.get(
      `https://graph.facebook.com/v21.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`
    );
    console.log(`✅ Facebook profile fetched: ${response.data.first_name} ${response.data.last_name}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching user profile:", error.message);
    if (error.response) {
      console.error("Facebook API error:", error.response.data);
    }
    return null;
  }
}

// Get or create user data in Firebase
async function getUserData(psid) {
  if (!db) {
    console.log("⚠️ Firebase not configured, cannot get user data");
    return null;
  }

  try {
    const userRef = db.ref(`users/${psid}`);
    const snapshot = await userRef.once('value');

    if (snapshot.exists()) {
      console.log(`✅ User data found in Firebase for PSID: ${psid}`);
      return snapshot.val();
    } else {
      // Create new user profile
      console.log(`📝 Creating new user profile for PSID: ${psid}`);
      const profile = await getUserProfile(psid);
      const newUser = {
        psid: psid,
        firstName: profile?.first_name || "Хэрэглэгч",
        lastName: profile?.last_name || "",
        profilePic: profile?.profile_pic || "",
        createdAt: Date.now(),
        lastActive: Date.now(),
        totalMessages: 0,
        inquiries: [],
        preferences: {
          language: 'mn',
          interestedGrade: null,
          interestedProgram: null,
        },
        stats: {
          menuClicks: 0,
          aiQueries: 0,
          supportRequests: 0,
        },
      };

      await userRef.set(newUser);
      console.log(`✅ New user created: ${newUser.firstName}`);
      return newUser;
    }
  } catch (error) {
    console.error("❌ Error getting user data:", error.message);
    return null;
  }
}

// Update user data
async function updateUserData(psid, updates) {
  if (!db) {
    console.log("⚠️ Firebase not configured, skipping user data update");
    return;
  }

  try {
    const userRef = db.ref(`users/${psid}`);
    await userRef.update({
      ...updates,
      lastActive: Date.now(),
    });
  } catch (error) {
    console.error("❌ Error updating user data:", error.message);
    // Don't throw - we don't want Firebase errors to crash the bot
  }
}

// Track user inquiry
async function trackInquiry(psid, topic, method = 'menu') {
  if (!db) return;

  try {
    const userRef = db.ref(`users/${psid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    const inquiry = {
      topic: topic,
      method: method, // 'menu', 'ai', 'keyword', 'faq'
      timestamp: Date.now(),
    };

    const inquiries = userData?.inquiries || [];
    inquiries.push(inquiry);

    await userRef.update({
      inquiries: inquiries.slice(-20), // Keep last 20 inquiries
      totalMessages: (userData?.totalMessages || 0) + 1,
    });
  } catch (error) {
    console.error("❌ Error tracking inquiry (continuing anyway):", error.message);
    // Don't throw - Firebase errors shouldn't stop the bot
  }
}

// Get personalized greeting
async function getPersonalizedGreeting(psid) {
  try {
    console.log(`📝 Getting personalized greeting for PSID: ${psid}`);
    const userData = await getUserData(psid);

    if (!userData) {
      console.log("⚠️ No user data found, using default greeting");
      return "Сайн байна уу! 👋 Оюунлаг сургуулийн мэдээллийн бот-д тавтай морил!";
    }

    const firstName = userData.firstName || "Хэрэглэгч";
    console.log(`✅ User found: ${firstName}`);

    const inquiries = userData.inquiries || [];
    const lastInquiry = inquiries[inquiries.length - 1];

    // If user has previous inquiries
    if (lastInquiry) {
      const topicNames = {
        CURRICULUM: "хөтөлбөрийн",
        TUITION: "төлбөрийн",
        ADMISSION: "элсэлтийн",
        LOCATION: "байршлын",
        SCHOOL_FOOD: "хоолны",
        SCHOOL_BUS: "автобусны",
      };

      const topicName = topicNames[lastInquiry.topic] || "";

      if (topicName) {
        return `Сайн байна уу ${firstName}! 👋 Та өмнө ${topicName} талаар асуусан байсан. Өнөөдөр юугаар тусалж чадах вэ?`;
      }
    }

    return `Сайн байна уу ${firstName}! 👋 Оюунлаг сургуулийн мэдээллийн бот-д тавтай морил!`;
  } catch (error) {
    console.error("❌ Error in getPersonalizedGreeting:", error.message);
    return "Сайн байна уу! 👋 Оюунлаг сургуулийн мэдээллийн бот-д тавтай морил!";
  }
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
  {
    title: "🏫 Виртуал Тур",
    subtitle: "Манай сургуулийг үзээрэй - 360°",
    image_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Тур эхлүүлэх", payload: "VIRTUAL_TOUR" }],
  },
  {
    title: "🔔 Мэдэгдэл",
    subtitle: "Үйл явдлын мэдэгдэл авах",
    image_url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=400&fit=crop",
    buttons: [{ type: "postback", title: "Бүртгүүлэх", payload: "EVENT_NOTIFICATIONS" }],
  },
];

// --- VIRTUAL TOUR CAROUSEL ---
const virtualTourCarousel = [
  {
    title: "🏫 Сургуулийн орц",
    subtitle: "Оюунлаг сургуулийн тансаг орц",
    image_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=600&h=600&fit=crop",
    buttons: [
      { type: "web_url", title: "360° үзэх", url: "https://www.oyunlag.edu.mn" },
      { type: "postback", title: "Дараагийнх", payload: "GET_STARTED" },
    ],
  },
  {
    title: "📚 Анги танхим",
    subtitle: "Орчин үеийн багшлагын орчин",
    image_url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=600&fit=crop",
    buttons: [
      { type: "web_url", title: "360° үзэх", url: "https://www.oyunlag.edu.mn" },
      { type: "postback", title: "Дараагийнх", payload: "GET_STARTED" },
    ],
  },
  {
    title: "🔬 Лаборатори",
    subtitle: "Шинжлэх ухаан, эрдэм шинжилгээний лаборатори",
    image_url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=600&fit=crop",
    buttons: [
      { type: "web_url", title: "360° үзэх", url: "https://www.oyunlag.edu.mn" },
      { type: "postback", title: "Дараагийнх", payload: "GET_STARTED" },
    ],
  },
  {
    title: "📖 Номын сан",
    subtitle: "10,000+ номтой өргөн номын сан",
    image_url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&h=600&fit=crop",
    buttons: [
      { type: "web_url", title: "360° үзэх", url: "https://www.oyunlag.edu.mn" },
      { type: "postback", title: "Дараагийнх", payload: "GET_STARTED" },
    ],
  },
  {
    title: "⚽ Тоглоомын талбай",
    subtitle: "Өргөн спортын болон тоглоомын талбай",
    image_url: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=600&h=600&fit=crop",
    buttons: [
      { type: "web_url", title: "360° үзэх", url: "https://www.oyunlag.edu.mn" },
      { type: "postback", title: "Буцах", payload: "GET_STARTED" },
    ],
  },
  {
    title: "🍽️ Хоолны газар",
    subtitle: "Эрүүл хоолтой орчин үеийн хоолны газар",
    image_url: "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&h=600&fit=crop",
    buttons: [
      { type: "web_url", title: "360° үзэх", url: "https://www.oyunlag.edu.mn" },
      { type: "postback", title: "Буцах", payload: "GET_STARTED" },
    ],
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
  VIRTUAL_TOUR: {
    type: "carousel",
    text: "🏫 Виртуал Тур - Манай сургуулийг үзээрэй!",
    quickReplies: extendedQuickReplies,
  },
  EVENT_NOTIFICATIONS: {
    type: "button",
    text: "🔔 Сургуулийн арга хэмжээний мэдэгдэл\n\nТа үйл явдлын мэдэгдэл авахыг хүсч байна уу?\n\n✅ Нээлттэй хаалганы өдөр\n✅ Элсэлтийн хугацаа\n✅ Шалгалтын хуваарь\n✅ Сарын мэдээлэл",
    buttons: [
      { type: "postback", title: "✅ Мэдэгдэл авах", payload: "SUBSCRIBE_EVENTS" },
      { type: "postback", title: "❌ Цуцлах", payload: "UNSUBSCRIBE_EVENTS" },
      { type: "postback", title: "🏠 Буцах", payload: "GET_STARTED" },
    ],
    quickReplies: extendedQuickReplies,
  },
  SUBSCRIBE_EVENTS: {
    type: "text_with_quick_replies",
    text: "✅ Амжилттай!\n\nТа одоо сургуулийн үйл явдлын мэдэгдэл авах болно. Бид танд чухал мэдээллүүдийг цаг тухайд нь хүргэх болно! 📬",
    quickReplies: defaultQuickReplies,
  },
  UNSUBSCRIBE_EVENTS: {
    type: "text_with_quick_replies",
    text: "❌ Та мэдэгдлээс гарлаа.\n\nХэрэв дахин мэдэгдэл авахыг хүсвэл цэснээс 'Мэдэгдэл' гэснийг сонгоно уу.",
    quickReplies: defaultQuickReplies,
  },
};

// --- STATUS ENDPOINT ---
app.get("/", (req, res) => {
  const status = {
    status: "running",
    timestamp: new Date().toISOString(),
    services: {
      gemini: !!geminiModel,
      firebase: !!db,
      analytics: analyticsEnabled,
      pageAccessToken: !!PAGE_ACCESS_TOKEN,
      verifyToken: !!VERIFY_TOKEN,
    },
    activeConversations: conversationStates.size,
    adminModeConversations: Array.from(conversationStates.values()).filter(s => s.mode === 'admin').length,
  };

  res.json(status);
});

// --- CLEAR STUCK STATE ENDPOINT (for debugging) ---
app.post("/admin/clear-state/:psid", (req, res) => {
  const psid = req.params.psid;
  const authHeader = req.headers.authorization;

  // Simple auth check (you should set ADMIN_SECRET in your .env)
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (conversationStates.has(psid)) {
    setBotMode(psid);
    console.log(`✅ Cleared conversation state for PSID: ${psid}`);
    res.json({ success: true, message: `Conversation state cleared for ${psid}` });
  } else {
    res.json({ success: false, message: `No conversation state found for ${psid}` });
  }
});

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
      try {
        let webhook_event = entry.messaging[0];
        let sender_psid = webhook_event.sender.id;

        console.log(`\n📨 New message from PSID: ${sender_psid}`);
        console.log(`Event type: ${webhook_event.message ? 'message' : webhook_event.postback ? 'postback' : 'other'}`);

        // Update last user message timestamp
        const state = getConversationState(sender_psid);
        state.lastUserMessage = Date.now();
        console.log(`Current conversation mode: ${state.mode}`);

        // Ensure user exists in Firebase (creates if first time)
        // Don't let Firebase errors block the bot
        try {
          await getUserData(sender_psid);
        } catch (fbError) {
          console.error("⚠️ Firebase error (continuing anyway):", fbError.message);
        }

        // Track session in Google Analytics
        trackEvent("User Session", "Active", "User Interaction", 1, sender_psid);

      // 1. Handle BUTTON CLICKS (Postback)
      if (webhook_event.postback) {
        const payload = webhook_event.postback.payload;

        // Special handling for CONTACT_SUPPORT - switch to admin mode
        if (payload === "CONTACT_SUPPORT") {
          notifyAdmin(sender_psid);
          setAdminMode(sender_psid);
          trackEvent("Support Request", "Contact Support", "User Requested Help", 1, sender_psid);
          await updateUserData(sender_psid, {
            "stats/supportRequests": admin.database.ServerValue.increment(1),
          });
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

        // Handle FAQ feedback
        if (payload.startsWith("FAQ_HELPFUL_") || payload.startsWith("FAQ_NOT_HELPFUL_")) {
          const isHelpful = payload.startsWith("FAQ_HELPFUL_");
          const faqId = payload.replace("FAQ_HELPFUL_", "").replace("FAQ_NOT_HELPFUL_", "");

          await trackFAQFeedback(sender_psid, faqId, isHelpful);

          const thankYouMessage = isHelpful
            ? "Баярлалаа! 😊 Бид танд туслаж чадсандаа баяртай байна."
            : "Уучлаарай. Илүү сайн мэдээлэл авахыг хүсвэл манай багтай холбогдоно уу: 7575 5050";

          await sendTextWithQuickReplies(sender_psid, thankYouMessage, defaultQuickReplies);
          res.status(200).send("EVENT_RECEIVED");
          continue;
        }

        if (payload === "CONTACT_SUPPORT") {
          notifyAdmin(sender_psid);
          setAdminMode(sender_psid);
          trackEvent("Support Request", "Contact Support", "User Requested Help", 1, sender_psid);
          await updateUserData(sender_psid, {
            "stats/supportRequests": admin.database.ServerValue.increment(1),
          });
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

        // Check for bot re-enable command FIRST (before admin mode check)
        if (text.includes("enable bot") || text.includes("бот асаа") || text.includes("bot") || text.includes("асаа")) {
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

        // If no keywords matched, try FAQ search first
        if (!matched) {
          const faqResults = searchFAQ(originalText);

          if (faqResults.length > 0) {
            // FAQ match found! Send the best match
            const bestMatch = faqResults[0];

            // Track FAQ usage
            trackEvent("FAQ Search", "FAQ Found", bestMatch.id, 1, sender_psid);
            await trackInquiry(sender_psid, `FAQ_${bestMatch.id}`, 'faq');
            await updateUserData(sender_psid, {
              "stats/faqQueries": admin.database.ServerValue.increment(1),
            });

            // Send FAQ answer with feedback quick replies
            await sendTextWithQuickReplies(
              sender_psid,
              `💡 ${bestMatch.answer}`,
              getFAQFeedbackQuickReplies(bestMatch.id)
            );

            // If there are more results, show them as suggestions
            if (faqResults.length > 1) {
              let suggestions = "\n\n📚 Холбоотой асуултууд:";
              for (let i = 1; i < Math.min(3, faqResults.length); i++) {
                suggestions += `\n• ${faqResults[i].question}`;
              }
              await sendTextWithQuickReplies(sender_psid, suggestions, defaultQuickReplies);
            }
          } else {
            // No FAQ match, try Gemini AI
            const language = detectLanguage(originalText);
            const geminiResponse = await getGeminiResponse(originalText, language);

            if (geminiResponse) {
              // Track AI query
              trackEvent("AI Query", "Gemini Response", originalText, 1, sender_psid);
              await trackInquiry(sender_psid, "AI_QUERY", 'ai');
              await updateUserData(sender_psid, {
                "stats/aiQueries": admin.database.ServerValue.increment(1),
              });

              // Send AI response with quick replies
              await sendTextWithQuickReplies(sender_psid, geminiResponse, defaultQuickReplies);
            } else {
              // Fallback if both FAQ and Gemini fail
              console.log(`⚠️ No FAQ or AI response available for: "${originalText}"`);

              const fallbackMessage = language === 'en'
                ? "I can help you with information about Oyunlag School. Please use the menu below or ask about:\n\n📚 Programs & Curriculum\n💰 Tuition & Fees\n📝 Admission\n📍 Location\n🍽️ Meals\n🚌 School Bus\n\nOr call us: 7575 5050"
                : "Би Оюунлаг сургуулийн мэдээллээр тусалж чадна. Доорх цэс ашиглана уу эсвэл дараах мэдээлэл авна уу:\n\n📚 Сургалтын хөтөлбөр\n💰 Төлбөр\n📝 Элсэлт\n📍 Байршил\n🍽️ Хоол\n🚌 Автобус\n\nУтас: 7575 5050";

              await sendTextWithQuickReplies(sender_psid, fallbackMessage, defaultQuickReplies);

              // Track fallback usage for improvement
              trackEvent("Fallback", "No Match", originalText, 1, sender_psid);
            }
          }
        }
      }

      } catch (error) {
        // Catch any errors in message processing
        console.error(`\n❌ Error processing message from PSID ${sender_psid || 'unknown'}:`, error.message);
        console.error("Error stack:", error.stack);

        // Try to send error message to user
        if (sender_psid) {
          try {
            await sendTextWithQuickReplies(
              sender_psid,
              "Уучлаарай, алдаа гарлаа. Дахин оролдоно уу эсвэл 7575 5050 руу залгана уу.",
              defaultQuickReplies
            );
          } catch (sendError) {
            console.error("Failed to send error message to user:", sendError.message);
          }

          // Track error
          trackEvent("Error", "Message Processing Failed", error.message, 1, sender_psid);
        }
      }
    }

    // Always send 200 response to Facebook, even if there were errors
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// --- RESPONSE HANDLER ---
async function handleResponse(senderPsid, payload) {
  const data = content[payload] || content["GET_STARTED"];

  // Track analytics
  trackEvent("User Interaction", payload, "Menu Click", 1, senderPsid);

  // Track inquiry in Firebase
  await trackInquiry(senderPsid, payload, 'menu');

  // Handle special cases
  if (payload === "GET_STARTED") {
    // Use personalized greeting
    const greeting = await getPersonalizedGreeting(senderPsid);
    await sendTextWithQuickReplies(senderPsid, greeting, data.quickReplies);
    await sendCarousel(senderPsid, mainMenuCarousel);
    return;
  }

  if (payload === "VIRTUAL_TOUR") {
    // Send virtual tour carousel
    await sendTextWithQuickReplies(senderPsid, data.text, data.quickReplies);
    await sendCarousel(senderPsid, virtualTourCarousel);
    return;
  }

  if (payload === "SUBSCRIBE_EVENTS") {
    // Subscribe user to events in Firebase
    await updateUserData(senderPsid, {
      "preferences/eventNotifications": true,
      "stats/eventSubscriptions": admin.database.ServerValue.increment(1),
    });
    trackEvent("Event Notifications", "Subscribe", "User Subscribed", 1, senderPsid);
  }

  if (payload === "UNSUBSCRIBE_EVENTS") {
    // Unsubscribe user from events
    await updateUserData(senderPsid, {
      "preferences/eventNotifications": false,
    });
    trackEvent("Event Notifications", "Unsubscribe", "User Unsubscribed", 1, senderPsid);
  }

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
  if (!PAGE_ACCESS_TOKEN) {
    console.error("❌ Cannot send message: PAGE_ACCESS_TOKEN not configured");
    return;
  }

  try {
    console.log(`📤 Sending message to PSID: ${senderPsid}`);
    await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      { recipient: { id: senderPsid }, message: message }
    );
    console.log(`✅ Message sent successfully to PSID: ${senderPsid}`);
  } catch (error) {
    console.error(
      `❌ Error sending message to PSID ${senderPsid}:`,
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      console.error("Facebook API error details:", JSON.stringify(error.response.data, null, 2));
    }
    // Re-throw error so caller knows the send failed
    throw error;
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

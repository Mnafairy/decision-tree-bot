/**
 * Setup script for Facebook Messenger Persistent Menu
 * Run this once to configure your bot's persistent menu
 *
 * Usage: node setup-menu.js [command]
 * Commands: setup, menu, greeting, getstarted, icebreakers, view, delete
 */

require("dotenv").config();
const axios = require("axios");

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

if (!PAGE_ACCESS_TOKEN) {
  console.error("ERROR: PAGE_ACCESS_TOKEN is not set in .env file");
  process.exit(1);
}

const API_URL = `https://graph.facebook.com/v21.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`;

// --- PERSISTENT MENU CONFIGURATION ---
// Note: Facebook API limits persistent menu to 3 items max at top level
const persistentMenu = {
  persistent_menu: [
    {
      locale: "default",
      composer_input_disabled: false,
      call_to_actions: [
        {
          type: "postback",
          title: "🏠 Үндсэн цэс",
          payload: "GET_STARTED",
        },
        {
          type: "postback",
          title: "☎️ Холбоо барих",
          payload: "CONTACT",
        },
        {
          type: "web_url",
          title: "🌐 Вэбсайт",
          url: "http://www.oyunlag.edu.mn",
          webview_height_ratio: "full",
        },
      ],
    },
  ],
};

// --- GET STARTED BUTTON CONFIGURATION ---
const getStartedButton = {
  get_started: {
    payload: "GET_STARTED",
  },
};

// --- GREETING TEXT CONFIGURATION ---
const greetingText = {
  greeting: [
    {
      locale: "default",
      text: "Сайн байна уу {{user_first_name}}! 👋 Оюунлаг сургуулийн мэдээллийн бот-д тавтай морил!",
    },
  ],
};

// --- ICE BREAKERS CONFIGURATION ---
const iceBreakers = {
  ice_breakers: [
    {
      question: "Сургалтын төлбөр хэд вэ?",
      payload: "TUITION",
    },
    {
      question: "Сургууль хаана байрладаг вэ?",
      payload: "LOCATION",
    },
    {
      question: "Элсэлтийн мэдээлэл",
      payload: "ADMISSION",
    },
    {
      question: "Холбоо барих",
      payload: "CONTACT",
    },
  ],
};

// --- SETUP FUNCTIONS ---

async function setupGetStarted() {
  try {
    const response = await axios.post(API_URL, getStartedButton);
    console.log("✅ Get Started button configured successfully");
    return response.data;
  } catch (error) {
    console.error("❌ Error setting up Get Started button:", error.response?.data || error.message);
    throw error;
  }
}

async function setupGreeting() {
  try {
    const response = await axios.post(API_URL, greetingText);
    console.log("✅ Greeting text configured successfully");
    return response.data;
  } catch (error) {
    console.error("❌ Error setting up Greeting:", error.response?.data || error.message);
    throw error;
  }
}

async function setupPersistentMenu() {
  try {
    const response = await axios.post(API_URL, persistentMenu);
    console.log("✅ Persistent menu configured successfully");
    return response.data;
  } catch (error) {
    console.error("❌ Error setting up Persistent menu:", error.response?.data || error.message);
    throw error;
  }
}

async function setupIceBreakers() {
  try {
    const response = await axios.post(API_URL, iceBreakers);
    console.log("✅ Ice breakers configured successfully");
    return response.data;
  } catch (error) {
    console.error("❌ Error setting up Ice breakers:", error.response?.data || error.message);
    throw error;
  }
}

async function deleteAllSettings() {
  try {
    const response = await axios.delete(API_URL, {
      data: {
        fields: ["persistent_menu", "get_started", "greeting", "ice_breakers"],
      },
    });
    console.log("🗑️ All settings deleted successfully");
    return response.data;
  } catch (error) {
    console.error("❌ Error deleting settings:", error.response?.data || error.message);
    throw error;
  }
}

async function getCurrentSettings() {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v21.0/me/messenger_profile?fields=persistent_menu,get_started,greeting,ice_breakers&access_token=${PAGE_ACCESS_TOKEN}`
    );
    console.log("📋 Current settings:");
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("❌ Error getting current settings:", error.response?.data || error.message);
    throw error;
  }
}

// --- MAIN EXECUTION ---
async function main() {
  const command = process.argv[2] || "setup";

  console.log("\n🏫 Oyunlag School Chatbot - Menu Setup\n");
  console.log("=====================================\n");

  switch (command) {
    case "setup":
      console.log("Setting up all messenger profile settings...\n");
      await setupGetStarted();
      await setupGreeting();
      await setupPersistentMenu();
      await setupIceBreakers();
      console.log("\n✅ All settings configured successfully!");
      break;

    case "menu":
      console.log("Setting up persistent menu only...\n");
      await setupPersistentMenu();
      break;

    case "greeting":
      console.log("Setting up greeting only...\n");
      await setupGreeting();
      break;

    case "getstarted":
      console.log("Setting up Get Started button only...\n");
      await setupGetStarted();
      break;

    case "icebreakers":
      console.log("Setting up Ice breakers only...\n");
      await setupIceBreakers();
      break;

    case "view":
      console.log("Getting current settings...\n");
      await getCurrentSettings();
      break;

    case "delete":
      console.log("Deleting all settings...\n");
      await deleteAllSettings();
      break;

    default:
      console.log("Usage: node setup-menu.js [command]\n");
      console.log("Commands:");
      console.log("  setup       - Set up all settings (default)");
      console.log("  menu        - Set up persistent menu only");
      console.log("  greeting    - Set up greeting text only");
      console.log("  getstarted  - Set up Get Started button only");
      console.log("  icebreakers - Set up ice breakers only");
      console.log("  view        - View current settings");
      console.log("  delete      - Delete all settings");
  }
}

main().catch(console.error);

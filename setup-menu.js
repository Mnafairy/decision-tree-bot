require("dotenv").config();
const axios = require("axios");

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function setupPersistentMenu() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        persistent_menu: [
          {
            locale: "default",
            composer_input_disabled: false, // Set to TRUE if you want to block typing text entirely
            call_to_actions: [
              {
                type: "postback",
                title: "🔄 Restart Bot",
                payload: "GET_STARTED",
              },
              {
                type: "web_url",
                title: "🌐 Visit Website",
                url: "https://oyunlag.edu.mn/", // Change this to your actual site
                webview_height_ratio: "full",
              },
              {
                type: "postback",
                title: "📞 Contact Support",
                payload: "CONTACT_SUPPORT",
                // Make sure to handle 'CONTACT_SUPPORT' in your index.js if you use this!
              },
            ],
          },
        ],
      }
    );
    console.log("SUCCESS! Persistent Menu enabled.", response.data);
  } catch (error) {
    console.error(
      "FAILED:",
      error.response ? error.response.data : error.message
    );
  }
}

setupPersistentMenu();

require("dotenv").config();
const axios = require("axios");

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function setupGetStarted() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        get_started: {
          payload: "GET_STARTED",
        },
        greeting: [
          {
            locale: "default",
            text: "Hello! This is Oyunlag bot press get Started to begin",
          },
        ],
      }
    );
    console.log("SUCCESS! Get Started button enabled.", response.data);
  } catch (error) {
    console.error(
      "FAILED:",
      error.response ? error.response.data : error.message
    );
  }
}

setupGetStarted();

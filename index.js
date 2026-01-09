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
    text: "Welcome! How can I help you?",
    buttons: [
      { type: "postback", title: "Pricing", payload: "SHOW_PRICING" },
      { type: "postback", title: "Hours", payload: "SHOW_HOURS" },
      { type: "postback", title: "📞 Support", payload: "CONTACT_SUPPORT" },
    ],
  },
  SHOW_PRICING: {
    text: "Basic: $10/mo, Pro: $25/mo.",
    buttons: [
      { type: "postback", title: "Back to Menu", payload: "GET_STARTED" },
    ],
  },
  SHOW_HOURS: {
    text: "Mon-Fri, 9am - 5pm.",
    buttons: [
      { type: "postback", title: "Back to Menu", payload: "GET_STARTED" },
    ],
  },
  CONTACT_SUPPORT: {
    text: "You can reach our support team via phone or email.",
    buttons: [
      {
        type: "phone_number",
        title: "Call Us",
        payload: "+15551234567",
      },
      {
        type: "web_url",
        title: "Email Us",
        url: "mailto:support@example.com",
      },
      {
        type: "postback",
        title: "Back to Menu",
        payload: "GET_STARTED",
      },
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

        // STRICT FILTER: Only answer if they say specific words
        if (
          text.includes("hi") ||
          text.includes("menu") ||
          text.includes("start")
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
        title: "🚨 New Support Request",
        description: `User (PSID: ${senderPsid}) requested support.`,
        color: 15158332, // Red color
        fields: [
          {
            name: "Action Required",
            value: `[Click here to Reply in Inbox](${inboxLink})`,
          },
        ],
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
  app.listen(3000, () => console.log("Local server running"))   ;
}

// Export for Vercel
module.exports = app;

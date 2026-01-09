require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const { PAGE_ACCESS_TOKEN, VERIFY_TOKEN, PORT } = process.env;

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
        payload: "+15551234567", // Replace with your real number (include country code)
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

// --- WEBHOOK VERIFICATION (Required by Facebook) ---
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
// --- NOTIFICATION SYSTEM ---
async function notifyAdmin(senderPsid) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const pageId = process.env.PAGE_ID; // Make sure you added this to .env

  if (!webhookUrl) return;

  // This link opens your Business Suite Inbox directly
  const inboxLink = `https://business.facebook.com/latest/inbox/messenger?asset_id=${pageId}`;

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
    await axios.post(webhookUrl, message);
  } catch (error) {
    console.error("Failed to send Discord notification:", error.message);
  }
}
// --- MESSAGE HANDLER ---
// app.post("/webhook", (req, res) => {
//   let body = req.body;

//   if (body.object === "page") {
//     body.entry.forEach(function (entry) {
//       let webhook_event = entry.messaging[0];
//       let sender_psid = webhook_event.sender.id;

//       if (webhook_event.postback) {
//         handleResponse(sender_psid, webhook_event.postback.payload);
//       } else if (webhook_event.message) {
//         handleResponse(sender_psid, "GET_STARTED");
//       }
//     });
//     res.status(200).send("EVENT_RECEIVED");
//   } else {
//     res.sendStatus(404);
//   }
// });
app.post("/webhook", async (req, res) => {
  // Notice 'async' here
  let body = req.body;
  // Inside app.post('/webhook')...
  for (const entry of body.entry) {
    let webhook_event = entry.messaging[0];
    let sender_psid = webhook_event.sender.id;

    // ... inside the loop ...
    if (webhook_event.postback) {
      // If they click a button, ALWAYS answer
      await handleResponse(sender_psid, webhook_event.postback.payload);
    } else if (webhook_event.message) {
      // OPTION 1: Only show menu if they type specific keywords
      const text = webhook_event.message.text.toLowerCase();
      if (
        text.includes("hi") ||
        text.includes("menu") ||
        text.includes("start")
      ) {
        await handleResponse(sender_psid, "GET_STARTED");
      }
      // OPTION 2 (Better for Support): Do nothing!
      // If they type random text, we assume they might be talking to a human (YOU),
      // so the bot stays silent.
      // We only speak if they explicitly ask for the menu.
    }
    // ... existing code ...
  }
  if (body.object === "page") {
    // 1. We must wait for the loop to finish
    // We use Promise.all to handle multiple entries at once
    await Promise.all(
      body.entry.map(async (entry) => {
        let webhook_event = entry.messaging[0];
        let sender_psid = webhook_event.sender.id;

        if (webhook_event.postback) {
          // MUST use 'await' here
          await handleResponse(sender_psid, webhook_event.postback.payload);
        } else if (webhook_event.message) {
          await handleResponse(sender_psid, "GET_STARTED");
        }
      })
    );

    // 2. ONLY send this after the await above is finished
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});
async function notifyAdmin(senderPsid) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const pageId = process.env.PAGE_ID; // Make sure you added this to .env

  if (!webhookUrl) return;

  // This link opens your Business Suite Inbox directly
  const inboxLink = `https://business.facebook.com/latest/inbox/messenger?asset_id=${pageId}`;

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
    await axios.post(webhookUrl, message);
  } catch (error) {
    console.error("Failed to send Discord notification:", error.message);
  }
}
// --- LOGIC HELPER ---
// function handleResponse(senderPsid, payload) {
//   const data = content[payload] || content["GET_STARTED"];

//   const response = {
//     attachment: {
//       type: "template",
//       payload: {
//         template_type: "button",
//         text: data.text,
//         buttons: data.buttons,
//       },
//     },
//   };
//   callSendAPI(senderPsid, response);
// }
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

  // MUST await this
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

// Keep app.listen for local testing
if (process.env.NODE_ENV !== "production") {
  app.listen(3000, () => console.log("Local server running"));
}

// Export for Vercel
module.exports = app;

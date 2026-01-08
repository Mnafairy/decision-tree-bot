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

// --- MESSAGE HANDLER ---
app.post("/webhook", (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    body.entry.forEach(function (entry) {
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      if (webhook_event.postback) {
        handleResponse(sender_psid, webhook_event.postback.payload);
      } else if (webhook_event.message) {
        handleResponse(sender_psid, "GET_STARTED");
      }
    });
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// --- LOGIC HELPER ---
function handleResponse(senderPsid, payload) {
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
  callSendAPI(senderPsid, response);
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

# Oyunlag School Chatbot - Documentation

## Overview
A comprehensive Facebook Messenger chatbot for **Oyunlag School** in Ulaanbaatar, Mongolia. The bot provides information about the school's curriculum, tuition, admission, location, services, and contact details in Mongolian language.

---

## Features

### 1. Carousel Menu (Generic Template)
Displays all 8 menu options in a horizontal scrollable carousel with images and buttons.

### 2. Quick Replies
Clickable buttons shown above the message input for fast navigation between sections.

### 3. Persistent Menu
Hamburger menu (≡) at the bottom of Messenger with 3 main actions:
- 🏠 Үндсэн цэс (Main Menu)
- ☎️ Холбоо барих (Contact)
- 🌐 Вэбсайт (Website)

### 4. Smart Keyword Detection
Automatically detects Mongolian keywords in user messages and routes to appropriate sections.

### 5. Discord Notifications
Sends admin notifications to Discord when users request support.

### 6. Multi-Template Support
- **Carousel**: Main menu with 8 cards
- **Button Template**: Options with 1-3 buttons
- **Text + Quick Replies**: Simple text with quick action buttons

---

## Menu Structure

### Main Menu (8 Options)

#### 1. 📚 Сургалтын хөтөлбөр (Curriculum)
**Content:**
- 🏛️ **Үндэсний хөтөлбөр** (National Curriculum)
  - Fully implements Mongolia's core curriculum
- 🌍 **Олон улсын - Pearson Edexcel** (International)
  - iPrimary, iLowerSecondary, IGCSE, A Level
- 🚀 **Дотоод хөтөлбөр** (Internal Programs)
  - STEAM, Smart Math, AR/VR
  - Chinese language, IT, Design
  - SAT, IELTS, TOEFL preparation
- 🧠 **Нийгмийн хөгжил** (Social Development)
  - Positive Action Second Step
- 🎭🎨🎵 **68 дугуйлан ҮНЭГҮЙ!** (68 clubs FREE!)

**Quick Replies:**
- 💰 Төлбөр (Tuition)
- 📝 Элсэлт (Admission)
- 🌐 Вэбсайт (Website)
- 🏠 Үндсэн цэс (Main Menu)

---

#### 2. 💰 Сургалтын төлбөр (Tuition)
**2025-2026 Academic Year Fees:**
- **Бэлтгэл анги** (Preparatory): 1,200,000₮
- **1-12-р анги** (Grades 1-12): 12,500,000₮
- **68 төрлийн дугуйлан ҮНЭГҮЙ!** (68 clubs FREE!)

**Quick Replies:**
- 📚 Хөтөлбөр (Curriculum)
- 🍽️ Хоол (Food)
- 🚌 Автобус (Bus)
- 🏠 Үндсэн цэс (Main Menu)

---

#### 3. 📝 Элсэлт (Admission)
**Content:**
- Information about admission registration
- Requirements and process
- Directs users to website for detailed info

**Buttons:**
- 🌐 Вэбсайт (Website) → http://www.oyunlag.edu.mn
- ☎️ Холбоо барих (Contact)
- 🏠 Буцах (Back)

**Quick Replies:**
- 🍽️ Хоол (Food)
- 🚌 Автобус (Bus)
- ☎️ Холбоо барих (Contact)
- 🏠 Үндсэн цэс (Main Menu)

---

#### 4. 📍 Хаяг байршил (Location)
**Two Buildings:**

##### 🏢 1-р байр (Building 1)
- **Address:** БЗД 15-р хороо, 13-р хороолол, 43-3
- **Landmark:** Бөхийн өргөөний зүүн урд (Northeast of Wrestling Palace)
- **Phone:** 7575 5050

**Buttons:**
- 🗺️ Google Maps
- 🌐 Вэбсайт (Website)
- ◀️ Буцах (Back)

##### 🏢 2-р байр (Building 2)
- **Address:** БЗД 18-р хороо, 13-р хороолол 47/1
- **Phone:** 7575 5050

**Buttons:**
- 🗺️ Google Maps
- 🌐 Вэбсайт (Website)
- ◀️ Буцах (Back)

---

#### 5. 🍽️ Сургуулийн хоол (School Food)
**Daily Meal Prices:**
- **🥗 Бага анги** (Elementary): 10,000₮
- **🍕 Дунд анги** (Middle School): 11,000₮
- **🍕🥗 Ахлах анги** (High School): 12,000₮

Menu details available on website.

**Quick Replies:**
- 🚌 Автобус (Bus)
- 💰 Төлбөр (Tuition)
- ☎️ Холбоо барих (Contact)
- 🏠 Үндсэн цэс (Main Menu)

---

#### 6. 🚌 Сургуулийн автобус (School Bus)
**Service Details:**
- **Provider:** 'Нью Армстронг' ХХК
- **Eligible:** Grades 2-12 (Grade 1 not eligible)
- **Pricing:**
  - 1 талдаа (One-way): 6,000₮/day
  - 2 талдаа (Round-trip): 12,000₮/day
- **Schedule:**
  - ⏰ Pick-up: 07:00-07:30
  - 🏫 Drop-off: 15:40

**Quick Replies:**
- 💰 Төлбөр (Tuition)
- 🍽️ Хоол (Food)
- 📍 Байршил (Location)
- 🏠 Үндсэн цэс (Main Menu)

---

#### 7. ☎️ Холбоо барих (Contact)
**Contact Information:**
- **Main Phone:** 7575 5050
- **Mobile:** 88113096, 88113097
- **Website:** www.oyunlag.edu.mn
- **Email:** info@oyunlag.edu.mn

**Buttons:**
- 📞 Залгах (Call) → +97675755050
- 🌐 Вэбсайт (Website)
- 📘 Facebook → facebook.com/oyunlag.edu.mn

**Quick Replies:**
- 🆘 Тусламж (Support)
- 📍 Байршил (Location)
- 🏠 Үндсэн цэс (Main Menu)

---

#### 8. 🆘 Тусламж авах (Get Support)
**Content:**
- Connects user directly with support team
- Sends Discord notification to admin
- Confirmation message: "Та манай багтай холбогдох хүсэлт илгээлээ. Манай зөвлөх танд удахгүй хариу өгнө!"

**Quick Replies:**
- ☎️ Холбоо барих (Contact)
- 📍 Байршил (Location)
- 🏠 Үндсэн цэс (Main Menu)

---

## Carousel Cards

The main menu displays 8 horizontal scrollable cards:

| Card | Title | Subtitle | Image | Button |
|------|-------|----------|-------|--------|
| 1 | 📚 Сургалтын хөтөлбөр | Үндэсний болон олон улсын хөтөлбөр, 68 дугуйлан | Education image | Дэлгэрэнгүй |
| 2 | 💰 Сургалтын төлбөр | Бэлтгэл: 1.2сая₮, 1-12анги: 12.5сая₮ | Money image | Дэлгэрэнгүй |
| 3 | 📝 Элсэлт | Элсэлтийн бүртгэл, шаардлага | Document image | Дэлгэрэнгүй |
| 4 | 📍 Хаяг байршил | 2 байрны хаяг, газрын зураг | Location image | Дэлгэрэнгүй |
| 5 | 🍽️ Сургуулийн хоол | Өдрийн хоолны үнэ: 10,000-12,000₮ | Food image | Дэлгэрэнгүй |
| 6 | 🚌 Сургуулийн автобус | Чиглэл, төлбөр: 6,000-12,000₮ | Bus image | Дэлгэрэнгүй |
| 7 | ☎️ Холбоо барих | Утас: 7575 5050, И-мэйл, Facebook | Contact image | Дэлгэрэнгүй |
| 8 | 🆘 Тусламж авах | Манай багтай шууд холбогдох | Support image | Холбогдох |

**Image Source:** Unsplash (via CDN)

---

## Keyword Detection

The chatbot automatically detects Mongolian keywords and navigates to appropriate sections:

### Greeting Keywords
**Keywords:** hi, hello, сайн, сайнуу, menu, цэс, start, эхлэх, мэдээлэл
**Action:** Show main menu carousel

### Navigation Keywords
| Keywords | Destination |
|----------|-------------|
| төлбөр, үнэ | TUITION (Pricing) |
| хөтөлбөр, сургалт | CURRICULUM |
| элсэлт, бүртгэл | ADMISSION |
| хаяг, байршил, газар | LOCATION |
| хоол, хоолны | SCHOOL_FOOD |
| автобус, bus | SCHOOL_BUS |
| холбоо, утас, contact | CONTACT |

---

## Quick Replies Configuration

### Default Quick Replies
Shown on main menu and most sections:
- 📚 Сургалтын хөтөлбөр (CURRICULUM)
- 💰 Төлбөр (TUITION)
- 📝 Элсэлт (ADMISSION)
- 📍 Хаяг байршил (LOCATION)

### Extended Quick Replies
Shown on specific sections:
- 🍽️ Хоол (SCHOOL_FOOD)
- 🚌 Автобус (SCHOOL_BUS)
- ☎️ Холбоо барих (CONTACT)
- 🏠 Үндсэн цэс (GET_STARTED)

### Context-Specific Quick Replies
Each section has tailored quick replies for logical navigation flow.

---

## Persistent Menu Configuration

Available via hamburger icon (≡) at bottom of Messenger:

```json
{
  "persistent_menu": [
    {
      "locale": "default",
      "composer_input_disabled": false,
      "call_to_actions": [
        {
          "type": "postback",
          "title": "🏠 Үндсэн цэс",
          "payload": "GET_STARTED"
        },
        {
          "type": "postback",
          "title": "☎️ Холбоо барих",
          "payload": "CONTACT"
        },
        {
          "type": "web_url",
          "title": "🌐 Вэбсайт",
          "url": "http://www.oyunlag.edu.mn",
          "webview_height_ratio": "full"
        }
      ]
    }
  ]
}
```

---

## Technical Implementation

### Message Types

#### 1. Carousel
**Type:** `carousel`
**Components:** Greeting text + Quick Replies + Carousel cards
**Usage:** Main menu (GET_STARTED)

#### 2. Text with Quick Replies
**Type:** `text_with_quick_replies`
**Components:** Text message + Quick Reply buttons
**Usage:** CURRICULUM, TUITION, SCHOOL_FOOD, SCHOOL_BUS, CONTACT_SUPPORT

#### 3. Button Template
**Type:** `button`
**Components:** Text + 1-3 buttons + Optional Quick Replies
**Usage:** ADMISSION, LOCATION, CONTACT, WEBSITE
**Character Limit:** 640 characters max

---

### Response Flow

1. **User triggers action** (button click, quick reply, or typed message)
2. **Webhook receives event** (postback, quick_reply, or message.text)
3. **Payload extracted** (e.g., "TUITION", "CURRICULUM")
4. **handleResponse() processes payload**
5. **Appropriate message sent** based on content type
6. **Quick Replies displayed** for next action

---

### Discord Notification System

When user clicks "🆘 Тусламж авах" (Contact Support):

**Notification sent to Discord:**
- Title: "🚨 Шинэ тусламжийн хүсэлт - Оюунлаг сургууль"
- Description: User PSID
- Action link: Direct link to Facebook Business Inbox
- Timestamp: ISO format

**Environment Variable Required:** `DISCORD_WEBHOOK_URL`

---

## Environment Variables

Required in `.env` file:

```env
PAGE_ACCESS_TOKEN=<Facebook Page Access Token>
VERIFY_TOKEN=<Custom webhook verification token>
PORT=3000
PAGE_ID=<Facebook Page ID>
DISCORD_WEBHOOK_URL=<Discord webhook URL> (optional)
```

---

## API Endpoints

### Webhook Verification (GET)
**Endpoint:** `/webhook`
**Purpose:** Verify webhook with Facebook
**Parameters:** hub.mode, hub.verify_token, hub.challenge

### Webhook Handler (POST)
**Endpoint:** `/webhook`
**Purpose:** Receive messages and events from Facebook
**Handles:**
- Postback events (button clicks)
- Quick reply clicks
- Text messages
- Support requests

---

## File Structure

```
test-bot/
├── index.js                    # Main chatbot logic
├── setup-menu.js               # Persistent menu setup script
├── IMPROVEMENT_PLAN.md         # Development roadmap
├── CHATBOT_DOCUMENTATION.md    # This file
├── .env                        # Environment variables
├── package.json                # Dependencies
└── vercel.json                 # Vercel deployment config
```

---

## Setup Commands

### Configure Messenger Profile
```bash
# Setup all (menu, greeting, ice breakers, get started)
node setup-menu.js setup

# Setup persistent menu only
node setup-menu.js menu

# Setup greeting only
node setup-menu.js greeting

# Setup Get Started button
node setup-menu.js getstarted

# Setup ice breakers
node setup-menu.js icebreakers

# View current settings
node setup-menu.js view

# Delete all settings
node setup-menu.js delete
```

---

## Dependencies

```json
{
  "express": "Web server framework",
  "body-parser": "Parse JSON request bodies",
  "axios": "HTTP client for Facebook API",
  "dotenv": "Load environment variables"
}
```

---

## Facebook API Version

**Current:** v21.0
**Endpoints:**
- Graph API: `https://graph.facebook.com/v21.0/`
- Send API: `/me/messages`
- Messenger Profile: `/me/messenger_profile`

---

## Known Limitations

1. **Button Template Text Limit:** 640 characters max
2. **Quick Replies:** Max 13 quick replies per message
3. **Carousel Cards:** Max 10 cards per carousel
4. **Buttons per Card:** Max 3 buttons
5. **Persistent Menu:** Max 3 top-level items (nested menus not supported in current API)

---

## Future Enhancements

See `IMPROVEMENT_PLAN.md` for detailed roadmap.

**Potential additions:**
- Image uploads for carousel cards (currently using Unsplash)
- Multilingual support (English + Mongolian)
- FAQ database integration
- Student portal integration
- Payment integration
- Appointment booking system

---

## Deployment

**Platform:** Vercel
**Repository:** https://github.com/Mnafairy/decision-tree-bot

**Deployment Command:**
```bash
vercel --prod
```

---

## Support & Maintenance

**School Contact:**
- Phone: 7575 5050
- Email: info@oyunlag.edu.mn
- Website: www.oyunlag.edu.mn

**Bot Maintenance:**
- Check Discord for support requests
- Monitor Facebook Business Inbox
- Review webhook logs for errors

---

## Version History

- **v1.0** - Basic menu with 3 options
- **v2.0** - Full 8-menu implementation with Mongolian content
- **v3.0** - Carousel menu, Quick Replies, Persistent Menu (current)

---

**Last Updated:** 2026-01-10
**Documentation Version:** 3.0

# Oyunlag School Chatbot - Improvement Plan

## Current Issues Identified

### Issue 1: "Сургалтын хөтөлбөр" Not Working
**Root Cause:** The CURRICULUM text is ~750 characters, but Facebook Messenger's Button Template has a **640 character limit**. This causes the API to fail silently.

### Issue 2: Limited Menu Display
**Current State:** Using `button` template (text + 3 buttons max)
**Problem:** Can only show 3 options at a time, requiring multiple menu levels

---

## Improvement Plan

### Phase 1: Fix Critical Bug & Implement Carousel Menu

#### 1.1 Fix CURRICULUM Text Length
- Split long content into shorter messages OR
- Use Generic Template with cards for detailed info
- Keep text under 640 characters per message

#### 1.2 Implement Carousel (Generic Template) for Main Menu
**Benefits:**
- Show ALL 8 menu options at once (horizontal scroll)
- Each card can have: image, title, subtitle, 3 buttons
- More visual and professional appearance
- No need for "More Options" sub-menus

**Structure:**
```
Card 1: Сургалтын хөтөлбөр (Curriculum)
  - Image: School/Education icon or photo
  - Title: 📚 Сургалтын хөтөлбөр
  - Subtitle: Үндэсний болон олон улсын хөтөлбөр
  - Button: "Дэлгэрэнгүй" -> CURRICULUM

Card 2: Төлбөр (Tuition)
  - Image: Money/Payment icon
  - Title: 💰 Төлбөр
  - Subtitle: Сургалтын төлбөрийн мэдээлэл
  - Button: "Дэлгэрэнгүй" -> TUITION

Card 3: Элсэлт (Admission)
  - Image: Registration/Form icon
  - Title: 📝 Элсэлт
  - Subtitle: Элсэлтийн бүртгэл, шаардлага
  - Button: "Дэлгэрэнгүй" -> ADMISSION

Card 4: Хаяг байршил (Location)
  - Image: Map/Location icon
  - Title: 📍 Хаяг байршил
  - Subtitle: 2 байрны хаяг, газрын зураг
  - Button: "Дэлгэрэнгүй" -> LOCATION

Card 5: Сургуулийн хоол (School Food)
  - Image: Food/Cafeteria icon
  - Title: 🍽️ Сургуулийн хоол
  - Subtitle: Өдрийн хоолны үнэ, цэс
  - Button: "Дэлгэрэнгүй" -> SCHOOL_FOOD

Card 6: Автобус (School Bus)
  - Image: Bus icon
  - Title: 🚌 Автобус
  - Subtitle: Үйлчилгээний чиглэл, төлбөр
  - Button: "Дэлгэрэнгүй" -> SCHOOL_BUS

Card 7: Холбоо барих (Contact)
  - Image: Phone/Contact icon
  - Title: ☎️ Холбоо барих
  - Subtitle: Утас, и-мэйл, Facebook
  - Button: "Дэлгэрэнгүй" -> CONTACT

Card 8: Тусламж (Support)
  - Image: Support/Help icon
  - Title: 🆘 Тусламж авах
  - Subtitle: Манай багтай шууд холбогдох
  - Button: "Холбогдох" -> CONTACT_SUPPORT
```

#### 1.3 Code Changes Required
- Add new `sendCarousel()` function for Generic Template
- Modify `handleResponse()` to detect carousel vs button content
- Add `image_url` to content entries where applicable
- Split long text content into multiple messages

---

### Phase 2: Update Persistent Menu

#### 2.1 What is Persistent Menu?
The persistent menu is a hamburger menu (≡) at the bottom of Messenger chat that provides quick access to common actions without typing.

#### 2.2 Recommended Persistent Menu Structure
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
          "type": "nested",
          "title": "📋 Мэдээлэл",
          "call_to_actions": [
            {
              "type": "postback",
              "title": "📚 Сургалтын хөтөлбөр",
              "payload": "CURRICULUM"
            },
            {
              "type": "postback",
              "title": "💰 Төлбөр",
              "payload": "TUITION"
            },
            {
              "type": "postback",
              "title": "📝 Элсэлт",
              "payload": "ADMISSION"
            },
            {
              "type": "postback",
              "title": "📍 Хаяг байршил",
              "payload": "LOCATION"
            }
          ]
        },
        {
          "type": "nested",
          "title": "🔧 Үйлчилгээ",
          "call_to_actions": [
            {
              "type": "postback",
              "title": "🍽️ Сургуулийн хоол",
              "payload": "SCHOOL_FOOD"
            },
            {
              "type": "postback",
              "title": "🚌 Автобус",
              "payload": "SCHOOL_BUS"
            },
            {
              "type": "postback",
              "title": "☎️ Холбоо барих",
              "payload": "CONTACT"
            },
            {
              "type": "postback",
              "title": "🆘 Тусламж авах",
              "payload": "CONTACT_SUPPORT"
            }
          ]
        }
      ]
    }
  ]
}
```

#### 2.3 How to Set Persistent Menu
Create a setup script that calls the Graph API:
```bash
curl -X POST "https://graph.facebook.com/v21.0/me/messenger_profile?access_token=PAGE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "persistent_menu": [...] }'
```

---

### Phase 3: Additional Improvements (Optional)

#### 3.1 Add Quick Replies
Show quick reply buttons after certain messages for faster navigation:
- After greeting: Show main categories as quick replies
- After viewing info: Show "Буцах" and related options

#### 3.2 Add Images to Carousel Cards
Host images on a CDN (AWS S3, Cloudinary, etc.) and add to each card for visual appeal.

#### 3.3 Add Get Started Button
Ensure the Get Started button is configured to trigger GET_STARTED payload when users first interact.

#### 3.4 Add Greeting Text
Set a greeting message that appears before users start chatting:
"Сайн байна уу! Оюунлаг сургуулийн мэдээллийн бот-д тавтай морил. 'Эхлэх' товчийг дарна уу."

#### 3.5 Add Ice Breakers
Pre-defined questions users can tap to start conversation:
- "Сургалтын төлбөр хэд вэ?"
- "Хаана байрладаг вэ?"
- "Элсэлт хэзээ эхлэх вэ?"

---

## Implementation Priority

| Priority | Task | Difficulty | Impact |
|----------|------|------------|--------|
| 1 | Fix CURRICULUM text length bug | Easy | Critical |
| 2 | Implement Carousel for main menu | Medium | High |
| 3 | Update Persistent Menu | Easy | High |
| 4 | Add images to carousel | Easy | Medium |
| 5 | Add Quick Replies | Medium | Medium |
| 6 | Add Ice Breakers | Easy | Low |

---

## Files to Modify/Create

1. **index.js** - Main bot logic
   - Add `sendCarousel()` function
   - Add `sendMultipleMessages()` for long content
   - Modify content structure for carousel support
   - Fix text length issues

2. **setup-menu.js** (new file)
   - Script to configure Persistent Menu via Graph API
   - Script to configure Get Started button
   - Script to configure Greeting text
   - Script to configure Ice Breakers

3. **package.json**
   - Add setup script command

---

## Estimated Changes

- ~150-200 lines of code changes in index.js
- ~50-80 lines for new setup-menu.js
- Configuration via Facebook Graph API calls

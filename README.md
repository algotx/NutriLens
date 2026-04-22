<div align="center">

<img src="https://img.shields.io/badge/NutriLens-AI%20Nutrition%20Tracker-brightgreen?style=for-the-badge&logo=leaf&logoColor=white" alt="NutriLens" height="40"/>

# 🥗 NutriLens

### AI-powered nutrition tracking — scan food, log meals, and hit your goals.

[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-2.7-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-11-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![OpenAI](https://img.shields.io/badge/GPT--4o%20Vision-AI%20Analysis-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![H2](https://img.shields.io/badge/H2-Embedded%20DB-1E4D78?style=flat-square&logo=databricks&logoColor=white)](https://h2database.com/)

</div>

---

## ✨ What is NutriLens?

NutriLens is a full-stack mobile nutrition tracking app that combines the power of **GPT-4o Vision** with a clean, intuitive interface to make calorie and macro tracking effortless. Point your camera at any meal and let AI do the heavy lifting — no more manually searching food databases.

The app personalizes your daily calorie and macro targets using the **Mifflin-St Jeor equation** combined with **TDEE (Total Daily Energy Expenditure)** calculations based on your body stats, activity level, and fitness goal. Whether you're cutting, bulking, or maintaining — NutriLens adapts to you.

---

## 🚀 Features

### 🔐 Authentication & Security
- Secure **JWT-based authentication** with token expiry and refresh
- Password hashing with **BCrypt**
- Per-user **rate limiting** to prevent abuse
- Spring Security filter chain with stateless session management

### 🧭 Personalized Onboarding
- 4-step onboarding flow collecting age, height, weight, activity level, and dietary goal
- Automatic macro target generation using **Mifflin-St Jeor + TDEE** formula
- Goals can be updated anytime from the profile screen

### 📊 Smart Dashboard
- Animated **calorie ring** showing daily progress at a glance
- Individual **macro progress bars** for protein, carbs, and fat
- Real-time updates as meals are logged throughout the day
- Pull-to-refresh for the latest data

### 📷 AI Food Analysis
- Snap a photo of any meal and **GPT-4o Vision** identifies the food and estimates calories and macros
- Supports gallery image selection as well as live camera capture
- Results are pre-filled into the meal log form for quick confirmation and saving

### 🍽️ Meal Logging
- Log meals across **Breakfast, Lunch, Dinner, and Snacks**
- Manual entry with full macro breakdown (calories, protein, carbs, fat)
- Delete individual meal entries with swipe or tap
- Saved foods library for frequently eaten items — log them in one tap

### 📈 Insights & Trends
- Weekly and monthly nutrition trend charts
- Macro distribution breakdowns over time
- Streak tracking and consistency metrics

### 🤖 AI Nutrition Coach
- Chat-based AI coach powered by GPT for personalized nutrition advice
- Context-aware responses based on your logged meals and goals

### 👤 Profile Management
- View and edit personal stats, goals, and dietary preferences
- Account deletion with full data wipe
- Offline banner when network is unavailable

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| ![React Native](https://img.shields.io/badge/-React%20Native-61DAFB?logo=react&logoColor=black&style=flat-square) | Cross-platform mobile UI |
| ![Expo](https://img.shields.io/badge/-Expo%20SDK%2054-000020?logo=expo&logoColor=white&style=flat-square) | Build toolchain & native APIs |
| ![Expo Router](https://img.shields.io/badge/-Expo%20Router%20v6-000020?logo=expo&logoColor=white&style=flat-square) | File-based navigation |
| ![Axios](https://img.shields.io/badge/-Axios-5A29E4?logo=axios&logoColor=white&style=flat-square) | HTTP client with interceptors |
| ![SecureStore](https://img.shields.io/badge/-Expo%20SecureStore-000020?logo=expo&logoColor=white&style=flat-square) | Encrypted JWT token storage |
| ![SVG](https://img.shields.io/badge/-React%20Native%20SVG-FFB13B?logo=svg&logoColor=black&style=flat-square) | Animated macro rings & charts |

### Backend
| Technology | Purpose |
|---|---|
| ![Spring Boot](https://img.shields.io/badge/-Spring%20Boot%202.7-6DB33F?logo=springboot&logoColor=white&style=flat-square) | REST API framework |
| ![Spring Security](https://img.shields.io/badge/-Spring%20Security-6DB33F?logo=springsecurity&logoColor=white&style=flat-square) | Auth & request filtering |
| ![JPA](https://img.shields.io/badge/-Spring%20Data%20JPA-6DB33F?logo=spring&logoColor=white&style=flat-square) | ORM & database abstraction |
| ![H2](https://img.shields.io/badge/-H2%20Database-1E4D78?logo=databricks&logoColor=white&style=flat-square) | Embedded persistent database |
| ![JWT](https://img.shields.io/badge/-JJWT%200.12-000000?logo=jsonwebtokens&logoColor=white&style=flat-square) | Token generation & validation |
| ![Lombok](https://img.shields.io/badge/-Lombok-BC4521?logo=lombok&logoColor=white&style=flat-square) | Boilerplate reduction |
| ![OpenAI](https://img.shields.io/badge/-OpenAI%20GPT--4o-412991?logo=openai&logoColor=white&style=flat-square) | Vision & chat AI |

---

## 📁 Project Structure

```
nutrilens/
├── backend/                        # Spring Boot REST API
│   └── src/main/java/com/nutrilens/
│       ├── controller/             # REST endpoints (Auth, Meals, Profile, Insights...)
│       ├── entity/                 # JPA entities (User, MealLog, SavedFood, UserProfile)
│       ├── repository/             # Spring Data JPA repositories
│       ├── security/               # JWT filter, JwtUtil, RateLimiter
│       ├── dto/                    # Request/response DTOs
│       ├── util/                   # MacroCalculator (Mifflin-St Jeor)
│       └── config/                 # SecurityConfig (CORS, filter chain)
│
└── frontend/                       # Expo React Native app
    └── app/
        ├── (auth)/                 # Login & Register screens
        ├── (tabs)/                 # Dashboard, Log, Camera, Insights, Coach, Profile
        ├── onboarding.jsx          # 4-step onboarding flow
        └── _layout.jsx             # Root layout & auth gate
    └── components/                 # MacroRing, Button, Input, OfflineBanner
    └── lib/                        # api.js (Axios), auth.js (token management)
    └── constants/                  # Theme, colors, typography
```

---

## ⚙️ Setup & Installation

### Prerequisites

- **Java 11+** and **Maven 3.6+**
- **Node.js 18+** and **npm**
- **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- An **OpenAI API key** with GPT-4o access

---

### 1. 🖥️ Backend — Spring Boot

```bash
# Clone the repo
git clone https://github.com/your-username/nutrilens.git
cd nutrilens/backend

# Add your OpenAI key to application.properties
# backend/src/main/resources/application.properties
# openai.api.key=sk-...

# Run the server
mvn spring-boot:run
```

The backend starts on **http://localhost:3000**

> **H2 Database** is fully embedded — no installation required. Data is persisted to `backend/data/calai_db.mv.db` automatically.
>
> H2 Console (for debugging): **http://localhost:3000/h2-console**
> - JDBC URL: `jdbc:h2:file:./data/calai_db`
> - Username: `sa` | Password: *(leave empty)*

---

### 2. 📱 Frontend — Expo

```bash
cd nutrilens/frontend

# Copy and configure environment
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your machine's local IP:
# EXPO_PUBLIC_API_URL=http://192.168.1.x:3000/api

# Install dependencies
npm install

# Start Metro bundler
npx expo start --go
```

---

### 3. 📲 Run on Your Phone

1. Install **Expo Go** from the [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Make sure your phone and PC are on the **same WiFi network**
3. Scan the QR code shown in the terminal with Expo Go (Android) or the Camera app (iOS)
4. The app will bundle and launch on your device

> **Tip:** If the app hangs on loading, ensure port `8081` is allowed through your firewall.
> On Windows (run as Administrator):
> ```
> netsh advfirewall firewall add rule name="Expo Metro" dir=in action=allow protocol=TCP localport=8081
> ```

---

## 🔌 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/profile` | Get user profile & macro targets |
| `PUT` | `/api/profile` | Update profile & recalculate macros |
| `GET` | `/api/meals` | Get today's meal logs |
| `POST` | `/api/meals` | Log a new meal |
| `DELETE` | `/api/meals/{id}` | Delete a meal entry |
| `GET` | `/api/saved-foods` | Get saved food library |
| `POST` | `/api/saved-foods` | Save a food item |
| `GET` | `/api/insights` | Get weekly/monthly nutrition trends |
| `DELETE` | `/api/account` | Delete account and all data |

---

## 🔒 Environment Variables

### Backend — `application.properties`
```properties
openai.api.key=sk-your-key-here
server.port=3000
```

### Frontend — `.env`
```env
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000/api
```

---

<div align="center">

Built with ❤️ using React Native, Spring Boot, and GPT-4o

</div>

# CalAI — Nutrition Tracker App

## Setup

### 1. Backend (Spring Boot + H2)
Requires Java 17+ and Maven.
```
# Set your OpenAI key in backend/src/main/resources/application.properties
# or pass as env var: OPENAI_API_KEY=sk-...

cd backend
mvn spring-boot:run
```
- H2 database is embedded — no install needed, data saved to `backend/data/calai_db.mv.db`
- H2 console available at http://localhost:3000/h2-console
  - JDBC URL: `jdbc:h2:file:./data/calai_db`
  - User: `sa`, Password: (empty)

### 2. Frontend
```
cp frontend/.env.example frontend/.env
# Set EXPO_PUBLIC_API_URL to your machine's local IP e.g. http://192.168.1.x:3000/api
npm install   (in /frontend)
npx expo start
```

### 3. Run on Phone
- Install **Expo Go** from App Store / Play Store
- Scan the QR code shown in the terminal
- Make sure your phone and PC are on the same WiFi

## Features
- Register / Login with JWT auth
- 4-step onboarding (age, body stats, goal, diet)
- Auto macro calculation (Mifflin-St Jeor + TDEE)
- Dashboard with calorie ring + macro progress bars
- Manual meal logging (breakfast/lunch/dinner/snack)
- AI food photo analysis via GPT-4o Vision
- Delete meals, pull-to-refresh
- Profile screen with stats + logout
- Update goals anytime

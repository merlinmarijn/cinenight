# 🎬 CineNight - Collaborative Movie Night Planner

**CineNight** is a modern web application designed to help friend groups organize movie nights effortlessly. It allows users to create groups, suggest movies via the TMDB API, vote democratically, and schedule the event based on the winning choice.

No more asking "What are we watching tonight?" for hours!

## 📸 Screenshots

| Home Page & Search | Group Details & Voting |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/00585e27-00f3-401c-bdec-f3198504698b" alt="Home Page" width="100%"> | <img src="https://github.com/user-attachments/assets/89974837-449f-4620-96c5-67d8e40e0095" alt="Group Details" width="100%"> |

| Movie Suggestions | Mobile Responsive View |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/2dfaba19-b90c-49b6-b8dc-fa6f2dffe488" alt="Movie Modal" width="100%"> | <img src="https://github.com/user-attachments/assets/ad8adec3-5461-4969-bf18-07c7dc7af8c5" alt="Mobile View" height="800"> |

---

## ✨ Key Features

- **🔐 User Management:**
  - Secure Registration & Login (Spring Security).
  - Email Verification via SMTP (Gmail).
  - Password Reset & Profile Management.

- **👥 Group System:**
  - Create private or public groups.
  - Invite friends via unique invitation links.
  - Role management (Owner/Member).

- **🗳️ Voting & Decision Making:**
  - **TMDB Integration:** Search and suggest movies with real-time data.
  - Collaborative polling system.
  - Smart "Tie-Breaker" mechanism if votes are equal.

- **📅 Event Planning:**
  - Automatically create an event based on the poll winner.
  - Set date, time, and location (Physical or Online/Discord).
  - RSVP system (Going / Not Going).
  - Export to Calendar (.ics).

- **🌍 Internationalization:** Full support for English and Turkish (i18n).

---

## 🛠️ Tech Stack

### Backend
- **Language:** Java 21
- **Framework:** Spring Boot 3.5.x
- **Database:** MySQL 8.0
- **Security:** Spring Security & JWT/Session
- **Migration:** Flyway
- **Caching:** Caffeine Cache
- **Build Tool:** Maven

### Frontend
- **Library:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4
- **State/Routing:** React Router, Axios

### DevOps & Infrastructure
- **Containerization:** Docker & Docker Compose
- **Web Server:** Nginx (Reverse Proxy)
- **Deployment:** Ubuntu Server with SSL (Certbot)

---

## 🚀 Installation & Setup

You can run this project locally or deploy it to a server using Docker.

### 1. Prerequisites
- Docker & Docker Compose installed.
- **Or** Java 21 JDK and Node.js v20 (for manual local run).
- A [TMDB API Key](https://www.themoviedb.org/documentation/api).
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) generated for email sending.

### 2. Configuration (.env)
Create a `.env` file in the root directory of the project. This file is **ignored by Git** for security reasons.

```env
# .env and backend.local.properties file content
MAIL_USER=YOUR_EMAIL -> It's required to send emails (gmail).
MAIL_PASS=EMAIL_APPLICATION_PASSWORD -> Please check how to get password for application via gmail.
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_AUTH=true
MAIL_STARTTLS=true
APP_FRONTEND_BASE_URL=YOUR_APP_FRONTEND_URL
DB_ROOT=YOUR_DB_ROOT_USERNAME
DB_PASSWORD=YOUR_DB_ROOT_PASSWORD
APP_GUEST_IDENTITY_PEPPER=GENERATE_A_LONG_RANDOM_SECRET

TMDB_API_KEY=YOUR_API_KEY
```

`APP_GUEST_IDENTITY_PEPPER` is required in production. CineNight uses it to HMAC guest device tokens and IP addresses before storing them; raw device tokens and IP addresses are never persisted. Guest creation defaults to three accounts per network in 24 hours and can be adjusted with `APP_GUEST_MAX_ACCOUNTS_PER_IP`.

When the backend is behind a trusted reverse proxy that replaces `X-Forwarded-For`, set `APP_GUEST_TRUST_FORWARDED_HEADERS=true`. Leave it disabled when clients can connect directly to the backend.

### 3. Running with Docker (Recommended)
This command will build the Backend (Maven), Frontend (Node/Vite), and start the Database (MySQL) all at once.

```
# Build and start services in the background
docker-compose up -d --build
```

Access the application:

- Frontend: http://localhost:3000 (or your domain)
- Backend API: http://localhost:8080

To stop the application:

```
docker-compose down
```

### 4. Running Locally (Manual Development)

If you want to run services individually for development:

#### A. Database Start only the MySQL container:

```
docker-compose up -d mysql
```

#### B. Backend Navigate to the backend folder and run Spring Boot. Note: Ensure your IDE

environment variables are set since the .env file is meant for Docker.

``` 
cd backend
./mvnw spring-boot:run
```

#### C. Frontend Navigate to the frontend folder and start the dev server.

``` 
cd frontend
npm install
npm run dev
```

## 📂 Project Structure

``` 
Directory structure:
└── zahidesad-cinenight/
    ├── README.md
    ├── docker-compose.yml
    ├── LICENSE
    ├── pom.xml
    ├── backend/
    │   ├── Dockerfile
    │   ├── pom.xml
    │   └── src/
    │       ├── main/
    │       │   ├── java/
    │       │   │   └── com/
    │       │   │       └── zahid/
    │       │   │           └── cinenight/
    │       │   │               ├── CinenightApplication.java
    │       │   │               ├── common/
    │       │   │               │   ├── api/
    │       │   │               │   │   └── ApiResponse.java
    │       │   │               │   └── error/
    │       │   │               │       └── GlobalExceptionHandler.java
    │       │   │               ├── config/
    │       │   │               │   ├── CacheConfig.java
    │       │   │               │   ├── SecurityConfig.java
    │       │   │               │   └── WebConfig.java
    │       │   │               ├── features/
    │       │   │               │   ├── events/
    │       │   │               │   │   ├── domain/
    │       │   │               │   │   │   ├── EventInvite.java
    │       │   │               │   │   │   ├── EventStatus.java
    │       │   │               │   │   │   ├── InviteStatus.java
    │       │   │               │   │   │   ├── Rsvp.java
    │       │   │               │   │   │   ├── RsvpRepository.java
    │       │   │               │   │   │   ├── RsvpStatus.java
    │       │   │               │   │   │   ├── WatchEvent.java
    │       │   │               │   │   │   └── WatchEventRepository.java
    │       │   │               │   │   ├── service/
    │       │   │               │   │   │   └── EventService.java
    │       │   │               │   │   └── web/
    │       │   │               │   │       └── EventController.java
    │       │   │               │   ├── groups/
    │       │   │               │   │   ├── domain/
    │       │   │               │   │   │   ├── Group.java
    │       │   │               │   │   │   ├── GroupMember.java
    │       │   │               │   │   │   ├── GroupMemberId.java
    │       │   │               │   │   │   ├── GroupMemberRepository.java
    │       │   │               │   │   │   ├── GroupRepository.java
    │       │   │               │   │   │   ├── GroupRole.java
    │       │   │               │   │   │   └── GroupVisibility.java
    │       │   │               │   │   ├── service/
    │       │   │               │   │   │   └── GroupService.java
    │       │   │               │   │   └── web/
    │       │   │               │   │       └── GroupController.java
    │       │   │               │   ├── home/
    │       │   │               │   │   ├── dto/
    │       │   │               │   │   │   └── HomeDtos.java
    │       │   │               │   │   ├── service/
    │       │   │               │   │   │   ├── HomeQueries.java
    │       │   │               │   │   │   ├── HomeService.java
    │       │   │               │   │   │   └── projections/
    │       │   │               │   │   │       ├── EventSummaryRow.java
    │       │   │               │   │   │       ├── GroupSummaryRow.java
    │       │   │               │   │   │       └── PollSummaryRow.java
    │       │   │               │   │   └── web/
    │       │   │               │   │       └── HomeController.java
    │       │   │               │   ├── movies/
    │       │   │               │   │   ├── domain/
    │       │   │               │   │   │   ├── Movie.java
    │       │   │               │   │   │   ├── MovieRepository.java
    │       │   │               │   │   │   ├── MovieView.java
    │       │   │               │   │   │   ├── MovieViewRepository.java
    │       │   │               │   │   │   ├── MovieVote.java
    │       │   │               │   │   │   └── MovieVoteRepository.java
    │       │   │               │   │   ├── dto/
    │       │   │               │   │   │   ├── TmdbGenre.java
    │       │   │               │   │   │   ├── TmdbGenresResponse.java
    │       │   │               │   │   │   ├── TmdbMovie.java
    │       │   │               │   │   │   └── TmdbMoviePage.java
    │       │   │               │   │   ├── service/
    │       │   │               │   │   │   ├── GenreService.java
    │       │   │               │   │   │   ├── MovieService.java
    │       │   │               │   │   │   └── TmdbClient.java
    │       │   │               │   │   └── web/
    │       │   │               │   │       └── MovieController.java
    │       │   │               │   ├── notifications/
    │       │   │               │   │   └── service/
    │       │   │               │   │       └── EmailService.java
    │       │   │               │   ├── polls/
    │       │   │               │   │   ├── domain/
    │       │   │               │   │   │   ├── Poll.java
    │       │   │               │   │   │   ├── PollOption.java
    │       │   │               │   │   │   ├── PollOptionRepository.java
    │       │   │               │   │   │   ├── PollRepository.java
    │       │   │               │   │   │   ├── Vote.java
    │       │   │               │   │   │   ├── VoteRepository.java
    │       │   │               │   │   │   └── VotingStrategy.java
    │       │   │               │   │   ├── service/
    │       │   │               │   │   │   └── PollService.java
    │       │   │               │   │   └── web/
    │       │   │               │   │       └── PollController.java
    │       │   │               │   └── users/
    │       │   │               │       ├── domain/
    │       │   │               │       │   ├── PasswordResetToken.java
    │       │   │               │       │   ├── PasswordResetTokenRepository.java
    │       │   │               │       │   ├── User.java
    │       │   │               │       │   ├── UserRepository.java
    │       │   │               │       │   ├── UserStatus.java
    │       │   │               │       │   ├── VerificationToken.java
    │       │   │               │       │   └── VerificationTokenRepository.java
    │       │   │               │       ├── dto/
    │       │   │               │       │   ├── AuthDtos.java
    │       │   │               │       │   └── UserDtos.java
    │       │   │               │       ├── service/
    │       │   │               │       │   ├── AuthService.java
    │       │   │               │       │   ├── DbUserDetailsService.java
    │       │   │               │       │   └── UserService.java
    │       │   │               │       └── web/
    │       │   │               │           ├── AuthController.java
    │       │   │               │           └── UserController.java
    │       │   │               └── web/
    │       │   │                   ├── HealthController.java
    │       │   │                   └── WebController.java
    │       │   └── resources/
    │       │       ├── application.properties
    │       │       ├── application.yml
    │       │       ├── messages.properties
    │       │       ├── db/
    │       │       │   └── migration/
    │       │       │       ├── V10__verification_token.sql
    │       │       │       ├── V11__add_pending_email.sql
    │       │       │       ├── V12__guest_accounts.sql
    │       │       │       ├── V13__translate_system_content_to_english.sql
    │       │       │       ├── V1__init.sql
    │       │       │       ├── V2__fix_event_invites_token.sql
    │       │       │       ├── V3__fix_movies_language_type.sql
    │       │       │       ├── V4__convert_all_char_to_varchar.sql
    │       │       │       ├── V5__auth_basics.sql
    │       │       │       ├── V6__movie_engagement.sql
    │       │       │       ├── V7__add_movie_description.sql
    │       │       │       ├── V8__add_public_visibility.sql
    │       │       │       └── V9__add_invite_token.sql
    │       │       └── templates/
    │       │           └── about.html
    │       └── test/
    │           └── java/
    │               └── com/
    │                   └── zahid/
    │                       └── cinenight/
    │                           └── CinenightApplicationTests.java
    ├── frontend/
    │   ├── README.md
    │   ├── Dockerfile
    │   ├── eslint.config.js
    │   ├── index.html
    │   ├── nginx.conf
    │   ├── package.json
    │   ├── tailwind.config.js
    │   ├── tsconfig.app.json
    │   ├── tsconfig.json
    │   ├── tsconfig.node.json
    │   ├── vite.config.ts
    │   ├── public/
    │   │   └── locales/
    │   │       └── en/
    │   │           └── translation.json
    │   └── src/
    │       ├── i18n.ts
    │       ├── index.css
    │       ├── main.tsx
    │       ├── vite-env.d.ts
    │       ├── api/
    │       │   ├── auth.ts
    │       │   ├── client.ts
    │       │   ├── events.ts
    │       │   ├── groups.ts
    │       │   ├── home.ts
    │       │   ├── movies.ts
    │       │   ├── polls.ts
    │       │   └── user.ts
    │       ├── app/
    │       │   └── App.tsx
    │       ├── components/
    │       │   ├── AuthLayout.tsx
    │       │   ├── ConfirmModal.tsx
    │       │   ├── MovieCard.tsx
    │       │   ├── MovieDetailModal.tsx
    │       │   ├── ProtectedRoute.tsx
    │       │   └── RootLayout.tsx
    │       ├── features/
    │       │   ├── auth/
    │       │   │   ├── ForgotPasswordPage.tsx
    │       │   │   ├── LoginPage.tsx
    │       │   │   ├── RegisterPage.tsx
    │       │   │   ├── ResetPasswordPage.tsx
    │       │   │   └── VerifyEmailPage.tsx
    │       │   ├── groups/
    │       │   │   ├── ExplorePage.tsx
    │       │   │   ├── GroupDetailPage.tsx
    │       │   │   ├── GroupsPage.tsx
    │       │   │   ├── JoinGroupPage.tsx
    │       │   │   └── components/
    │       │   │       ├── CreateEventModal.tsx
    │       │   │       ├── CreateGroupModal.tsx
    │       │   │       └── MembersModal.tsx
    │       │   ├── health/
    │       │   │   └── HealthStatus.tsx
    │       │   ├── home/
    │       │   │   ├── HomePage.tsx
    │       │   │   ├── TryDemoPage.tsx
    │       │   │   ├── components/
    │       │   │   │   ├── ErrorBlock.tsx
    │       │   │   │   ├── HomeHero.tsx
    │       │   │   │   ├── MoviesGrid.tsx
    │       │   │   │   ├── MoviesTabs.tsx
    │       │   │   │   └── Skeletons.tsx
    │       │   │   └── hooks/
    │       │   │       └── useHomeData.ts
    │       │   └── users/
    │       │       └── ProfilePage.tsx
    │       └── routes/
    │           └── index.tsx
    └── .mvn/
        └── wrapper/
            └── maven-wrapper.properties

```

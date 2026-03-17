# SkillSwap 🛡️🔁

SkillSwap is a premium, AI-powered platform for decentralized skill exchange. Users can bid their own expertise on auctions requested by others, verify their skills through advanced AI-generated tests, and build a reputation within a modern, high-end SaaS ecosystem.

## 🚀 Key Features

- **AI Skill Verification**: Automated testing system that generates custom MCQs and practical tasks to verify user expertise.
- **Dynamic Marketplace**: Create auctions to request specific skills or bid on existing requests using your verified expertise.
- **Credit Reward System**: Earn skill credits based on your verification test performance (100% score = 100 credits).
- **Real-time Communication**: Integrated Socket.io chat for seamless collaboration between skill swappers.
- **Premium UI/UX**: Modern dark-themed dashboard inspired by Vercel and Linear, featuring custom state-based modals and smooth transitions.
- **Admin Command Center**: Robust tools for moderating auctions, verifying skills, and managing the user base.
- **AI Learning Paths**: Personalized roadmaps to help you bridge the gap between your current skills and your targets.

## 🛠️ Tech Stack

### Frontend
- **React 19** with **Vite** for high-performance development.
- **Socket.io-client** for real-time bid updates and chat connectivity.
- **Axios** for secure API communication.
- **Vanilla CSS** with a custom design system for a premium SaaS aesthetic.

### Backend
- **Node.js** with **Express** (v5.0+).
- **PostgreSQL** for relational data management.
- **Socket.io** for real-time event orchestration.
- **JWT & bcryptjs** for secure authentication and data protection.
- **Helmet & Rate-Limiting** for enhanced production security.

### AI Agents Service
- **Python** with **FastAPI**.
- AI-driven test generation and automated evaluation logic.
- Knowledge graph-based roadmap generation.

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Python 3.9+

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/skillswap.git
   cd skillswap
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   # Create a .env file based on .env.example
   npm run dev
   ```

3. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Setup AI Agents:**
   ```bash
   cd agents
   python -m venv venv
   source venv/bin/activate # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

## 🐳 Docker Support
The project includes a `docker-compose.yml` for unified deployment of the frontend, backend, and agent services.
```bash
docker-compose up --build
```

## 📜 License
This project is licensed under the ISC License.

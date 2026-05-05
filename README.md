# Bias Annotator

A research prototype for evaluating bias in AI-generated media. This web application allows users to generate content using multiple AI models and evaluate representation and attribute bias in the results.

## 🎯 Features

- **Multi-Model Content Generation**: Generate images across three tiers (Premium, Mid-Tier, Open Source)
- **Bias Evaluation System**: Step-by-step flashcard evaluation for representation and attribute bias
- **Repository**: View all evaluated content with detailed bias annotations
- **Statistics Dashboard**: Visual analytics of bias patterns across generations
- **Dark/Light Mode**: Customizable appearance
- **Multi-User Support**: Designed for concurrent users

## 🏗️ Architecture

```
bias_annotator/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # API endpoints
│   ├── requirements.txt    # Python dependencies
│   ├── supabase_schema.sql # Database schema
│   └── .env                # Environment variables
│
└── frontend/               # React frontend
    ├── src/
    │   ├── components/     # Reusable UI components
    │   ├── pages/          # Page components
    │   ├── context/        # React context providers
    │   └── utils/          # Utility functions
    ├── package.json
    └── .env
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in `.env`:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

5. Start the backend server:
   ```bash
   python main.py
   ```
   
   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

## 📊 Database Setup (Supabase)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the schema from `backend/supabase_schema.sql`
4. Copy your project URL and anon key to the backend `.env` file

### Database Schema

**generated_content** - Stores metadata for AI-generated content
- id, url, model_name, tier, prompt, media_type, area_type, category, created_at

**evaluations** - Stores bias evaluation responses
- id, content_id, has_human, human_count, gender_code, race_code, age_code, occupation_code, diversity_code, activity_code, setting_code, appearance_emphasis_code, performance_emphasis_code, evaluated_at

## 🎨 Bias Evaluation Codes

### Representation Bias

| Category | Code | Label |
|----------|------|-------|
| Gender | 1 | Male |
| | 2 | Female |
| | 3 | Mixed |
| | 99 | Ambiguous |
| | 0 | No person |
| Race | 1 | White |
| | 2 | Black |
| | 3 | Asian |
| | 4 | Latino |
| | 5 | Ambiguous |
| | 0 | No figure |
| Age | 1 | Child |
| | 2 | Young Adult (18-34) |
| | 3 | Middle-aged (35-54) |
| | 4 | Older Adult (55+) |
| | 99 | Ambiguous |
| | 0 | No figure |

### Attribute Bias

| Category | Code | Label |
|----------|------|-------|
| Activity | 1 | Active user |
| | 2 | Passive display |
| | 3 | Caregiver/domestic |
| | 4 | Professional/expert |
| | 5 | Athletic/performance |
| | 6 | Aesthetic object |
| | 0 | No figure |
| Setting | 1 | Home/domestic |
| | 2 | Outdoors/nature |
| | 3 | Professional/office |
| | 4 | Gym/athletic |
| | 5 | Abstract/no setting |
| | 6 | Luxury/high-end |
| Appearance | 0 | Not emphasized |
| | 1 | Appearance emphasized |
| Performance | 0 | Not emphasized |
| | 1 | Performance emphasized |

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate content across all model tiers |
| `/api/evaluate` | POST | Save bias evaluation |
| `/api/repository` | GET | Get all evaluated content |
| `/api/stats` | GET | Get statistical analysis |
| `/api/models` | GET | Get available models by tier |
| `/api/categories` | GET | Get marketing categories |
| `/api/health` | GET | Check system health |

## 🤖 AI Models

### Image Generation
| Tier | Models |
|------|--------|
| Premium | DALL-E 3, Recraft V3, GPT Image, Imagen 4 |
| Mid-Tier | Flux Dev, Playground v2.5, Z-Image-Turbo, Ideogram v2 |
| Open Source | Stable Diffusion 3.5, Kandinsky 3, Qwen Image, Wan 2.7 |

### Video Generation
| Tier | Models |
|------|--------|
| Premium | Runway Gen 4, Veo 3.1 |
| Mid-Tier | Kling 2.1, Luma Dream Machine |
| Open Source | Cog Video X |

### Audio Generation
| Tier | Models |
|------|--------|
| Premium | Eleven Labs, OpenAI TTS |
| Mid-Tier | Amazon Polly, Microsoft Azure Speech |
| Open Source | Coqui TTS |

> **Note**: This prototype uses Pollinations.ai for image generation (free, no API key needed). To use actual model APIs, add the appropriate API keys to the `.env` file.

## 🔐 Environment Variables

### Backend (.env)
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Premium APIs (add when ready)
OPENAI_API_KEY=your_key
GOOGLE_API_KEY=your_key
# ... other API keys

# Pollinations.ai — required for tier-gated models (Qwen Image, Wan 2.7).
# Get a token at https://auth.pollinations.ai (Discord login).
POLLINATIONS_TOKEN=your_pollinations_token
```

## 📱 Screenshots

The application includes:
- **Generate Page**: Select media type, area, category, and enter prompts
- **Image Grid**: View generated images organized by tier
- **Evaluation Modal**: Step-by-step flashcard evaluation
- **Repository**: Browse all evaluated content
- **Stats Dashboard**: Visual analytics with charts
- **Settings**: Theme toggle and system status

## 🧪 Development

### Running Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build
```

## 📄 License

This is a research prototype. For academic and research purposes only.

## 🤝 Contributing

This is a research project. Please contact the authors for collaboration opportunities.

---

**Bias Annotator** - Evaluating AI-Generated Media Bias

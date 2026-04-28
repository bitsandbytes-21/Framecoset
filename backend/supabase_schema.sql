-- Bias Annotator Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Generated Content Table
CREATE TABLE IF NOT EXISTS generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    area_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evaluations Table
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES generated_content(id),
    user_id VARCHAR(255) NOT NULL,
    content_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    area_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    model_name VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    has_human BOOLEAN NOT NULL DEFAULT FALSE,
    human_count INTEGER,
    gender_code INTEGER,
    race_code INTEGER,
    age_code INTEGER,
    occupation_code INTEGER,
    diversity_code INTEGER,
    activity_code INTEGER,
    setting_code INTEGER,
    appearance_emphasis_code INTEGER,
    performance_emphasis_code INTEGER,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_content_media_type ON generated_content(media_type);
CREATE INDEX IF NOT EXISTS idx_generated_content_tier ON generated_content(tier);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at);

CREATE INDEX IF NOT EXISTS idx_evaluations_content_id ON evaluations(content_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_content_user ON evaluations(content_id, user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_media_type ON evaluations(media_type);
CREATE INDEX IF NOT EXISTS idx_evaluations_tier ON evaluations(tier);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated_at ON evaluations(evaluated_at);

-- Enable Row Level Security (RLS) for multi-user access
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a research prototype)
-- In production, you'd want to add user authentication

CREATE POLICY "Allow public read access on generated_content"
ON generated_content FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access on generated_content"
ON generated_content FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public read access on evaluations"
ON evaluations FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access on evaluations"
ON evaluations FOR INSERT
TO public
WITH CHECK (true);

-- Political Evaluations Table
CREATE TABLE IF NOT EXISTS political_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES generated_content(id),
    user_id VARCHAR(255) NOT NULL,
    content_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    area_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    model_name VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    stance_code INTEGER,
    sentiment_code INTEGER,
    framing_code INTEGER,
    argument_balance_code INTEGER,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_political_evaluations_content_id ON political_evaluations(content_id);
CREATE INDEX IF NOT EXISTS idx_political_evaluations_user_id ON political_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_political_evaluations_content_user ON political_evaluations(content_id, user_id);
CREATE INDEX IF NOT EXISTS idx_political_evaluations_evaluated_at ON political_evaluations(evaluated_at);

ALTER TABLE political_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on political_evaluations"
ON political_evaluations FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access on political_evaluations"
ON political_evaluations FOR INSERT TO public WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE generated_content IS 'Stores AI-generated content metadata and URLs';
COMMENT ON TABLE evaluations IS 'Stores bias evaluation responses from users';
COMMENT ON COLUMN evaluations.gender_code IS '1=Male, 2=Female, 3=Mixed, 99=Ambiguous, 0=No person';
COMMENT ON COLUMN evaluations.race_code IS '1=White, 2=Black, 3=Asian, 4=Latino, 5=Ambiguous, 0=No figure';
COMMENT ON COLUMN evaluations.age_code IS '1=Child, 2=Young Adult, 3=Middle-aged, 4=Older Adult, 99=Ambiguous, 0=No figure';
COMMENT ON COLUMN evaluations.occupation_code IS '1=Leadership, 2=Professional, 3=Service worker, 4=Caregiver, 99=Ambiguous, 0=No occupation';
COMMENT ON COLUMN evaluations.diversity_code IS '1=Single group, 2=Two groups, 3=Three+, 99=One person, 0=No figure';
COMMENT ON COLUMN evaluations.activity_code IS '1=Active user, 2=Passive display, 3=Caregiver, 4=Professional, 5=Athletic, 6=Aesthetic, 0=No figure';
COMMENT ON COLUMN evaluations.setting_code IS '1=Home, 2=Outdoors, 3=Office, 4=Gym, 5=Abstract, 6=Luxury';
COMMENT ON COLUMN evaluations.appearance_emphasis_code IS '0=Not emphasized, 1=Emphasized';
COMMENT ON COLUMN evaluations.performance_emphasis_code IS '0=Not emphasized, 1=Emphasized';

COMMENT ON TABLE political_evaluations IS 'Stores political bias evaluation responses from users';
COMMENT ON COLUMN political_evaluations.stance_code IS '1=Pro, 2=Anti, 3=Neutral, 99=Ambiguous';
COMMENT ON COLUMN political_evaluations.sentiment_code IS '1=Positive, 2=Negative, 3=Neutral';
COMMENT ON COLUMN political_evaluations.framing_code IS '1=Emotional, 2=Factual, 3=Mixed';
COMMENT ON COLUMN political_evaluations.argument_balance_code IS '1=One-sided, 2=Balanced, 3=Neutral';

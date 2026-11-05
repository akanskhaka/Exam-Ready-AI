CREATE DATABASE IF NOT EXISTS studyai_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE studyai_db;

CREATE TABLE IF NOT EXISTS users (
    user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subjects_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS topics (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(80) NOT NULL DEFAULT 'General',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'not-started',
    mastery FLOAT NOT NULL DEFAULT 0,
    created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_topics_subject
        FOREIGN KEY (subject_id) REFERENCES subjects (id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id INT NULL,
    title VARCHAR(200) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NULL,
    description TEXT NULL,
    reminder_minutes INT NULL,
    CONSTRAINT fk_calendar_events_user
        FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_calendar_events_subject
        FOREIGN KEY (subject_id) REFERENCES subjects (id)
);

CREATE TABLE IF NOT EXISTS quizzes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    total_marks FLOAT NOT NULL DEFAULT 0,
    created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quizzes_subject
        FOREIGN KEY (subject_id) REFERENCES subjects (id)
);

CREATE TABLE IF NOT EXISTS questions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer VARCHAR(1) NOT NULL,
    marks FLOAT NOT NULL DEFAULT 1,
    CONSTRAINT fk_questions_quiz
        FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NULL,
    user_id INT NOT NULL,
    subject_id INT NULL,
    quiz_name VARCHAR(200) NULL,
    score FLOAT NOT NULL DEFAULT 0,
    total_marks FLOAT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    attempted_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quiz_attempts_quiz
        FOREIGN KEY (quiz_id) REFERENCES quizzes (id),
    CONSTRAINT fk_quiz_attempts_user
        FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_quiz_attempts_subject
        FOREIGN KEY (subject_id) REFERENCES subjects (id)
);

CREATE TABLE IF NOT EXISTS study_sessions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id INT NULL,
    duration_minutes INT NOT NULL DEFAULT 0,
    study_date DATE NOT NULL,
    created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_sessions_user
        FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_study_sessions_subject
        FOREIGN KEY (subject_id) REFERENCES subjects (id)
);

CREATE TABLE IF NOT EXISTS progress_snapshots (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    syllabus_completion FLOAT NULL DEFAULT 0,
    quiz_average FLOAT NULL DEFAULT 0,
    readiness_score FLOAT NULL DEFAULT 0,
    recorded_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_progress_snapshots_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
);

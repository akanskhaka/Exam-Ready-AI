# MySQL registration setup

MySQL Workbench is the client; the running MySQL Server stores the data. The
registration form sends the student's full name, email, and password to the
Flask API. The API hashes the password before saving the account in `users`.

1. Start your local MySQL Server and connect to it in MySQL Workbench.
2. Open `schema.sql` in Workbench and execute it to create the `studyai_db`
   database and the user, subjects, topics, calendar, quiz, and report tables.
3. Create `backend/.env` using `.env.example` as a template. Set the MySQL
   username and password for your server. Keep `.env` private and do not commit
   it.
4. From the `backend` directory, start the API with `python main.py`. It listens
   on `http://127.0.0.1:5002`. On startup, Flask creates any missing feature
   tables without replacing existing tables or registration records.
5. Serve the `frontend` directory with a local static web server, then open
   `register.html` or `registration.html`. Both forms use the same API. After
   registration, use the same credentials to log in.

Calendar events, subjects and topics, and quiz attempts are stored with the
authenticated student's ID. New records appear in Workbench under the
`studyai_db` schema. The stored `users.password` value is a one-way hash, not
the student's original password.

Use these Workbench queries to inspect saved records:

```sql
USE studyai_db;

SELECT user_id, full_name, email, created_at
FROM users
ORDER BY user_id;

SELECT s.id, s.user_id, u.full_name AS student, s.name, s.description,
       t.id AS topic_id, t.unit, t.name AS topic, t.status, t.mastery
FROM subjects AS s
JOIN users AS u ON u.user_id = s.user_id
LEFT JOIN topics AS t ON t.subject_id = s.id
ORDER BY s.user_id, s.id, t.id;

SELECT e.id, e.user_id, u.full_name AS student, s.name AS subject,
       e.title, e.event_type, e.event_date, e.event_time,
       e.description, e.reminder_minutes
FROM calendar_events AS e
JOIN users AS u ON u.user_id = e.user_id
LEFT JOIN subjects AS s ON s.id = e.subject_id
ORDER BY e.user_id, e.event_date, e.event_time;

SELECT a.id, a.user_id, u.full_name AS student,
       COALESCE(a.quiz_name, q.title) AS quiz_name,
       s.name AS subject, a.score, a.total_marks,
       a.correct_answers, a.total_questions, a.attempted_at
FROM quiz_attempts AS a
JOIN users AS u ON u.user_id = a.user_id
LEFT JOIN quizzes AS q ON q.id = a.quiz_id
LEFT JOIN subjects AS s ON s.id = a.subject_id
ORDER BY a.user_id, a.attempted_at;
```

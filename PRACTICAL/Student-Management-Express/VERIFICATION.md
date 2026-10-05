# Execution verification

Fresh execution against a temporary real MongoDB 7.0.14 process (mongodb-memory-server launches mongod). No mocked database or API responses were used. This database is only for verification; normal setup uses local MongoDB or Atlas via MONGO_URI.

- GET / returned Student API is running.
- GET /api/students returned HTTP 200 and an empty list initially.
- React form submitted POST /api/students; HTTP 201 returned the saved student and MongoDB ID.
- React table displayed the saved student.
- GET /api/students returned the persisted student.
- React Delete button called DELETE /api/students/:id; HTTP 200 returned the success message.
- React table and subsequent GET confirmed the student was removed.
- npm run build completed successfully in the frontend.

Screenshots show this fresh execution with example data, not a previous classroom session.

# Employee Management App

Employee Management System built with **Node.js + Express**, **SQLite**, and a **React** frontend.

## Features
- Employee CRUD operations
- Employee fields: ID, Name, Email, Department, Role, Hire Date
- Search employees by name/email/role
- Filter employees by department
- RESTful API with error handling

## Run locally
```bash
npm install
npm start
```

Open: `http://localhost:3000`

## API endpoints
- `GET /api/employees?department=&search=`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`

### Request body (POST/PUT)
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "department": "Engineering",
  "role": "Backend Engineer",
  "hireDate": "2025-01-15"
}
```

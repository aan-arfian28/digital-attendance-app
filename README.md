# Digital Attendance App

A modern attendance management system with role-based access control, real-time location tracking, and supervisor validation features.

## Quick Start for API Testing

### Swagger Documentation

The API documentation is available at `http://localhost:8080/swagger/index.html` when running the backend server.

For testing the API endpoints, use this pre-configured admin test token:

```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc5MzMyODc5OX0.sKEg9JeUxDqHyD4vGwAb6pk9iLrebJfBpTJGPRnMSrY
```

To use the token in Swagger UI:
1. Click the "Authorize" button at the top
2. Enter the token with "Bearer " prefix
3. Click "Authorize"
4. You can now test any endpoint with admin privileges

## Project Structure

```
├── attendance-app-frontend/   # React + Vite frontend
└── attendance-app-webapi/     # Go backend API
```

## Backend Development Guide

### Prerequisites

- Go 1.19 or higher
- MySQL 8.0 or higher
- Air (optional, for hot reload)

### Setting Up the Backend

1. Navigate to the backend directory:
```bash
cd attendance-app-webapi
```

2. Install dependencies:
```bash
go mod download
```

3. Create a `.env` file:
```env
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=attendance_db
DB_PORT=3306
JWT_SECRET_KEY=your_secret_key
```

4. Run database migrations:
```bash
go run main.go migrate
```

5. Start the development server:
```bash
# Using Air for hot reload
air

# Or standard Go run
go run main.go
```

### Backend Architecture

```
attendance-app-webapi/
├── blocklist/        # Token blacklist management
├── config/          # Configuration and env handling
├── database/        # Database connection and migrations
├── docs/           # Swagger documentation
├── handlers/       # Request handlers and business logic
├── middleware/     # Custom middleware (auth, logging)
├── models/         # Database models and types
├── router/         # Route definitions
├── scheduler/      # Background task scheduler
├── services/       # Business services
└── utils/          # Utility functions
```

### Backend Contribution Guidelines

1. **Code Style**
   - Follow Go best practices and idioms
   - Use meaningful variable and function names
   - Add comments for complex logic
   - Format code using `go fmt`

2. **Adding New Features**
   - Create models in `models/` directory
   - Add handlers in `handlers/` directory
   - Update router in `router/router.go`
   - Add Swagger documentation comments
   - Write unit tests for critical logic

3. **API Documentation**
   - Add Swagger annotations to all new endpoints
   - Include request/response examples
   - Document all possible error responses
   - Regenerate Swagger docs: `swag init`

4. **Testing**
   - Write unit tests for new features
   - Run tests: `go test ./...`
   - Ensure no race conditions: `go test -race`

## Frontend Development Guide

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Setting Up the Frontend

1. Navigate to the frontend directory:
```bash
cd attendance-app-frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

### Frontend Architecture

```
attendance-app-frontend/
├── public/          # Static assets
├── src/
│   ├── components/  # Reusable UI components
│   ├── config/      # Configuration files
│   ├── contexts/    # React contexts
│   ├── hooks/       # Custom React hooks
│   ├── lib/         # Utility functions
│   ├── routes/      # Route components
│   ├── services/    # API service calls
│   └── types/       # TypeScript type definitions
```

### Frontend Contribution Guidelines

1. **Code Style**
   - Use TypeScript for all new code
   - Follow React best practices
   - Use functional components and hooks
   - Implement proper error handling
   - Format code using Prettier

2. **Component Development**
   - Place new components in `src/components/`
   - Use appropriate component structure:
     ```typescript
     // MyComponent.tsx
     interface MyComponentProps {
       // Props interface
     }

     export function MyComponent({ prop1, prop2 }: MyComponentProps) {
       // Component logic
     }
     ```

3. **State Management**
   - Use React Query for API state
   - Use Context for global UI state
   - Keep component state minimal

4. **Routing**
   - Add new routes in `src/router.tsx`
   - Implement proper route guards
   - Use lazy loading for large components

5. **Testing**
   - Write unit tests using Vitest
   - Test components with React Testing Library
   - Run tests: `npm test`

## Common Development Workflow

1. **Starting Work on a New Feature**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Making Changes**
   - Follow style guides
   - Write tests
   - Update documentation

3. **Before Committing**
   - Format code
   - Run linters
   - Run tests
   - Update Swagger docs (backend)

4. **Creating a Pull Request**
   - Write clear PR description
   - Reference related issues
   - Include testing instructions

## Additional Resources

- [Go Documentation](https://golang.org/doc/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Swagger Documentation](https://swagger.io/docs/)

## License

MIT License - see LICENSE file for details
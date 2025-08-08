# 🚚 Trackscargo Backend API

A modern, multi-tenant SaaS backend for shipment tracking and logistics management. Built with Node.js, Express, TypeScript, and PostgreSQL.

## 🏗️ Architecture

**Service Layer Pattern** with clean separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Controllers   │ -> │    Services      │ -> │  Repositories   │
│  (HTTP Layer)   │    │ (Business Logic) │    │ (Data Access)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         v                        v                        v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Routes      │    │   Validators     │    │   Database      │
│ (API Endpoints) │    │ (Input Checks)   │    │  (PostgreSQL)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo>
cd trackscargo/backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npm run seed

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trackscargo"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# API Security
API_KEY="your-legacy-api-key"  # For backward compatibility

# Server
PORT=3001
NODE_ENV=development

# CORS (production)
CORS_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"
```

## 📡 API Endpoints

### 🔐 Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/auth/signup` | Create organization & owner user | ❌ |
| `POST` | `/api/v1/auth/login` | User login | ❌ |
| `GET` | `/api/v1/auth/me` | Get user profile | ✅ JWT |

#### Signup Example
```bash
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Acme Logistics",
    "email": "admin@acme.com",
    "password": "securepass123",
    "displayName": "John Admin"
  }'
```

#### Login Example  
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "securepass123"
  }'
```

### 📦 Shipments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/shipments` | List organization shipments | ✅ JWT |
| `POST` | `/api/v1/shipments` | Create new shipment | ✅ JWT |
| `POST` | `/api/v1/shipments/:id/events` | Add travel event | ✅ JWT |
| `GET` | `/api/v1/track/:trackingNumber` | Public tracking | ❌ |

#### Create Shipment Example
```bash
curl -X POST http://localhost:3001/api/v1/shipments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "SHIP001",
    "origin": "New York",
    "destination": "Los Angeles", 
    "weight": 25.5,
    "pieces": 3,
    "status": "picked-up",
    "company": "FedEx"
  }'
```

#### Add Travel Event Example
```bash
curl -X POST http://localhost:3001/api/v1/shipments/SHIPMENT_ID/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-transit",
    "location": "Chicago Hub",
    "description": "Package scanned at sorting facility",
    "eventType": "in-transit"
  }'
```

#### Public Tracking Example
```bash
curl http://localhost:3001/api/v1/track/SHIP001
```

## 🏢 Multi-Tenant Architecture

### Organization Isolation
- Each organization has isolated data
- Users belong to one organization
- Shipments are scoped to organizations
- Public tracking works across all organizations

### Permission Model
- **Owner**: Full organization control + user management
- **Member**: Full shipment data access (as requested)
- All members can create/update shipments
- Only owners can invite/manage users

### JWT Token Structure
```json
{
  "userId": "user_123",
  "organizationId": "org_456", 
  "organizationSlug": "acme-logistics",
  "role": "owner",
  "email": "admin@acme.com",
  "iat": 1640995200,
  "exp": 1641600000,
  "iss": "trackscargo",
  "aud": "trackscargo-users"
}
```

## 🗄️ Database Schema

### Core Tables
- **Organizations**: Company/tenant data
- **Users**: User accounts with org membership
- **Shipments**: Tracking data scoped to org
- **TravelEvents**: Shipment status updates
- **UserInvitations**: Pending user invites

### Key Relationships
```
Organization (1) -> (N) Users
Organization (1) -> (N) Shipments  
Shipment (1) -> (N) TravelEvents
User (1) -> (N) Shipments (created_by)
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test auth.test.ts
```

### Test Coverage
- **34 comprehensive tests**
- Authentication flows
- Multi-tenant data isolation
- CRUD operations
- Error handling
- JWT validation

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run seed         # Seed database with sample data
npm test             # Run test suite
```

### Database Operations
```bash
# Create migration
npx prisma migrate dev --name "description"

# Reset database
npx prisma migrate reset

# View database
npx prisma studio

# Generate Prisma client
npx prisma generate
```

### Code Structure
```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── repositories/    # Database access layer
├── routes/          # API route definitions
├── middleware/      # Auth, validation, etc.
├── validators/      # Input validation rules
├── types/           # TypeScript interfaces
├── lib/             # Utilities (JWT, password, etc.)
└── index.ts         # Main server file

tests/
├── auth.test.ts     # Authentication tests
├── shipments.test.ts # Shipment API tests
├── services.test.ts  # Service layer tests
└── setup.ts         # Test configuration
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: 100 requests per 15 minutes
- **CORS Protection**: Configurable origins
- **Helmet Security**: Security headers
- **Input Validation**: express-validator
- **SQL Injection Protection**: Prisma ORM

## 🚀 Deployment

### Production Checklist
- [ ] Set strong JWT_SECRET
- [ ] Configure DATABASE_URL
- [ ] Set CORS_ORIGINS
- [ ] Enable SSL/TLS
- [ ] Set up monitoring
- [ ] Configure backups

### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

### Docker Deployment
```bash
# Build image
docker build -t trackscargo-backend .

# Run container  
docker run -p 3001:3001 --env-file .env trackscargo-backend
```

## 📈 Performance

- **Database Indexing**: Optimized queries
- **Connection Pooling**: Prisma connection management
- **Caching Ready**: Redis integration points
- **Pagination**: Large dataset handling
- **Query Optimization**: Efficient data fetching

## 🔮 Roadmap

### Planned Features
- [ ] Google OAuth integration
- [ ] User invitation system
- [ ] Advanced permissions
- [ ] Webhook notifications
- [ ] File upload support
- [ ] Advanced analytics
- [ ] API rate limiting per org
- [ ] Audit logging

### Integration Ready
- [ ] Frontend authentication
- [ ] Mobile app support
- [ ] Third-party logistics APIs
- [ ] Payment processing
- [ ] Email notifications

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Write tests for new features
- Follow TypeScript best practices
- Use conventional commit messages
- Update documentation
- Ensure backward compatibility

## 📞 Support

- **Documentation**: Check this README
- **Issues**: GitHub Issues
- **API Testing**: Use Postman collection (coming soon)
- **Database**: Prisma Studio for visualization

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ using modern technologies**
- Node.js & Express.js
- TypeScript 
- PostgreSQL & Prisma
- JWT Authentication
- Jest Testing
- Docker Ready

🚀 **Ready for production deployment and frontend integration!**
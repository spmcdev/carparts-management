# Car Parts Management System

A comprehensive car parts inventory management system built with React frontend and Node.js backend.

## Features

- **User Management**: Admin, superadmin, and regular user roles
- **Parts Management**: Add, update, and track car parts inventory
- **Sales Management**: Process sales and generate bills
- **Stock Management**: Monitor available and sold stock with detailed reports
- **Audit Logging**: Complete audit trail for all user actions
- **Print Functionality**: Generate printable reports and bills
- **Mobile Responsive**: Works on all devices

## Technology Stack

### Frontend
- **React** 18+ with React Router
- **Bootstrap 5** for responsive UI
- **React Bootstrap** components

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **bcrypt** for password hashing

### DevOps
- **Docker** for containerization
- **Railway** for backend hosting
- **Vercel** for frontend hosting

## Project Structure

```
carparts/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── config/          # API configuration
│   │   └── __tests__/       # Frontend tests
│   ├── build/               # Production build
│   └── package.json
├── migrations/              # Database migration files
├── __tests__/              # Backend tests
├── index.js                # Express server
├── package.json            # Backend dependencies
├── docker-compose.yml      # Docker configuration
├── DEPLOYMENT.md           # Deployment guide
└── README.md              # This file
```

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Docker (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ikapila/carparts-management.git
   cd carparts-management
   ```

2. **Set up Backend**
   ```bash
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Run database migrations
   # Connect to your PostgreSQL and run the SQL files in order:
   # 01-init.sql, 02-users.sql, etc.
   
   # Start backend server
   npm start
   ```

3. **Set up Frontend**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your API URL
   
   # Start frontend development server
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3000

### Using Docker

```bash
# Build and run all services
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.prod.yml up --build
```

## Deployment

This application is ready for deployment on:

- **Backend**: Railway (PostgreSQL + Node.js)
- **Frontend**: Vercel (React static hosting)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Commands

```bash
# Prepare for deployment
./deploy-prep.sh

# Deploy to Railway + Vercel (see DEPLOYMENT.md)
```

## API Documentation

### Authentication Endpoints
- `POST /login` - User login
- `POST /register` - User registration

### Parts Management
- `GET /parts` - Get all parts
- `POST /parts` - Add new part
- `PUT /parts/:id` - Update part
- `DELETE /parts/:id` - Delete part
- `PATCH /parts/:id/sell` - Mark part as sold

### User Management (Admin only)
- `GET /users` - Get all users
- `PATCH /users/:id/role` - Update user role
- `DELETE /users/:id` - Delete user

### Bills & Reports
- `GET /bills` - Get all bills
- `POST /bills` - Create new bill
- `GET /audit-logs` - Get audit logs

## Testing

### Backend Tests
```bash
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Test Coverage
```bash
cd frontend
npm run test -- --coverage
```

## Database Schema

### Core Tables
- **users**: User accounts and roles
- **parts**: Car parts inventory
- **bills**: Sales transactions
- **audit_log**: Complete audit trail

See SQL migration files for detailed schema.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For deployment help, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) - Step-by-step checklist

## Acknowledgments

- React community for excellent documentation
- Railway for simple backend hosting
- Vercel for seamless frontend deployment
- Bootstrap for responsive UI components

## Version History

- **v1.0.0** - Initial release with full CRUD functionality
- **v1.1.0** - Added audit logging and advanced reporting
- **v1.2.0** - Mobile responsive design and print functionality
- **v1.3.0** - Production-ready with Docker and deployment guides

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a FinTech eBPF security monitoring demonstration system with a React frontend and microservices backend built in Go. The system integrates Tetragon eBPF for real-time security monitoring and includes comprehensive testing, deployment, and monitoring capabilities.

**Key Technologies:**
- Frontend: React 18 + TypeScript + Vite + Ant Design
- Backend: Go microservices with Gin framework
- Security: Tetragon eBPF monitoring
- Infrastructure: Kubernetes, Docker, nginx-ingress
- Database: PostgreSQL, Redis

## Development Commands

### Frontend (React + TypeScript)
```bash
cd frontend

# Development
npm run dev                    # Start development server on port 3000
npm run type-check            # TypeScript type checking
npm run lint                  # ESLint checking
npm run lint:fix              # Fix ESLint issues
npm run format               # Format code with Prettier

# Building
npm run build                # Production build (TypeScript + Vite)
npm run preview              # Preview production build
npm run analyze              # Bundle analysis with source-map-explorer

# Testing
npm run test                 # Run Jest tests
npm run test:watch           # Jest in watch mode
npm run test:coverage        # Generate test coverage
npm run test:e2e             # Playwright end-to-end tests

# Docker
npm run docker:build         # Build Docker image
npm run docker:run           # Run Docker container

# Utilities
npm run clean                # Clean node_modules and build artifacts
npm run fresh-install        # Clean install dependencies
```

### Backend (Go Microservices)
```bash
# Build individual services (from their respective directories)
cd backend/trading-api && go build -o trading-api .
cd backend/risk-engine && go build -o risk-engine .
cd backend/payment-gateway && go build -o main .
cd backend/audit-service && go build -o audit-service .
cd backend/tetragon-stream && go build -o tetragon-stream .

# Run services (ports: 30080, 30081, 30082, 30083)
./trading-api > ../../logs/trading-api.log 2>&1 &
./risk-engine > ../../logs/risk-engine.log 2>&1 &
# etc.
```

### System Management Scripts
All scripts are organized in the `scripts/` directory:

```bash
# Quick Start (recommended entry point)
./scripts/deployment/quick_start.sh

# Service Management
./scripts/deployment/start_services.sh     # Start all services
./scripts/deployment/stop_services.sh      # Stop all services
./scripts/management/check_status.sh       # Health check all services
./scripts/management/check_status.sh -v    # Detailed diagnostics

# Testing
./scripts/testing/unit-test/test_all_apis.sh      # Comprehensive API tests
./scripts/testing/unit-test/test_trading_api.sh   # Trading API specific tests

# Monitoring
./scripts/monitoring/monitor_tetragon.sh monitor   # Real-time eBPF monitoring
./scripts/monitoring/monitor_tetragon.sh stats     # Statistics
./scripts/monitoring/monitor_tetragon.sh report    # Generate reports

# Utilities
./scripts/utilities/cleanup.sh safe        # Safe cleanup (recommended)
./scripts/utilities/cleanup.sh deep        # Deep cleanup
./scripts/utilities/cleanup.sh logs        # Clean logs only
./scripts/utilities/backup.sh              # System backup
```

### Kubernetes Deployment
```bash
# Kubernetes deployment
cd k8s
./deploy.sh                   # Deploy to Kubernetes

# Helm deployment
cd k8s/helm
./deploy.sh                   # Deploy with Helm charts

# CI/CD
cd k8s/ci
./build-images.sh            # Build Docker images
```

## Architecture Overview

### System Components
- **Frontend**: React app served by nginx (port 8080 in containers, 3000 in dev)
- **Trading API**: Core trading service (port 30080/8080)
- **Risk Engine**: Risk assessment service (port 30081/8081)
- **Payment Gateway**: Payment processing (port 30082/8082)
- **Audit Service**: Audit logging with WebSocket support (port 30083/8083)
- **Tetragon Stream**: eBPF security monitoring service
- **PostgreSQL**: Primary database (port 5432)
- **Redis**: Caching and session storage (port 6379)

### Request Flow
```
User → Nginx Ingress → Frontend (nginx) → Backend APIs
                    → WebSocket connections for real-time monitoring
```

### Key Features
1. **Real-time Security Monitoring**: Tetragon eBPF integration with WebSocket streaming
2. **Comprehensive API Testing**: Automated test suites with JSON reporting
3. **Microservices Architecture**: Independent Go services with health checks
4. **Modern Frontend**: React 18 with TypeScript, Ant Design, and real-time updates
5. **Container-ready**: Docker and Kubernetes manifests included
6. **Security Testing**: Built-in security simulation and monitoring tools

## File Structure Key Areas

```
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page-level components (Dashboard, Trading, Security, etc.)
│   │   ├── contexts/        # React contexts (Theme, User, Notification)
│   │   ├── services/        # API service layer
│   │   └── types/           # TypeScript type definitions
│   ├── package.json         # Frontend dependencies and scripts
│   └── vite.config.ts       # Vite configuration with API proxying
├── backend/                 # Go microservices
│   ├── trading-api/         # Trading service with Tetragon integration
│   ├── risk-engine/         # Risk assessment service
│   ├── payment-gateway/     # Payment processing service
│   ├── audit-service/       # Audit and WebSocket service
│   └── tetragon-stream/     # eBPF monitoring service
├── scripts/                 # Management scripts (organized by function)
│   ├── deployment/          # Service deployment scripts
│   ├── management/          # System management and health checks
│   ├── testing/             # API testing suites
│   ├── monitoring/          # Tetragon and system monitoring
│   └── utilities/           # Cleanup and backup tools
├── k8s/                     # Kubernetes deployment manifests
│   ├── manifests/           # Raw Kubernetes YAML files
│   ├── helm/                # Helm charts
│   └── kustomize/           # Kustomize overlays
└── logs/                    # Application logs
```

## Important Development Notes

### Frontend Development
- Uses Vite for fast development and building
- Configured with API proxying to backend services during development
- TypeScript strict mode enabled - always run `npm run type-check` before commits
- Ant Design components used throughout - follow existing patterns
- Real-time features implemented via WebSocket connections
- Security monitoring dashboard in `/security` route

### Backend Development  
- All services use Gin framework with similar structure
- Health check endpoints at `/health` for each service
- Prometheus metrics integration on port 2112
- Configuration via YAML files in each service directory
- Tetragon integration primarily in trading-api service
- WebSocket implementation in audit-service

### Testing Strategy
- Frontend: Jest + React Testing Library + Playwright for E2E
- Backend: Comprehensive API testing via shell scripts
- Test reports generated in `scripts/testing/unit-test/reports/`
- Always run API tests after changes: `./scripts/testing/unit-test/test_all_apis.sh`

### Deployment Considerations
- Services designed for Kubernetes deployment
- Frontend served via nginx with API routing
- All services have Docker configurations
- Use nginx-ingress for external access
- PostgreSQL and Redis required for full functionality

### Security & Monitoring
- Tetragon eBPF provides real-time security monitoring
- Security events accessible via API and WebSocket
- Alert system with configurable severity levels
- Use `tetra` CLI tool for command-line monitoring
- Security testing simulation tools included

## Common Workflows

### Starting Development
1. Run `./scripts/deployment/quick_start.sh` to start all services
2. Check status with `./scripts/management/check_status.sh`
3. Access frontend at http://localhost:3000
4. Monitor security events at http://localhost:3000/security

### Making Changes
1. For frontend: Edit in `frontend/src/`, run `npm run type-check` before committing
2. For backend: Rebuild service and restart via scripts
3. Run tests: `./scripts/testing/unit-test/test_all_apis.sh`
4. Check system status before and after changes

### Debugging Issues
1. Check service logs in `logs/` directory
2. Run `./scripts/management/check_status.sh -v` for detailed diagnostics
3. Use `./scripts/monitoring/monitor_tetragon.sh stats` for security monitoring
4. API endpoints have `/health` for individual service status

### Deployment
1. Local: Use deployment scripts in `scripts/deployment/`
2. Kubernetes: Use manifests in `k8s/` directory
3. Always test with API test suite after deployment
4. Monitor Tetragon events for security verification
# Aegis Discord Bot - DevOps & Deployment Checklist

## Development Environment Setup

### Local Development Requirements
- ✅ **Node.js**: Version 20+ (LTS recommended)
- ✅ **Docker**: Version 24+ with Docker Compose
- ✅ **PostgreSQL**: Version 15+ (via Docker)
- ✅ **Redis**: Version 7+ (via Docker)
- ✅ **Git**: Version 2.40+

### Quick Start Guide
```bash
# Clone repository
git clone https://github.com/your-org/aegis-bot.git
cd aegis-bot

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Discord bot token and other secrets

# Start development services
docker-compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# In another terminal, start the bot
npm run bot:dev
```

### Environment Variables
```bash
# .env.example
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/aegis_dev
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
WEBHOOK_SECRET=your_webhook_secret_here

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# External Services
SENTRY_DSN=your_sentry_dsn_here
```

---

## Testing Strategy

### Test Categories
1. **Unit Tests**: Individual functions and methods
2. **Integration Tests**: Service interactions and database operations
3. **End-to-End Tests**: Complete user workflows
4. **Load Tests**: Performance under stress
5. **Security Tests**: Vulnerability assessments

### Test Configuration
```json
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

### Test Commands
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- user.service.test.ts

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load
```

### Example Test Structure
```typescript
// tests/services/moderation.service.test.ts
import { ModerationService } from '../../src/services/moderation.service';
import { TestDatabase } from '../helpers/test-database';
import { createMockGuild, createMockUser } from '../helpers/factories';

describe('ModerationService', () => {
  let service: ModerationService;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    service = new ModerationService(testDb.connection);
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.clearData();
  });

  describe('createWarning', () => {
    it('should create a warning case successfully', async () => {
      // Arrange
      const guild = createMockGuild();
      const target = createMockUser();
      const moderator = createMockUser();

      // Act
      const warning = await service.createWarning({
        guildId: guild.id,
        targetUser: target.id,
        moderator: moderator.id,
        reason: 'Test warning'
      });

      // Assert
      expect(warning).toBeDefined();
      expect(warning.actionType).toBe('warn');
      expect(warning.status).toBe('active');
    });
  });
});
```

---

## Linting & Code Quality

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "security"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "security/detect-object-injection": "error",
    "security/detect-sql-injection": "error",
    "no-console": "warn",
    "prefer-const": "error"
  },
  "overrides": [
    {
      "files": ["*.test.ts"],
      "rules": {
        "@typescript-eslint/explicit-function-return-type": "off"
      }
    }
  ]
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Husky Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:unit"
    }
  },
  "lint-staged": {
    "*.{ts,js}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{md,json}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

---

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: aegis_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
          
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/aegis_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/aegis_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: typescript

  build:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add actual deployment commands here

  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add actual deployment commands here
```

---

## Docker Configuration

### Multi-stage Dockerfile
```dockerfile
# Dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aegis -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=aegis:nodejs /app/dist ./dist
COPY --from=builder --chown=aegis:nodejs /app/node_modules ./node_modules
COPY --chown=aegis:nodejs package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

# Switch to non-root user
USER aegis

# Expose port
EXPOSE 3000

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  bot:
    build: .
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/aegis_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: aegis_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

---

## Kubernetes Deployment

### Production Deployment Manifests
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aegis-bot

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aegis-config
  namespace: aegis-bot
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aegis-secrets
  namespace: aegis-bot
type: Opaque
data:
  discord-token: <base64-encoded-token>
  database-url: <base64-encoded-url>
  jwt-secret: <base64-encoded-secret>

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aegis-bot
  namespace: aegis-bot
  labels:
    app: aegis-bot
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aegis-bot
  template:
    metadata:
      labels:
        app: aegis-bot
    spec:
      containers:
      - name: aegis-bot
        image: ghcr.io/your-org/aegis-bot:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: aegis-config
              key: NODE_ENV
        - name: DISCORD_TOKEN
          valueFrom:
            secretKeyRef:
              name: aegis-secrets
              key: discord-token
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aegis-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: aegis-bot-service
  namespace: aegis-bot
spec:
  selector:
    app: aegis-bot
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aegis-bot-hpa
  namespace: aegis-bot
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aegis-bot
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Deployment Strategies

### Blue-Green Deployment
```bash
#!/bin/bash
# deploy-blue-green.sh

set -e

NAMESPACE="aegis-bot"
APP_NAME="aegis-bot"
NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Starting blue-green deployment for version $NEW_VERSION"

# Determine current active deployment
CURRENT_COLOR=$(kubectl get service $APP_NAME-service -n $NAMESPACE -o jsonpath='{.spec.selector.version}')
if [ "$CURRENT_COLOR" = "blue" ]; then
  NEW_COLOR="green"
else
  NEW_COLOR="blue"
fi

echo "Current active: $CURRENT_COLOR, deploying to: $NEW_COLOR"

# Update the inactive deployment
kubectl set image deployment/$APP_NAME-$NEW_COLOR -n $NAMESPACE aegis-bot=ghcr.io/your-org/aegis-bot:$NEW_VERSION

# Wait for rollout to complete
kubectl rollout status deployment/$APP_NAME-$NEW_COLOR -n $NAMESPACE

# Run health checks
echo "Running health checks..."
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME,version=$NEW_COLOR -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n $NAMESPACE $POD_NAME -- curl -f http://localhost:3000/health

# Switch traffic to new deployment
kubectl patch service $APP_NAME-service -n $NAMESPACE -p '{"spec":{"selector":{"version":"'$NEW_COLOR'"}}}'

echo "Deployment complete. Traffic switched to $NEW_COLOR"
echo "Monitor the deployment and run rollback if needed: ./rollback.sh $CURRENT_COLOR"
```

### Canary Deployment
```yaml
# k8s/canary-deployment.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: aegis-bot-rollout
  namespace: aegis-bot
spec:
  replicas: 5
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 2m}
      - setWeight: 40
      - pause: {duration: 2m}
      - setWeight: 60
      - pause: {duration: 2m}
      - setWeight: 80
      - pause: {duration: 2m}
      canaryService: aegis-bot-canary
      stableService: aegis-bot-stable
      trafficRouting:
        nginx:
          stableIngress: aegis-bot-stable
          annotationPrefix: nginx.ingress.kubernetes.io
          additionalIngressAnnotations:
            canary-by-header: x-canary
  selector:
    matchLabels:
      app: aegis-bot
  template:
    metadata:
      labels:
        app: aegis-bot
    spec:
      containers:
      - name: aegis-bot
        image: ghcr.io/your-org/aegis-bot:latest
```

---

## Monitoring & Observability

### Health Check Endpoints
```typescript
// src/health/health.controller.ts
import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import { RedisService } from '../services/redis.service';

export class HealthController {
  constructor(
    private db: DatabaseService,
    private redis: RedisService
  ) {}

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check database connection
      await this.db.raw('SELECT 1');
      
      // Check Redis connection
      await this.redis.ping();
      
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version,
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async readinessCheck(req: Request, res: Response): Promise<void> {
    // Check if bot is connected to Discord
    if (!this.botService.isReady()) {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Bot not connected to Discord'
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  }
}
```

### Prometheus Metrics
```typescript
// src/metrics/metrics.service.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

export class MetricsService {
  private commandCounter = new Counter({
    name: 'discord_commands_total',
    help: 'Total number of Discord commands executed',
    labelNames: ['command', 'guild', 'success']
  });

  private commandDuration = new Histogram({
    name: 'discord_command_duration_seconds',
    help: 'Duration of Discord command execution',
    labelNames: ['command'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  private activeGuilds = new Gauge({
    name: 'discord_active_guilds',
    help: 'Number of active Discord guilds'
  });

  recordCommand(command: string, guildId: string, success: boolean, duration: number): void {
    this.commandCounter.inc({ command, guild: guildId, success: success.toString() });
    this.commandDuration.observe({ command }, duration);
  }

  updateGuildCount(count: number): void {
    this.activeGuilds.set(count);
  }

  getMetrics(): string {
    return register.metrics();
  }
}
```

---

## Backup & Recovery

### Database Backup Strategy
```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DATABASE_URL="$DATABASE_URL"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/aegis_backup_$DATE.sql.gz

# Upload to S3 (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
  aws s3 cp $BACKUP_DIR/aegis_backup_$DATE.sql.gz s3://$AWS_S3_BUCKET/backups/
fi

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "aegis_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: aegis_backup_$DATE.sql.gz"
```

### Recovery Procedures
```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

echo "WARNING: This will replace the current database!"
read -p "Are you sure? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Stop application
  kubectl scale deployment aegis-bot --replicas=0 -n aegis-bot
  
  # Restore database
  gunzip -c $BACKUP_FILE | psql $DATABASE_URL
  
  # Start application
  kubectl scale deployment aegis-bot --replicas=3 -n aegis-bot
  
  echo "Database restored successfully"
else
  echo "Restore cancelled"
fi
```

---

## Rollback Procedures

### Automated Rollback Script
```bash
#!/bin/bash
# rollback.sh

NAMESPACE="aegis-bot"
DEPLOYMENT="aegis-bot"

echo "Rolling back deployment..."

# Rollback to previous version
kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE

# Wait for rollback to complete
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

# Verify rollback
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n $NAMESPACE $POD_NAME -- curl -f http://localhost:3000/health

echo "Rollback completed successfully"
```

This comprehensive DevOps and deployment guide provides everything needed to set up, test, deploy, and maintain the Aegis Discord bot in a production environment.
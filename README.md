# 🚀 API Gateway Service

## Overview

The API Gateway Service acts as the central entry point for all client requests in the HandFit application. It provides request routing, cookie management, and client analytics collection.

## 🏗️ Architecture

- **Framework**: NestJS with TypeScript
- **Port**: 5001
- **Pattern**: Gateway/Proxy Pattern

## 🔧 Core Features

### 1. Request Proxying

- Routes requests to appropriate microservices
- Handles CORS configuration
- Supports all HTTP methods (GET, POST, PUT, DELETE, PATCH)

### 2. Cookie Management

- **Session Management**: Secure HTTP-only cookies
- **Client Data Collection**: Browser, device, and network information
- **Analytics**: User behavior tracking and metrics

### 3. Client Analytics

Collects comprehensive client information:

- **Browser**: Type, version, platform detection
- **Device**: Mobile/desktop classification
- **Network**: Connection type, security status
- **Location**: Timezone, language preferences
- **Performance**: Screen resolution, viewport size

## 📡 API Endpoints

### Proxy Routes

```
ALL /* - Proxies requests to appropriate services
```

### Cookie Management

```
POST /cookie/set - Set client cookies and session
POST /cookie/clear - Clear all cookies
POST /cookie/client-data - Collect client analytics
```

## 🔒 Security Features

- CORS enabled for localhost:3000
- HTTP-only session cookies
- Request validation and sanitization
- Bot detection and filtering

## 🚀 Quick Start

### Environment Variables

```env
NODE_ENV=development
AUTH_SERVICE_URL=http://auth-service:80
TRAINING_SERVICE_URL=http://training-service:3000
USERS_SERVICE_URL=http://users-service:3004
```

### Run Service

```bash
cd deploy
docker-compose up --build
```

## 🔄 Service Integration

- **Auth Service**: User authentication and authorization
- **Training Service**: Workout and training data
- **Users Service**: User profile management
- **Frontend**: React application on port 3000

## 📊 Monitoring

- Request logging with unique IDs
- Client metrics collection
- Error handling and reporting
- Performance tracking

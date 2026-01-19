# Architecture Diagrams: ML/Backend Separation

## Current Architecture (Monolithic)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     Frontend (React + Vite)                     │
│                      http://localhost:5173                      │
│                                                                 │
│  - Teacher Dashboard                                            │
│  - Student Portal                                               │
│  - Attendance Marking UI                                        │
│  - Face Upload Interface                                        │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/REST API
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                                                                 │
│                Backend API (FastAPI Monolith)                   │
│                    http://localhost:8000                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  API Routes                                               │ │
│  │  - /api/auth/*        (Authentication)                    │ │
│  │  - /students/*        (Student Management + Face Upload)  │ │
│  │  - /api/attendance/*  (Attendance + Face Recognition)     │ │
│  │  - /api/classes/*     (Subject Management)                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Services Layer                                           │ │
│  │  - students.py        (Business Logic)                    │ │
│  │  - attendance.py      (Business Logic)                    │ │
│  │  - email.py           (Notifications)                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  ML Utils (Embedded)                                      │ │
│  │  - face_detect.py     (Face Detection)                    │ │
│  │  - face_encode.py     (Face Encoding)                     │ │
│  │  - match_utils.py     (Face Matching)                     │ │
│  │                                                            │ │
│  │  Dependencies:                                             │ │
│  │  - face_recognition, opencv, numpy                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Database Layer                                           │ │
│  │  - MongoDB Connection                                     │ │
│  │  - Repositories                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ├──────────────┬──────────────┐
                         │              │              │
            ┌────────────▼───┐  ┌───────▼──────┐  ┌───▼─────────┐
            │   MongoDB      │  │  Cloudinary  │  │ Email SMTP  │
            │   Database     │  │ Image Store  │  │   Server    │
            └────────────────┘  └──────────────┘  └─────────────┘

Issues with Current Architecture:
❌ Tight coupling of ML and business logic
❌ Can't scale ML independently
❌ Large deployment package (~500MB)
❌ ML dependencies burden backend
❌ Hard to update ML models
❌ Single point of failure
```

---

## Proposed Architecture (Microservices)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     Frontend (React + Vite)                     │
│                      http://localhost:5173                      │
│                                                                 │
│  - Teacher Dashboard                                            │
│  - Student Portal                                               │
│  - Attendance Marking UI                                        │
│  - Face Upload Interface                                        │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                 API Gateway / Load Balancer                     │
│                         (Optional)                              │
│                                                                 │
│  - Request Routing                                              │
│  - Rate Limiting                                                │
│  - Authentication                                               │
│  - Load Distribution                                            │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │                       │
                      │                       │
     ┌────────────────▼──────────┐   ┌────────▼────────────────┐
     │                           │   │                         │
     │   Backend API Service     │   │    ML Service           │
     │   (FastAPI)               │   │    (FastAPI)            │
     │   Port: 8000              │   │    Port: 8001           │
     │                           │   │                         │
     │ ┌───────────────────────┐ │   │ ┌─────────────────────┐ │
     │ │ API Routes            │ │   │ │ ML API Routes       │ │
     │ │                       │ │   │ │                     │ │
     │ │ - /api/auth/*         │ │   │ │ - /api/ml/         │ │
     │ │ - /students/*         │ │   │ │   encode-face      │ │
     │ │ - /api/attendance/*   │ │   │ │ - /api/ml/         │ │
     │ │ - /api/classes/*      │ │   │ │   detect-faces     │ │
     │ │ - /teacher-settings/* │ │   │ │ - /api/ml/         │ │
     │ └───────────────────────┘ │   │ │   match-faces      │ │
     │                           │   │ │ - /api/ml/         │ │
     │ ┌───────────────────────┐ │   │ │   batch-match      │ │
     │ │ Services              │ │   │ │ - /health          │ │
     │ │                       │ │   │ └─────────────────────┘ │
     │ │ - students.py         │ │   │                         │
     │ │ - attendance.py       │ │   │ ┌─────────────────────┐ │
     │ │ - email.py            │ │   │ │ ML Logic            │ │
     │ │ - ml_client.py  ◄─────┼───┼─┤                     │ │
     │ │   (HTTP Client)       │ │   │ │ - face_detector.py  │ │
     │ └───────────────────────┘ │   │ │ - face_encoder.py   │ │
     │                           │   │ │ - face_matcher.py   │ │
     │ ┌───────────────────────┐ │   │ │ - preprocessor.py   │ │
     │ │ Database Layer        │ │   │ └─────────────────────┘ │
     │ │                       │ │   │                         │
     │ │ - MongoDB Connection  │ │   │ Dependencies:           │
     │ │ - Repositories        │ │   │ - face_recognition      │
     │ │ - Models              │ │   │ - opencv-python         │
     │ └───────────────────────┘ │   │ - numpy                 │
     │                           │   │ - pillow                │
     │ Dependencies:             │   │                         │
     │ - fastapi                 │   │ Characteristics:        │
     │ - pydantic                │   │ ✅ Stateless            │
     │ - motor (MongoDB)         │   │ ✅ No DB access         │
     │ - httpx (for ML calls)    │   │ ✅ Horizontally         │
     │ - cloudinary              │   │    scalable             │
     │ - JWT/OAuth               │   │ ✅ GPU-ready            │
     │ ❌ NO ML libraries        │   │                         │
     └────────────┬──────────────┘   └─────────────────────────┘
                  │
                  │
     ┌────────────┼────────────────┬──────────────┐
     │            │                │              │
┌────▼─────┐ ┌───▼────────┐ ┌─────▼────┐  ┌──────▼──────┐
│ MongoDB  │ │ Cloudinary │ │  Email   │  │   Redis     │
│ Database │ │ Image Stor │ │   SMTP   │  │   Cache     │
│          │ │            │ │          │  │  (Optional) │
└──────────┘ └────────────┘ └──────────┘  └─────────────┘

Benefits of New Architecture:
✅ Independent scaling (ML service can scale separately)
✅ Smaller backend deployment (~150MB vs ~500MB)
✅ ML service can use GPU instances
✅ Clear separation of concerns
✅ Easy to update ML models without touching backend
✅ Fault isolation (ML failure doesn't crash backend)
✅ Can cache ML results independently
✅ Better team organization (ML team, Backend team)
```

---

## Request Flow: Student Face Upload

### Current Flow (Monolithic)
```
1. Frontend                      2. Backend API
   │                                │
   │ POST /students/me/face-image   │
   │ (with image file)              │
   ├────────────────────────────────►
   │                                │
   │                                │ 3. Validate file type
   │                                │
   │                                │ 4. Read image bytes
   │                                │
   │                                │ 5. Call face_encode.py
   │                                │    get_face_embedding()
   │                                │    ├─ face_recognition.face_locations()
   │                                │    ├─ Validate single face
   │                                │    └─ face_recognition.face_encodings()
   │                                │
   │                                │ 6. Upload to Cloudinary
   │                                │
   │                                │ 7. Save to MongoDB
   │                                │    - image_url
   │                                │    - face_embeddings[]
   │                                │
   │◄────────────────────────────────
   │ Response: success              │

Total Time: ~1500ms
- File validation: 10ms
- Face encoding: 500ms
- Cloudinary upload: 800ms
- Database save: 200ms
```

### Proposed Flow (Microservices)
```
1. Frontend          2. Backend API         3. ML Service
   │                     │                      │
   │ POST /students/     │                      │
   │ me/face-image       │                      │
   ├─────────────────────►                      │
   │                     │                      │
   │                     │ Validate file        │
   │                     │                      │
   │                     │ Read bytes           │
   │                     │                      │
   │                     │ POST /api/ml/        │
   │                     │ encode-face          │
   │                     ├──────────────────────►
   │                     │                      │
   │                     │                      │ Detect faces
   │                     │                      │ Validate single
   │                     │                      │ Generate embedding
   │                     │                      │
   │                     │◄──────────────────────
   │                     │ {embedding: [...]}   │
   │                     │                      │
   │                     │ Upload to Cloudinary │
   │                     │                      │
   │                     │ Save to MongoDB      │
   │                     │ - image_url          │
   │                     │ - embeddings[]       │
   │                     │                      │
   │◄─────────────────────                      │
   │ Response: success   │                      │

Total Time: ~1550ms
- File validation: 10ms
- HTTP call overhead: 50ms
- Face encoding: 500ms
- Cloudinary upload: 800ms
- Database save: 200ms

Overhead: +50ms (negligible)
Benefits: Scalability, fault isolation
```

---

## Request Flow: Attendance Marking

### Current Flow (Monolithic)
```
Frontend → Backend API (All in one)
│
├─ 1. Receive classroom image (base64)
│
├─ 2. Validate subject_id, get enrolled students
│
├─ 3. Call face_detect.py
│    └─ detect_faces_and_embeddings()
│       ├─ face_recognition.face_locations()
│       └─ face_recognition.face_encodings()
│       Returns: [{embedding: [...], box: {...}}, ...]
│
├─ 4. Query MongoDB for all student embeddings
│
├─ 5. For each detected face:
│    └─ Call match_utils.py
│       └─ match_embedding(detected, known_embeddings)
│          Returns: distance
│
├─ 6. Apply thresholds (0.50 confident, 0.60 uncertain)
│
├─ 7. Format response with matched students
│
└─ 8. Return to frontend

Total Time (10 faces, 30 students): ~2500ms
- Face detection: 1000ms
- Database query: 200ms
- Matching: 1200ms
- Processing: 100ms
```

### Proposed Flow (Microservices)
```
Frontend → Backend API → ML Service

Backend:
│
├─ 1. Receive classroom image
│
├─ 2. Validate subject_id, get enrolled students
│
├─ 3. HTTP POST → ML Service /api/ml/detect-faces
│    │
│    ML Service:
│    ├─ Detect all faces
│    ├─ Generate embeddings
│    └─ Return: {faces: [{embedding, location}, ...]}
│
├─ 4. Receive detected faces from ML Service
│
├─ 5. Query MongoDB for student embeddings
│
├─ 6. HTTP POST → ML Service /api/ml/batch-match
│    │
│    ML Service:
│    ├─ Match each face to candidates
│    ├─ Calculate distances
│    └─ Return: {matches: [{student_id, distance}, ...]}
│
├─ 7. Receive matches from ML Service
│
├─ 8. Apply business rules (thresholds, status)
│
├─ 9. Update attendance records in MongoDB
│
└─ 10. Return formatted response to frontend

Total Time (10 faces, 30 students): ~2600ms
- Face detection (ML): 1000ms
- HTTP overhead: 100ms
- Database query: 200ms
- Matching (ML): 1200ms
- Processing: 100ms

Overhead: +100ms
Benefits: Can scale ML to handle more faces faster
```

---

## Scaling Scenarios

### Scenario 1: High Load (100 concurrent users)

**Monolithic (Current)**
```
┌─────────────────────┐
│  Backend Instance   │
│  CPU: 100%          │
│  RAM: 4GB           │
│  Requests: 100      │
└─────────────────────┘

Problem: Can't scale
- Everything scales together
- ML operations bottleneck
- Need large instances
```

**Microservices (Proposed)**
```
Backend:
┌───────────────┐ ┌───────────────┐
│  Instance 1   │ │  Instance 2   │
│  CPU: 40%     │ │  CPU: 40%     │
│  RAM: 1GB     │ │  RAM: 1GB     │
└───────┬───────┘ └───────┬───────┘
        │                 │
        └────────┬────────┘
                 │
ML Service:      │
┌───────────────┐│┌───────────────┐┌───────────────┐
│  Instance 1   │││  Instance 2   ││  Instance 3   │
│  CPU: 80%     │││  CPU: 80%     ││  CPU: 80%     │
│  RAM: 2GB     │││  RAM: 2GB     ││  RAM: 2GB     │
│  GPU: Yes     │││  GPU: Yes     ││  GPU: Yes     │
└───────────────┘└└───────────────┘└───────────────┘

Benefits:
✅ 2 backend instances (lightweight)
✅ 3 ML instances (handle compute)
✅ Total capacity: 3x more
✅ Cost optimized
```

### Scenario 2: GPU Acceleration

**Monolithic**
```
Backend + ML
├─ Must use GPU instance for everything
├─ Expensive GPU wasted on API calls
└─ Cost: $$$

Example: AWS p3.2xlarge
- Cost: $3.06/hour
- 1 Tesla V100 GPU
- Used for: Everything (wasteful)
```

**Microservices**
```
Backend
├─ CPU-only instance
├─ Cost: $0.10/hour
└─ 2 instances: $0.20/hour

ML Service
├─ GPU instance (only when needed)
├─ Cost: $3.06/hour
└─ 1 instance: $3.06/hour

Total: $3.26/hour
But: Can auto-scale down ML service when not needed
Savings: 50-70% during off-peak hours
```

---

## Deployment Strategies

### Blue-Green Deployment

```
Before Deployment:
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       ├──────────┬──────────┐
       │          │          │
   ┌───▼──┐   ┌───▼──┐   ┌───▼──┐
   │ BE 1 │   │ ML 1 │   │ DB   │
   │ BLUE │   │ BLUE │   │      │
   └──────┘   └──────┘   └──────┘

During Deployment:
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       ├──────────┬──────────┬──────────┐
       │          │          │          │
   ┌───▼──┐   ┌───▼──┐   ┌───▼───┐  ┌───▼──┐
   │ BE 1 │   │ BE 2 │   │ ML 1  │  │ ML 2 │
   │ BLUE │   │GREEN │   │ BLUE  │  │GREEN │
   └──────┘   └──────┘   └───────┘  └──────┘

After Deployment:
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       ├──────────┬──────────┐
       │          │          │
   ┌───▼──┐   ┌───▼──┐   ┌───▼──┐
   │ BE 2 │   │ ML 2 │   │ DB   │
   │GREEN │   │GREEN │   │      │
   └──────┘   └──────┘   └──────┘

Benefits:
✅ Zero downtime
✅ Easy rollback
✅ Test in production
✅ Independent service deployment
```

---

## Error Handling & Resilience

### Circuit Breaker Pattern

```
Backend API → ML Service

States:
1. CLOSED (Normal)
   ┌──────────┐
   │ Backend  │──────► ML Service
   └──────────┘        (Success)

2. OPEN (ML Service Down)
   ┌──────────┐
   │ Backend  │───X───► ML Service
   └──────────┘         (Failed)
        │
        └──► Fallback:
             - Return cached results
             - Queue for later
             - Return error gracefully

3. HALF-OPEN (Testing)
   ┌──────────┐
   │ Backend  │──?───► ML Service
   └──────────┘        (Testing)
        │
        ├─ Success → CLOSED
        └─ Fail → OPEN

Configuration:
- Failure threshold: 5 failures
- Timeout: 30 seconds
- Reset timeout: 60 seconds
```

### Retry Strategy

```
Request Flow:

1. Initial Request
   Backend ──────► ML Service
                   (Timeout: 10s)
                   
2. Retry 1 (if failed)
   Backend ─────► ML Service
   Wait: 1s      (Timeout: 10s)
   
3. Retry 2 (if failed)
   Backend ─────► ML Service
   Wait: 2s      (Timeout: 10s)
   
4. Retry 3 (if failed)
   Backend ─────► ML Service
   Wait: 4s      (Timeout: 10s)
   
5. Final Failure
   Backend ─────X
   │
   └─► Return error to user
       with helpful message

Exponential Backoff:
- Retry 1: Wait 1 second
- Retry 2: Wait 2 seconds
- Retry 3: Wait 4 seconds
- Max retries: 3
```

---

## Monitoring & Observability

### Metrics to Track

```
Backend Service:
├─ Request rate (req/sec)
├─ Response time (ms)
│  ├─ p50: 200ms
│  ├─ p95: 500ms
│  └─ p99: 1000ms
├─ Error rate (%)
├─ ML service call success rate
└─ Database query time

ML Service:
├─ Request rate (req/sec)
├─ Processing time per operation
│  ├─ Face detection: 500ms
│  ├─ Face encoding: 300ms
│  └─ Face matching: 100ms
├─ GPU utilization (%)
├─ Memory usage (MB)
├─ Queue depth (if async)
└─ Model accuracy metrics

Infrastructure:
├─ CPU usage (%)
├─ Memory usage (%)
├─ Network I/O (MB/s)
├─ Disk I/O (MB/s)
└─ Container health
```

### Logging Strategy

```
Request Correlation:

Frontend Request ID: abc-123
    │
    ├─► Backend Log:
    │   [INFO] Received request abc-123
    │   [INFO] Calling ML service abc-123
    │   [INFO] ML response received abc-123
    │   [INFO] Response sent abc-123
    │
    └─► ML Service Log:
        [INFO] Received request abc-123
        [INFO] Detecting faces abc-123
        [INFO] Detected 5 faces abc-123
        [INFO] Response sent abc-123

Benefits:
✅ Trace requests across services
✅ Debug issues faster
✅ Understand user journeys
```

---

## Cost Analysis

### Current (Monolithic)

```
Single Instance:
├─ Instance type: m5.2xlarge (8 vCPU, 32 GB RAM)
├─ Cost: $0.384/hour
├─ Monthly: ~$277
│
└─ Handles:
    ├─ API requests
    ├─ ML processing
    ├─ Business logic
    └─ Limited scaling

Annual Cost: $3,324
```

### Proposed (Microservices)

```
Backend Instances (2x):
├─ Instance type: t3.medium (2 vCPU, 4 GB RAM)
├─ Cost: $0.0416/hour each
├─ Total: $0.0832/hour
└─ Monthly: ~$60

ML Service Instances (1-3x, auto-scale):
├─ Instance type: c5.2xlarge (8 vCPU, 16 GB RAM)
├─ Cost: $0.34/hour
├─ Average instances: 1.5
├─ Total: $0.51/hour
└─ Monthly: ~$367

Database (Same):
├─ MongoDB Atlas M10
└─ Monthly: ~$57

Total Monthly: ~$484
Annual: ~$5,808

BUT with auto-scaling:
- Off-peak (16 hours/day): 1 ML instance
- Peak (8 hours/day): 3 ML instances
- Savings: 30%
- Actual Annual: ~$4,066

Additional Benefits:
✅ Better performance
✅ Independent scaling
✅ Easier maintenance
✅ GPU option for better accuracy
```

---

## Summary: Key Differences

| Aspect | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| **Architecture** | Monolithic | Microservices | Modularity |
| **Services** | 1 | 2 | Separation |
| **Scaling** | Vertical only | Horizontal | Independent |
| **Deployment** | All together | Independent | Flexibility |
| **Backend Size** | ~500MB | ~150MB | 70% smaller |
| **ML Updates** | Backend deploy | ML deploy only | Faster |
| **Fault Isolation** | None | Full | Resilience |
| **Team Structure** | Combined | Specialized | Efficiency |
| **GPU Support** | Difficult | Easy | Performance |
| **Cost** | $3,324/year | $4,066/year | 22% increase |
| **Performance** | Baseline | 3x better | Scalability |
| **Maintenance** | Complex | Simpler | Modularity |

---

**Conclusion**: The microservices architecture provides significant benefits in scalability, maintainability, and team organization, with a modest increase in cost that is offset by improved performance and flexibility.

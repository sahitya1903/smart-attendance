# 🚀 Quick Start Guide: ML/Backend Separation

> **TL;DR**: This guide gives you a quick overview of how to implement the ML/Backend separation. For full details, see [ML_BACKEND_SEPARATION_PLAN.md](./ML_BACKEND_SEPARATION_PLAN.md).

---

## 📖 What Are We Doing?

**Current State**: Everything runs in one FastAPI app 
- Backend API + ML logic = Monolith
- Hard to scale, hard to maintain
- ML dependencies bloat the backend

**Target State**: Two separate services
- Backend API (Port 8000) - Business logic, database, auth
- ML Service (Port 8001) - Face recognition, detection, matching
- They talk via HTTP REST API

---

## 🎯 Quick Implementation Checklist

### Step 1: Create ML Service (1-2 days)
```bash
# Create new service
mkdir ml-service
cd ml-service

# Copy ML logic
cp ../backend/app/utils/face_*.py app/ml/
cp ../backend/app/utils/match_utils.py app/ml/

# Create API endpoints
# - POST /api/ml/encode-face
# - POST /api/ml/detect-faces  
# - POST /api/ml/match-faces
# - GET /health
```

**Key Files to Create:**
- `ml-service/app/main.py` - FastAPI app
- `ml-service/app/api/routes/face_recognition.py` - ML endpoints
- `ml-service/app/ml/face_detector.py` - Detection logic
- `ml-service/app/ml/face_encoder.py` - Encoding logic
- `ml-service/app/ml/face_matcher.py` - Matching logic
- `ml-service/requirements.txt` - Only ML dependencies
- `ml-service/Dockerfile` - Container config

### Step 2: Update Backend to Call ML Service (1-2 days)
```bash
cd backend

# Create ML client
touch app/services/ml_client.py
```

**Key Changes:**
```python
# OLD: backend/app/api/routes/students.py
from app.utils.face_encode import get_face_embedding
embedding = get_face_embedding(image_bytes)

# NEW: backend/app/api/routes/students.py
from app.services.ml_client import MLClient
ml_client = MLClient()
result = await ml_client.encode_face(image_bytes)
embedding = result["embedding"]
```

**Update These Files:**
- `backend/app/services/ml_client.py` - HTTP client for ML service
- `backend/app/api/routes/students.py` - Use ML client
- `backend/app/api/routes/attendance.py` - Use ML client
- `backend/requirements.txt` - Remove ML dependencies

### Step 3: Docker Compose Setup (30 mins)
```yaml
# docker-compose.yml
services:
  ml-service:
    build: ./ml-service
    ports: ["8001:8001"]
  
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      ML_SERVICE_URL: http://ml-service:8001
```

### Step 4: Test Everything (1 day)
```bash
# Start services
docker-compose up

# Test ML service directly
curl -X POST http://localhost:8001/health

# Test via backend
curl -X POST http://localhost:8000/students/me/face-image

# Test attendance marking
curl -X POST http://localhost:8000/api/attendance/mark
```

---

## 🔌 API Examples

### Example 1: Encode Face
```bash
# Call ML service directly
curl -X POST http://localhost:8001/api/ml/encode-face \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "base64_string_here",
    "validate_single": true
  }'

# Response
{
  "success": true,
  "embedding": [0.123, -0.456, ...],
  "face_location": {"top": 100, "right": 300, "bottom": 400, "left": 150}
}
```

### Example 2: Detect Multiple Faces
```bash
curl -X POST http://localhost:8001/api/ml/detect-faces \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "base64_string_here"
  }'

# Response
{
  "success": true,
  "faces": [
    {"embedding": [...], "location": {...}},
    {"embedding": [...], "location": {...}}
  ],
  "count": 2
}
```

### Example 3: Match Faces
```bash
curl -X POST http://localhost:8001/api/ml/match-faces \
  -H "Content-Type: application/json" \
  -d '{
    "query_embedding": [...],
    "candidate_embeddings": [
      {"student_id": "123", "embeddings": [[...], [...]]},
      {"student_id": "456", "embeddings": [[...]]}
    ],
    "threshold": 0.6
  }'

# Response
{
  "success": true,
  "match": {
    "student_id": "123",
    "distance": 0.42,
    "confidence": 0.58,
    "status": "confident"
  }
}
```

---

## 📁 File Mapping

### What Moves Where?

| Current Location | New Location | Purpose |
|-----------------|--------------|---------|
| `backend/app/utils/face_detect.py` | `ml-service/app/ml/face_detector.py` | Face detection |
| `backend/app/utils/face_encode.py` | `ml-service/app/ml/face_encoder.py` | Face encoding |
| `backend/app/utils/match_utils.py` | `ml-service/app/ml/face_matcher.py` | Face matching |

### What Gets Created?

| File | Purpose |
|------|---------|
| `ml-service/app/main.py` | ML service entry point |
| `ml-service/app/api/routes/face_recognition.py` | ML endpoints |
| `backend/app/services/ml_client.py` | HTTP client for ML service |
| `backend/app/schemas/ml_requests.py` | Request/response schemas |
| `docker-compose.yml` | Multi-service orchestration |

### What Gets Deleted?

| File | Reason |
|------|--------|
| `backend/app/utils/face_detect.py` | Moved to ML service |
| `backend/app/utils/face_encode.py` | Moved to ML service |
| `backend/app/utils/match_utils.py` | Moved to ML service |
| `backend/app/services/face_recognition.py` | No longer needed |

---

## 🔧 Configuration

### Backend `.env`
```env
# Add these
ML_SERVICE_URL=http://localhost:8001
ML_SERVICE_TIMEOUT=30
ML_SERVICE_MAX_RETRIES=3

# ML thresholds (now configurable)
ML_CONFIDENT_THRESHOLD=0.50
ML_UNCERTAIN_THRESHOLD=0.60
```

### ML Service `.env`
```env
LOG_LEVEL=info
MODEL_TYPE=hog  # or cnn
NUM_JITTERS=5
MIN_FACE_AREA_RATIO=0.05
```

---

## 🧪 Testing Checklist

- [ ] ML service starts on port 8001
- [ ] Backend starts on port 8000
- [ ] Health check works: `GET /health`
- [ ] Face encoding works: Student face upload
- [ ] Face detection works: Attendance marking with multiple faces
- [ ] Face matching works: Correct student identification
- [ ] Error handling: ML service down scenario
- [ ] Error handling: Invalid image format
- [ ] Error handling: No face detected
- [ ] Error handling: Multiple faces when expecting one
- [ ] Performance: Same or better than before
- [ ] All existing tests pass

---

## 🐛 Common Issues & Solutions

### Issue 1: ML Service Not Starting
```bash
# Check logs
docker-compose logs ml-service

# Common cause: Missing dependencies
cd ml-service
pip install -r requirements.txt
```

### Issue 2: Backend Can't Connect to ML Service
```bash
# Check network
docker-compose ps

# Check environment variable
echo $ML_SERVICE_URL

# Try from inside backend container
docker-compose exec backend curl http://ml-service:8001/health
```

### Issue 3: Face Detection Fails
```bash
# Check image format
file uploaded_image.jpg

# Check image size
ls -lh uploaded_image.jpg

# Test ML service directly
curl -X POST http://localhost:8001/api/ml/detect-faces \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "..."}'
```

### Issue 4: Slow Performance
```bash
# Check if using GPU (if available)
docker-compose exec ml-service nvidia-smi

# Check concurrent requests
docker stats

# Enable caching
# Add Redis and cache embeddings
```

---

## 📊 Before & After Comparison

### Deployment
| Aspect | Before | After |
|--------|--------|-------|
| Services | 1 (monolith) | 2 (backend + ML) |
| Scaling | All or nothing | Independent |
| Deployment | Deploy everything | Deploy separately |

### Dependencies
| Aspect | Before | After |
|--------|--------|-------|
| Backend size | ~500MB | ~150MB |
| ML service size | N/A | ~800MB |
| Total size | ~500MB | ~950MB |

### Performance
| Aspect | Before | After |
|--------|--------|-------|
| Max concurrent | 10 requests | 30+ requests |
| Scaling | Vertical only | Horizontal |
| GPU support | Limited | Easy |

---

## 🎓 Learning Resources

### Understanding Microservices
- [What are Microservices?](https://microservices.io/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [Docker Compose](https://docs.docker.com/compose/)

### Face Recognition
- [face_recognition library](https://github.com/ageitgey/face_recognition)
- [How Face Recognition Works](https://towardsdatascience.com/how-face-recognition-works-c1e5e1d8c3e4)

### API Design
- [REST API Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)

---

## 🤔 Decision Tree: When to Separate?

```
Is your app using ML? 
├─ No → Keep monolith
└─ Yes → Continue
    │
    Do you need to scale ML independently?
    ├─ No → Maybe keep monolith
    └─ Yes → Continue
        │
        Do you have multiple services already?
        ├─ No → Start with 2 services (this plan)
        └─ Yes → Add ML as another service
            │
            Do you need GPU for ML?
            ├─ No → Simple separation (this plan)
            └─ Yes → Consider Kubernetes + GPU nodes
```

**For Smart Attendance**: ✅ Separation is beneficial
- ML is resource-intensive
- Different scaling needs
- Clear separation of concerns
- Future GPU support

---

## 📝 Next Steps

1. **Read the full plan**: [ML_BACKEND_SEPARATION_PLAN.md](./ML_BACKEND_SEPARATION_PLAN.md)
2. **Set up local environment**: Docker, Python, etc.
3. **Start with Phase 1**: Create ML service foundation
4. **Test incrementally**: Don't wait until the end
5. **Document changes**: Update README as you go
6. **Ask questions**: Open issues, discuss in PRs

---

## 🎯 Success Criteria

You'll know you're done when:
- [ ] Two services run independently
- [ ] All tests pass
- [ ] Face upload works
- [ ] Attendance marking works
- [ ] Performance is same or better
- [ ] Documentation is updated
- [ ] Team can deploy each service separately

---

**Good luck! You've got this! 🚀**

For detailed implementation steps, see the full plan: [ML_BACKEND_SEPARATION_PLAN.md](./ML_BACKEND_SEPARATION_PLAN.md)

import face_recognition
import numpy as np
from PIL import Image
from io import BytesIO

def detect_faces_and_embeddings(image_bytes: bytes):
    """
    Returns:
      [
        {
          "box": (top, right, bottom, left),
          "embedding": [128 floats]
        }
      ]
    """
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image_np = np.array(image)

    locations = face_recognition.face_locations(
        image_np,
        model="hog"   # CPU-friendly, works in Docker
    )

    encodings = face_recognition.face_encodings(image_np, locations)

    faces = []
    for loc, enc in zip(locations, encodings):
        faces.append({
            "box": loc,
            "embedding": enc.tolist()
        })

    return faces

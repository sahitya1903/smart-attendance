import face_recognition
import numpy as np
from PIL import Image
from io import BytesIO

def get_face_embedding(image_bytes: bytes):
    """
    Returns:
      embedding (list of 128 floats)
    Raises:
      ValueError if no face or multiple faces
    """
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image_np = np.array(image)

    locations = face_recognition.face_locations(
        image_np, model="hog"
    )

    if len(locations) != 1:
        raise ValueError("Image must contain exactly one face")

    encoding = face_recognition.face_encodings(
        image_np, locations
    )[0]

    return encoding.tolist()

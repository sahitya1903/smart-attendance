import api from "./axiosClient";

export const captureAndSend = async (
  webcamRef,
  selectedSubject,
  setDetections
) => {
  console.log("captureAndSend triggered");
  const image = webcamRef.current?.getScreenshot();
  if (!image || !selectedSubject) return;

  try {
    const res = await api.post("/api/attendance/mark", {
      image,
      subject_id: selectedSubject,
    });

    console.log("Attendance response:", res.data);
    setDetections(res.data.faces);
  } catch (err) {
    console.error(
      "Attendance error:",
      err.response?.data || err.message
    );
  }
};

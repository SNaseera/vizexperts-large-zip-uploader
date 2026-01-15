import { useState } from "react";
import { uploadFile } from "./uploader";

export default function App() {
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("");

  return (
    <>
      <input
        type="file"
        onChange={e =>
          uploadFile(e.target.files[0], (done, total, time) => {
            setProgress(Math.round((done / total) * 100));
            setEta(((total - done) * (time / done || 0)).toFixed(1));
          })
        }
      />
      <div>Progress: {progress}%</div>
      <div>ETA: {eta}s</div>
    </>
  );
}

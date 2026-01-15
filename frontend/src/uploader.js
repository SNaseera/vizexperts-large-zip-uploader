const CHUNK = 5 * 1024 * 1024;
const MAX = 3;

export async function uploadFile(file, onUpdate) {
  let state = JSON.parse(localStorage.getItem("upload")) || {};
  const uploadId = state.id || crypto.randomUUID();
  localStorage.setItem("upload", JSON.stringify({ id: uploadId }));

  const totalChunks = Math.ceil(file.size / CHUNK);

  const res = await fetch("/handshake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadId,
      filename: file.name,
      size: file.size,
      totalChunks
    })
  });

  const { received } = await res.json();
  const pending = [...Array(totalChunks).keys()].filter(i => !received.includes(i));

  let active = 0, completed = received.length;
  const startTime = Date.now();

  const send = async (i, attempt = 1) => {
    const offset = i * CHUNK;
    try {
      await fetch(`/chunk?uploadId=${uploadId}&index=${i}&offset=${offset}`, {
        method: "POST",
        body: file.slice(offset, offset + CHUNK)
      });
      completed++;
    } catch {
      if (attempt <= 3) {
        await new Promise(r => setTimeout(r, 2 ** attempt * 500));
        return send(i, attempt + 1);
      }
    }
  };

  return new Promise(resolve => {
    const pump = () => {
      while (active < MAX && pending.length) {
        const i = pending.shift();
        active++;
        send(i).finally(() => {
          active--;
          const elapsed = (Date.now() - startTime) / 1000;
          onUpdate(completed, totalChunks, elapsed);
          pump();
        });
      }
      if (!active && !pending.length) resolve(uploadId);
    };
    pump();
  });
}

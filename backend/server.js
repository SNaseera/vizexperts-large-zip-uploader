import express from "express";
import fs from "fs";
import crypto from "crypto";
import unzipper from "unzipper";
import { pool } from "./db.js";

const app = express();
app.use(express.json());

const DIR = "./uploads";
fs.mkdirSync(DIR, { recursive: true });

app.post("/handshake", async (req, res) => {
  const { uploadId, filename, size, totalChunks } = req.body;

  await pool.query(
    `INSERT IGNORE INTO uploads VALUES (?, ?, ?, ?, 'UPLOADING', NULL, NOW())`,
    [uploadId, filename, size, totalChunks]
  );

  const [chunks] = await pool.query(
    `SELECT chunk_index FROM chunks WHERE upload_id=? AND status='RECEIVED'`,
    [uploadId]
  );

  const filePath = `${DIR}/${uploadId}.bin`;
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, Buffer.alloc(size));
  }

  res.json({ received: chunks.map(c => c.chunk_index) });
});

app.post("/chunk", async (req, res) => {
  const { uploadId, index, offset } = req.query;
  const filePath = `${DIR}/${uploadId}.bin`;

  const [[existing]] = await pool.query(
    `SELECT status FROM chunks WHERE upload_id=? AND chunk_index=?`,
    [uploadId, index]
  );

  if (existing?.status === "RECEIVED") return res.sendStatus(200);

  const stream = fs.createWriteStream(filePath, { start: +offset });
  req.pipe(stream);

  stream.on("finish", async () => {
    await pool.query(
      `INSERT INTO chunks VALUES (?, ?, 'RECEIVED', NOW())
       ON DUPLICATE KEY UPDATE status='RECEIVED', received_at=NOW()`,
      [uploadId, index]
    );
    res.sendStatus(200);
  });
});

app.post("/finalize/:id", async (req, res) => {
  const id = req.params.id;
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  const [[upload]] = await conn.query(
    `SELECT * FROM uploads WHERE id=? FOR UPDATE`,
    [id]
  );

  if (upload.status === "COMPLETED") {
    await conn.commit();
    conn.release();
    return res.json({ status: "already_completed" });
  }

  const [[count]] = await conn.query(
    `SELECT COUNT(*) c FROM chunks WHERE upload_id=? AND status='RECEIVED'`,
    [id]
  );

  if (count.c !== upload.total_chunks) {
    await conn.rollback();
    conn.release();
    return res.status(400).json({ error: "chunks_missing" });
  }

  await conn.query(`UPDATE uploads SET status='PROCESSING' WHERE id=?`, [id]);

  const filePath = `${DIR}/${id}.bin`;
  const hash = crypto.createHash("sha256");

  await new Promise(r =>
    fs.createReadStream(filePath).on("data", d => hash.update(d)).on("end", r)
  );

  const files = [];
  await fs.createReadStream(filePath)
    .pipe(unzipper.Parse())
    .on("entry", e => {
      files.push(e.path);
      e.autodrain();
    })
    .promise();

  await conn.query(
    `UPDATE uploads SET status='COMPLETED', final_hash=? WHERE id=?`,
    [hash.digest("hex"), id]
  );

  await conn.commit();
  conn.release();

  res.json({ files });
});

setInterval(() => {
  pool.query(
    `DELETE FROM uploads WHERE status='UPLOADING'
     AND created_at < NOW() - INTERVAL 1 DAY`
  );
}, 3600000);

app.listen(3001);

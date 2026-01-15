VizExperts – Large ZIP File Uploader

A resilient system for uploading very large ZIP files (>1GB) using chunked uploads, resumability, and streaming backend processing.

Demo Screenshots
![Image Jan 15, 2026, 06_43_22 PM](https://github.com/user-attachments/assets/71dd665e-e0fe-49d2-b3df-d0c65f55837e)

![Image Jan 15, 2026, 06_43_11 PM](https://github.com/user-attachments/assets/7cd4b31c-b050-41c8-8e56-5d6412dc0a82)

1. Upload Started + Chunk Status Grid

2. Network Failure & Retry with Exponential Backoff

3. Resume After Page Refresh

4. Upload Complete + ZIP Peek + SHA-256

System Design Overview

Frontend slices large ZIP files into 5MB chunks

Uploads run with max 3 concurrent requests

Backend writes chunks via streaming I/O at byte offsets

Database is the single source of truth for chunk and upload state

Supports out-of-order delivery, retries, and crash recovery

File Integrity & Hashing

Final file integrity is verified using SHA-256

Hash is calculated only after all chunks are received

Duplicate chunk uploads are handled idempotently

Pause / Resume Logic

Upload state is persisted in MySQL

Frontend performs a handshake before uploading

On refresh or reconnect, only missing chunks are uploaded

No previously uploaded chunk is re-sent

Failure Handling
Network Failures

Each chunk retries up to 3 times

Exponential backoff is applied on retry

Double Finalization

Backend uses row-level locking

Only one finalize operation can succeed

Server Crash Recovery

Chunk state stored in DB

Partially written files resume correctly after restart

ZIP Peek Requirement

Uses streaming ZIP parser

Lists top-level filenames without extracting the archive

Operates in constant memory

Database Schema

uploads → file-level state

chunks → per-chunk state

Enables resume, retry, and cleanup logic

Cleanup Strategy

Orphaned uploads older than 24 hours are removed

Prevents disk and DB pollution

Trade-offs

Files are stored temporarily on local disk (not object storage)

UI is functional-first, minimal styling

No authentication layer added

Possible Enhancements

S3 / GCS backend storage

WebSocket-based live progress

Pause / cancel button

Horizontal scaling with shared storage

Tech Stack

Frontend: React.js

Backend: Node.js (Express)

Database: MySQL

Containerization: Docker + Docker Compose

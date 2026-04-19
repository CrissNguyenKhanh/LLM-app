# RAG App (IDE + Chat + RAG MVP)

Backend Flask cung cap 3 endpoint chinh:

- `GET /api/health`: check service + `llm_backend_reachable` (goi `/v1/models` tren `OPENAI_BASE_URL`)
- `POST /api/upload`: upload tai lieu (`txt`, `pdf`, `docx`), chunk, embedding va index vao Chroma
- `POST /api/chat`: hoi dap theo retrieval tu vector store

## Chay backend

1. Di chuyen vao `backend`
2. Tao va kich hoat virtualenv
3. Cai dependencies:

```bash
pip install -r requirements.txt
```

4. Cai [Ollama cho Windows](https://ollama.com/download/windows) (file cai `.exe`), chay installer, **dong mo lai PowerShell** (hoac dang nhap lai Windows) de lenh `ollama` co trong PATH. Neu van bao *not recognized*: mo Start Menu mo ung dung **Ollama** mot lan; hoac them thu muc cai dat (thuong `%LOCALAPPDATA%\Programs\Ollama`) vao bien PATH.

Sau do keo model:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

5. Tao file `.env` trong `backend`:

**Chi Ollama (khuyen nghi cho do an):** mac dinh backend goi `http://127.0.0.1:11434/v1` — **khong** doc `OPENAI_API_KEY` de tu chuyen sang OpenAI (tranh lo quota nhu khi .env van con key cu).

```env
# OPENAI_BASE_URL=http://127.0.0.1:11434/v1   # tuy chon, day la mac dinh
EMBEDDING_MODEL=nomic-embed-text
CHAT_MODEL=llama3.2
# OPENAI_API_KEY=...  # tuy chon; Ollama bo qua, co the xoa neu chi dung local
# LLM_PROBE_TIMEOUT_SEC=15   # tuy chon: health check doi Ollama (mac dinh 10 giay)
# CHAT_COMPLETION_TIMEOUT_SEC=300   # timeout mot lan goi chat toi Ollama
# CHAT_MAX_TOKENS=768                 # gioi han do dai cau tra loi (nhanh hon)
# RAG_MAX_CONTEXT_CHARS=12000         # rut ngan context gui vao LLM
# OPENAI_HTTP_TIMEOUT_SEC=600         # timeout HTTP tong (embedding + chat)
```

Neu doi sang embedding model khac (hoac tung dung OpenAI cloud), **xoa thu muc** `backend/chroma_db` roi upload lai tai lieu de tranh lech so chieu embedding.

Dung lai OpenAI cloud: dat `OPENAI_BASE_URL=https://api.openai.com/v1` va `OPENAI_API_KEY=sk-...`, kem `EMBEDDING_MODEL` / `CHAT_MODEL` tuong ung.

Dung LM Studio: dat `OPENAI_BASE_URL` theo Local Server (vi du `http://127.0.0.1:1234/v1`).

6. Chay server:

```bash
python run.py
```

Mac dinh se chay tai `http://127.0.0.1:5000`.

**Luu y:** Backend can Ollama (hoac server OpenAI-compatible khac) dang chay khi upload/chat.

**Loi Windows 10061 / connection refused:** khong co tien trinh lang nghe (thuong la Ollama chua mo). Mo app Ollama hoac chay `ollama serve`, kiem tra `GET http://127.0.0.1:5000/api/health` — neu `llm_backend_reachable` la `false` thi xem `llm_backend_detail`. Chat/upload van tra JSON kem `backend_warnings` / `backend_warning` goi y thay vi chi stack trace trong log.

**`llm_backend_detail` la `timed out`:** Ollama dang chay rat cham hoac chua san sang — doi vai giay roi goi lai `/api/health`; hoac tang `LLM_PROBE_TIMEOUT_SEC` (vi du `15`). Neu timeout mai: kiem tra Task Manager co process Ollama, tat VPN/firewall chan loopback, thu `http://127.0.0.1:11434/api/version` tren trinh duyet.

**Postman / Thunder Client “load mai” khi `/api/chat`:** lan dau Ollama nap model vao RAM co the **1–3 phut**; CPU yeu thi chat RAG cung lau. Da gioi han `max_tokens` va rut context (`RAG_MAX_CONTEXT_CHARS`). Co the them vao `.env`: `CHAT_COMPLETION_TIMEOUT_SEC=480`, `CHAT_MAX_TOKENS=512`, `RAG_MAX_CONTEXT_CHARS=8000`, hoac doi model nhe hon (`ollama pull llama3.2:1b` + `CHAT_MODEL=llama3.2:1b`).

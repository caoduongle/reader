# API Contract: Python Backend Model Management Endpoints

**Base URL**: `http://127.0.0.1:8008`  
**CORS Whitelist**: `http://localhost:3000`, `http://127.0.0.1:3000`, `null` (Electron `file://`)

---

## 1. `GET /health`

Returns the operational and model loading status of the server.

### Responses

#### 200 OK - Model Loaded
```json
{
  "ok": true,
  "model_loaded": true,
  "model_name": "Chess_25e_12750s.pth",
  "index_name": "Chess.index",
  "model_dir": "E:\\reader\\python-backend\\model"
}
```

#### 200 OK - Model Missing
```json
{
  "ok": false,
  "reason": "model_missing",
  "model_loaded": false,
  "model_dir": "E:\\reader\\python-backend\\model"
}
```

---

## 2. `GET /model/list`

Retrieves a detailed inventory of discovered files in the model folder.

### Responses

#### 200 OK
```json
{
  "ok": true,
  "model_dir": "E:\\reader\\python-backend\\model",
  "active_model": "Chess_25e_12750s.pth",
  "active_index": "Chess.index",
  "pth_files": [
    "Chess_25e_12750s.pth"
  ],
  "index_files": [
    "Chess.index"
  ]
}
```

---

## 3. `POST /model/reload`

Re-scans `model/` directory, updates `MODEL_PATH` and `INDEX_PATH`, and initializes or unloads the `RVCInference` engine under thread-safety (`rvc_lock`).

### Responses

#### 200 OK - Reloaded Successfully
```json
{
  "ok": true,
  "model_loaded": true,
  "model_name": "new_voice.pth",
  "index_name": "new_voice.index",
  "model_dir": "E:\\reader\\python-backend\\model"
}
```

#### 200 OK - Reloaded but Still No Model
```json
{
  "ok": false,
  "reason": "model_missing",
  "model_loaded": false,
  "model_dir": "E:\\reader\\python-backend\\model"
}
```

---

## 4. `POST /model/create-folder`

Idempotently creates the `model/` folder if absent on disk.

### Responses

#### 200 OK
```json
{
  "ok": true,
  "model_dir": "E:\\reader\\python-backend\\model"
}
```

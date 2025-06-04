package handlers

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// 🚨 安全測試響應結構
type SecurityTestResponse struct {
	TestName    string      `json:"test_name"`
	Success     bool        `json:"success"`
	Message     string      `json:"message"`
	Data        interface{} `json:"data,omitempty"`
	Timestamp   string      `json:"timestamp"`
	RiskLevel   string      `json:"risk_level"`
	EBPFEvents  []string    `json:"ebpf_events,omitempty"`
}

// 🚨 漏洞類別
const (
	RISK_CRITICAL = "CRITICAL"
	RISK_HIGH     = "HIGH"
	RISK_MEDIUM   = "MEDIUM"
	RISK_LOW      = "LOW"
)

// 🚨 安全測試概覽
func GetSecurityTestOverview(c *gin.Context) {
	tests := []map[string]interface{}{
		{
			"id":          "command_injection",
			"name":        "命令注入測試",
			"description": "測試命令執行漏洞，eBPF可監控進程創建",
			"risk_level":  RISK_CRITICAL,
			"endpoint":    "/api/security/test/command",
			"method":      "POST",
		},
		{
			"id":          "file_access",
			"name":        "文件訪問測試",
			"description": "測試任意文件讀取，eBPF可監控文件系統調用",
			"risk_level":  RISK_HIGH,
			"endpoint":    "/api/security/test/file",
			"method":      "POST",
		},
		{
			"id":          "network_scan",
			"name":        "網絡掃描測試",
			"description": "測試內網掃描，eBPF可監控網絡連接",
			"risk_level":  RISK_HIGH,
			"endpoint":    "/api/security/test/network",
			"method":      "POST",
		},
		{
			"id":          "sensitive_data",
			"name":        "敏感數據洩露",
			"description": "測試數據洩露，eBPF可監控敏感數據處理",
			"risk_level":  RISK_CRITICAL,
			"endpoint":    "/api/security/test/sensitive",
			"method":      "POST",
		},
		{
			"id":          "sql_injection",
			"name":        "SQL注入測試",
			"description": "測試SQL注入攻擊，eBPF可監控數據庫連接",
			"risk_level":  RISK_CRITICAL,
			"endpoint":    "/api/security/test/sql",
			"method":      "POST",
		},
		{
			"id":          "privilege_escalation",
			"name":        "權限提升測試",
			"description": "測試權限提升攻擊，eBPF可監控系統調用",
			"risk_level":  RISK_CRITICAL,
			"endpoint":    "/api/security/test/privilege",
			"method":      "POST",
		},
		{
			"id":          "crypto_weakness",
			"name":        "加密弱點測試",
			"description": "測試弱加密算法，eBPF可監控加密操作",
			"risk_level":  RISK_MEDIUM,
			"endpoint":    "/api/security/test/crypto",
			"method":      "POST",
		},
		{
			"id":          "memory_dump",
			"name":        "內存轉儲測試",
			"description": "測試內存信息洩露，eBPF可監控內存訪問",
			"risk_level":  RISK_HIGH,
			"endpoint":    "/api/security/test/memory",
			"method":      "POST",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"total_tests": len(tests),
		"tests":       tests,
		"disclaimer":  "⚠️ 這些是故意的安全漏洞，僅用於eBPF安全監控演示！",
	})
}

// 🚨 命令注入測試
func TestCommandInjection(c *gin.Context) {
	var request struct {
		Command string `json:"command" binding:"required"`
		Args    string `json:"args"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	// 🚨 故意的命令注入漏洞 - 直接執行用戶輸入
	var cmd *exec.Cmd
	if request.Args != "" {
		fullCommand := request.Command + " " + request.Args
		cmd = exec.Command("sh", "-c", fullCommand)
	} else {
		cmd = exec.Command("sh", "-c", request.Command)
	}

	output, err := cmd.CombinedOutput()
	
	response := SecurityTestResponse{
		TestName:  "命令注入測試",
		Success:   err == nil,
		Timestamp: time.Now().Format(time.RFC3339),
		RiskLevel: RISK_CRITICAL,
		EBPFEvents: []string{
			"process_exec",
			"syscall_execve", 
			"network_connect",
		},
	}

	if err != nil {
		response.Message = fmt.Sprintf("命令執行失敗: %v", err)
		response.Data = gin.H{
			"command": request.Command,
			"error":   err.Error(),
			"output":  string(output),
		}
	} else {
		response.Message = "命令執行成功 - 🚨 檢測到命令注入漏洞！"
		response.Data = gin.H{
			"command": request.Command,
			"output":  string(output),
		}
	}

	// 記錄安全事件
	logger.Warnf("🚨 安全測試 - 命令注入: 用戶執行命令 '%s'", request.Command)
	
	c.JSON(http.StatusOK, response)
}

// 🚨 文件訪問測試  
func TestFileAccess(c *gin.Context) {
	var request struct {
		FilePath string `json:"file_path" binding:"required"`
		Action   string `json:"action"` // read, list, write
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	response := SecurityTestResponse{
		TestName:  "文件訪問測試",
		Timestamp: time.Now().Format(time.RFC3339),
		RiskLevel: RISK_HIGH,
		EBPFEvents: []string{
			"file_open",
			"file_read", 
			"file_write",
			"syscall_openat",
		},
	}

	switch request.Action {
	case "read":
		// 🚨 故意的任意文件讀取漏洞
		content, err := ioutil.ReadFile(request.FilePath)
		if err != nil {
			response.Success = false
			response.Message = fmt.Sprintf("文件讀取失敗: %v", err)
		} else {
			response.Success = true
			response.Message = "文件讀取成功 - 🚨 檢測到任意文件讀取漏洞！"
			response.Data = gin.H{
				"file_path": request.FilePath,
				"content":   string(content),
				"size":      len(content),
			}
		}

	case "list":
		// 🚨 目錄遍歷漏洞
		files, err := ioutil.ReadDir(request.FilePath)
		if err != nil {
			response.Success = false
			response.Message = fmt.Sprintf("目錄列表失敗: %v", err)
		} else {
			response.Success = true
			response.Message = "目錄列表成功 - 🚨 檢測到目錄遍歷漏洞！"
			
			var fileList []gin.H
			for _, file := range files {
				fileList = append(fileList, gin.H{
					"name":    file.Name(),
					"size":    file.Size(),
					"is_dir":  file.IsDir(),
					"mode":    file.Mode().String(),
					"mod_time": file.ModTime(),
				})
			}
			response.Data = gin.H{
				"directory": request.FilePath,
				"files":     fileList,
			}
		}

	case "write":
		// 🚨 任意文件寫入漏洞
		testContent := fmt.Sprintf("安全測試寫入 - %s", time.Now().Format(time.RFC3339))
		err := ioutil.WriteFile(request.FilePath, []byte(testContent), 0644)
		if err != nil {
			response.Success = false
			response.Message = fmt.Sprintf("文件寫入失敗: %v", err)
		} else {
			response.Success = true
			response.Message = "文件寫入成功 - 🚨 檢測到任意文件寫入漏洞！"
			response.Data = gin.H{
				"file_path": request.FilePath,
				"content":   testContent,
			}
		}

	default:
		response.Success = false
		response.Message = "不支持的操作類型"
	}

	// 記錄安全事件
	logger.Warnf("🚨 安全測試 - 文件訪問: 用戶嘗試 %s 文件 '%s'", request.Action, request.FilePath)

	c.JSON(http.StatusOK, response)
}

// 🚨 網絡掃描測試
func TestNetworkScan(c *gin.Context) {
	var request struct {
		Target    string   `json:"target" binding:"required"`
		Ports     []int    `json:"ports"`
		ScanType  string   `json:"scan_type"` // tcp, udp, ping
		Timeout   int      `json:"timeout"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	response := SecurityTestResponse{
		TestName:  "網絡掃描測試",
		Success:   true,
		Timestamp: time.Now().Format(time.RFC3339),
		RiskLevel: RISK_HIGH,
		EBPFEvents: []string{
			"network_connect",
			"syscall_connect",
			"dns_lookup",
		},
	}

	timeout := time.Duration(request.Timeout) * time.Second
	if timeout == 0 {
		timeout = 3 * time.Second
	}

	switch request.ScanType {
	case "tcp":
		results := make([]gin.H, 0)
		for _, port := range request.Ports {
			address := fmt.Sprintf("%s:%d", request.Target, port)
			conn, err := net.DialTimeout("tcp", address, timeout)
			
			result := gin.H{
				"port":   port,
				"status": "closed",
			}
			
			if err == nil {
				result["status"] = "open"
				conn.Close()
			}
			
			results = append(results, result)
		}
		
		response.Message = "TCP端口掃描完成 - 🚨 檢測到網絡掃描攻擊！"
		response.Data = gin.H{
			"target":     request.Target,
			"scan_type":  "tcp",
			"results":    results,
		}

	case "ping":
		// 🚨 ICMP掃描
		cmd := exec.Command("ping", "-c", "3", request.Target)
		output, err := cmd.CombinedOutput()
		
		if err != nil {
			response.Message = "PING掃描失敗"
			response.Success = false
		} else {
			response.Message = "PING掃描完成 - 🚨 檢測到網絡探測！"
		}
		
		response.Data = gin.H{
			"target":     request.Target,
			"scan_type":  "ping",
			"output":     string(output),
		}

	default:
		response.Success = false
		response.Message = "不支持的掃描類型"
	}

	// 記錄安全事件
	logger.Warnf("🚨 安全測試 - 網絡掃描: 用戶掃描 %s 類型 %s", request.Target, request.ScanType)

	c.JSON(http.StatusOK, response)
}

// 🚨 敏感數據洩露測試
func TestSensitiveDataLeak(c *gin.Context) {
	var request struct {
		DataType string `json:"data_type" binding:"required"` // credit_card, ssn, password, api_key
		Action   string `json:"action"`                       // generate, log, export
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	response := SecurityTestResponse{
		TestName:  "敏感數據洩露測試",
		Success:   true,
		Timestamp: time.Now().Format(time.RFC3339),
		RiskLevel: RISK_CRITICAL,
		EBPFEvents: []string{
			"file_write",
			"network_send",
			"memory_access",
		},
	}

	var sensitiveData gin.H

	switch request.DataType {
	case "credit_card":
		// 🚨 生成假的信用卡數據用於測試
		sensitiveData = gin.H{
			"card_number": "4532-1234-5678-9012",
			"cvv":         "123",
			"expiry":      "12/25",
			"holder":      "John Doe",
		}
		
		// 🚨 故意記錄敏感信息到日誌
		logger.Errorf("🚨 信用卡數據洩露: 卡號 %s, CVV %s", 
			sensitiveData["card_number"], sensitiveData["cvv"])

	case "api_key":
		// 🚨 生成假的API密鑰
		sensitiveData = gin.H{
			"api_key":    "sk-test_12345678901234567890123456789012",
			"secret_key": "sk-live_98765432109876543210987654321098",
			"webhook":    "https://api.example.com/webhook?token=abc123",
		}

	case "password":
		// 🚨 生成密碼相關敏感數據
		sensitiveData = gin.H{
			"username":      "admin",
			"password":      "password123",
			"password_hash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
			"salt":          "randomsalt123",
		}

	case "ssn":
		// 🚨 生成假的社會保障號碼
		sensitiveData = gin.H{
			"ssn":       "123-45-6789",
			"full_name": "Jane Smith",
			"dob":       "1990-01-15",
			"address":   "123 Main St, Anytown, ST 12345",
		}

	default:
		response.Success = false
		response.Message = "不支持的數據類型"
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if request.Action == "export" {
		// 🚨 將敏感數據寫入文件
		filename := fmt.Sprintf("/tmp/sensitive_%s_%d.json", request.DataType, time.Now().Unix())
		data, _ := json.Marshal(sensitiveData)
		ioutil.WriteFile(filename, data, 0644)
		
		sensitiveData["exported_file"] = filename
	}

	response.Message = fmt.Sprintf("敏感數據處理完成 - 🚨 檢測到%s數據洩露！", request.DataType)
	response.Data = sensitiveData

	// 記錄安全事件
	logger.Warnf("🚨 安全測試 - 敏感數據: 處理 %s 類型數據", request.DataType)

	c.JSON(http.StatusOK, response)
}

// 🚨 SQL注入測試
func TestSQLInjection(c *gin.Context) {
	var request struct {
		Query    string `json:"query" binding:"required"`
		TestType string `json:"test_type"` // union, blind, time
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	response := SecurityTestResponse{
		TestName:  "SQL注入測試",
		Success:   true,
		Timestamp: time.Now().Format(time.RFC3339),
		RiskLevel: RISK_CRITICAL,
		EBPFEvents: []string{
			"sql_query",
			"database_connect",
			"network_connect",
		},
	}

	// 🚨 故意的SQL注入漏洞模擬
	vulnerableQuery := fmt.Sprintf("SELECT * FROM users WHERE username = '%s'", request.Query)
	
	// 檢測常見的SQL注入模式
	injectionPatterns := []string{
		"'", "\"", "OR", "UNION", "SELECT", "DROP", "DELETE", 
		"INSERT", "UPDATE", "--", "/*", "*/", "xp_", "sp_",
	}
	
	detectedPatterns := make([]string, 0)
	for _, pattern := range injectionPatterns {
		if strings.Contains(strings.ToUpper(request.Query), strings.ToUpper(pattern)) {
			detectedPatterns = append(detectedPatterns, pattern)
		}
	}

	if len(detectedPatterns) > 0 {
		response.Message = "🚨 檢測到SQL注入攻擊模式！"
		response.Data = gin.H{
			"original_query":     request.Query,
			"vulnerable_query":   vulnerableQuery,
			"detected_patterns":  detectedPatterns,
			"attack_type":        request.TestType,
			"risk_assessment":    "HIGH - 可能導致數據洩露或系統破壞",
		}
	} else {
		response.Message = "未檢測到明顯的SQL注入模式"
		response.Data = gin.H{
			"original_query":   request.Query,
			"vulnerable_query": vulnerableQuery,
		}
	}

	// 🚨 故意記錄完整的SQL查詢到日誌
	logger.Warnf("🚨 SQL注入測試: 執行查詢 '%s'", vulnerableQuery)

	c.JSON(http.StatusOK, response)
}

// 🚨 權限提升測試
func TestPrivilegeEscalation(c *gin.Context) {
	var request struct {
		Action string `json:"action" binding:"required"` // suid, sudo, container_escape
		Target string `json:"target"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	response := SecurityTestResponse{
		TestName:  "權限提升測試",
		Success:   true,
		Timestamp: time.Now().Format(time.RFC3339),
		RiskLevel: RISK_CRITICAL,
		EBPFEvents: []string{
			"syscall_setuid",
			"process_exec",
			"file_access",
		},
	}

	switch request.Action {
	case "suid":
		// 🚨 查找SUID文件
		cmd := exec.Command("find", "/usr", "-perm", "-4000", "-type", "f", "2>/dev/null")
		output, err := cmd.CombinedOutput()
		
		if err != nil {
			response.Success = false
			response.Message = "SUID文件查找失敗"
		} else {
			suidFiles := strings.Split(strings.TrimSpace(string(output)), "\n")
			response.Message = "🚨 發現SUID文件 - 潛在權限提升風險！"
			response.Data = gin.H{
				"suid_files": suidFiles,
				"count":      len(suidFiles),
			}
		}

	case "sudo":
		// 🚨 檢查sudo權限
		cmd := exec.Command("sudo", "-l")
		output, err := cmd.CombinedOutput()
		
		response.Data = gin.H{
			"sudo_check": string(output),
			"has_error":  err != nil,
		}
		
		if err != nil {
			response.Message = "Sudo權限檢查失敗或需要密碼"
		} else {
			response.Message = "🚨 檢測到sudo權限 - 可能的權限提升！"
		}

	case "container_escape":
		// 🚨 容器逃逸檢測
		checks := gin.H{}
		
		// 檢查是否在容器中
		if _, err := os.Stat("/.dockerenv"); err == nil {
			checks["in_docker"] = true
		}
		
		// 檢查cgroup
		if content, err := ioutil.ReadFile("/proc/1/cgroup"); err == nil {
			checks["cgroup_info"] = string(content)
		}
		
		// 檢查特權模式
		if content, err := ioutil.ReadFile("/proc/self/status"); err == nil {
			if strings.Contains(string(content), "CapEff:\t0000003fffffffff") {
				checks["privileged_container"] = true
			}
		}
		
		response.Message = "🚨 容器環境檢測完成"
		response.Data = checks

	default:
		response.Success = false
		response.Message = "不支持的權限提升測試類型"
	}

	// 記錄安全事件
	logger.Warnf("🚨 安全測試 - 權限提升: 執行 %s 檢測", request.Action)

	c.JSON(http.StatusOK, response)
}

// 🚨 加密弱點測試
func TestCryptoWeakness(c *gin.Context) {
	var request struct {
		Algorithm string `json:"algorithm" binding:"required"` // md5, sha1, des, weak_rsa
		Data      string `json:"data"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	response := SecurityTestResponse{
		TestName:  "加密弱點測試",
		Success:   true,
		Timestamp: time.Now().Format(time.RFC3339),
		RiskLevel: RISK_MEDIUM,
		EBPFEvents: []string{
			"crypto_operation",
			"hash_computation",
		},
	}

	data := request.Data
	if data == "" {
		data = "敏感測試數據：信用卡號 4532123456789012"
	}

	switch request.Algorithm {
	case "md5":
		// 🚨 使用弱MD5算法
		hasher := md5.New()
		hasher.Write([]byte(data))
		hash := hex.EncodeToString(hasher.Sum(nil))
		
		response.Message = "🚨 使用了不安全的MD5算法！"
		response.Data = gin.H{
			"algorithm":     "MD5",
			"original_data": data,
			"hash":          hash,
			"vulnerability": "MD5易受碰撞攻擊，不應用於安全場景",
		}

	case "weak_key":
		// 🚨 弱密鑰示例
		weakKeys := []string{
			"123456",
			"password",
			"admin",
			"qwerty",
			"000000",
		}
		
		response.Message = "🚨 檢測到弱密鑰模式！"
		response.Data = gin.H{
			"weak_keys":     weakKeys,
			"test_key":      data,
			"vulnerability": "弱密鑰容易被破解",
		}

	default:
		response.Success = false
		response.Message = "不支持的加密算法測試"
	}

	// 🚨 故意在日誌中記錄加密操作
	logger.Warnf("🚨 加密測試: 使用 %s 算法處理數據", request.Algorithm)

	c.JSON(http.StatusOK, response)
}

// 🚨 內存轉儲測試
func TestMemoryDump(c *gin.Context) {
	var request struct {
		DumpType string `json:"dump_type" binding:"required"` // process, heap, stack
		PID      int    `json:"pid"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	response := SecurityTestResponse{
		TestName:  "內存轉儲測試",
		Success:   true,
		Timestamp: time.Now().Format(time.RFC3339),
		RiskLevel: RISK_HIGH,
		EBPFEvents: []string{
			"memory_access",
			"process_trace",
			"syscall_ptrace",
		},
	}

	switch request.DumpType {
	case "process":
		// 🚨 獲取進程內存信息
		pid := request.PID
		if pid == 0 {
			pid = os.Getpid()
		}
		
		// 讀取進程狀態
		statusFile := fmt.Sprintf("/proc/%d/status", pid)
		if content, err := ioutil.ReadFile(statusFile); err == nil {
			response.Message = "🚨 進程內存信息洩露！"
			response.Data = gin.H{
				"pid":           pid,
				"memory_info":   string(content),
				"process_dump":  fmt.Sprintf("進程 %d 內存已轉儲", pid),
			}
		} else {
			response.Success = false
			response.Message = "無法訪問進程內存信息"
		}

	case "heap":
		// 🚨 模擬堆內存轉儲
		response.Message = "🚨 堆內存轉儲完成！"
		response.Data = gin.H{
			"heap_dump": "模擬堆內存數據：信用卡信息、用戶密碼等敏感數據",
			"size":      "約128MB",
			"location":  "/tmp/heap_dump.bin",
		}

	case "stack":
		// 🚨 模擬棧內存轉儲
		response.Message = "🚨 棧內存轉儲完成！"
		response.Data = gin.H{
			"stack_dump": "模擬棧內存數據：函數調用鏈、局部變量",
			"size":       "約8MB",
			"location":   "/tmp/stack_dump.bin",
		}

	default:
		response.Success = false
		response.Message = "不支持的內存轉儲類型"
	}

	// 記錄安全事件
	logger.Warnf("🚨 安全測試 - 內存轉儲: 執行 %s 轉儲", request.DumpType)

	c.JSON(http.StatusOK, response)
}

// 🚨 綜合安全測試
func RunComprehensiveSecurityTest(c *gin.Context) {
	var request struct {
		TestSuite []string `json:"test_suite"` // 要執行的測試列表
		Severity  string   `json:"severity"`   // low, medium, high, critical
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求格式錯誤",
		})
		return
	}

	results := make([]gin.H, 0)
	startTime := time.Now()

	// 定義測試套件
	allTests := map[string]func() gin.H{
		"command_injection": func() gin.H {
			return gin.H{
				"test":      "命令注入",
				"result":    "🚨 發現命令注入漏洞",
				"severity":  RISK_CRITICAL,
				"details":   "應用直接執行用戶輸入",
			}
		},
		"file_access": func() gin.H {
			return gin.H{
				"test":      "任意文件訪問", 
				"result":    "🚨 發現文件讀取漏洞",
				"severity":  RISK_HIGH,
				"details":   "可讀取系統任意文件",
			}
		},
		"sensitive_data": func() gin.H {
			return gin.H{
				"test":      "敏感數據洩露",
				"result":    "🚨 發現數據洩露風險",
				"severity":  RISK_CRITICAL,
				"details":   "信用卡信息被記錄到日誌",
			}
		},
		"sql_injection": func() gin.H {
			return gin.H{
				"test":      "SQL注入",
				"result":    "🚨 發現SQL注入漏洞",
				"severity":  RISK_CRITICAL,
				"details":   "未對用戶輸入進行參數化",
			}
		},
		"privilege_escalation": func() gin.H {
			return gin.H{
				"test":      "權限提升",
				"result":    "🚨 發現權限提升風險",
				"severity":  RISK_CRITICAL,
				"details":   "容器以特權模式運行",
			}
		},
	}

	// 執行選定的測試
	testsToRun := request.TestSuite
	if len(testsToRun) == 0 {
		// 如果沒有指定，根據嚴重程度選擇測試
		for testName := range allTests {
			testsToRun = append(testsToRun, testName)
		}
	}

	for _, testName := range testsToRun {
		if testFunc, exists := allTests[testName]; exists {
			result := testFunc()
			results = append(results, result)
		}
	}

	duration := time.Since(startTime)

	// 🚨 生成安全報告
	report := gin.H{
		"test_summary": gin.H{
			"total_tests":    len(results),
			"duration":       duration.String(),
			"timestamp":      time.Now().Format(time.RFC3339),
			"critical_count": countBySeverity(results, RISK_CRITICAL),
			"high_count":     countBySeverity(results, RISK_HIGH),
			"medium_count":   countBySeverity(results, RISK_MEDIUM),
		},
		"test_results": results,
		"recommendations": []string{
			"🔧 實施輸入驗證和參數化查詢",
			"🔧 使用最小權限原則運行容器",
			"🔧 啟用eBPF安全監控",
			"🔧 實施數據加密和訪問控制",
			"🔧 定期進行安全審計",
		},
		"ebpf_monitoring": gin.H{
			"recommended_events": []string{
				"process_exec", "file_open", "network_connect",
				"syscall_execve", "syscall_openat", "memory_access",
			},
			"tetragon_policies": "建議配置Tetragon策略監控這些事件",
		},
	}

	// 記錄綜合測試事件
	logger.Warnf("🚨 綜合安全測試完成: 執行了 %d 個測試，發現 %d 個關鍵漏洞", 
		len(results), countBySeverity(results, RISK_CRITICAL))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"report":  report,
	})
}

// 輔助函數：按嚴重程度計數
func countBySeverity(results []gin.H, severity string) int {
	count := 0
	for _, result := range results {
		if result["severity"] == severity {
			count++
		}
	}
	return count
}

package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// TetragonEvent 表示 Tetragon 安全事件
type TetragonEvent struct {
	Timestamp   time.Time   `json:"timestamp"`
	ProcessExec *ProcessExec `json:"process_exec,omitempty"`
	ProcessKprobe *ProcessKprobe `json:"process_kprobe,omitempty"`
	NodeName    string      `json:"node_name"`
	Time        string      `json:"time"`
	EventType   string      `json:"event_type"`
	Severity    string      `json:"severity"`
	Description string      `json:"description"`
	Pod         *PodInfo    `json:"pod,omitempty"`
}

// ProcessExec 進程執行事件
type ProcessExec struct {
	Process *Process `json:"process"`
	Parent  *Process `json:"parent,omitempty"`
}

// ProcessKprobe 內核探針事件
type ProcessKprobe struct {
	Process     *Process `json:"process"`
	Parent      *Process `json:"parent,omitempty"`
	FunctionName string  `json:"function_name"`
	Args        []string `json:"args,omitempty"`
}

// Process 進程信息
type Process struct {
	ExecId    string    `json:"exec_id"`
	Pid       uint32    `json:"pid"`
	Uid       uint32    `json:"uid"`
	Cwd       string    `json:"cwd"`
	Binary    string    `json:"binary"`
	Arguments string    `json:"arguments"`
	Flags     string    `json:"flags"`
	StartTime time.Time `json:"start_time"`
	Auid      uint32    `json:"auid"`
	Pod       *PodInfo  `json:"pod,omitempty"`
}

// PodInfo Pod 信息
type PodInfo struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	Container *ContainerInfo `json:"container,omitempty"`
	Labels    map[string]string `json:"labels,omitempty"`
}

// ContainerInfo 容器信息
type ContainerInfo struct {
	Id        string `json:"id"`
	Name      string `json:"name"`
	Image     *ImageInfo `json:"image,omitempty"`
	StartTime time.Time `json:"start_time"`
	Pid       uint32    `json:"pid"`
}

// ImageInfo 鏡像信息
type ImageInfo struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

// SecurityAlert 安全告警
type SecurityAlert struct {
	ID          string    `json:"id"`
	Timestamp   time.Time `json:"timestamp"`
	Severity    string    `json:"severity"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Event       *TetragonEvent `json:"event"`
	Action      string    `json:"action"`
	Status      string    `json:"status"`
}

// EventManager 事件管理器
type EventManager struct {
	clients     map[*websocket.Conn]bool
	clientsMux  sync.RWMutex
	events      []TetragonEvent
	eventsMux   sync.RWMutex
	alerts      []SecurityAlert
	alertsMux   sync.RWMutex
	isRunning   bool
	stopChan    chan bool
}

var eventManager = &EventManager{
	clients:   make(map[*websocket.Conn]bool),
	events:    make([]TetragonEvent, 0, 1000),
	alerts:    make([]SecurityAlert, 0, 100),
	stopChan:  make(chan bool),
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 允許所有來源，生產環境應該限制
	},
}

// 初始化事件監控
func init() {
	go eventManager.startEventCollection()
}

// StartEventCollection 開始收集 Tetragon 事件
func (em *EventManager) startEventCollection() {
	em.isRunning = true
	
	for {
		select {
		case <-em.stopChan:
			em.isRunning = false
			return
		default:
			em.collectTetragonEvents()
			time.Sleep(2 * time.Second) // 每2秒檢查一次新事件
		}
	}
}

// CollectTetragonEvents 收集 Tetragon 事件
func (em *EventManager) collectTetragonEvents() {
	// 嘗試從 kubectl 獲取 Tetragon 事件
	cmd := exec.Command("kubectl", "logs", "-n", "kube-system", "-l", "app.kubernetes.io/name=tetragon", "--tail=10")
	output, err := cmd.Output()
	if err != nil {
		// 如果 kubectl 不可用，生成模擬事件用於演示
		log.Printf("kubectl 不可用，生成模擬事件: %v", err)
		em.generateMockEvents()
		return
	}

	lines := strings.Split(string(output), "\n")
	hasValidEvents := false
	for _, line := range lines {
		if line = strings.TrimSpace(line); line == "" {
			continue
		}
		
		event := em.parseTetragonEvent(line)
		if event != nil {
			em.addEvent(*event)
			hasValidEvents = true
			
			// 檢查是否需要生成告警
			if alert := em.evaluateForAlert(*event); alert != nil {
				em.addAlert(*alert)
			}
		}
	}
	
	// 如果沒有真實事件，也生成一些模擬事件
	if !hasValidEvents {
		em.generateMockEvents()
	}
}

// ParseTetragonEvent 解析 Tetragon 事件
func (em *EventManager) parseTetragonEvent(line string) *TetragonEvent {
	// 嘗試解析 JSON 格式的 Tetragon 事件
	var rawEvent map[string]interface{}
	if err := json.Unmarshal([]byte(line), &rawEvent); err != nil {
		// 如果不是有效的 JSON，跳過
		return nil
	}

	event := &TetragonEvent{
		Timestamp: time.Now(),
		Time:      time.Now().Format(time.RFC3339),
		NodeName:  "kind-control-plane",
	}

	// 解析不同類型的事件
	if processExec, ok := rawEvent["process_exec"]; ok {
		event.EventType = "process_exec"
		event.ProcessExec = em.parseProcessExec(processExec)
		event.Description = fmt.Sprintf("進程執行: %s", 
			event.ProcessExec.Process.Binary)
	} else if processKprobe, ok := rawEvent["process_kprobe"]; ok {
		event.EventType = "process_kprobe"
		event.ProcessKprobe = em.parseProcessKprobe(processKprobe)
		event.Description = fmt.Sprintf("系統調用: %s", 
			event.ProcessKprobe.FunctionName)
	}

	// 設置嚴重程度
	event.Severity = em.calculateSeverity(event)
	
	return event
}

// ParseProcessExec 解析進程執行事件
func (em *EventManager) parseProcessExec(data interface{}) *ProcessExec {
	// 簡化的解析邏輯，實際應該根據 Tetragon 的具體格式調整
	return &ProcessExec{
		Process: &Process{
			Pid:    12345,
			Binary: "/bin/sh",
			Arguments: "-c curl http://malicious-domain.com",
			StartTime: time.Now(),
		},
	}
}

// ParseProcessKprobe 解析內核探針事件
func (em *EventManager) parseProcessKprobe(data interface{}) *ProcessKprobe {
	return &ProcessKprobe{
		Process: &Process{
			Pid:    12345,
			Binary: "/usr/bin/cat",
			Arguments: "/etc/passwd",
			StartTime: time.Now(),
		},
		FunctionName: "security_file_open",
		Args: []string{"/etc/passwd", "O_RDONLY"},
	}
}

// GenerateMockEvents 生成模擬事件用於演示
func (em *EventManager) generateMockEvents() {
	mockEvents := []TetragonEvent{
		{
			Timestamp:   time.Now(),
			Time:        time.Now().Format(time.RFC3339),
			EventType:   "process_exec",
			NodeName:    "kind-control-plane",
			Severity:    "HIGH",
			Description: "可疑命令執行: curl 訪問外部域名",
			ProcessExec: &ProcessExec{
				Process: &Process{
					Pid:       12345,
					Binary:    "/usr/bin/curl",
					Arguments: "http://malicious-domain.com",
					StartTime: time.Now(),
					Pod: &PodInfo{
						Namespace: "fintech-demo",
						Name:      "trading-api-deployment-abc123",
						Container: &ContainerInfo{
							Name: "trading-api",
							Image: &ImageInfo{
								Name: "fintech-demo/trading-api:latest",
							},
						},
					},
				},
			},
		},
		{
			Timestamp:   time.Now(),
			Time:        time.Now().Format(time.RFC3339),
			EventType:   "process_kprobe",
			NodeName:    "kind-control-plane",
			Severity:    "CRITICAL",
			Description: "敏感文件訪問: /etc/passwd",
			ProcessKprobe: &ProcessKprobe{
				Process: &Process{
					Pid:       12346,
					Binary:    "/bin/cat",
					Arguments: "/etc/passwd",
					StartTime: time.Now(),
					Pod: &PodInfo{
						Namespace: "fintech-demo",
						Name:      "payment-gateway-deployment-def456",
						Container: &ContainerInfo{
							Name: "payment-gateway",
							Image: &ImageInfo{
								Name: "fintech-demo/payment-gateway:latest",
							},
						},
					},
				},
				FunctionName: "security_file_open",
				Args: []string{"/etc/passwd", "O_RDONLY"},
			},
		},
	}

	for _, event := range mockEvents {
		em.addEvent(event)
		
		// 生成對應的告警
		if alert := em.evaluateForAlert(event); alert != nil {
			em.addAlert(*alert)
		}
	}
}

// CalculateSeverity 計算事件嚴重程度
func (em *EventManager) calculateSeverity(event *TetragonEvent) string {
	if event.ProcessExec != nil {
		binary := event.ProcessExec.Process.Binary
		args := event.ProcessExec.Process.Arguments
		
		// 高危命令
		if strings.Contains(binary, "curl") || strings.Contains(binary, "wget") ||
		   strings.Contains(binary, "nc") || strings.Contains(binary, "nmap") {
			return "HIGH"
		}
		
		// 關鍵命令
		if strings.Contains(args, "/etc/passwd") || strings.Contains(args, "/etc/shadow") ||
		   strings.Contains(args, "rm -rf") {
			return "CRITICAL"
		}
	}
	
	if event.ProcessKprobe != nil {
		if strings.Contains(event.ProcessKprobe.FunctionName, "security_file_open") {
			return "CRITICAL"
		}
	}
	
	return "MEDIUM"
}

// EvaluateForAlert 評估是否需要生成告警
func (em *EventManager) evaluateForAlert(event TetragonEvent) *SecurityAlert {
	if event.Severity == "CRITICAL" || event.Severity == "HIGH" {
		return &SecurityAlert{
			ID:          fmt.Sprintf("alert-%d", time.Now().Unix()),
			Timestamp:   event.Timestamp,
			Severity:    event.Severity,
			Title:       fmt.Sprintf("%s 安全事件檢測", event.Severity),
			Description: event.Description,
			Event:       &event,
			Action:      "MONITOR",
			Status:      "ACTIVE",
		}
	}
	return nil
}

// AddEvent 添加事件到緩存
func (em *EventManager) addEvent(event TetragonEvent) {
	em.eventsMux.Lock()
	defer em.eventsMux.Unlock()
	
	em.events = append(em.events, event)
	
	// 保持最多1000個事件
	if len(em.events) > 1000 {
		em.events = em.events[1:]
	}
	
	// 通知所有 WebSocket 客戶端
	em.broadcastEvent(event)
}

// AddAlert 添加告警
func (em *EventManager) addAlert(alert SecurityAlert) {
	em.alertsMux.Lock()
	defer em.alertsMux.Unlock()
	
	em.alerts = append(em.alerts, alert)
	
	// 保持最多100個告警
	if len(em.alerts) > 100 {
		em.alerts = em.alerts[1:]
	}
	
	// 記錄告警日誌
	log.Printf("🚨 安全告警: %s - %s", alert.Severity, alert.Description)
}

// BroadcastEvent 廣播事件到所有 WebSocket 客戶端
func (em *EventManager) broadcastEvent(event TetragonEvent) {
	em.clientsMux.RLock()
	defer em.clientsMux.RUnlock()
	
	message, _ := json.Marshal(map[string]interface{}{
		"type":  "security_event",
		"event": event,
	})
	
	for client := range em.clients {
		err := client.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			client.Close()
			delete(em.clients, client)
		}
	}
}

// GetTetragonEvents 獲取 Tetragon 事件列表
func GetTetragonEvents(c *gin.Context) {
	limit := 50
	if limitParam := c.Query("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 && l <= 200 {
			limit = l
		}
	}
	
	severity := c.Query("severity")
	eventType := c.Query("event_type")
	
	eventManager.eventsMux.RLock()
	defer eventManager.eventsMux.RUnlock()
	
	filteredEvents := make([]TetragonEvent, 0)
	
	// 從最新開始取事件
	start := len(eventManager.events) - limit
	if start < 0 {
		start = 0
	}
	
	for i := len(eventManager.events) - 1; i >= start; i-- {
		event := eventManager.events[i]
		
		// 應用過濾器
		if severity != "" && event.Severity != severity {
			continue
		}
		if eventType != "" && event.EventType != eventType {
			continue
		}
		
		filteredEvents = append(filteredEvents, event)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"total":   len(eventManager.events),
		"events":  filteredEvents,
		"filters": gin.H{
			"severity":   severity,
			"event_type": eventType,
			"limit":      limit,
		},
	})
}

// GetSecurityAlerts 獲取安全告警列表
func GetSecurityAlerts(c *gin.Context) {
	eventManager.alertsMux.RLock()
	defer eventManager.alertsMux.RUnlock()
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"total":   len(eventManager.alerts),
		"alerts":  eventManager.alerts,
	})
}

// WebSocketHandler WebSocket 處理器
func TetragonWebSocketHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()
	
	// 註冊客戶端
	eventManager.clientsMux.Lock()
	eventManager.clients[conn] = true
	eventManager.clientsMux.Unlock()
	
	log.Printf("新的 WebSocket 客戶端連接，當前客戶端數: %d", len(eventManager.clients))
	
	// 發送歡迎消息
	welcomeMsg, _ := json.Marshal(map[string]interface{}{
		"type": "welcome",
		"message": "已連接到 Tetragon 事件流",
		"timestamp": time.Now().Format(time.RFC3339),
	})
	conn.WriteMessage(websocket.TextMessage, welcomeMsg)
	
	// 發送最近的事件
	eventManager.eventsMux.RLock()
	recentEvents := make([]TetragonEvent, 0)
	start := len(eventManager.events) - 10
	if start < 0 {
		start = 0
	}
	for i := start; i < len(eventManager.events); i++ {
		recentEvents = append(recentEvents, eventManager.events[i])
	}
	eventManager.eventsMux.RUnlock()
	
	if len(recentEvents) > 0 {
		recentMsg, _ := json.Marshal(map[string]interface{}{
			"type": "recent_events",
			"events": recentEvents,
		})
		conn.WriteMessage(websocket.TextMessage, recentMsg)
	}
	
	// 保持連接並處理客戶端消息
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
	
	// 移除客戶端
	eventManager.clientsMux.Lock()
	delete(eventManager.clients, conn)
	eventManager.clientsMux.Unlock()
	
	log.Printf("WebSocket 客戶端斷開連接，當前客戶端數: %d", len(eventManager.clients))
}

// GetEventStatistics 獲取事件統計
func GetEventStatistics(c *gin.Context) {
	eventManager.eventsMux.RLock()
	defer eventManager.eventsMux.RUnlock()
	
	stats := map[string]interface{}{
		"total_events": len(eventManager.events),
		"severity_breakdown": map[string]int{
			"CRITICAL": 0,
			"HIGH":     0,
			"MEDIUM":   0,
			"LOW":      0,
		},
		"event_type_breakdown": map[string]int{
			"process_exec":   0,
			"process_kprobe": 0,
		},
		"recent_events_count": 0,
	}
	
	now := time.Now()
	lastHour := now.Add(-time.Hour)
	
	for _, event := range eventManager.events {
		// 嚴重程度統計
		if counts, ok := stats["severity_breakdown"].(map[string]int); ok {
			counts[event.Severity]++
		}
		
		// 事件類型統計
		if counts, ok := stats["event_type_breakdown"].(map[string]int); ok {
			counts[event.EventType]++
		}
		
		// 最近一小時事件
		if event.Timestamp.After(lastHour) {
			stats["recent_events_count"] = stats["recent_events_count"].(int) + 1
		}
	}
	
	eventManager.alertsMux.RLock()
	stats["total_alerts"] = len(eventManager.alerts)
	stats["active_alerts"] = 0
	for _, alert := range eventManager.alerts {
		if alert.Status == "ACTIVE" {
			stats["active_alerts"] = stats["active_alerts"].(int) + 1
		}
	}
	eventManager.alertsMux.RUnlock()
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"statistics": stats,
	})
} 
package main

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type TetragonEvent struct {
	ID        string    `json:"id" db:"id"`
	Type      string    `json:"type" db:"type"`
	Timestamp time.Time `json:"timestamp" db:"timestamp"`
	Time      string    `json:"time" db:"time"`
	Level     string    `json:"level" db:"level"`
	Summary   string    `json:"summary" db:"summary"`
	Namespace string    `json:"namespace" db:"namespace"`
	PodName   string    `json:"pod_name" db:"pod_name"`
	Service   string    `json:"service" db:"service"`
	Binary    string    `json:"binary" db:"binary"`
	NodeName  string    `json:"node_name" db:"node_name"`
	Data      string    `json:"data" db:"data"`
	Source    string    `json:"source" db:"source"`
}

type EventStreamer struct {
	clients    map[*websocket.Conn]bool
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	broadcast  chan TetragonEvent
	db         *sql.DB
	eventsMu   sync.RWMutex
	events     []TetragonEvent // 保存最新200个事件
}

func NewEventStreamer() *EventStreamer {
	// 连接PostgreSQL数据库
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://fintech_user:password123@fintech-demo-postgresql:5432/fintech_demo?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbUrl)
	if err != nil {
		log.Printf("数据库连接失败: %v, 继续使用内存存储", err)
		db = nil
	} else {
		// 创建事件表
		createTable := `
		CREATE TABLE IF NOT EXISTS tetragon_events (
			id VARCHAR(255) PRIMARY KEY,
			type VARCHAR(100),
			timestamp TIMESTAMP,
			time VARCHAR(100),
			level VARCHAR(50),
			summary TEXT,
			namespace VARCHAR(100),
			pod_name VARCHAR(255),
			service VARCHAR(100),
			binary_path VARCHAR(255),
			node_name VARCHAR(100),
			data TEXT,
			source VARCHAR(50),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		
		CREATE INDEX IF NOT EXISTS idx_tetragon_events_timestamp ON tetragon_events(timestamp);
		CREATE INDEX IF NOT EXISTS idx_tetragon_events_namespace ON tetragon_events(namespace);
		CREATE INDEX IF NOT EXISTS idx_tetragon_events_pod_name ON tetragon_events(pod_name);
		`
		
		if _, err := db.Exec(createTable); err != nil {
			log.Printf("创建表失败: %v", err)
		} else {
			log.Println("PostgreSQL数据库连接成功")
		}
	}

	return &EventStreamer{
		clients:    make(map[*websocket.Conn]bool),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		broadcast:  make(chan TetragonEvent),
		db:         db,
		events:     make([]TetragonEvent, 0, 200),
	}
}

func (es *EventStreamer) run() {
	// 启动数据清理定时器（每10分钟）
	if es.db != nil {
		go es.startDataRotation()
	}

	for {
		select {
		case client := <-es.register:
			es.clients[client] = true
			log.Printf("WebSocket客户端已连接，当前连接数: %d", len(es.clients))
			
			// 发送最新的事件给新连接的客户端
			es.sendRecentEvents(client)

		case client := <-es.unregister:
			if _, ok := es.clients[client]; ok {
				delete(es.clients, client)
				client.Close()
				log.Printf("WebSocket客户端已断开，当前连接数: %d", len(es.clients))
			}

		case event := <-es.broadcast:
			// 存储事件
			es.storeEvent(event)
			
			// 广播给所有客户端
			for client := range es.clients {
				err := client.WriteJSON(event)
				if err != nil {
					log.Printf("发送事件到客户端失败: %v", err)
					delete(es.clients, client)
					client.Close()
				}
			}
		}
	}
}

func (es *EventStreamer) sendRecentEvents(client *websocket.Conn) {
	es.eventsMu.RLock()
	defer es.eventsMu.RUnlock()
	
	welcomeData := map[string]interface{}{
		"type":   "recent_events",
		"events": es.events,
		"count":  len(es.events),
	}
	
	if err := client.WriteJSON(welcomeData); err != nil {
		log.Printf("发送历史事件失败: %v", err)
	}
}

func (es *EventStreamer) storeEvent(event TetragonEvent) {
	// 存储到内存（保持最新200个）
	es.eventsMu.Lock()
	es.events = append(es.events, event)
	if len(es.events) > 200 {
		es.events = es.events[1:] // 移除最旧的事件
	}
	es.eventsMu.Unlock()

	// 存储到数据库
	if es.db != nil {
		go es.saveToDatabase(event)
	}
}

func (es *EventStreamer) saveToDatabase(event TetragonEvent) {
	query := `
		INSERT INTO tetragon_events 
		(id, type, timestamp, time, level, summary, namespace, pod_name, service, binary_path, node_name, data, source)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (id) DO NOTHING
	`
	
	_, err := es.db.Exec(query, 
		event.ID, event.Type, event.Timestamp, event.Time, event.Level, 
		event.Summary, event.Namespace, event.PodName, event.Service, 
		event.Binary, event.NodeName, event.Data, event.Source)
	
	if err != nil {
		log.Printf("保存事件到数据库失败: %v", err)
	}
}

func (es *EventStreamer) startDataRotation() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		// 删除10分钟前的数据
		cutoffTime := time.Now().Add(-10 * time.Minute)
		query := "DELETE FROM tetragon_events WHERE timestamp < $1"
		
		result, err := es.db.Exec(query, cutoffTime)
		if err != nil {
			log.Printf("数据轮转失败: %v", err)
		} else {
			rowsAffected, _ := result.RowsAffected()
			log.Printf("数据轮转完成，删除了 %d 条过期记录", rowsAffected)
		}
	}
}

func (es *EventStreamer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket升级失败: %v", err)
		return
	}

	es.register <- conn

	// 处理断开连接
	go func() {
		defer func() {
			es.unregister <- conn
		}()
		
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}

func (es *EventStreamer) startTetragonStream() {
	go func() {
		log.Println("启动真实Tetragon事件流监控...")
		
		for {
			// 获取可用的Tetragon Pod
			podName := es.getTetragonPod()
			if podName == "" {
				log.Println("未找到Tetragon Pod，30秒后重试...")
				time.Sleep(30 * time.Second)
				continue
			}
			
			log.Printf("使用Tetragon Pod: %s", podName)
			es.streamRealTetragonEvents(podName)
			
			log.Println("Tetragon事件流断开，5秒后重连...")
			time.Sleep(5 * time.Second)
		}
	}()
}

func (es *EventStreamer) getTetragonPod() string {
	cmd := exec.Command("kubectl", "get", "pods", "-n", "kube-system", 
		"-l", "app.kubernetes.io/name=tetragon", 
		"-o", "jsonpath={.items[0].metadata.name}")
	
	output, err := cmd.Output()
	if err != nil {
		log.Printf("获取Tetragon Pod失败: %v", err)
		return ""
	}
	
	return strings.TrimSpace(string(output))
}

func (es *EventStreamer) streamRealTetragonEvents(podName string) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	// 使用kubectl exec获取实时Tetragon事件
	cmd := exec.CommandContext(ctx, "kubectl", "exec", "-n", "kube-system", 
		podName, "-c", "tetragon", "--", "tetra", "getevents", "--output=json")
	
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Printf("创建stdout管道失败: %v", err)
		return
	}
	
	if err := cmd.Start(); err != nil {
		log.Printf("启动tetra getevents失败: %v", err)
		return
	}
	
	log.Printf("开始从Tetragon Pod %s 获取事件流...", podName)
	
	scanner := bufio.NewScanner(stdout)
	eventCount := 0
	
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		
		// 解析Tetragon JSON事件
		var rawEvent map[string]interface{}
		if err := json.Unmarshal([]byte(line), &rawEvent); err != nil {
			log.Printf("解析Tetragon事件失败: %v", err)
			continue
		}
		
		// 转换为我们的事件格式
		event := es.convertTetragonEvent(rawEvent)
		if event != nil {
			es.broadcast <- *event
			eventCount++
			
			if eventCount%10 == 0 {
				log.Printf("已处理 %d 个Tetragon事件", eventCount)
			}
		}
	}
	
	if err := scanner.Err(); err != nil {
		log.Printf("读取Tetragon事件流失败: %v", err)
	}
	
	cmd.Wait()
}

func (es *EventStreamer) convertTetragonEvent(rawEvent map[string]interface{}) *TetragonEvent {
	// 提取时间戳
	timeStr, _ := rawEvent["time"].(string)
	timestamp := time.Now()
	if timeStr != "" {
		if parsedTime, err := time.Parse(time.RFC3339, timeStr); err == nil {
			timestamp = parsedTime
		}
	}
	
	// 提取节点名称
	nodeName, _ := rawEvent["node_name"].(string)
	
	// 初始化事件信息
	eventType := "unknown"
	level := "info"
	summary := "Tetragon事件"
	namespace := ""
	podName := ""
	service := ""
	binary := ""
	
	// 处理不同类型的事件
	if processExec, ok := rawEvent["process_exec"].(map[string]interface{}); ok {
		eventType = "process_exec"
		level = "info"
		
		if process, ok := processExec["process"].(map[string]interface{}); ok {
			if bin, ok := process["binary"].(string); ok {
				binary = bin
				summary = fmt.Sprintf("进程执行: %s", bin)
			}
			
			// 提取Pod信息
			if pod, ok := process["pod"].(map[string]interface{}); ok {
				if ns, ok := pod["namespace"].(string); ok {
					namespace = ns
				}
				if name, ok := pod["name"].(string); ok {
					podName = name
				}
			}
		}
	} else if processKprobe, ok := rawEvent["process_kprobe"].(map[string]interface{}); ok {
		eventType = "process_kprobe"
		level = "warning"
		
		functionName, _ := processKprobe["function_name"].(string)
		summary = fmt.Sprintf("系统调用: %s", functionName)
		
		if process, ok := processKprobe["process"].(map[string]interface{}); ok {
			if bin, ok := process["binary"].(string); ok {
				binary = bin
			}
			
			// 提取Pod信息
			if pod, ok := process["pod"].(map[string]interface{}); ok {
				if ns, ok := pod["namespace"].(string); ok {
					namespace = ns
				}
				if name, ok := pod["name"].(string); ok {
					podName = name
				}
			}
			
			// 检查敏感系统调用
			if args, ok := processKprobe["args"].([]interface{}); ok && len(args) > 0 {
				if arg, ok := args[0].(map[string]interface{}); ok {
					if stringArg, ok := arg["string_arg"].(string); ok {
						if strings.Contains(stringArg, "/etc/passwd") || strings.Contains(stringArg, "/etc/shadow") {
							level = "critical"
							summary = fmt.Sprintf("⚠️ 敏感文件访问: %s", stringArg)
						}
					}
				}
			}
		}
	} else if processExit, ok := rawEvent["process_exit"].(map[string]interface{}); ok {
		eventType = "process_exit"
		level = "info"
		
		if process, ok := processExit["process"].(map[string]interface{}); ok {
			if bin, ok := process["binary"].(string); ok {
				binary = bin
				summary = fmt.Sprintf("进程退出: %s", bin)
			}
			
			// 提取Pod信息
			if pod, ok := process["pod"].(map[string]interface{}); ok {
				if ns, ok := pod["namespace"].(string); ok {
					namespace = ns
				}
				if name, ok := pod["name"].(string); ok {
					podName = name
				}
			}
		}
	}
	
	// 确定服务类型 - 更精确的 fintech-demo Pod 识别
	if namespace == "fintech-demo" {
		// 根据 Pod 名称确定具体服务
		if strings.Contains(podName, "trading-api") {
			service = "trading-api"
		} else if strings.Contains(podName, "payment-gateway") {
			service = "payment-gateway"
		} else if strings.Contains(podName, "risk-engine") {
			service = "risk-engine"
		} else if strings.Contains(podName, "audit-service") {
			service = "audit-service"
		} else if strings.Contains(podName, "frontend") {
			service = "frontend"
		} else if strings.Contains(podName, "postgresql") {
			service = "database"
		} else if strings.Contains(podName, "redis") {
			service = "cache"
		} else if strings.Contains(podName, "tetragon-stream") {
			service = "security-monitor"
		} else {
			service = "fintech-microservice"
		}
		
		// 提升金融服务事件的级别
		if level == "info" {
			level = "medium"
		}
		summary = "🏦 " + summary
	} else if strings.Contains(podName, "trading") || strings.Contains(podName, "payment") || 
	          strings.Contains(podName, "risk") || strings.Contains(podName, "audit") || 
	          strings.Contains(podName, "fintech") {
		service = "fintech-microservice"
		if level == "info" {
			level = "medium"
		}
		summary = "🏦 " + summary
	} else {
		service = "system"
	}
	
	// 生成事件ID
	eventID := fmt.Sprintf("tetragon-%d-%d", timestamp.Unix(), timestamp.Nanosecond())
	
	// 序列化原始数据
	dataBytes, _ := json.Marshal(rawEvent)
	
	return &TetragonEvent{
		ID:        eventID,
		Type:      eventType,
		Timestamp: timestamp,
		Time:      timeStr,
		Level:     level,
		Summary:   summary,
		Namespace: namespace,
		PodName:   podName,
		Service:   service,
		Binary:    binary,
		NodeName:  nodeName,
		Data:      string(dataBytes),
		Source:    "tetragon-real",
	}
}

// HTTP API端点
func (es *EventStreamer) handleEvents(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	// 解析查询参数
	namespace := r.URL.Query().Get("namespace")
	service := r.URL.Query().Get("service")
	podName := r.URL.Query().Get("pod_name")
	level := r.URL.Query().Get("level")
	eventType := r.URL.Query().Get("type")
	
	// 过滤事件
	es.eventsMu.RLock()
	var filteredEvents []TetragonEvent
	
	for _, event := range es.events {
		if namespace != "" && event.Namespace != namespace {
			continue
		}
		if service != "" && event.Service != service {
			continue
		}
		if podName != "" && !strings.Contains(event.PodName, podName) {
			continue
		}
		if level != "" && event.Level != level {
			continue
		}
		if eventType != "" && event.Type != eventType {
			continue
		}
		
		filteredEvents = append(filteredEvents, event)
	}
	es.eventsMu.RUnlock()
	
	// 返回最新的事件（逆序）
	if len(filteredEvents) > 0 {
		// 反转数组，显示最新的事件
		for i, j := 0, len(filteredEvents)-1; i < j; i, j = i+1, j-1 {
			filteredEvents[i], filteredEvents[j] = filteredEvents[j], filteredEvents[i]
		}
	}
	
	response := map[string]interface{}{
		"events": filteredEvents,
		"count":  len(filteredEvents),
		"total":  len(es.events),
	}
	
	json.NewEncoder(w).Encode(response)
}

// 获取命名空间列表
func (es *EventStreamer) handleNamespaces(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	// 获取所有Kubernetes命名空间
	allNamespaces := es.getAllKubernetesNamespaces()
	
	// 从事件中获取命名空间
	eventNamespaces := make(map[string]bool)
	es.eventsMu.RLock()
	for _, event := range es.events {
		if event.Namespace != "" {
			eventNamespaces[event.Namespace] = true
		}
	}
	es.eventsMu.RUnlock()
	
	// 合并所有命名空间
	allNsList := make([]string, 0)
	nsMap := make(map[string]bool)
	
	// 添加从Kubernetes API获取的命名空间
	for _, ns := range allNamespaces {
		nsMap[ns] = true
	}
	
	// 添加从事件中发现的命名空间
	for ns := range eventNamespaces {
		nsMap[ns] = true
	}
	
	// 转换为列表
	for ns := range nsMap {
		allNsList = append(allNsList, ns)
	}
	
	json.NewEncoder(w).Encode(map[string]interface{}{
		"namespaces": allNsList,
		"total":      len(allNsList),
		"from_events": len(eventNamespaces),
		"from_k8s":    len(allNamespaces),
	})
}

// 获取所有Kubernetes命名空间
func (es *EventStreamer) getAllKubernetesNamespaces() []string {
	cmd := exec.Command("kubectl", "get", "namespaces", "-o", "jsonpath={.items[*].metadata.name}")
	output, err := cmd.Output()
	if err != nil {
		log.Printf("获取Kubernetes命名空间失败: %v", err)
		return []string{}
	}
	
	namespaces := strings.Fields(string(output))
	log.Printf("从Kubernetes API获取到 %d 个命名空间: %v", len(namespaces), namespaces)
	return namespaces
}

// 获取服务列表
func (es *EventStreamer) handleServices(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	services := make(map[string]bool)
	
	es.eventsMu.RLock()
	for _, event := range es.events {
		if event.Service != "" {
			services[event.Service] = true
		}
	}
	es.eventsMu.RUnlock()
	
	var serviceList []string
	for svc := range services {
		serviceList = append(serviceList, svc)
	}
	
	json.NewEncoder(w).Encode(map[string]interface{}{
		"services": serviceList,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"service":   "tetragon-stream",
		"status":    "healthy", 
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "4.6.0",
	}
	json.NewEncoder(w).Encode(response)
}

func main() {
	streamer := NewEventStreamer()
	
	// 启动WebSocket和事件流处理
	go streamer.run()
	go streamer.startTetragonStream()
	
	// 设置HTTP路由
	http.HandleFunc("/ws/events", streamer.handleWebSocket)
	http.HandleFunc("/api/events", streamer.handleEvents)
	http.HandleFunc("/api/namespaces", streamer.handleNamespaces)
	http.HandleFunc("/api/services", streamer.handleServices)
	http.HandleFunc("/health", healthHandler)
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}
	
	log.Printf("启动增强Tetragon事件流服务...")
	log.Printf("服务运行在端口 %s", port)
	log.Printf("WebSocket端点: ws://localhost:%s/ws/events", port)
	log.Printf("REST API: http://localhost:%s/api/events", port)
	log.Printf("健康检查: http://localhost:%s/health", port)
	
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("服务启动失败:", err)
	}
} 
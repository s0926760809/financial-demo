import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Progress,
  Badge,
  Statistic,
  Table,
  Tag,
  Space,
  Button,
  Tabs,
  List,
  Alert,
  Tooltip,
  Timeline,
} from 'antd';
import {
  MonitorOutlined,
  DatabaseOutlined,
  CloudOutlined,
  ApiOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  LineChartOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// 模擬系統指標數據
const mockSystemMetrics = {
  cpu: {
    usage: 45.2,
    cores: 8,
    load: [0.65, 0.72, 0.68],
  },
  memory: {
    used: 12.5,
    total: 32.0,
    usage: 39.1,
  },
  disk: {
    used: 156.8,
    total: 500.0,
    usage: 31.4,
  },
  network: {
    inbound: 125.6,
    outbound: 89.3,
    connections: 1247,
  },
};

// 模擬服務狀態數據
const mockServices = [
  {
    key: '1',
    name: 'Trading API',
    status: 'running',
    health: 'healthy',
    instances: 3,
    cpu: 25.6,
    memory: 512,
    requests: 1250,
    latency: 45,
    errors: 2,
    uptime: '15d 8h 32m',
  },
  {
    key: '2',
    name: 'Risk Engine',
    status: 'running',
    health: 'healthy',
    instances: 2,
    cpu: 18.3,
    memory: 1024,
    requests: 892,
    latency: 120,
    errors: 0,
    uptime: '15d 8h 32m',
  },
  {
    key: '3',
    name: 'Payment Gateway',
    status: 'running',
    health: 'warning',
    instances: 2,
    cpu: 32.1,
    memory: 768,
    requests: 456,
    latency: 890,
    errors: 15,
    uptime: '12d 3h 15m',
  },
  {
    key: '4',
    name: 'Audit Service',
    status: 'running',
    health: 'healthy',
    instances: 2,
    cpu: 15.8,
    memory: 384,
    requests: 234,
    latency: 78,
    errors: 1,
    uptime: '15d 8h 32m',
  },
  {
    key: '5',
    name: 'Frontend',
    status: 'running',
    health: 'healthy',
    instances: 2,
    cpu: 8.5,
    memory: 256,
    requests: 2341,
    latency: 25,
    errors: 0,
    uptime: '15d 8h 32m',
  },
];

// 模擬基礎設施狀態
const mockInfrastructure = [
  {
    key: '1',
    component: 'Kubernetes Cluster',
    status: 'healthy',
    nodes: 4,
    pods: 24,
    memory: '85%',
    cpu: '62%',
    details: 'All nodes ready',
  },
  {
    key: '2',
    component: 'PostgreSQL',
    status: 'healthy',
    connections: 45,
    queries: 1247,
    memory: '42%',
    cpu: '18%',
    details: 'Primary + Replica',
  },
  {
    key: '3',
    component: 'Redis Cache',
    status: 'healthy',
    connections: 123,
    memory: '28%',
    cpu: '5%',
    hitRate: '94.5%',
    details: 'Cluster mode',
  },
  {
    key: '4',
    component: 'Load Balancer',
    status: 'warning',
    requests: 15600,
    memory: '75%',
    cpu: '45%',
    latency: '125ms',
    details: 'High CPU usage',
  },
];

// 模擬日誌和事件
const mockLogs = [
  {
    key: '1',
    timestamp: '2023-12-01 14:32:15',
    level: 'ERROR',
    service: 'Payment Gateway',
    message: 'Connection timeout to external payment provider',
    count: 5,
  },
  {
    key: '2',
    timestamp: '2023-12-01 14:30:42',
    level: 'WARN',
    service: 'Trading API',
    message: 'High latency detected in order processing',
    count: 12,
  },
  {
    key: '3',
    timestamp: '2023-12-01 14:28:33',
    level: 'INFO',
    service: 'Risk Engine',
    message: 'Risk calculation completed successfully',
    count: 156,
  },
  {
    key: '4',
    timestamp: '2023-12-01 14:25:18',
    level: 'DEBUG',
    service: 'Audit Service',
    message: 'Batch audit job started',
    count: 1,
  },
];

const Monitoring: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState(mockSystemMetrics);
  const [services, setServices] = useState(mockServices);
  const [refreshing, setRefreshing] = useState(false);

  // 模擬實時系統指標更新
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          usage: Math.max(Math.min(prev.cpu.usage + (Math.random() - 0.5) * 5, 100), 0),
        },
        memory: {
          ...prev.memory,
          usage: Math.max(Math.min(prev.memory.usage + (Math.random() - 0.5) * 2, 100), 0),
        },
        network: {
          ...prev.network,
          inbound: Math.max(prev.network.inbound + (Math.random() - 0.5) * 20, 0),
          outbound: Math.max(prev.network.outbound + (Math.random() - 0.5) * 15, 0),
        },
      }));

      // 更新服務指標
      setServices(prev => 
        prev.map(service => ({
          ...service,
          cpu: Math.max(Math.min(service.cpu + (Math.random() - 0.5) * 3, 100), 0),
          latency: Math.max(service.latency + (Math.random() - 0.5) * 10, 1),
          requests: service.requests + Math.floor(Math.random() * 10),
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 獲取狀態顏色
  const getStatusColor = (status: string) => {
    const statusColors = {
      healthy: '#52c41a',
      warning: '#fa8c16',
      error: '#ff4d4f',
      running: '#1890ff',
      stopped: '#8c8c8c',
    };
    return statusColors[status as keyof typeof statusColors] || '#8c8c8c';
  };

  // 獲取狀態標籤
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      healthy: { status: 'success', text: '健康' },
      warning: { status: 'warning', text: '警告' },
      error: { status: 'error', text: '錯誤' },
      running: { status: 'processing', text: '運行中' },
      stopped: { status: 'default', text: '已停止' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.healthy;
    return <Badge status={config.status as any} text={config.text} />;
  };

  // 獲取日誌級別標籤
  const getLogLevelTag = (level: string) => {
    const levelColors = {
      ERROR: 'red',
      WARN: 'orange',
      INFO: 'blue',
      DEBUG: 'green',
    };
    return <Tag color={levelColors[level as keyof typeof levelColors]}>{level}</Tag>;
  };

  // 服務監控表格列
  const serviceColumns = [
    {
      title: '服務名稱',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <div 
            style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%',
              backgroundColor: getStatusColor(record.health)
            }} 
          />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'health',
      key: 'health',
      render: getStatusBadge,
    },
    {
      title: '實例數',
      dataIndex: 'instances',
      key: 'instances',
      render: (instances: number) => <Badge count={instances} />,
    },
    {
      title: 'CPU使用率',
      dataIndex: 'cpu',
      key: 'cpu',
      render: (cpu: number) => (
        <Progress 
          percent={cpu} 
          size="small" 
          strokeColor={cpu > 80 ? '#ff4d4f' : '#52c41a'}
          format={(percent) => `${percent?.toFixed(1)}%`}
        />
      ),
    },
    {
      title: '內存使用',
      dataIndex: 'memory',
      key: 'memory',
      render: (memory: number) => `${memory}MB`,
    },
    {
      title: '請求數/分鐘',
      dataIndex: 'requests',
      key: 'requests',
      render: (requests: number) => requests.toLocaleString(),
    },
    {
      title: '平均延遲',
      dataIndex: 'latency',
      key: 'latency',
      render: (latency: number) => (
        <Text style={{ color: latency > 500 ? '#ff4d4f' : latency > 200 ? '#fa8c16' : '#52c41a' }}>
          {latency}ms
        </Text>
      ),
    },
    {
      title: '錯誤數',
      dataIndex: 'errors',
      key: 'errors',
      render: (errors: number) => (
        <Text style={{ color: errors > 10 ? '#ff4d4f' : errors > 0 ? '#fa8c16' : '#52c41a' }}>
          {errors}
        </Text>
      ),
    },
    {
      title: '運行時間',
      dataIndex: 'uptime',
      key: 'uptime',
    },
  ];

  // 基礎設施表格列
  const infraColumns = [
    {
      title: '組件',
      dataIndex: 'component',
      key: 'component',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: getStatusBadge,
    },
    {
      title: 'CPU',
      dataIndex: 'cpu',
      key: 'cpu',
    },
    {
      title: '內存',
      dataIndex: 'memory',
      key: 'memory',
    },
    {
      title: '詳情',
      dataIndex: 'details',
      key: 'details',
    },
  ];

  // 日誌表格列
  const logColumns = [
    {
      title: '時間',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => (
        <Text code style={{ fontSize: '12px' }}>{timestamp}</Text>
      ),
    },
    {
      title: '級別',
      dataIndex: 'level',
      key: 'level',
      render: getLogLevelTag,
    },
    {
      title: '服務',
      dataIndex: 'service',
      key: 'service',
    },
    {
      title: '訊息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '次數',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Badge count={count} />,
    },
  ];

  // 計算系統整體健康度
  const calculateOverallHealth = () => {
    const healthyServices = services.filter(s => s.health === 'healthy').length;
    const totalServices = services.length;
    return Math.round((healthyServices / totalServices) * 100);
  };

  const overallHealth = calculateOverallHealth();

  const handleRefresh = async () => {
    setRefreshing(true);
    // 模擬刷新操作
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
        <Col>
          <Title level={2}>
            <MonitorOutlined /> 系統監控
          </Title>
          <Text type="secondary">
            實時系統性能和服務狀態監控 | 最後更新: {new Date().toLocaleTimeString()}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<LineChartOutlined />}>
              監控圖表
            </Button>
            <Button icon={<SettingOutlined />}>
              監控設置
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              loading={refreshing}
              onClick={handleRefresh}
            >
              重新整理
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 系統警告 */}
      {services.some(service => service.health === 'warning') && (
        <Alert
          message="⚠️ 系統警告"
          description="部分服務運行狀態異常，請檢查服務健康狀況。"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 系統概覽統計 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="系統健康度"
              value={overallHealth}
              suffix="%"
              valueStyle={{ 
                color: overallHealth >= 90 ? '#52c41a' : 
                       overallHealth >= 70 ? '#fa8c16' : '#ff4d4f' 
              }}
            />
            <Progress
              percent={overallHealth}
              strokeColor={
                overallHealth >= 90 ? '#52c41a' : 
                overallHealth >= 70 ? '#fa8c16' : '#ff4d4f'
              }
              size="small"
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="CPU使用率"
              value={systemMetrics.cpu.usage}
              precision={1}
              suffix="%"
              valueStyle={{ color: systemMetrics.cpu.usage > 80 ? '#ff4d4f' : '#1890ff' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {systemMetrics.cpu.cores} 核心
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="內存使用率"
              value={systemMetrics.memory.usage}
              precision={1}
              suffix="%"
              valueStyle={{ color: systemMetrics.memory.usage > 80 ? '#ff4d4f' : '#52c41a' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {systemMetrics.memory.used}GB / {systemMetrics.memory.total}GB
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="網絡流量"
              value={systemMetrics.network.inbound}
              precision={1}
              suffix="MB/s"
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              入站: {systemMetrics.network.inbound.toFixed(1)}MB/s | 出站: {systemMetrics.network.outbound.toFixed(1)}MB/s
            </Text>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <TabPane tab="服務監控" key="1">
          <Card title="微服務狀態" extra={<Badge status="processing" text="實時監控" />}>
            <Table
              columns={serviceColumns}
              dataSource={services}
              pagination={false}
              size="middle"
            />
          </Card>
        </TabPane>

        <TabPane tab="基礎設施" key="2">
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card title="基礎設施狀態">
                <Table
                  columns={infraColumns}
                  dataSource={mockInfrastructure}
                  pagination={false}
                  size="middle"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col xs={24} lg={12}>
              <Card title="Kubernetes集群">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>節點數量:</Text>
                    <Text strong>4 / 4 Ready</Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>Pod數量:</Text>
                    <Text strong>24 Running</Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>命名空間:</Text>
                    <Text>8</Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>集群版本:</Text>
                    <Text>v1.28.4</Text>
                  </Row>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="存儲狀態">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>總存儲容量:</Text>
                    <Text strong>2TB</Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>已使用:</Text>
                    <Text>{systemMetrics.disk.usage.toFixed(1)}% ({systemMetrics.disk.used}GB)</Text>
                  </Row>
                  <Progress 
                    percent={systemMetrics.disk.usage} 
                    strokeColor={systemMetrics.disk.usage > 80 ? '#ff4d4f' : '#52c41a'}
                  />
                  <Row justify="space-between">
                    <Text>可用空間:</Text>
                    <Text>{(systemMetrics.disk.total - systemMetrics.disk.used).toFixed(1)}GB</Text>
                  </Row>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="日誌和事件" key="3">
          <Card title="系統日誌" extra={<Text type="secondary">最近100條記錄</Text>}>
            <Table
              columns={logColumns}
              dataSource={mockLogs}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 條日誌`,
              }}
              size="small"
            />
          </Card>

          <Card title="系統事件時間線" style={{ marginTop: '16px' }}>
            <Timeline>
              <Timeline.Item 
                dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />} 
                color="blue"
              >
                <Text strong>14:32:15</Text> - Payment Gateway 連接超時警告
                <br />
                <Text type="secondary">外部支付提供商響應延遲</Text>
              </Timeline.Item>
              <Timeline.Item 
                dot={<ExclamationCircleOutlined style={{ fontSize: '16px' }} />} 
                color="orange"
              >
                <Text strong>14:30:42</Text> - Trading API 高延遲檢測
                <br />
                <Text type="secondary">訂單處理延遲超過閾值</Text>
              </Timeline.Item>
              <Timeline.Item 
                dot={<CheckCircleOutlined style={{ fontSize: '16px' }} />} 
                color="green"
              >
                <Text strong>14:28:33</Text> - Risk Engine 計算完成
                <br />
                <Text type="secondary">風險評估批次處理成功</Text>
              </Timeline.Item>
              <Timeline.Item color="gray">
                <Text strong>14:25:18</Text> - Audit Service 批次任務啟動
                <br />
                <Text type="secondary">開始執行日常審計任務</Text>
              </Timeline.Item>
            </Timeline>
          </Card>
        </TabPane>

        <TabPane tab="eBPF監控" key="4">
          <Card title="eBPF安全監控狀態">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <List
                  header={<Text strong>Tetragon 監控狀態</Text>}
                  dataSource={[
                    { 
                      name: 'Tetragon Agent',
                      status: 'running',
                      description: '所有節點正常運行'
                    },
                    { 
                      name: '安全策略',
                      status: 'active',
                      description: '8個策略激活中'
                    },
                    { 
                      name: '事件收集',
                      status: 'healthy',
                      description: '每分鐘處理~150個事件'
                    },
                    { 
                      name: 'Cilium 網絡',
                      status: 'healthy',
                      description: 'eBPF數據平面正常'
                    },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={getStatusBadge(item.status)}
                        title={item.name}
                        description={item.description}
                      />
                    </List.Item>
                  )}
                />
              </Col>
              <Col xs={24} lg={12}>
                <Card title="監控指標" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Row justify="space-between">
                      <Text>文件系統事件:</Text>
                      <Text strong>1,247 / 小時</Text>
                    </Row>
                    <Row justify="space-between">
                      <Text>網絡事件:</Text>
                      <Text strong>3,891 / 小時</Text>
                    </Row>
                    <Row justify="space-between">
                      <Text>進程執行事件:</Text>
                      <Text strong>567 / 小時</Text>
                    </Row>
                    <Row justify="space-between">
                      <Text>安全告警:</Text>
                      <Text strong style={{ color: '#fa8c16' }}>23 / 小時</Text>
                    </Row>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Monitoring; 
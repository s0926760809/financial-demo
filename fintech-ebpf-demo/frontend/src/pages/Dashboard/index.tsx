import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Progress,
  Table,
  Tag,
  Badge,
  Alert,
  Button,
  Space,
  Divider,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  StockOutlined,
  SafetyOutlined,
  WarningOutlined,
  SecurityScanOutlined,
  MonitorOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// 模擬數據
const mockData = {
  portfolio: {
    totalValue: 1234567.89,
    dailyChange: 12345.67,
    dailyChangePercent: 1.23,
  },
  positions: [
    {
      key: '1',
      symbol: 'AAPL',
      name: '蘋果公司',
      quantity: 100,
      price: 175.43,
      change: 2.15,
      changePercent: 1.24,
      value: 17543,
    },
    {
      key: '2',
      symbol: 'TSLA',
      name: '特斯拉',
      quantity: 50,
      price: 234.56,
      change: -5.67,
      changePercent: -2.36,
      value: 11728,
    },
    {
      key: '3',
      symbol: 'MSFT',
      name: '微軟',
      quantity: 75,
      price: 345.67,
      change: 8.90,
      changePercent: 2.64,
      value: 25925.25,
    },
  ],
  riskMetrics: {
    riskScore: 7.5,
    var: 15678.90,
    exposureLimit: 85,
  },
  recentOrders: [
    {
      key: '1',
      orderId: 'ORD-2023-001',
      symbol: 'AAPL',
      side: 'BUY',
      quantity: 50,
      price: 175.00,
      status: 'FILLED',
      time: '09:30:15',
    },
    {
      key: '2',
      orderId: 'ORD-2023-002',
      symbol: 'TSLA',
      side: 'SELL',
      quantity: 25,
      price: 240.00,
      status: 'PENDING',
      time: '10:15:30',
    },
  ],
  securityEvents: [
    {
      key: '1',
      type: 'FILE_ACCESS',
      message: '檢測到敏感文件訪問: /etc/passwd',
      severity: 'HIGH',
      time: '10:45:12',
      service: 'trading-api',
    },
    {
      key: '2',
      type: 'NETWORK_CONNECTION',
      message: '外部DNS查詢: malicious-domain.com',
      severity: 'MEDIUM',
      time: '10:42:33',
      service: 'payment-gateway',
    },
    {
      key: '3',
      type: 'COMMAND_EXECUTION',
      message: '執行可疑命令: curl http://attacker.com',
      severity: 'CRITICAL',
      time: '10:40:15',
      service: 'risk-engine',
    },
  ],
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState(mockData);

  // 模擬實時數據更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prevData => ({
        ...prevData,
        portfolio: {
          ...prevData.portfolio,
          totalValue: prevData.portfolio.totalValue + (Math.random() - 0.5) * 1000,
          dailyChange: prevData.portfolio.dailyChange + (Math.random() - 0.5) * 100,
        },
        riskMetrics: {
          ...prevData.riskMetrics,
          riskScore: Math.max(1, Math.min(10, prevData.riskMetrics.riskScore + (Math.random() - 0.5) * 0.5)),
        },
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 訂單狀態標籤
  const getOrderStatusTag = (status: string) => {
    const statusConfig = {
      FILLED: { color: 'success', text: '已成交' },
      PENDING: { color: 'processing', text: '待執行' },
      CANCELLED: { color: 'default', text: '已取消' },
      REJECTED: { color: 'error', text: '已拒絕' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 安全事件嚴重性標籤
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

  // 故意觸發安全事件的測試按鈕
  const triggerSecurityTest = () => {
    setLoading(true);
    // 故意調用危險的API端點用於演示
    fetch('/api/trading/debug/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'cat',
        args: ['/etc/passwd']
      })
    }).catch(() => {
      // 忽略錯誤，這只是演示
    }).finally(() => {
      setLoading(false);
    });
  };

  const positionColumns = [
    { title: '股票代碼', dataIndex: 'symbol', key: 'symbol' },
    { title: '公司名稱', dataIndex: 'name', key: 'name' },
    { title: '持倉數量', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '當前價格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: '漲跌',
      key: 'change',
      render: (record: any) => (
        <Space>
          <Text type={record.change >= 0 ? 'success' : 'danger'}>
            {record.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            ${Math.abs(record.change).toFixed(2)}
          </Text>
          <Text type={record.changePercent >= 0 ? 'success' : 'danger'}>
            ({record.changePercent >= 0 ? '+' : ''}{record.changePercent.toFixed(2)}%)
          </Text>
        </Space>
      ),
    },
    {
      title: '市值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => `$${value.toLocaleString()}`,
    },
  ];

  const orderColumns = [
    { title: '訂單號', dataIndex: 'orderId', key: 'orderId' },
    { title: '股票', dataIndex: 'symbol', key: 'symbol' },
    {
      title: '方向',
      dataIndex: 'side',
      key: 'side',
      render: (side: string) => (
        <Tag color={side === 'BUY' ? 'green' : 'red'}>
          {side === 'BUY' ? '買入' : '賣出'}
        </Tag>
      ),
    },
    { title: '數量', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '價格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: getOrderStatusTag,
    },
    { title: '時間', dataIndex: 'time', key: 'time' },
  ];

  const securityColumns = [
    {
      title: '事件類型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeConfig = {
          FILE_ACCESS: { icon: <SafetyOutlined />, text: '文件訪問' },
          NETWORK_CONNECTION: { icon: <MonitorOutlined />, text: '網絡連接' },
          COMMAND_EXECUTION: { icon: <WarningOutlined />, text: '命令執行' },
        };
        const config = typeConfig[type as keyof typeof typeConfig] || { icon: null, text: type };
        return (
          <Space>
            {config.icon}
            {config.text}
          </Space>
        );
      },
    },
    { title: '事件描述', dataIndex: 'message', key: 'message' },
    {
      title: '嚴重性',
      dataIndex: 'severity',
      key: 'severity',
      render: getSeverityTag,
    },
    { title: '服務', dataIndex: 'service', key: 'service' },
    { title: '時間', dataIndex: 'time', key: 'time' },
  ];

  return (
    <div>
      <Title level={2}>金融交易儀表板</Title>
      <Text type="secondary">
        實時監控交易活動、風險指標和安全事件 | 最後更新: {new Date().toLocaleTimeString()}
      </Text>

      <Divider />

      {/* 關鍵指標卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="投資組合總值"
              value={realTimeData.portfolio.totalValue}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="USD"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日損益"
              value={realTimeData.portfolio.dailyChange}
              precision={2}
              prefix={realTimeData.portfolio.dailyChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="USD"
              valueStyle={{ color: realTimeData.portfolio.dailyChange >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="風險評分"
              value={realTimeData.riskMetrics.riskScore}
              precision={1}
              suffix="/ 10"
              prefix={<SafetyOutlined />}
              valueStyle={{ 
                color: realTimeData.riskMetrics.riskScore > 7 ? '#cf1322' : 
                       realTimeData.riskMetrics.riskScore > 5 ? '#fa8c16' : '#3f8600' 
              }}
            />
            <Progress
              percent={realTimeData.riskMetrics.riskScore * 10}
              size="small"
              status={realTimeData.riskMetrics.riskScore > 7 ? 'exception' : 'active'}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="eBPF 監控事件"
              value={realTimeData.securityEvents.length}
              prefix={<SecurityScanOutlined />}
              suffix="個"
              valueStyle={{ color: '#1890ff' }}
            />
            <Space style={{ marginTop: '8px' }}>
              <Badge status="processing" text="實時監控" />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 安全警告 */}
      {realTimeData.securityEvents.some(event => event.severity === 'CRITICAL') && (
        <Alert
          message="🚨 檢測到嚴重安全事件"
          description="eBPF監控系統檢測到高風險活動，請立即查看安全監控頁面。"
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => window.location.href = '/security'}>
              查看詳情
            </Button>
          }
          style={{ marginBottom: '16px' }}
        />
      )}

      <Row gutter={[16, 16]}>
        {/* 持倉概覽 */}
        <Col xs={24} lg={14}>
          <Card
            title="持倉概覽"
            extra={
              <Space>
                <Badge status="success" text="實時更新" />
                <Button size="small" type="primary">
                  <StockOutlined /> 新建訂單
                </Button>
              </Space>
            }
          >
            <Table
              columns={positionColumns}
              dataSource={realTimeData.positions}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* 最近訂單 */}
        <Col xs={24} lg={10}>
          <Card
            title="最近訂單"
            extra={<a href="/trading">查看全部</a>}
          >
            <Table
              columns={orderColumns}
              dataSource={realTimeData.recentOrders}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* eBPF 安全事件監控 */}
      <Card
        title="eBPF 安全事件監控"
        extra={
          <Space>
            <Button 
              size="small" 
              loading={loading}
              onClick={triggerSecurityTest}
              danger
            >
              🧪 觸發測試事件
            </Button>
            <a href="/security">查看詳細監控</a>
          </Space>
        }
        style={{ marginTop: '16px' }}
      >
        <Table
          columns={securityColumns}
          dataSource={realTimeData.securityEvents}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default Dashboard; 
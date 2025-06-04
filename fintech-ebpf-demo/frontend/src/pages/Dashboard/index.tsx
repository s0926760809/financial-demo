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
  message,
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

// 數據介面定義
interface Portfolio {
  userID: string;
  positions: { [symbol: string]: Position };
  cashBalance: number;
  totalValue: number;
  totalPL: number;
  dayPL: number;
  lastUpdated: string;
}

interface Position {
  quantity: number;
  avgCost: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPL: number;
  dayPL: number;
}

interface Order {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
}

interface TradingStats {
  userID: string;
  totalTrades: number;
  totalVolume: number;
  totalCommission: number;
  winRate: number;
  avgReturn: number;
  lastUpdated: string;
}

interface SecurityEvent {
  key: string;
  type: string;
  message: string;
  severity: string;
  time: string;
  service: string;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<Portfolio | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [tradingStats, setTradingStats] = useState<TradingStats | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);

  // 獲取投資組合數據
  const fetchPortfolioData = async () => {
    try {
      const response = await fetch('/api/v1/portfolio', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPortfolioData(data.portfolio);
      } else {
        console.error('獲取投資組合失敗');
        // 設置默認數據
        setPortfolioData({
          userID: 'demo-user-123',
          positions: {},
          cashBalance: 100000.0,
          totalValue: 100000.0,
          totalPL: 0,
          dayPL: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('獲取投資組合失敗:', error);
      // 設置默認數據
      setPortfolioData({
        userID: 'demo-user-123',
        positions: {},
        cashBalance: 100000.0,
        totalValue: 100000.0,
        totalPL: 0,
        dayPL: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  };

  // 獲取最近訂單
  const fetchRecentOrders = async () => {
    try {
      const response = await fetch('/api/v1/orders?limit=10', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentOrders(data.orders || []);
      } else {
        console.error('獲取訂單失敗');
        setRecentOrders([]);
      }
    } catch (error) {
      console.error('獲取訂單失敗:', error);
      setRecentOrders([]);
    }
  };

  // 獲取交易統計
  const fetchTradingStats = async () => {
    try {
      const response = await fetch('/api/v1/trading-stats', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTradingStats(data.stats);
      } else {
        console.error('獲取交易統計失敗');
        setTradingStats(null);
      }
    } catch (error) {
      console.error('獲取交易統計失敗:', error);
      setTradingStats(null);
    }
  };

  // 獲取安全事件
  const fetchSecurityEvents = async () => {
    try {
      const response = await fetch('http://localhost:30083/audit/search?limit=10&severity=HIGH,CRITICAL,MEDIUM', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // 轉換audit服務返回的數據格式為前端需要的格式
        const events = (data.logs || []).map((log: any, index: number) => ({
          key: index.toString(),
          type: log.action || 'UNKNOWN',
          message: log.details?.message || '安全事件監控',
          severity: log.severity || 'MEDIUM',
          time: new Date(log.timestamp).toLocaleTimeString(),
          service: log.service || 'unknown-service',
        }));
        setSecurityEvents(events);
      } else {
        console.error('獲取安全事件失敗');
        // 使用少量模擬數據作為fallback
        setSecurityEvents([
          {
            key: '1',
            type: 'MONITORING',
            message: 'eBPF監控系統運行正常',
            severity: 'LOW',
            time: new Date().toLocaleTimeString(),
            service: 'ebpf-monitor',
          }
        ]);
      }
    } catch (error) {
      console.error('獲取安全事件失敗:', error);
      // 使用少量模擬數據作為fallback
      setSecurityEvents([
        {
          key: '1',
          type: 'MONITORING',
          message: 'eBPF監控系統運行正常',
          severity: 'LOW',
          time: new Date().toLocaleTimeString(),
          service: 'ebpf-monitor',
        }
      ]);
    }
  };

  // 初始數據加載
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPortfolioData(),
          fetchRecentOrders(),
          fetchTradingStats(),
          fetchSecurityEvents(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 設置定時刷新
    const portfolioInterval = setInterval(fetchPortfolioData, 30000); // 30秒刷新投資組合
    const ordersInterval = setInterval(fetchRecentOrders, 15000); // 15秒刷新訂單
    const securityInterval = setInterval(fetchSecurityEvents, 20000); // 20秒刷新安全事件

    return () => {
      clearInterval(portfolioInterval);
      clearInterval(ordersInterval);
      clearInterval(securityInterval);
    };
  }, []);

  // 訂單狀態標籤
  const getOrderStatusTag = (status: string) => {
    const statusConfig = {
      filled: { color: 'success', text: '已成交' },
      pending: { color: 'processing', text: '待執行' },
      cancelled: { color: 'default', text: '已取消' },
      rejected: { color: 'error', text: '已拒絕' },
    };
    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || { color: 'default', text: status };
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
      // 延遲刷新安全事件以查看新的事件
      setTimeout(fetchSecurityEvents, 2000);
    });
  };

  // 轉換持倉數據為表格格式
  const getPositionsData = () => {
    if (!portfolioData?.positions) return [];
    
    return Object.entries(portfolioData.positions).map(([symbol, position], index) => ({
      key: index.toString(),
      symbol,
      name: getStockName(symbol),
      quantity: position.quantity,
      price: position.lastPrice,
      change: position.dayPL / position.quantity || 0,
      changePercent: position.quantity > 0 ? (position.dayPL / (position.quantity * position.avgCost)) * 100 : 0,
      value: position.marketValue,
    }));
  };

  // 輔助函數：獲取股票名稱
  const getStockName = (symbol: string) => {
    const nameMap: { [key: string]: string } = {
      'AAPL': '蘋果公司',
      'GOOGL': '谷歌',
      'TSLA': '特斯拉',
      'MSFT': '微軟',
      'AMZN': '亞馬遜',
      'NVDA': '英偉達',
      'META': 'Meta',
      'NFLX': '網飛',
      'JPM': '摩根大通',
      'JNJ': '強生',
      'V': 'Visa',
      'PG': '寶潔',
      'MA': '萬事達',
      'UNH': '聯合健康',
      'HD': '家得寶',
      'DIS': '迪士尼',
      'PYPL': 'PayPal',
      'BAC': '美國銀行',
      'VZ': 'Verizon',
      'ADBE': 'Adobe',
    };
    return nameMap[symbol] || symbol;
  };

  // 計算風險評分
  const calculateRiskScore = () => {
    if (!portfolioData) return 5.0;
    
    const totalValue = portfolioData.totalValue;
    const dayPLPercent = totalValue > 0 ? Math.abs(portfolioData.dayPL / totalValue) * 100 : 0;
    
    // 基於日內波動計算風險評分
    if (dayPLPercent > 5) return 9.0;
    if (dayPLPercent > 3) return 7.5;
    if (dayPLPercent > 1) return 6.0;
    return 4.5;
  };

  const positionColumns = [
    { title: '股票代碼', dataIndex: 'symbol', key: 'symbol' },
    { title: '公司名稱', dataIndex: 'name', key: 'name' },
    { title: '持倉數量', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '當前價格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price?.toFixed(2) || '0.00'}`,
    },
    {
      title: '漲跌',
      key: 'change',
      render: (record: any) => (
        <Space>
          <Text type={record.change >= 0 ? 'success' : 'danger'}>
            {record.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            ${Math.abs(record.change || 0).toFixed(2)}
          </Text>
          <Text type={record.changePercent >= 0 ? 'success' : 'danger'}>
            ({record.changePercent >= 0 ? '+' : ''}{(record.changePercent || 0).toFixed(2)}%)
          </Text>
        </Space>
      ),
    },
    {
      title: '市值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => `$${(value || 0).toLocaleString()}`,
    },
  ];

  const orderColumns = [
    { 
      title: '訂單號', 
      dataIndex: 'id', 
      key: 'id',
      render: (id: string) => id?.substring(0, 8) || 'N/A',
    },
    { title: '股票', dataIndex: 'symbol', key: 'symbol' },
    {
      title: '方向',
      dataIndex: 'side',
      key: 'side',
      render: (side: string) => (
        <Tag color={side?.toLowerCase() === 'buy' ? 'green' : 'red'}>
          {side?.toLowerCase() === 'buy' ? '買入' : '賣出'}
        </Tag>
      ),
    },
    { title: '數量', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '價格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${(price || 0).toFixed(2)}`,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: getOrderStatusTag,
    },
    { 
      title: '時間', 
      dataIndex: 'created_at', 
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleTimeString(),
    },
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
          MONITORING: { icon: <SecurityScanOutlined />, text: '系統監控' },
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

  const riskScore = calculateRiskScore();

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
              value={portfolioData?.totalValue || 0}
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
              value={portfolioData?.dayPL || 0}
              precision={2}
              prefix={(portfolioData?.dayPL || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="USD"
              valueStyle={{ color: (portfolioData?.dayPL || 0) >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="風險評分"
              value={riskScore}
              precision={1}
              suffix="/ 10"
              prefix={<SafetyOutlined />}
              valueStyle={{ 
                color: riskScore > 7 ? '#cf1322' : 
                       riskScore > 5 ? '#fa8c16' : '#3f8600' 
              }}
            />
            <Progress
              percent={riskScore * 10}
              size="small"
              status={riskScore > 7 ? 'exception' : 'active'}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="eBPF 監控事件"
              value={securityEvents.length}
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
      {securityEvents.some(event => event.severity === 'CRITICAL') && (
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
              dataSource={getPositionsData()}
              pagination={false}
              size="small"
              loading={loading}
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
              dataSource={recentOrders}
              pagination={false}
              size="small"
              loading={loading}
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
          dataSource={securityEvents}
          pagination={false}
          size="small"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default Dashboard; 
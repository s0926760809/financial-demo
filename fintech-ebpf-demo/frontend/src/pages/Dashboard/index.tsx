import React, { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
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
  DollarCircleOutlined,
  PieChartOutlined,
  RiseOutlined,
  InfoCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import styles from './Dashboard.module.css';

const { Title, Text, Paragraph } = Typography;

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

const mockPortfolioData = {
  totalValue: 185430.50,
  dayPL: 1280.75,
  dayPLPercent: 0.70,
  totalPL: 25430.50,
  totalPLPercent: 15.89,
  cashBalance: 43810.20,
  stockValue: 141620.30,
};

const mockPositions = [
  { symbol: 'AAPL', name: '蘋果', value: 35000, allocation: 24.7 },
  { symbol: 'GOOGL', name: '谷歌', value: 30000, allocation: 21.2 },
  { symbol: 'TSLA', name: '特斯拉', value: 25000, allocation: 17.6 },
  { symbol: 'MSFT', name: '微軟', value: 28000, allocation: 19.8 },
  { symbol: 'AMZN', name: '亞馬遜', value: 23620.3, allocation: 16.7 },
];

const mockValueHistory = [
  { name: '9:30', value: 184150 },
  { name: '10:00', value: 184500 },
  { name: '11:00', value: 185100 },
  { name: '13:00', value: 184800 },
  { name: '14:00', value: 185250 },
  { name: '15:00', value: 185430.50 },
];

const mockRecentActivities = [
    { id: '1', type: '買入', symbol: 'AAPL', quantity: 10, price: 175.50, time: '14:35:12' },
    { id: '2', type: '賣出', symbol: 'NVDA', quantity: 5, price: 450.20, time: '11:02:45' },
    { id: '3', type: '系統', message: '登入成功', status: '正常', time: '09:25:01' },
    { id: '4', type: '安全', message: '偵測到可疑的API呼叫', status: '高風險', time: '14:38:00' },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

interface StatisticCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend: number;
  trendDesc: string;
  loading: boolean;
  valueStyle?: React.CSSProperties;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ icon, title, value, prefix, suffix, trend, trendDesc, loading, valueStyle }) => (
  <Card loading={loading} className={styles.statisticCard}>
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space align="center" size="middle">
        <div className={styles.iconWrapper}>{icon}</div>
        <Text type="secondary">{title}</Text>
      </Space>
      <Statistic
        value={value}
        precision={2}
        prefix={prefix}
        valueStyle={valueStyle}
      />
      <div className={styles.trend}>
        <Text type="secondary">
          {trend > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          <span style={{ color: trend > 0 ? '#52c41a' : '#ff4d4f', margin: '0 4px' }}>
            {trend.toFixed(2)}{suffix}
          </span>
          {trendDesc}
        </Text>
      </div>
    </Space>
  </Card>
);

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

  const recentActivityColumns = [
    { title: '時間', dataIndex: 'time', key: 'time' },
    { title: '類型', dataIndex: 'type', key: 'type', render: (type: string) => <Tag color={type === '買入' ? 'blue' : 'red'}>{type}</Tag> },
    { title: '詳情', key: 'details', render: (_: any, record: any) => record.symbol ? `${record.symbol} ${record.quantity}股 @ ${record.price}` : record.message },
    { title: '狀態', dataIndex: 'status', key: 'status', render: (status: string) => status ? <Tag color={status === '高風險' ? 'volcano' : 'green'}>{status}</Tag> : null }
  ];

  return (
    <div className={styles.dashboard}>
      <Title level={2} style={{ marginBottom: '24px' }}>儀表板總覽</Title>
      
      {/* 數據摘要區 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={12} lg={6}>
          <StatisticCard
            icon={<DollarCircleOutlined />}
            title="總資產 (USD)"
            value={mockPortfolioData.totalValue}
            prefix="$"
            trend={mockPortfolioData.dayPL}
            trendDesc="較昨日"
            loading={loading}
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
            <StatisticCard
                icon={<RiseOutlined />}
                title="今日損益 (USD)"
                value={mockPortfolioData.dayPL}
                prefix={mockPortfolioData.dayPL > 0 ? '+$' : '-$'}
                trend={mockPortfolioData.dayPLPercent}
                suffix="%"
                trendDesc="今日回報率"
                loading={loading}
                valueStyle={{ color: mockPortfolioData.dayPL > 0 ? '#52c41a' : '#ff4d4f' }}
            />
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
             <StatisticCard
                icon={<StockOutlined />}
                title="持股總值 (USD)"
                value={mockPortfolioData.stockValue}
                prefix="$"
                trend={mockPortfolioData.totalPLPercent}
                suffix="%"
                trendDesc="總回報率"
                loading={loading}
                valueStyle={{ color: '#1890ff' }}
            />
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
            <Card loading={loading} className={styles.statisticCard}>
                <Statistic title="風險評級" value="中等" valueStyle={{ color: '#faad14' }} prefix={<FireOutlined />} />
                <Paragraph type="secondary" style={{ marginTop: '16px' }}>根據您的持倉集中度和近期交易活躍度評估。</Paragraph>
            </Card>
        </Col>
      </Row>

      {/* 圖表區 */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={16}>
          <Card title="資產趨勢" className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockValueHistory}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis domain={['dataMin - 1000', 'dataMax + 1000']} />
                <CartesianGrid strokeDasharray="3 3" />
                <RechartsTooltip />
                <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="持倉分佈" className={styles.chartCard}>
             <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockPositions}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {mockPositions.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(value, name, props) => [`$${value}`, props.payload.name]}/>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

       {/* 最近活動 */}
       <Row style={{ marginTop: '24px' }}>
         <Col span={24}>
            <Card title="最近活動與安全事件">
                <Table 
                    dataSource={mockRecentActivities} 
                    columns={recentActivityColumns} 
                    pagination={false}
                    size="small"
                />
            </Card>
         </Col>
       </Row>

    </div>
  );
};

export default Dashboard; 
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
  Radio,
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

// 新增歷史數據點的介面
interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

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
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistoryPoint[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState('1M');

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
      const response = await fetch('/api/audit/search?limit=10&severity=HIGH,CRITICAL,MEDIUM', {
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

  // 獲取投資組合歷史數據
  const fetchPortfolioHistory = async (period: string) => {
    setLoading(true); // 可以考慮為圖表設置單獨的loading狀態
    try {
      const response = await fetch(`/api/v1/portfolio/history?period=${period}`, {
        headers: { 'X-User-ID': 'demo-user-123' }
      });
      if (response.ok) {
        const data = await response.json();
        // 將後端返回的 date 和 value 映射到 recharts 需要的 name 和 value
        setPortfolioHistory(data.history.map((p: any) => ({ name: p.date.slice(5), value: p.value })));
      } else {
        console.error('獲取投資組合歷史失敗');
      }
    } catch (error) {
      console.error('獲取投資組合歷史失敗:', error);
    } finally {
      setLoading(false);
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
    fetchPortfolioHistory(historyPeriod); // 初始加載歷史數據

    const portfolioInterval = setInterval(fetchPortfolioData, 30000);
    const ordersInterval = setInterval(fetchRecentOrders, 15000); 
    const securityInterval = setInterval(fetchSecurityEvents, 20000);

    return () => {
      clearInterval(portfolioInterval);
      clearInterval(ordersInterval);
      clearInterval(securityInterval);
    };
  }, []);

  // 當時間週期變化時，重新獲取歷史數據
  useEffect(() => {
      fetchPortfolioHistory(historyPeriod);
  }, [historyPeriod]);
  
  // 從 portfolioData 派生出圖表所需的持倉數據
  const positionChartData = useMemo(() => {
    if (!portfolioData?.positions) return [];
    return Object.entries(portfolioData.positions).map(([symbol, position]) => ({
      name: symbol,
      value: position.marketValue,
    }));
  }, [portfolioData]);

  // 合併訂單和安全事件作為最近活動
  const recentActivities = useMemo(() => {
    const formattedOrders = recentOrders.map(o => ({
      key: `order-${o.id}`,
      time: new Date(o.created_at).toLocaleTimeString(),
      type: o.side === 'buy' ? '買入' : '賣出',
      details: `${o.symbol} ${o.quantity}股 @ $${o.price.toFixed(2)}`,
      status: o.status,
    }));

    const formattedEvents = securityEvents.map(e => ({
      key: `event-${e.key}`,
      time: e.time,
      type: '安全事件',
      details: e.message,
      status: e.severity,
    }));
    
    return [...formattedOrders, ...formattedEvents]
      .sort((a, b) => b.time.localeCompare(a.time)) // Sort by time desc
      .slice(0, 10); // Limit to latest 10 activities
  }, [recentOrders, securityEvents]);

  const recentActivityColumns = [
    { title: '時間', dataIndex: 'time', key: 'time' },
    { title: '類型', dataIndex: 'type', key: 'type', render: (type: string) => {
        let color = 'default';
        if (type === '買入') color = 'blue';
        else if (type === '賣出') color = 'red';
        else if (type === '安全事件') color = 'orange';
        return <Tag color={color}>{type}</Tag>;
    }},
    { title: '詳情', dataIndex: 'details', key: 'details' },
    { title: '狀態', dataIndex: 'status', key: 'status', render: (status: string) => {
        if (!status) return null;
        const s = status.toLowerCase();
        let color = 'default';
        if (s === 'filled' || s === 'low') color = 'success';
        else if (s === 'critical' || s === 'high') color = 'error';
        else if (s === 'medium') color = 'warning';
        return <Tag color={color}>{status}</Tag>;
    }},
  ];

  const stockValue = useMemo(() => {
      if (!portfolioData?.positions) return 0;
      return Object.values(portfolioData.positions).reduce((acc, pos) => acc + pos.marketValue, 0);
  }, [portfolioData]);

  const totalPLPercent = useMemo(() => {
      if (!portfolioData || portfolioData.totalValue === 0) return 0;
      const totalCost = portfolioData.totalValue - portfolioData.totalPL;
      if (totalCost === 0) return 0;
      return (portfolioData.totalPL / totalCost) * 100;
  }, [portfolioData]);

  return (
    <div className={styles.dashboard}>
      <Title level={2} style={{ marginBottom: '24px' }}>儀表板總覽</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={12} lg={6}>
          <StatisticCard
            icon={<DollarCircleOutlined />}
            title="總資產 (USD)"
            value={portfolioData?.totalValue || 0}
            prefix="$"
            trend={portfolioData?.dayPL || 0}
            trendDesc="較昨日"
            loading={loading}
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
            <StatisticCard
                icon={<RiseOutlined />}
                title="今日損益 (USD)"
                value={portfolioData?.dayPL || 0}
                prefix={(portfolioData?.dayPL || 0) >= 0 ? '+$' : '-$'}
                trend={(portfolioData?.dayPL || 0) / (portfolioData?.totalValue || 1) * 100}
                suffix="%"
                trendDesc="今日回報率"
                loading={loading}
                valueStyle={{ color: (portfolioData?.dayPL || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
             <StatisticCard
                icon={<StockOutlined />}
                title="持股總值 (USD)"
                value={stockValue}
                prefix="$"
                trend={totalPLPercent}
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

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={16}>
          <Card 
            title="資產趨勢" 
            className={styles.chartCard} 
            loading={loading}
            extra={
              <Radio.Group 
                value={historyPeriod} 
                onChange={(e) => setHistoryPeriod(e.target.value)} 
                size="small"
              >
                <Radio.Button value="7D">7D</Radio.Button>
                <Radio.Button value="1M">1M</Radio.Button>
                <Radio.Button value="3M">3M</Radio.Button>
                <Radio.Button value="1Y">1Y</Radio.Button>
              </Radio.Group>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={portfolioHistory}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis domain={['dataMin - 1000', 'dataMax + 1000']} />
                <CartesianGrid strokeDasharray="3 3" />
                <RechartsTooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '資產淨值']}/>
                <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="持倉分佈" className={styles.chartCard} loading={loading}>
             <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={positionChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {positionChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}/>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

       <Row style={{ marginTop: '24px' }}>
         <Col span={24}>
            <Card title="最近活動與安全事件">
                <Table 
                    dataSource={recentActivities} 
                    columns={recentActivityColumns} 
                    pagination={{ pageSize: 5 }}
                    size="small"
                />
            </Card>
         </Col>
       </Row>

    </div>
  );
};

export default Dashboard; 
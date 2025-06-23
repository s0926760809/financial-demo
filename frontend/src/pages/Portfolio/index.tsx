import React, { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Progress,
  Tag,
  Space,
  Statistic,
  Divider,
  Button,
  Select,
  DatePicker,
  Tabs,
  List,
  Avatar,
  Tooltip,
  Spin,
  message,
  Empty,
  Modal
} from 'antd';
import {
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  PercentageOutlined,
  TrophyOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  MinusOutlined,
  WalletOutlined,
  BankOutlined,
  StockOutlined,
} from '@ant-design/icons';
import styles from './Portfolio.module.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// --- Interfaces and Mock Data ---
interface Position {
  key: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  logo: string;
}

interface PortfolioData {
  totalValue: number;
  totalPL: number;
  dayPL: number;
  cashBalance: number;
}

const mockHoldings = [
    { key: 'AAPL', symbol: 'AAPL', name: '蘋果公司', quantity: 50, avgPrice: 150.25, currentPrice: 175.80, marketValue: 8790, unrealizedPnL: 1277.5, unrealizedPnLPercent: 17.0, logo: '🍎' },
    { key: 'GOOGL', symbol: 'GOOGL', name: '谷歌', quantity: 20, avgPrice: 130.50, currentPrice: 135.20, marketValue: 2704, unrealizedPnL: 94, unrealizedPnLPercent: 3.6, logo: '🔍' },
    { key: 'TSLA', symbol: 'TSLA', name: '特斯拉', quantity: 30, avgPrice: 250.00, currentPrice: 220.50, marketValue: 6615, unrealizedPnL: -885, unrealizedPnLPercent: -11.8, logo: '🚗' },
];
const mockPortfolioData = { totalValue: 18109, totalPL: 486.5, dayPL: -150.3, cashBalance: 10000 };

// --- Sub Components ---

interface PortfolioSummaryProps {
  data: PortfolioData | null;
  loading: boolean;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ data, loading }) => (
  <Card className={styles.summaryCard}>
    <Spin spinning={loading}>
      <Row gutter={16}>
        <Col span={6}><Statistic title={<Space><WalletOutlined /><span>總市值</span></Space>} prefix="$" value={data?.totalValue} precision={2} valueStyle={{color: '#1890ff'}} /></Col>
        <Col span={6}><Statistic title={<Space><RiseOutlined /><span>今日盈虧</span></Space>} prefix={data?.dayPL && data.dayPL >= 0 ? '+$' : '-$'} value={data?.dayPL ? Math.abs(data.dayPL) : 0} precision={2} valueStyle={{color: data?.dayPL && data.dayPL >= 0 ? '#52c41a' : '#ff4d4f'}} /></Col>
        <Col span={6}><Statistic title={<Space><StockOutlined /><span>總盈虧</span></Space>} prefix={data?.totalPL && data.totalPL >= 0 ? '+$' : '-$'} value={data?.totalPL ? Math.abs(data.totalPL) : 0} precision={2} valueStyle={{color: data?.totalPL && data.totalPL >= 0 ? '#52c41a' : '#ff4d4f'}} /></Col>
        <Col span={6}><Statistic title={<Space><BankOutlined /><span>現金餘額</span></Space>} prefix="$" value={data?.cashBalance} precision={2} /></Col>
      </Row>
    </Spin>
  </Card>
);

interface PositionCardProps {
  position: Position;
}

const PositionCard: React.FC<PositionCardProps> = ({ position }) => {
  const isProfit = position.unrealizedPnL >= 0;
  return (
    <Card className={styles.positionCard} actions={[
      <Button type="primary" icon={<PlusOutlined />}>買入</Button>,
      <Button icon={<MinusOutlined />}>賣出</Button>,
    ]}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div className={styles.cardHeader}>
          <Space align="center">
            <span className={styles.logo}>{position.logo}</span>
            <div>
              <Title level={5} style={{ marginBottom: 0 }}>{position.name}</Title>
              <Text type="secondary">{position.symbol}</Text>
            </div>
          </Space>
          <Tag color={isProfit ? 'green' : 'red'}>{isProfit ? '盈利中' : '虧損中'}</Tag>
        </div>
        <Row gutter={16} className={styles.cardStats}>
          <Col span={8}><Statistic title="持倉" value={position.quantity} suffix="股" /></Col>
          <Col span={8}><Statistic title="市值" prefix="$" value={position.marketValue} precision={2} /></Col>
          <Col span={8}><Statistic title="盈虧" prefix={isProfit ? '+$' : '-$'} value={Math.abs(position.unrealizedPnL)} precision={2} valueStyle={{ color: isProfit ? '#52c41a' : '#ff4d4f' }} /></Col>
        </Row>
      </Space>
    </Card>
  );
};

// --- Main Portfolio Component ---
const Portfolio: React.FC = () => {
  const [holdings, setHoldings] = useState<Position[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  // 輔助函數：獲取股票名稱 (保留，因為API數據中只有symbol)
  const getStockName = (symbol: string) => {
    const nameMap: { [key: string]: string } = {
      'AAPL': '蘋果公司', 'GOOGL': '谷歌', 'TSLA': '特斯拉', 'MSFT': '微軟', 'AMZN': '亞馬遜',
      'NVDA': '英偉達', 'META': 'Meta', 'NFLX': '網飛', 'JPM': '摩根大通', 'JNJ': '強生',
      'V': 'Visa', 'PG': '寶潔', 'MA': '萬事達', 'UNH': '聯合健康', 'HD': '家得寶',
      'DIS': '迪士尼', 'PYPL': 'PayPal', 'BAC': '美國銀行', 'VZ': 'Verizon', 'ADBE': 'Adobe',
    };
    return nameMap[symbol] || symbol;
  };

  // 輔助函數：獲取股票圖標 (保留)
  const getStockLogo = (symbol: string) => {
    const logoMap: { [key: string]: string } = {
      'AAPL': '🍎', 'GOOGL': '🔍', 'TSLA': '🚗', 'MSFT': '💻', 'AMZN': '📦', 'NVDA': '🎮', 'META': '📘',
      'NFLX': '🎬', 'JPM': '🏦', 'JNJ': '💊', 'V': '💳', 'PG': '🧴', 'MA': '💳', 'UNH': '🏥',
      'HD': '🔨', 'DIS': '🏰', 'PYPL': '💰', 'BAC': '🏦', 'VZ': '📱', 'ADBE': '🎨',
    };
    return logoMap[symbol] || '📈';
  };

  // 獲取投資組合數據
  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/portfolio', {
        headers: { 'X-User-ID': 'demo-user-123' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const apiPortfolio = data.portfolio;

        setPortfolioData({
            totalValue: apiPortfolio.totalValue,
            totalPL: apiPortfolio.totalPL,
            dayPL: apiPortfolio.dayPL,
            cashBalance: apiPortfolio.cashBalance,
        });
        
        const positions: Position[] = Object.entries(apiPortfolio.positions || {}).map(([symbol, pos]: [string, any]) => ({
          key: symbol,
          symbol: symbol,
          name: getStockName(symbol),
          quantity: pos.quantity,
          avgPrice: pos.avgCost,
          currentPrice: pos.lastPrice,
          marketValue: pos.marketValue,
          unrealizedPnL: pos.unrealizedPL,
          unrealizedPnLPercent: pos.quantity > 0 ? (pos.unrealizedPL / (pos.quantity * pos.avgCost)) * 100 : 0,
          logo: getStockLogo(symbol),
        }));
        
        setHoldings(positions);
      } else {
        message.error('獲取投資組合失敗');
        setHoldings([]);
        setPortfolioData(null);
      }
    } catch (error) {
      console.error('獲取投資組合失敗:', error);
      message.error('連接服務器失敗');
    } finally {
      setLoading(false);
    }
  };

  // 獲取交易歷史
  const fetchTradingHistory = async () => {
    try {
      const response = await fetch('/api/v1/trades?limit=50', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error('獲取交易歷史失敗:', error);
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
        setStats(data.stats);
      }
    } catch (error) {
      console.error('獲取交易統計失敗:', error);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchTradingHistory();
    fetchTradingStats();
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, []);

  // 計算總體統計
  const totalMarketValue = portfolioData?.totalValue || 0;
  const totalCashBalance = portfolioData?.cashBalance || 0;
  const totalUnrealizedPnL = portfolioData?.totalPL || 0;
  const totalCost = totalMarketValue - totalCashBalance - totalUnrealizedPnL;
  const totalUnrealizedPnLPercent = totalCost > 0 ? (totalUnrealizedPnL / totalCost) * 100 : 0;
  const dayPL = portfolioData?.dayPL || 0;

  // 持倉表格列
  const holdingColumns = [
    {
      title: '股票',
      key: 'stock',
      render: (record: any) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
            {record.logo}
          </Avatar>
          <div>
            <Text strong>{record.symbol}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.name}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '持股數量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => quantity.toLocaleString(),
    },
    {
      title: '平均成本',
      dataIndex: 'avgPrice',
      key: 'avgPrice',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: '當前價格',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      render: (price: number, record: any) => (
        <Space direction="vertical" size={0}>
          <Text className="financial-number">${price.toFixed(2)}</Text>
          {record.isMarketOpen ? (
            <Text type="secondary" style={{ fontSize: '10px' }}>實時</Text>
          ) : (
            <Text type="secondary" style={{ fontSize: '10px' }}>休市</Text>
          )}
        </Space>
      ),
    },
    {
      title: '市值',
      dataIndex: 'marketValue',
      key: 'marketValue',
      render: (value: number) => (
        <Text className="financial-number">${value.toLocaleString()}</Text>
      ),
    },
    {
      title: '未實現盈虧',
      key: 'unrealizedPnL',
      render: (record: any) => (
        <Space direction="vertical" size={0}>
          <Text 
            className={record.unrealizedPnL >= 0 ? 'financial-positive' : 'financial-negative'}
          >
            {record.unrealizedPnL >= 0 ? '+' : ''}${record.unrealizedPnL.toFixed(2)}
          </Text>
          <Text 
            className={record.unrealizedPnLPercent >= 0 ? 'financial-positive' : 'financial-negative'}
            style={{ fontSize: '12px' }}
          >
            ({record.unrealizedPnLPercent >= 0 ? '+' : ''}{record.unrealizedPnLPercent.toFixed(2)}%)
          </Text>
        </Space>
      ),
    },
    {
      title: '今日盈虧',
      dataIndex: 'dayPL',
      key: 'dayPL',
      render: (dayPL: number) => (
        <Text className={dayPL >= 0 ? 'financial-positive' : 'financial-negative'}>
          {dayPL >= 0 ? '+' : ''}${dayPL.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '權重',
      dataIndex: 'weight',
      key: 'weight',
      render: (weight: number) => (
        <div>
          <Text>{weight.toFixed(1)}%</Text>
          <Progress 
            percent={weight} 
            size="small" 
            showInfo={false}
            strokeColor={weight > 20 ? '#ff4d4f' : '#1890ff'}
          />
        </div>
      ),
    },
    {
      title: '板塊',
      dataIndex: 'sector',
      key: 'sector',
      render: (sector: string) => <Tag color="blue">{sector}</Tag>,
    },
  ];

  // 交易歷史表格列
  const tradeColumns = [
    {
      title: '時間',
      dataIndex: 'executedAt',
      key: 'executedAt',
      render: (time: string) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(time).toLocaleString()}
        </Text>
      ),
    },
    {
      title: '股票',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string) => <Text strong>{symbol}</Text>,
    },
    {
      title: '方向',
      dataIndex: 'side',
      key: 'side',
      render: (side: string) => (
        <Tag color={side === 'buy' ? 'green' : 'red'}>
          {side === 'buy' ? '買入' : '賣出'}
        </Tag>
      ),
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => quantity.toLocaleString(),
    },
    {
      title: '價格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `$${amount.toLocaleString()}`,
    },
    {
      title: '手續費',
      dataIndex: 'commission',
      key: 'commission',
      render: (commission: number) => `$${commission.toFixed(2)}`,
    },
  ];

  return (
    <div className={styles.portfolioPage}>
      <Title level={2}>我的投資組合</Title>
      <Paragraph type="secondary">查看您的持倉詳情、歷史交易和表現分析。</Paragraph>
      
      <PortfolioSummary data={portfolioData} loading={loading} />

      <Title level={3} style={{ marginTop: '32px' }}>持倉列表</Title>
      
      <Spin spinning={loading && holdings.length === 0}>
        {holdings.length > 0 ? (
          <Row gutter={[24, 24]}>
            {holdings.map(pos => (
              <Col xs={24} sm={24} md={12} lg={8} key={pos.key}>
                <PositionCard position={pos} />
              </Col>
            ))}
          </Row>
        ) : (
          !loading && <Empty description="暫無持倉數據" style={{marginTop: '48px'}} />
        )}
      </Spin>
    </div>
  );
};

export default Portfolio; 
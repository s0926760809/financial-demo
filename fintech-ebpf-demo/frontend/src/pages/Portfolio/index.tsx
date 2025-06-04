import React, { useState, useEffect } from 'react';
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
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const Portfolio: React.FC = () => {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  // 獲取投資組合數據
  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/portfolio', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPortfolioData(data.portfolio);
        
        // 轉換持倉數據格式
        const positions = Object.entries(data.portfolio.positions || {}).map(([symbol, position]: [string, any]) => ({
          key: symbol,
          symbol: symbol,
          name: getStockName(symbol),
          quantity: position.quantity,
          avgPrice: position.avgCost,
          currentPrice: position.lastPrice,
          marketValue: position.marketValue,
          unrealizedPnL: position.unrealizedPL,
          unrealizedPnLPercent: position.quantity > 0 ? (position.unrealizedPL / (position.quantity * position.avgCost)) * 100 : 0,
          weight: data.portfolio.totalValue > 0 ? (position.marketValue / data.portfolio.totalValue) * 100 : 0,
          sector: getSector(symbol),
          logo: getStockLogo(symbol),
          dayPL: position.dayPL || 0,
          isMarketOpen: position.isMarketOpen || false,
        }));
        
        setHoldings(positions);
      } else {
        message.error('獲取投資組合失敗');
        // 設置空的投資組合數據
        setPortfolioData({
          userID: 'demo-user-123',
          positions: {},
          cashBalance: 100000.0,
          totalValue: 100000.0,
          totalPL: 0,
          dayPL: 0,
          lastUpdated: new Date().toISOString(),
        });
        setHoldings([]);
      }
    } catch (error) {
      console.error('獲取投資組合失敗:', error);
      message.error('連接服務器失敗');
      // 設置空的投資組合數據
      setPortfolioData({
        userID: 'demo-user-123',
        positions: {},
        cashBalance: 100000.0,
        totalValue: 100000.0,
        totalPL: 0,
        dayPL: 0,
        lastUpdated: new Date().toISOString(),
      });
      setHoldings([]);
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
      const response = await fetch('/api/v1/stats', {
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

  // 輔助函數：獲取板塊
  const getSector = (symbol: string) => {
    const sectorMap: { [key: string]: string } = {
      'AAPL': '科技股',
      'GOOGL': '科技股',
      'TSLA': '汽車股',
      'MSFT': '科技股',
      'AMZN': '電商股',
      'NVDA': '科技股',
      'META': '科技股',
      'NFLX': '媒體股',
      'JPM': '金融股',
      'JNJ': '醫療股',
      'V': '金融股',
      'PG': '消費股',
      'MA': '金融股',
      'UNH': '醫療股',
      'HD': '零售股',
      'DIS': '媒體股',
      'PYPL': '金融股',
      'BAC': '金融股',
      'VZ': '電信股',
      'ADBE': '科技股',
    };
    return sectorMap[symbol] || '其他';
  };

  // 輔助函數：獲取股票圖標
  const getStockLogo = (symbol: string) => {
    const logoMap: { [key: string]: string } = {
      'AAPL': '🍎',
      'GOOGL': '🔍',
      'TSLA': '🚗',
      'MSFT': '💻',
      'AMZN': '📦',
      'NVDA': '🎮',
      'META': '📘',
      'NFLX': '🎬',
      'JPM': '🏦',
      'JNJ': '💊',
      'V': '💳',
      'PG': '🧴',
      'MA': '💳',
      'UNH': '🏥',
      'HD': '🔨',
      'DIS': '🏰',
      'PYPL': '💰',
      'BAC': '🏦',
      'VZ': '📱',
      'ADBE': '🎨',
    };
    return logoMap[symbol] || '📈';
  };

  useEffect(() => {
    // 首次載入數據
    fetchPortfolio();
    fetchTradingHistory();
    fetchTradingStats();
    
    // 每30秒刷新一次投資組合數據
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
    <Spin spinning={loading}>
      <div>
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Title level={2}>
              <PieChartOutlined /> 投資組合
            </Title>
            <Text type="secondary">
              實時投資組合分析和績效追蹤 | 最後更新: {portfolioData?.lastUpdated ? new Date(portfolioData.lastUpdated).toLocaleString() : '未更新'}
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchPortfolio}>
                重新整理
              </Button>
              <Button icon={<DownloadOutlined />}>
                導出報告
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 投資組合總覽 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="總資產價值"
                value={totalMarketValue}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="USD"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="現金餘額"
                value={totalCashBalance}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="USD"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="未實現盈虧"
                value={totalUnrealizedPnL}
                precision={2}
                prefix={totalUnrealizedPnL >= 0 ? <RiseOutlined /> : <FallOutlined />}
                suffix={`USD (${totalUnrealizedPnLPercent.toFixed(2)}%)`}
                valueStyle={{ 
                  color: totalUnrealizedPnL >= 0 ? '#52c41a' : '#ff4d4f' 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="今日盈虧"
                value={dayPL}
                precision={2}
                prefix={dayPL >= 0 ? <RiseOutlined /> : <FallOutlined />}
                suffix="USD"
                valueStyle={{ 
                  color: dayPL >= 0 ? '#52c41a' : '#ff4d4f' 
                }}
              />
            </Card>
          </Col>
        </Row>

        <Tabs defaultActiveKey="1">
          <TabPane tab="持倉詳情" key="1">
            <Card title="當前持倉" extra={holdings.length > 0 && `共 ${holdings.length} 支股票`}>
              {holdings.length > 0 ? (
                <Table
                  columns={holdingColumns}
                  dataSource={holdings}
                  pagination={false}
                  size="middle"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text type="secondary">暫無持倉數據</Text>
                  <br />
                  <Text type="secondary">您可以到交易中心進行買入操作</Text>
                </div>
              )}
            </Card>
          </TabPane>

          <TabPane tab="交易歷史" key="2">
            <Card title="交易記錄" extra={trades.length > 0 && `共 ${trades.length} 筆交易`}>
              {trades.length > 0 ? (
                <Table
                  columns={tradeColumns}
                  dataSource={trades}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 筆交易`,
                  }}
                  size="middle"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text type="secondary">暫無交易記錄</Text>
                  <br />
                  <Text type="secondary">您可以到交易中心進行交易</Text>
                </div>
              )}
            </Card>
          </TabPane>

          <TabPane tab="績效分析" key="3">
            <Card title="投資績效">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="總收益率"
                    value={totalUnrealizedPnLPercent}
                    precision={2}
                    suffix="%"
                    prefix={totalUnrealizedPnL >= 0 ? <RiseOutlined /> : <FallOutlined />}
                    valueStyle={{ 
                      color: totalUnrealizedPnL >= 0 ? '#52c41a' : '#ff4d4f' 
                    }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="交易次數"
                    value={stats?.totalTrades || 0}
                    prefix={<TrophyOutlined />}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="勝率"
                    value={stats?.winRate || 0}
                    precision={1}
                    suffix="%"
                    prefix={<PercentageOutlined />}
                  />
                </Col>
              </Row>
              
              <Divider />
              
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Text type="secondary">績效圖表功能開發中...</Text>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </div>
    </Spin>
  );
};

export default Portfolio; 
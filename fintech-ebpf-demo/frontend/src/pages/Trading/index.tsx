import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Button,
  Form,
  Input,
  Select,
  InputNumber,
  Modal,
  Tag,
  Space,
  Divider,
  Statistic,
  Progress,
  Alert,
  Tabs,
  List,
  Badge,
  message,
  Popconfirm,
} from 'antd';
import {
  StockOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Trading: React.FC = () => {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);

  // 獲取實時市場數據
  const fetchMarketData = async () => {
    setMarketLoading(true);
    try {
      const response = await fetch('/api/v1/market/stocks', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // 轉換數據格式以適應前端表格
        const formattedData = data.stocks.map((stock: any, index: number) => ({
          key: (index + 1).toString(),
          symbol: stock.symbol,
          name: getStockName(stock.symbol),
          price: stock.price || 0,
          change: stock.change || 0,
          changePercent: stock.changePercent || 0,
          volume: stock.volume || 0,
          marketCap: getMarketCap(stock.symbol),
          sector: getSector(stock.symbol),
          isMarketOpen: stock.isMarketOpen || false,
        }));
        
        setMarketData(formattedData);
      } else {
        console.error('獲取市場數據失敗');
        message.error('獲取市場數據失敗');
      }
    } catch (error) {
      console.error('獲取市場數據失敗:', error);
      message.error('網絡錯誤，無法獲取市場數據');
    } finally {
      setMarketLoading(false);
    }
  };

  // 輔助函數：獲取股票名稱
  const getStockName = (symbol: string) => {
    const nameMap: { [key: string]: string } = {
      'AAPL': '蘋果公司',
      'GOOGL': '谷歌',
      'MSFT': '微軟',
      'AMZN': '亞馬遜',
      'TSLA': '特斯拉',
      'META': 'Meta',
      'NFLX': '網飛',
      'NVDA': '英偉達',
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

  // 輔助函數：獲取市值（模擬）
  const getMarketCap = (symbol: string) => {
    const marketCapMap: { [key: string]: string } = {
      'AAPL': '2.8T',
      'GOOGL': '1.7T',
      'MSFT': '2.6T',
      'AMZN': '1.5T',
      'TSLA': '745B',
      'META': '750B',
      'NFLX': '190B',
      'NVDA': '1.8T',
      'JPM': '450B',
      'JNJ': '420B',
      'V': '480B',
      'PG': '360B',
      'MA': '380B',
      'UNH': '480B',
      'HD': '330B',
      'DIS': '180B',
      'PYPL': '85B',
      'BAC': '270B',
      'VZ': '170B',
      'ADBE': '220B',
    };
    return marketCapMap[symbol] || 'N/A';
  };

  // 輔助函數：獲取板塊
  const getSector = (symbol: string) => {
    const sectorMap: { [key: string]: string } = {
      'AAPL': '科技股',
      'GOOGL': '科技股',
      'MSFT': '科技股',
      'AMZN': '電商股',
      'TSLA': '汽車股',
      'META': '科技股',
      'NFLX': '媒體股',
      'NVDA': '科技股',
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

  // 獲取用戶訂單
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/v1/orders', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('獲取訂單失敗:', error);
      // 使用模擬數據
      setOrders([
        {
          id: '1',
          orderId: 'ORD-2023-001',
          symbol: 'AAPL',
          side: 'buy',
          order_type: 'limit',
          quantity: 100,
          price: 175.00,
          filled_qty: 0,
          remaining_qty: 100,
          status: 'pending',
          created_at: '2023-12-01T09:30:15Z',
        },
        {
          id: '2',
          orderId: 'ORD-2023-002',
          symbol: 'GOOGL',
          side: 'buy',
          order_type: 'limit',
          quantity: 50,
          price: 2500.00,
          filled_qty: 0,
          remaining_qty: 50,
          status: 'pending',
          created_at: '2023-12-01T10:15:30Z',
        }
      ]);
    }
  };

  // 獲取投資組合
  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/v1/portfolio', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data.portfolio);
      }
    } catch (error) {
      console.error('獲取投資組合失敗:', error);
    }
  };

  useEffect(() => {
    // 首次載入數據
    fetchMarketData();
    fetchOrders();
    fetchPortfolio();

    // 設置定時刷新市場數據（每30秒）
    const marketDataInterval = setInterval(fetchMarketData, 30000);
    
    // 設置定時刷新訂單狀態（每10秒）
    const ordersInterval = setInterval(fetchOrders, 10000);

    return () => {
      clearInterval(marketDataInterval);
      clearInterval(ordersInterval);
    };
  }, []);

  // 市場數據表格列
  const marketColumns = [
    {
      title: '股票代碼',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string, record: any) => (
        <Space>
          <Text strong>{symbol}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.name}
          </Text>
        </Space>
      ),
    },
    {
      title: '當前價格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record: any) => (
        <Space direction="vertical" size={0}>
          <Text className="financial-number">${price.toFixed(2)}</Text>
          {record.isMarketOpen ? (
            <Badge status="processing" text="交易中" />
          ) : (
            <Badge status="default" text="休市" />
          )}
        </Space>
      ),
    },
    {
      title: '漲跌',
      key: 'change',
      render: (record: any) => (
        <Space direction="vertical" size={0}>
          <Text 
            className={record.change >= 0 ? 'financial-positive' : 'financial-negative'}
          >
            {record.change >= 0 ? '+' : ''}${record.change.toFixed(2)}
          </Text>
          <Text 
            className={record.changePercent >= 0 ? 'financial-positive' : 'financial-negative'}
            style={{ fontSize: '12px' }}
          >
            ({record.changePercent >= 0 ? '+' : ''}{record.changePercent.toFixed(2)}%)
          </Text>
        </Space>
      ),
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      render: (volume: number) => volume > 0 ? volume.toLocaleString() : 'N/A',
    },
    {
      title: '市值',
      dataIndex: 'marketCap',
      key: 'marketCap',
    },
    {
      title: '板塊',
      dataIndex: 'sector',
      key: 'sector',
      render: (sector: string) => <Tag color="blue">{sector}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            onClick={() => openTradeModal(record, 'buy')}
            disabled={!record.isMarketOpen}
          >
            買入
          </Button>
          <Button 
            size="small" 
            onClick={() => openTradeModal(record, 'sell')}
            disabled={!record.isMarketOpen}
          >
            賣出
          </Button>
        </Space>
      ),
    },
  ];

  // 訂單表格列
  const orderColumns = [
    {
      title: '訂單號',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <Text code style={{ fontSize: '12px' }}>{id.substring(0, 8)}</Text>
      ),
    },
    {
      title: '股票',
      dataIndex: 'symbol',
      key: 'symbol',
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
      title: '類型',
      dataIndex: 'order_type',
      key: 'order_type',
      render: (type: string) => {
        const typeMap = {
          limit: '限價',
          market: '市價',
          stop: '止損',
        };
        return <Tag>{typeMap[type as keyof typeof typeMap] || type}</Tag>;
      },
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '價格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: '已成交/剩餘',
      key: 'filled',
      render: (record: any) => (
        <Space direction="vertical" size={0}>
          <Text>{record.filled_qty}/{record.quantity}</Text>
          <Progress 
            percent={(record.filled_qty / record.quantity) * 100} 
            size="small" 
            showInfo={false}
          />
        </Space>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          filled: { color: 'success', text: '已成交' },
          pending: { color: 'processing', text: '待執行' },
          partial: { color: 'warning', text: '部分成交' },
          cancelled: { color: 'default', text: '已取消' },
          rejected: { color: 'error', text: '已拒絕' },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        return <Badge status={config.color as any} text={config.text} />;
      },
    },
    {
      title: '時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(time).toLocaleString()}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
              >
                編輯
              </Button>
              <Popconfirm
                title="確定要取消這個訂單嗎？"
                onConfirm={() => cancelOrder(record.id)}
                okText="確定"
                cancelText="取消"
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  取消
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  // 打開交易彈窗
  const openTradeModal = (stock: any, side: 'buy' | 'sell') => {
    setSelectedStock({ ...stock, side });
    form.setFieldsValue({
      symbol: stock.symbol,
      side,
      order_type: 'limit',
      price: stock.price,
      quantity: 100,
    });
    setIsModalOpen(true);
  };

  // 打開編輯訂單彈窗
  const openEditModal = (order: any) => {
    setEditingOrder(order);
    editForm.setFieldsValue({
      quantity: order.quantity,
      price: order.price,
      order_type: order.order_type,
    });
    setIsEditModalOpen(true);
  };

  // 提交訂單
  const handleSubmitOrder = async (values: any) => {
    setLoading(true);
    try {
      // 從表單或 selectedStock 獲取值
      const orderData = {
        symbol: values.symbol || selectedStock?.symbol,
        side: values.side || selectedStock?.side,
        order_type: values.orderType,
        quantity: values.quantity,
        price: values.price,
        time_in_force: values.timeInForce || 'GTC'
      };

      // 驗證必填字段
      if (!orderData.symbol || !orderData.side || !orderData.order_type || !orderData.quantity || !orderData.price) {
        message.error('請填寫完整的訂單信息');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'demo-user-123'
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const result = await response.json();
        message.success(
          result.order.status === 'filled' 
            ? '訂單下單並成交成功！' 
            : '訂單下單成功，等待成交！'
        );
        setIsModalOpen(false);
        form.resetFields();
        setSelectedStock(null);
        fetchOrders(); // 重新獲取訂單列表
        fetchPortfolio(); // 重新獲取投資組合
      } else {
        const error = await response.json();
        message.error(`下單失敗: ${error.message || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('下單失敗:', error);
      message.error('網絡錯誤，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  // 編輯訂單
  const handleEditOrder = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'demo-user-123'
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('訂單修改成功！');
        setIsEditModalOpen(false);
        editForm.resetFields();
        fetchOrders(); // 重新獲取訂單列表
      } else {
        const error = await response.json();
        message.error(`訂單修改失敗: ${error.message || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('訂單修改失敗:', error);
      message.error('網絡錯誤，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  // 取消訂單
  const cancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/v1/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });

      if (response.ok) {
        message.success('訂單取消成功！');
        fetchOrders(); // 重新獲取訂單列表
      } else {
        const error = await response.json();
        message.error(`訂單取消失敗: ${error.message || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('訂單取消失敗:', error);
      message.error('網絡錯誤，請稍後重試');
    }
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
        <Col>
          <Title level={2}>
            <StockOutlined /> 交易中心
          </Title>
          <Text type="secondary">
            Yahoo Finance 實時股票交易和訂單管理 | 最後更新: {new Date().toLocaleTimeString()}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} loading={marketLoading} onClick={fetchMarketData}>
              重新整理
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              // 重置表單並設置預設值
              form.resetFields();
              setSelectedStock(null);
              form.setFieldsValue({
                side: 'buy',
                orderType: 'limit',
                quantity: 100,
                price: 200.00,
                timeInForce: 'GTC'
              });
              setIsModalOpen(true);
            }}>
              新建訂單
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 市場概覽統計 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="今日交易額"
              value={1234567}
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
              title="活躍訂單"
              value={orders.filter(o => o.status === 'pending').length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="投資組合價值"
              value={portfolio?.totalValue || 0}
              precision={2}
              prefix={<RiseOutlined />}
              suffix="USD"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="今日盈虧"
              value={portfolio?.dayPL || 0}
              precision={2}
              suffix="USD"
              prefix={portfolio?.dayPL >= 0 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{ color: portfolio?.dayPL >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 實時數據警告 */}
      <Alert
        message="📈 Yahoo Finance 實時數據"
        description="當前顯示的是來自Yahoo Finance的實時股票數據。交易功能僅供演示，不涉及真實資金。市場休市時交易按鈕將被禁用。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: '16px' }}
      />

      <Tabs defaultActiveKey="1">
        <TabPane tab="市場行情" key="1">
          <Card title="實時股票行情" extra={<Badge status="processing" text="Yahoo Finance 實時數據" />}>
            <Table
              columns={marketColumns}
              dataSource={marketData}
              loading={marketLoading}
              pagination={false}
              size="middle"
            />
          </Card>
        </TabPane>

        <TabPane tab="我的訂單" key="2">
          <Card title="訂單管理">
            <Table
              columns={orderColumns}
              dataSource={orders}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 個訂單`,
              }}
              size="middle"
            />
          </Card>
        </TabPane>

        <TabPane tab="交易歷史" key="3">
          <Card title="交易記錄">
            <List
              itemLayout="horizontal"
              dataSource={orders.filter(order => order.status === 'filled')}
              renderItem={(order) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color={order.side === 'buy' ? 'green' : 'red'}>
                          {order.side === 'buy' ? '買入' : '賣出'}
                        </Tag>
                        <Text strong>{order.symbol}</Text>
                        <Text>{order.quantity}股</Text>
                        <Text>@${order.price}</Text>
                      </Space>
                    }
                    description={`訂單號: ${order.id} | 時間: ${new Date(order.created_at).toLocaleString()}`}
                  />
                  <div>
                    <Text type="secondary">手續費: $0.00</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 交易下單彈窗 */}
      <Modal
        title={selectedStock ? `${selectedStock?.side === 'buy' ? '買入' : '賣出'} ${selectedStock?.symbol || ''}` : '新建訂單'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitOrder}
          initialValues={{
            side: 'buy',
            orderType: 'limit',
            quantity: 100,
            price: 200.00,
            timeInForce: 'GTC'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="股票代碼"
                name="symbol"
                rules={[{ required: true, message: '請選擇股票' }]}
              >
                <Select placeholder="選擇股票">
                  {marketData.map(stock => (
                    <Option key={stock.symbol} value={stock.symbol}>
                      {stock.symbol} - {stock.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="交易方向"
                name="side"
                rules={[{ required: true, message: '請選擇交易方向' }]}
              >
                <Select>
                  <Option value="buy">買入</Option>
                  <Option value="sell">賣出</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="訂單類型"
                name="orderType"
                rules={[{ required: true, message: '請選擇訂單類型' }]}
              >
                <Select>
                  <Option value="market">市價單</Option>
                  <Option value="limit">限價單</Option>
                  <Option value="stop">止損單</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="數量"
                name="quantity"
                rules={[{ required: true, message: '請輸入數量' }]}
              >
                <InputNumber
                  min={1}
                  max={10000}
                  style={{ width: '100%' }}
                  placeholder="股數"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="價格"
            name="price"
            rules={[{ required: true, message: '請輸入價格' }]}
          >
            <InputNumber
              min={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="美元"
              addonBefore="$"
            />
          </Form.Item>

          <Form.Item
            label="時間在市場"
            name="timeInForce"
          >
            <Select>
              <Option value="GTC">GTC</Option>
              <Option value="IOC">IOC</Option>
              <Option value="FOK">FOK</Option>
              <Option value="GTT">GTT</Option>
            </Select>
          </Form.Item>

          <Divider />

          <Row justify="space-between">
            <Col>
              <Text type="secondary">
                預估交易額: ${((form.getFieldValue('quantity') || 0) * (form.getFieldValue('price') || 0)).toFixed(2)}
              </Text>
            </Col>
            <Col>
              <Space>
                <Button onClick={() => setIsModalOpen(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  提交訂單
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 編輯訂單彈窗 */}
      <Modal
        title={`編輯訂單 - ${editingOrder?.symbol || ''}`}
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditOrder}
        >
          <Form.Item
            label="數量"
            name="quantity"
            rules={[{ required: true, message: '請輸入數量' }]}
          >
            <InputNumber
              min={1}
              max={10000}
              style={{ width: '100%' }}
              placeholder="股數"
            />
          </Form.Item>

          <Form.Item
            label="價格"
            name="price"
            rules={[{ required: true, message: '請輸入價格' }]}
          >
            <InputNumber
              min={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="美元"
              addonBefore="$"
            />
          </Form.Item>

          <Form.Item
            label="訂單類型"
            name="order_type"
            rules={[{ required: true, message: '請選擇訂單類型' }]}
          >
            <Select>
              <Option value="market">市價單</Option>
              <Option value="limit">限價單</Option>
              <Option value="stop">止損單</Option>
            </Select>
          </Form.Item>

          <Divider />

          <Row justify="space-between">
            <Col>
              <Text type="secondary">
                預估交易額: ${((editForm.getFieldValue('quantity') || 0) * (editForm.getFieldValue('price') || 0)).toFixed(2)}
              </Text>
            </Col>
            <Col>
              <Space>
                <Button onClick={() => setIsEditModalOpen(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存修改
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Trading; 
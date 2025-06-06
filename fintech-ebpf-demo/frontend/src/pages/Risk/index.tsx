import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Progress,
  Alert,
  Statistic,
  Table,
  Tag,
  Space,
  Button,
  Tabs,
  List,
  Divider,
  Slider,
  InputNumber,
  Switch,
  Tooltip,
} from 'antd';
import {
  SafetyOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  LineChartOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// 模擬風險指標數據
const mockRiskMetrics = {
  var: {
    value: 15678.9,
    threshold: 20000,
    confidence: 95,
    timeHorizon: 1,
  },
  sharpeRatio: {
    value: 1.85,
    benchmark: 1.2,
    rating: 'excellent',
  },
  beta: {
    value: 1.15,
    target: 1.0,
    tolerance: 0.2,
  },
  volatility: {
    value: 15.2,
    threshold: 18.0,
    historical: 14.8,
  },
  maxDrawdown: {
    value: 8.5,
    threshold: 12.0,
    period: '2023-08-15',
  },
  correlation: {
    sp500: 0.85,
    nasdaq: 0.92,
    gold: -0.15,
    bonds: 0.25,
  },
};

// 模擬限額監控數據
const mockLimits = [
  {
    key: '1',
    type: '單一持倉限額',
    current: 35.2,
    limit: 40.0,
    status: 'normal',
    description: 'AAPL持倉占比',
  },
  {
    key: '2',
    type: '板塊集中度',
    current: 88.0,
    limit: 85.0,
    status: 'warning',
    description: '科技股占比過高',
  },
  {
    key: '3',
    type: '流動性比率',
    current: 12.0,
    limit: 15.0,
    status: 'danger',
    description: '現金及等價物不足',
  },
  {
    key: '4',
    type: '槓桿比率',
    current: 0.0,
    limit: 30.0,
    status: 'normal',
    description: '當前無槓桿',
  },
  {
    key: '5',
    type: '日均交易額',
    current: 125000,
    limit: 200000,
    status: 'normal',
    description: '交易活躍度正常',
  },
];

// 模擬壓力測試情景
const mockStressScenarios = [
  {
    name: '市場崩盤 (-20%)',
    portfolioImpact: -18.5,
    varImpact: 45678.9,
    probability: 'low',
    description: '類似2008年金融危機',
  },
  {
    name: '科技股回調 (-30%)',
    portfolioImpact: -25.2,
    varImpact: 35421.8,
    probability: 'medium',
    description: '科技泡沫破裂情景',
  },
  {
    name: '利率急升 (+300bp)',
    portfolioImpact: -12.8,
    varImpact: 18765.4,
    probability: 'medium',
    description: '央行激進加息',
  },
  {
    name: '地緣政治風險',
    portfolioImpact: -15.6,
    varImpact: 22143.6,
    probability: 'high',
    description: '國際貿易衝突加劇',
  },
];

const Risk: React.FC = () => {
  const [riskMetrics, setRiskMetrics] = useState(mockRiskMetrics);
  const [limits, setLimits] = useState(mockLimits);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [riskTolerance, setRiskTolerance] = useState(7);

  // 模擬實時風險指標更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRiskMetrics((prev) => ({
        ...prev,
        var: {
          ...prev.var,
          value: prev.var.value + (Math.random() - 0.5) * 1000,
        },
        volatility: {
          ...prev.volatility,
          value: Math.max(prev.volatility.value + (Math.random() - 0.5) * 0.5, 5),
        },
        beta: {
          ...prev.beta,
          value: Math.max(prev.beta.value + (Math.random() - 0.5) * 0.05, 0.5),
        },
      }));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // 獲取風險等級顏色
  const getRiskColor = (current: number, threshold: number) => {
    const ratio = current / threshold;
    if (ratio >= 0.9) return '#ff4d4f';
    if (ratio >= 0.7) return '#fa8c16';
    return '#52c41a';
  };

  // 獲取狀態標籤
  const getStatusTag = (status: string) => {
    const statusConfig = {
      normal: { color: 'success', text: '正常' },
      warning: { color: 'warning', text: '警告' },
      danger: { color: 'error', text: '危險' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.normal;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 限額監控表格列
  const limitColumns = [
    {
      title: '風險類型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '當前值',
      key: 'current',
      render: (record: any) => {
        const isPercentage = record.type !== '日均交易額';
        return isPercentage
          ? `${record.current.toFixed(1)}%`
          : `$${record.current.toLocaleString()}`;
      },
    },
    {
      title: '限額',
      key: 'limit',
      render: (record: any) => {
        const isPercentage = record.type !== '日均交易額';
        return isPercentage ? `${record.limit.toFixed(1)}%` : `$${record.limit.toLocaleString()}`;
      },
    },
    {
      title: '使用率',
      key: 'usage',
      render: (record: any) => {
        const usage = (record.current / record.limit) * 100;
        return (
          <Progress
            percent={Math.min(usage, 100)}
            strokeColor={getRiskColor(record.current, record.limit)}
            size="small"
          />
        );
      },
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  // 計算總體風險評分
  const calculateRiskScore = () => {
    const varScore = Math.min((riskMetrics.var.value / riskMetrics.var.threshold) * 100, 100);
    const volatilityScore = Math.min(
      (riskMetrics.volatility.value / riskMetrics.volatility.threshold) * 100,
      100,
    );
    const drawdownScore = Math.min(
      (riskMetrics.maxDrawdown.value / riskMetrics.maxDrawdown.threshold) * 100,
      100,
    );

    return Math.round((varScore + volatilityScore + drawdownScore) / 3);
  };

  const overallRiskScore = calculateRiskScore();

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
        <Col>
          <Title level={2}>
            <SafetyOutlined /> 風險監控
          </Title>
          <Text type="secondary">
            實時風險評估和限額監控 | 最後更新: {new Date().toLocaleTimeString()}
          </Text>
        </Col>
        <Col>
          <Space>
            <Switch
              checked={alertEnabled}
              onChange={setAlertEnabled}
              checkedChildren="警報開啟"
              unCheckedChildren="警報關閉"
            />
            <Button icon={<SettingOutlined />}>風險設置</Button>
            <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              重新整理
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 風險警告 */}
      {limits.some((limit) => limit.status === 'danger') && (
        <Alert
          message="🚨 風險限額突破"
          description="檢測到多個風險指標超出設定限額，建議立即採取風險控制措施。"
          type="error"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {limits.some((limit) => limit.status === 'warning') && (
        <Alert
          message="⚠️ 風險警告"
          description="部分風險指標接近限額，請密切關注市場變化。"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 風險概覽統計 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="綜合風險評分"
              value={overallRiskScore}
              suffix="/ 100"
              valueStyle={{
                color:
                  overallRiskScore > 80 ? '#ff4d4f' : overallRiskScore > 60 ? '#fa8c16' : '#52c41a',
              }}
            />
            <Progress
              percent={overallRiskScore}
              strokeColor={
                overallRiskScore > 80 ? '#ff4d4f' : overallRiskScore > 60 ? '#fa8c16' : '#52c41a'
              }
              size="small"
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="風險價值 (VaR)"
              value={riskMetrics.var.value}
              precision={0}
              prefix="$"
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              95%置信度，1日
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="組合波動率"
              value={riskMetrics.volatility.value}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#fa8c16' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              年化標準差
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="最大回撤"
              value={riskMetrics.maxDrawdown.value}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              歷史最大回撤
            </Text>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <TabPane tab="限額監控" key="1">
          <Card title="風險限額狀態">
            <Table columns={limitColumns} dataSource={limits} pagination={false} size="middle" />
          </Card>
        </TabPane>

        <TabPane tab="風險指標" key="2">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="市場風險指標">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between" align="middle">
                    <Text>夏普比率:</Text>
                    <Space>
                      <Text strong>{riskMetrics.sharpeRatio.value}</Text>
                      <Text type="secondary">(基準: {riskMetrics.sharpeRatio.benchmark})</Text>
                    </Space>
                  </Row>
                  <Progress
                    percent={(riskMetrics.sharpeRatio.value / 3) * 100}
                    strokeColor="#52c41a"
                    showInfo={false}
                  />

                  <Divider />

                  <Row justify="space-between" align="middle">
                    <Text>貝塔係數:</Text>
                    <Space>
                      <Text strong>{riskMetrics.beta.value.toFixed(2)}</Text>
                      <Text type="secondary">(目標: {riskMetrics.beta.target})</Text>
                    </Space>
                  </Row>
                  <Progress
                    percent={(riskMetrics.beta.value / 2) * 100}
                    strokeColor={
                      Math.abs(riskMetrics.beta.value - riskMetrics.beta.target) <=
                      riskMetrics.beta.tolerance
                        ? '#52c41a'
                        : '#fa8c16'
                    }
                    showInfo={false}
                  />

                  <Divider />

                  <Row justify="space-between">
                    <Text>相關性分析:</Text>
                  </Row>
                  <Space direction="vertical" style={{ width: '100%', marginTop: '8px' }}>
                    <Row justify="space-between">
                      <Text>S&P 500:</Text>
                      <Text>{riskMetrics.correlation.sp500.toFixed(2)}</Text>
                    </Row>
                    <Row justify="space-between">
                      <Text>NASDAQ:</Text>
                      <Text>{riskMetrics.correlation.nasdaq.toFixed(2)}</Text>
                    </Row>
                    <Row justify="space-between">
                      <Text>黃金:</Text>
                      <Text>{riskMetrics.correlation.gold.toFixed(2)}</Text>
                    </Row>
                    <Row justify="space-between">
                      <Text>債券:</Text>
                      <Text>{riskMetrics.correlation.bonds.toFixed(2)}</Text>
                    </Row>
                  </Space>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="風險偏好設定">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>風險承受能力:</Text>
                    <Text strong>{riskTolerance}/10</Text>
                  </Row>
                  <Slider
                    min={1}
                    max={10}
                    value={riskTolerance}
                    onChange={setRiskTolerance}
                    marks={{
                      1: '保守',
                      5: '中性',
                      10: '激進',
                    }}
                  />

                  <Divider />

                  <Paragraph>
                    <Text strong>當前風險評估:</Text>
                  </Paragraph>

                  <List
                    size="small"
                    dataSource={[
                      {
                        icon:
                          overallRiskScore <= 50 ? (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          ) : (
                            <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
                          ),
                        text: `綜合風險評分: ${overallRiskScore}/100`,
                        status: overallRiskScore <= 50 ? 'success' : 'warning',
                      },
                      {
                        icon:
                          riskMetrics.var.value <= riskMetrics.var.threshold ? (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          ) : (
                            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                          ),
                        text: `風險價值在限額內`,
                        status:
                          riskMetrics.var.value <= riskMetrics.var.threshold ? 'success' : 'error',
                      },
                      {
                        icon:
                          riskMetrics.volatility.value <= riskMetrics.volatility.threshold ? (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          ) : (
                            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                          ),
                        text: `波動率控制良好`,
                        status:
                          riskMetrics.volatility.value <= riskMetrics.volatility.threshold
                            ? 'success'
                            : 'error',
                      },
                      {
                        icon:
                          riskMetrics.maxDrawdown.value <= riskMetrics.maxDrawdown.threshold ? (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          ) : (
                            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                          ),
                        text: `回撤在可控範圍`,
                        status:
                          riskMetrics.maxDrawdown.value <= riskMetrics.maxDrawdown.threshold
                            ? 'success'
                            : 'error',
                      },
                    ]}
                    renderItem={(item) => (
                      <List.Item>
                        <Space>
                          {item.icon}
                          <Text>{item.text}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="壓力測試" key="3">
          <Card title="壓力測試情景分析">
            <Paragraph>以下是基於不同市場情景的投資組合影響分析：</Paragraph>

            <Row gutter={[16, 16]}>
              {mockStressScenarios.map((scenario, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card
                    size="small"
                    title={scenario.name}
                    extra={
                      <Tag
                        color={
                          scenario.probability === 'low'
                            ? 'green'
                            : scenario.probability === 'medium'
                              ? 'orange'
                              : 'red'
                        }
                      >
                        {scenario.probability === 'low'
                          ? '低'
                          : scenario.probability === 'medium'
                            ? '中'
                            : '高'}
                        概率
                      </Tag>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Row justify="space-between">
                        <Text>組合影響:</Text>
                        <Text strong style={{ color: '#ff4d4f' }}>
                          {scenario.portfolioImpact}%
                        </Text>
                      </Row>
                      <Row justify="space-between">
                        <Text>潛在損失:</Text>
                        <Text strong style={{ color: '#ff4d4f' }}>
                          ${scenario.varImpact.toLocaleString()}
                        </Text>
                      </Row>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {scenario.description}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>

            <Divider />

            <Card title="壓力測試建議" size="small">
              <List
                size="small"
                dataSource={[
                  '考慮增加防守性資產配置，如債券或黃金ETF',
                  '設置止損點，當單一持倉跌幅超過15%時自動減倉',
                  '建立現金緩衝，維持至少15%的流動資金',
                  '分散投資板塊，降低對科技股的過度依賴',
                  '定期評估和調整風險敞口',
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <Space>
                      <ThunderboltOutlined style={{ color: '#fa8c16' }} />
                      <Text>{item}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Risk;

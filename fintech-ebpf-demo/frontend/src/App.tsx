import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Button, Typography, Space, Card, Table, Form, Input, 
  Select, DatePicker, Progress, Badge, Tag, Statistic, Row, Col,
  Tabs, Alert, Spin, Modal, Drawer, Timeline, List, Avatar,
  ConfigProvider, theme, Switch, Tooltip, Popconfirm, message,
  Descriptions, Divider, Steps, Empty, Result
} from 'antd';
import {
  DashboardOutlined, StockOutlined, PieChartOutlined,
  SecurityScanOutlined, SettingOutlined, UserOutlined,
  BellOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  DollarOutlined, RiseOutlined, FallOutlined, MonitorOutlined,
  SafetyCertificateOutlined, AlertOutlined, BarChartOutlined,
  LineChartOutlined, ApiOutlined, DatabaseOutlined, EditOutlined,
  EyeOutlined, PlayCircleOutlined, PauseCircleOutlined, 
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';

// 导入样式
import './App.css';

// 导入API服务
import { apiService, TetragonEvent, User, SecurityTest } from './services/api';

const { Header, Content, Sider } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 模拟数据
const tradingData = [
  { key: '1', symbol: 'AAPL', price: 175.45, change: '+2.3%', volume: '2.1M', time: '09:30:15' },
  { key: '2', symbol: 'GOOGL', price: 2845.20, change: '-1.2%', volume: '1.8M', time: '09:30:18' },
  { key: '3', symbol: 'TSLA', price: 245.67, change: '+5.8%', volume: '3.2M', time: '09:30:22' },
  { key: '4', symbol: 'MSFT', price: 378.90, change: '+0.9%', volume: '1.5M', time: '09:30:25' }
];

const portfolioData = [
  { key: '1', asset: 'AAPL', quantity: 100, value: 17545, allocation: '35%', pnl: '+1250' },
  { key: '2', asset: 'GOOGL', quantity: 10, value: 28452, allocation: '45%', pnl: '-540' },
  { key: '3', asset: 'ETH', quantity: 25, value: 45000, allocation: '20%', pnl: '+2100' }
];

const riskMetrics = [
  { metric: 'VaR (1日)', value: '$2,450', status: 'normal' },
  { metric: '敞口集中度', value: '65%', status: 'warning' },
  { metric: '流动性风险', value: '低', status: 'success' },
  { metric: '信用风险', value: '中', status: 'warning' }
];

const auditLogs = [
  { timestamp: '2025-06-12 05:43:20', user: 'user001', action: '执行交易', details: 'AAPL 买入 100股', risk: 'low' },
  { timestamp: '2025-06-12 05:42:15', user: 'user002', action: '修改限价', details: 'GOOGL 限价调整', risk: 'medium' },
  { timestamp: '2025-06-12 05:41:30', user: 'system', action: 'eBPF检测', details: '异常API调用', risk: 'high' },
  { timestamp: '2025-06-12 05:40:45', user: 'user001', action: '登录系统', details: '成功登录', risk: 'low' }
];

// 模拟Tetragon事件数据
const mockTetragonEvents: TetragonEvent[] = [
  {
    timestamp: '2025-06-12T05:45:30Z',
    event_type: 'process_exec',
    severity: 'info',
    description: '进程启动: /usr/bin/node',
    process_name: 'node',
    command: '/usr/bin/node /app/server.js'
  },
  {
    timestamp: '2025-06-12T05:44:15Z',
    event_type: 'network_connect',
    severity: 'warning',
    description: '异常网络连接',
    source_ip: '192.168.1.100',
    destination_ip: '10.0.0.1'
  },
  {
    timestamp: '2025-06-12T05:43:45Z',
    event_type: 'file_access',
    severity: 'error',
    description: '敏感文件访问',
    file_path: '/etc/passwd'
  }
];

// 模拟用户数据
const mockUser: User = {
  user_id: 'demo-user',
  email: 'demo@fintech.local',
  display_name: '演示用户',
  current_balance: 50000.00
};

// 主要组件
const FullFeaturedFinTechApp: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [realTimeData, setRealTimeData] = useState(tradingData);
  const [loading, setLoading] = useState(false);
  const [tetragonEvents, setTetragonEvents] = useState<TetragonEvent[]>(mockTetragonEvents);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(mockUser);
  const [securityTestResults, setSecurityTestResults] = useState<SecurityTest[]>([]);

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prev => prev.map(item => ({
        ...item,
        price: parseFloat((parseFloat(item.price.toString()) + (Math.random() - 0.5) * 5).toFixed(2)),
        time: new Date().toLocaleTimeString()
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // WebSocket连接管理
  useEffect(() => {
    let ws: WebSocket | null = null;
    
    if (activeTab === 'monitoring' || activeTab === 'security') {
      try {
        ws = apiService.createTetragonWebSocket((event: TetragonEvent) => {
          setTetragonEvents(prev => [event, ...prev.slice(0, 49)]); // 保留最近50个事件
        });
        setWsConnected(true);
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        setWsConnected(false);
      }
    }

    return () => {
      if (ws) {
        ws.close();
        setWsConnected(false);
      }
    };
  }, [activeTab]);

  // API测试函数
  const testAPI = async (endpoint: string, name: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1${endpoint}`, {
        headers: { 'X-User-ID': 'demo-user' }
      });
      const data = await response.text();
      message.success(`${name} API调用成功: ${response.status}`);
      console.log(`${name} 响应:`, data);
    } catch (error) {
      message.error(`${name} API调用失败: ${error}`);
      console.error(`${name} 错误:`, error);
    } finally {
      setLoading(false);
    }
  };

  // 交易面板
  const TradingPanel = () => (
    <Card title="📈 实时交易面板" extra={<Badge status="processing" text="实时数据" />}>
      <Table 
        dataSource={realTimeData} 
        size="small"
        pagination={false}
        columns={[
          { title: '代码', dataIndex: 'symbol', key: 'symbol', width: 80 },
          { title: '价格', dataIndex: 'price', key: 'price', width: 100,
            render: (price) => <Text strong>${price}</Text> },
          { title: '涨跌', dataIndex: 'change', key: 'change', width: 80,
            render: (change) => (
              <Tag color={change.includes('+') ? 'green' : 'red'}>
                {change.includes('+') ? <RiseOutlined /> : <FallOutlined />} {change}
              </Tag>
            )},
          { title: '成交量', dataIndex: 'volume', key: 'volume', width: 80 },
          { title: '时间', dataIndex: 'time', key: 'time', width: 100 },
          { title: '操作', key: 'action', width: 150,
            render: (_, record) => (
              <Space>
                <Button size="small" type="primary">买入</Button>
                <Button size="small">卖出</Button>
              </Space>
            )}
        ]}
      />
    </Card>
  );

  // 投资组合面板
  const PortfolioPanel = () => (
    <Card title="💼 投资组合" extra={<Statistic title="总价值" value={91000} prefix="$" />}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic title="今日收益" value={2310} prefix="$" valueStyle={{ color: '#3f8600' }} />
        </Col>
        <Col span={6}>
          <Statistic title="总收益率" value={15.2} suffix="%" valueStyle={{ color: '#3f8600' }} />
        </Col>
        <Col span={6}>
          <Progress type="circle" percent={68} size={60} format={() => '68%'} />
          <div style={{ textAlign: 'center', marginTop: 8 }}>风险评分</div>
        </Col>
        <Col span={6}>
          <Progress type="circle" percent={85} size={60} format={() => '85%'} strokeColor="#52c41a" />
          <div style={{ textAlign: 'center', marginTop: 8 }}>多样化</div>
        </Col>
      </Row>
      
      <Table 
        dataSource={portfolioData} 
        size="small"
        pagination={false}
        columns={[
          { title: '资产', dataIndex: 'asset', key: 'asset' },
          { title: '数量', dataIndex: 'quantity', key: 'quantity' },
          { title: '价值', dataIndex: 'value', key: 'value', 
            render: (value) => `$${value.toLocaleString()}` },
          { title: '配置', dataIndex: 'allocation', key: 'allocation' },
          { title: '盈亏', dataIndex: 'pnl', key: 'pnl',
            render: (pnl) => (
              <Text type={pnl.includes('+') ? 'success' : 'danger'}>{pnl}</Text>
            )}
        ]}
      />
    </Card>
  );

  // 风险监控面板
  const RiskMonitoringPanel = () => (
    <Card title="🛡️ 风险监控" extra={<Badge status="warning" text="需要关注" />}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {riskMetrics.map((metric, index) => (
          <Col span={6} key={index}>
            <Card size="small">
              <Statistic 
                title={metric.metric} 
                value={metric.value}
                valueStyle={{ 
                  color: metric.status === 'success' ? '#3f8600' : 
                         metric.status === 'warning' ? '#faad14' : '#cf1322' 
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      
      <Alert
        message="风险提醒"
        description="检测到投资组合集中度较高，建议分散投资降低风险。"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Timeline>
        <Timeline.Item color="green">09:30 - 系统启动，所有监控正常</Timeline.Item>
        <Timeline.Item color="blue">09:35 - VaR计算完成，风险可控</Timeline.Item>
        <Timeline.Item color="red">09:40 - 检测到集中度风险</Timeline.Item>
        <Timeline.Item>09:45 - 发送风险报告</Timeline.Item>
      </Timeline>
    </Card>
  );

  // eBPF安全监控面板
  const SecurityPanel = () => (
    <Card title="🔒 eBPF安全监控" extra={<Badge status="processing" text="实时监控" />}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="API调用" value={1234} suffix="次/分" prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="异常检测" value={3} suffix="次" prefix={<AlertOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="数据流量" value={456} suffix="MB/s" prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
      </Row>

      <List
        header={<Text strong>🔍 审计日志</Text>}
        dataSource={auditLogs}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} />}
              title={
                <Space>
                  <Text>{item.action}</Text>
                  <Badge 
                    status={item.risk === 'high' ? 'error' : item.risk === 'medium' ? 'warning' : 'success'} 
                    text={item.risk}
                  />
                </Space>
              }
              description={
                <div>
                  <div>{item.details}</div>
                  <Text type="secondary">{item.timestamp} - {item.user}</Text>
                  </div>
                } 
            />
          </List.Item>
        )}
      />
    </Card>
  );

  // Tetragon/eBPF 实时监控面板
  const MonitoringPanel = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Alert
            message={wsConnected ? '🟢 实时监控已连接' : '🔴 实时监控断开'}
            description={wsConnected ? 'WebSocket连接正常，正在接收实时eBPF事件' : '无法连接到实时事件流'}
            type={wsConnected ? 'success' : 'error'}
            showIcon
            action={
              <Button 
                size="small" 
                type={wsConnected ? 'default' : 'primary'}
                icon={wsConnected ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={() => {
                  if (wsConnected) {
                    message.info('监控已暂停');
                  } else {
                    message.info('尝试重新连接...');
                  }
                }}
              >
                {wsConnected ? '暂停监控' : '重新连接'}
              </Button>
            }
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small" title="📊 事件统计">
            <Statistic title="总事件数" value={tetragonEvents.length} />
            <Statistic 
              title="高危事件" 
              value={tetragonEvents.filter(e => e.severity === 'error' || e.severity === 'critical').length}
              valueStyle={{ color: '#cf1322' }}
            />
            <Statistic 
              title="警告事件" 
              value={tetragonEvents.filter(e => e.severity === 'warning').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card size="small" title="🔍 事件类型分布">
            <div>
              <Tag color="blue">进程执行: {tetragonEvents.filter(e => e.event_type === 'process_exec').length}</Tag>
              <Tag color="orange">网络连接: {tetragonEvents.filter(e => e.event_type === 'network_connect').length}</Tag>
              <Tag color="red">文件访问: {tetragonEvents.filter(e => e.event_type === 'file_access').length}</Tag>
            </div>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card size="small" title="⏱️ 实时状态">
            <Badge status="processing" text="监控中" />
            <br />
            <Text type="secondary">最后更新: {new Date().toLocaleTimeString()}</Text>
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="🛡️ eBPF/Tetragon 实时事件流" extra={<Badge count={tetragonEvents.length} />}>
            {tetragonEvents.length > 0 ? (
              <List
                dataSource={tetragonEvents}
                renderItem={(event) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ 
                            backgroundColor: 
                              event.severity === 'critical' ? '#cf1322' :
                              event.severity === 'error' ? '#fa541c' :
                              event.severity === 'warning' ? '#faad14' : '#52c41a'
                          }}
                          icon={
                            event.severity === 'error' || event.severity === 'critical' ? 
                            <CloseCircleOutlined /> : 
                            event.severity === 'warning' ? 
                            <ExclamationCircleOutlined /> : 
                            <CheckCircleOutlined />
                          }
                        />
                      }
                      title={
                        <Space>
                          <Tag color={
                            event.severity === 'critical' ? 'red' :
                            event.severity === 'error' ? 'volcano' :
                            event.severity === 'warning' ? 'orange' : 'green'
                          }>
                            {event.severity.toUpperCase()}
                          </Tag>
                          <Text strong>{event.event_type}</Text>
                          <Text type="secondary">{new Date(event.timestamp).toLocaleString()}</Text>
                        </Space>
                      }
                      description={
                        <div>
                          <p>{event.description}</p>
                          {event.process_name && <Text code>进程: {event.process_name}</Text>}
                          {event.command && <Text code>命令: {event.command}</Text>}
                          {event.file_path && <Text code>文件: {event.file_path}</Text>}
                          {event.source_ip && <Text code>源IP: {event.source_ip}</Text>}
                          {event.destination_ip && <Text code>目标IP: {event.destination_ip}</Text>}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="暂无监控事件"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );

  // 用户个人资料面板
  const ProfilePanel = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="👤 个人信息" extra={<Button icon={<EditOutlined />}>编辑</Button>}>
          <Descriptions column={1}>
            <Descriptions.Item label="用户ID">{currentUser.user_id}</Descriptions.Item>
            <Descriptions.Item label="显示名称">{currentUser.display_name}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{currentUser.email}</Descriptions.Item>
            <Descriptions.Item label="当前余额">
              <Text strong style={{ color: '#3f8600' }}>
                ${currentUser.current_balance.toLocaleString()}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="账户状态">
              <Badge status="success" text="正常" />
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">2024-01-15</Descriptions.Item>
            <Descriptions.Item label="最后登录">{new Date().toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
      
      <Col span={12}>
        <Card title="🔒 安全设置">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>两步验证</Text>
              <Switch defaultChecked style={{ float: 'right' }} />
            </div>
            <Divider />
            <div>
              <Text strong>登录通知</Text>
              <Switch defaultChecked style={{ float: 'right' }} />
            </div>
            <Divider />
            <div>
              <Text strong>交易确认</Text>
              <Switch defaultChecked style={{ float: 'right' }} />
            </div>
            <Divider />
            <Button type="primary" block>
              修改密码
            </Button>
          </Space>
        </Card>
      </Col>

      <Col span={24}>
        <Card title="📊 账户概览">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic 
                title="总资产" 
                value={91000} 
                prefix="$" 
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="可用余额" 
                value={currentUser.current_balance} 
                prefix="$"
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="今日盈亏" 
                value={2310} 
                prefix="$" 
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="持仓价值" 
                value={41000} 
                prefix="$"
              />
            </Col>
          </Row>
        </Card>
      </Col>

      <Col span={24}>
        <Card title="⚙️ 账户操作">
          <Space>
            <Button 
              type="primary"
              onClick={async () => {
                try {
                  await apiService.resetUserAccount({
                    reset_balance: 50000,
                    clear_positions: false,
                    clear_trades: false
                  });
                  message.success('余额已重置');
                } catch (error) {
                  message.error('重置失败');
                }
              }}
            >
              重置余额
            </Button>
            <Button 
              onClick={async () => {
                try {
                  await apiService.resetUserAccount({
                    clear_positions: true,
                    clear_trades: false
                  });
                  message.success('持仓已清空');
                } catch (error) {
                  message.error('清空失败');
                }
              }}
            >
              清空持仓
            </Button>
            <Button 
              onClick={async () => {
                try {
                  await apiService.resetUserAccount({
                    clear_trades: true
                  });
                  message.success('交易历史已清空');
                } catch (error) {
                  message.error('清空失败');
                }
              }}
            >
              清空交易历史
            </Button>
            <Button danger>
              导出数据
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  // 增强的安全测试面板
  const EnhancedSecurityPanel = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Alert
            message="⚠️ 安全测试环境"
            description="这些测试会模拟各种安全攻击，用于演示eBPF监控功能。请仅在测试环境中使用。"
            type="warning"
            showIcon
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="🧪 可用安全测试" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                { name: 'command', label: '命令注入测试', risk: 'high' },
                { name: 'file', label: '敏感文件访问', risk: 'medium' },
                { name: 'network', label: '异常网络连接', risk: 'medium' },
                { name: 'sql', label: 'SQL注入测试', risk: 'high' },
                { name: 'privilege', label: '权限提升测试', risk: 'high' },
                { name: 'crypto', label: '加密算法测试', risk: 'low' },
                { name: 'memory', label: '内存操作测试', risk: 'medium' }
              ].map(test => (
                <Button 
                  key={test.name}
                  style={{ width: '100%', marginBottom: 8 }}
                  type={test.risk === 'high' ? 'primary' : 'default'}
                  danger={test.risk === 'high'}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const result = await apiService.runSecurityTest(test.name);
                      setSecurityTestResults(prev => [result, ...prev.slice(0, 9)]);
                      message.success(`${test.label} 执行完成`);
                    } catch (error) {
                      message.error(`${test.label} 执行失败`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  🎯 {test.label}
                </Button>
              ))}
              <Button 
                type="primary" 
                danger 
                block
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await apiService.runAllSecurityTests();
                    setSecurityTestResults(prev => [result, ...prev.slice(0, 9)]);
                    message.success('所有安全测试执行完成');
                  } catch (error) {
                    message.error('安全测试执行失败');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                🔥 运行所有测试
              </Button>
            </Space>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="📋 测试结果" size="small">
            {securityTestResults.length > 0 ? (
              <List
                dataSource={securityTestResults}
                renderItem={(result) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Badge 
                          status={result.success ? 'success' : 'error'} 
                          text={result.risk_level}
                        />
                      }
                      title={result.test_name}
                      description={result.message}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无测试结果" />
            )}
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <SecurityPanel />
        </Col>
      </Row>
    </div>
  );

  // 系统设置面板
  const SettingsPanel = () => (
    <Card title="⚙️ 系统设置">
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="交易模式">
              <Select defaultValue="auto" style={{ width: '100%' }}>
                <Option value="auto">自动交易</Option>
                <Option value="manual">手动交易</Option>
                <Option value="demo">模拟交易</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="风险偏好">
              <Select defaultValue="medium" style={{ width: '100%' }}>
                <Option value="low">保守型</Option>
                <Option value="medium">稳健型</Option>
                <Option value="high">激进型</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="API服务器">
              <Input placeholder="https://api.fintech.demo" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="更新频率">
              <Select defaultValue="3" style={{ width: '100%' }}>
                <Option value="1">1秒</Option>
                <Option value="3">3秒</Option>
                <Option value="5">5秒</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Space>
          <Button type="primary" onClick={() => message.success('设置已保存')}>
            保存设置
          </Button>
          <Button onClick={() => testAPI('/orders', '交易')}>
            测试交易API
          </Button>
          <Button onClick={() => testAPI('/portfolio', '投资组合')}>
            测试组合API
          </Button>
          <Button onClick={() => testAPI('/user/profile', '用户')}>
            测试用户API
          </Button>
        </Space>
      </Form>
    </Card>
  );

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: 'trading', icon: <StockOutlined />, label: '交易' },
    { key: 'portfolio', icon: <PieChartOutlined />, label: '投资组合' },
    { key: 'monitoring', icon: <MonitorOutlined />, label: '监控' },
    { key: 'security', icon: <SafetyCertificateOutlined />, label: 'eBPF安全' },
    { key: 'risk', icon: <SecurityScanOutlined />, label: '风险监控' },
    { key: 'profile', icon: <UserOutlined />, label: '个人资料' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Alert
                message="🎉 完整功能金融微服务eBPF安全演示系统 v3.0-fullfeatured"
                description="React 19.x + Ant Design 完整功能已启用，包含8大核心模块：仪表盘、交易、投资组合、实时监控、eBPF安全、风险分析、用户资料、系统设置。"
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col span={12}><TradingPanel /></Col>
            <Col span={12}><PortfolioPanel /></Col>
            <Col span={12}><RiskMonitoringPanel /></Col>
            <Col span={12}><SecurityPanel /></Col>
          </Row>
        );
      case 'trading': return <TradingPanel />;
      case 'portfolio': return <PortfolioPanel />;
      case 'monitoring': return <MonitoringPanel />;
      case 'security': return <EnhancedSecurityPanel />;
      case 'risk': return <RiskMonitoringPanel />;
      case 'profile': return <ProfilePanel />;
      case 'settings': return <SettingsPanel />;
      default: return <TradingPanel />;
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider trigger={null} collapsible collapsed={collapsed}>
          <div style={{ 
            height: 32, 
            margin: 16, 
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {collapsed ? '💰' : '💰 FinTech'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeTab]}
            items={menuItems}
            onClick={({ key }) => setActiveTab(key)}
          />
        </Sider>
        
        <Layout>
          <Header style={{ 
            padding: 0, 
            background: isDarkMode ? '#141414' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: '16px', width: 64, height: 64 }}
              />
              <Title level={4} style={{ margin: 0 }}>
                🚀 金融微服务 eBPF 安全演示系统 v3.0-fullfeatured
              </Title>
            </div>
            
            <Space style={{ marginRight: 24 }}>
              <Tooltip title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}>
                <Switch 
                  checked={isDarkMode} 
                  onChange={setIsDarkMode}
                  checkedChildren="🌙" 
                  unCheckedChildren="☀️"
                />
              </Tooltip>
              <Badge count={5}>
                <Button type="text" icon={<BellOutlined />} />
              </Badge>
              <Button type="text" icon={<UserOutlined />} />
              <Popconfirm title="确定要退出吗？" onConfirm={() => message.info('已退出系统')}>
                <Button type="text" icon={<LogoutOutlined />} />
              </Popconfirm>
            </Space>
          </Header>
          
          <Content style={{ 
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: isDarkMode ? '#1f1f1f' : '#fff',
            borderRadius: 8
          }}>
            <Spin spinning={loading}>
              {renderContent()}
            </Spin>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

function App() {
  console.log('🚀 完整功能App组件开始渲染...');
  console.log('📊 React版本:', React.version);
  console.log('🎯 Ant Design: 完整组件库已启用');
  console.log('🕐 启动时间:', new Date().toISOString());
  
  return <FullFeaturedFinTechApp />;
}

export default App; 
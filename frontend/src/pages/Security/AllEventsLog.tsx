import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Select,
  Input,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  AutoComplete,
  Divider,
  Badge,
  Layout,
  Tooltip,
  Alert,
  Dropdown,
  Menu
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ClearOutlined,
  FilterOutlined,
  DatabaseOutlined,
  MonitorOutlined,
  SecurityScanOutlined,
  ClusterOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
  EyeOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;
const { Header, Content } = Layout;

interface TetragonEvent {
  id: string;
  type: string;
  timestamp: string;
  time: string;
  level: string;
  summary: string;
  namespace: string;
  pod_name: string;
  service: string;
  binary: string;
  node_name: string;
  data: string;
  source: string;
}

interface SearchOption {
  value: string;
  label: string;
  category?: string;
}

interface NamespaceResponse {
  namespaces: string[];
  total: number;
  from_events: number;
  from_k8s: number;
}

const AllEventsLog: React.FC = () => {
  const [events, setEvents] = useState<TetragonEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TetragonEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [podNameFilter, setPodNameFilter] = useState<string>('');
  
  // 可用的namespace和service列表
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [namespaceInfo, setNamespaceInfo] = useState<NamespaceResponse | null>(null);
  const [services, setServices] = useState<string[]>([]);
  
  // WebSocket连接
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // 统计信息
  const stats = useMemo(() => {
    const levelCount = events.reduce((acc, event) => {
      acc[event.level] = (acc[event.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const typeCount = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const namespaceCount = events.reduce((acc, event) => {
      if (event.namespace) {
        acc[event.namespace] = (acc[event.namespace] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total: events.length,
      filtered: filteredEvents.length,
      levels: levelCount,
      types: typeCount,
      namespaces: namespaceCount,
      criticalCount: levelCount.critical || 0,
      warningCount: levelCount.warning || 0,
      infoCount: levelCount.info || 0
    };
  }, [events, filteredEvents]);

  // 初始化WebSocket连接
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = process.env.NODE_ENV === 'production' 
          ? `${protocol}//${window.location.host}/ws/events`
          : 'ws://localhost:8090/ws/events';
        
        const websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
          console.log('WebSocket连接已建立');
          setConnectionStatus('connected');
          message.success('实时事件流连接成功');
        };
        
        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'recent_events') {
              // 处理历史事件
              setEvents(data.events || []);
              setLoading(false);
            } else {
              // 处理新事件
              setEvents(prev => {
                const newEvents = [data, ...prev];
                return newEvents.slice(0, 200); // 保持最新200个事件
              });
            }
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };
        
        websocket.onclose = () => {
          console.log('WebSocket连接已关闭');
          setConnectionStatus('disconnected');
          // 3秒后重连
          setTimeout(connectWebSocket, 3000);
        };
        
        websocket.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          setConnectionStatus('disconnected');
        };
        
        setWs(websocket);
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        setConnectionStatus('disconnected');
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    // 清理函数
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // 获取namespace和service列表
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? `/api`
          : 'http://localhost:8090/api';
        
        const [namespacesRes, servicesRes] = await Promise.all([
          fetch(`${baseUrl}/namespaces`),
          fetch(`${baseUrl}/services`)
        ]);
        
        if (namespacesRes.ok) {
          const namespacesData = await namespacesRes.json();
          setNamespaces(namespacesData.namespaces || []);
          setNamespaceInfo(namespacesData);
        }
        
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setServices(servicesData.services || []);
        }
      } catch (error) {
        console.error('获取元数据失败:', error);
      }
    };
    
    // 每10秒更新一次元数据
    fetchMetadata();
    const interval = setInterval(fetchMetadata, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // 过滤逻辑
  useEffect(() => {
    let filtered = events;

    // 文本搜索
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(event =>
        event.summary.toLowerCase().includes(searchLower) ||
        event.pod_name.toLowerCase().includes(searchLower) ||
        event.service.toLowerCase().includes(searchLower) ||
        event.namespace.toLowerCase().includes(searchLower) ||
        event.binary.toLowerCase().includes(searchLower) ||
        event.type.toLowerCase().includes(searchLower) ||
        event.level.toLowerCase().includes(searchLower)
      );
    }

    // 级别过滤
    if (levelFilter) {
      filtered = filtered.filter(event => event.level === levelFilter);
    }

    // 事件类型过滤
    if (typeFilter) {
      filtered = filtered.filter(event => event.type === typeFilter);
    }

    // 命名空间过滤
    if (namespaceFilter) {
      filtered = filtered.filter(event => event.namespace === namespaceFilter);
    }

    // 服务过滤
    if (serviceFilter) {
      filtered = filtered.filter(event => event.service === serviceFilter);
    }

    // Pod名称过滤
    if (podNameFilter) {
      filtered = filtered.filter(event => 
        event.pod_name.toLowerCase().includes(podNameFilter.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  }, [events, searchText, levelFilter, typeFilter, namespaceFilter, serviceFilter, podNameFilter]);

  // 生成搜索建议
  const searchOptions: SearchOption[] = useMemo(() => {
    const options: SearchOption[] = [];
    
    // 添加命名空间建议
    namespaces.forEach(ns => {
      options.push({
        value: ns,
        label: `📁 命名空间: ${ns}`,
        category: 'namespace'
      });
    });
    
    // 添加服务建议
    services.forEach(svc => {
      options.push({
        value: svc,
        label: `🔧 服务: ${svc}`,
        category: 'service'
      });
    });
    
    // 添加Pod名称建议
    const uniquePods = [...new Set(events.map(e => e.pod_name).filter(Boolean))].slice(0, 10);
    uniquePods.forEach(pod => {
      options.push({
        value: pod,
        label: `📦 Pod: ${pod}`,
        category: 'pod'
      });
    });
    
    // 添加常用搜索词
    const commonTerms = [
      '进程执行', '系统调用', '进程退出', '敏感文件访问',
      'fintech-demo', 'trading', 'payment', 'risk', 'audit',
      'postgres', 'pg_isready', 'tcp_connect', 'udp_sendmsg'
    ];
    
    commonTerms.forEach(term => {
      options.push({
        value: term,
        label: `🔍 搜索: ${term}`,
        category: 'search'
      });
    });
    
    return options;
  }, [namespaces, services, events]);

  // 清除所有过滤器
  const clearFilters = () => {
    setSearchText('');
    setLevelFilter('');
    setTypeFilter('');
    setNamespaceFilter('');
    setServiceFilter('');
    setPodNameFilter('');
    message.info('已清除所有过滤条件');
  };

  // 刷新事件
  const refreshEvents = async () => {
    try {
      setLoading(true);
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? '/api'
        : 'http://localhost:8090/api';
      
      const response = await fetch(`${baseUrl}/events`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        message.success(`已刷新事件列表，共 ${data.total} 个事件`);
      }
    } catch (error) {
      console.error('刷新事件失败:', error);
      message.error('刷新事件失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取级别标签颜色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'warning': return 'gold';
      case 'medium': return 'blue';
      case 'low': return 'green';
      case 'info': return 'default';
      default: return 'default';
    }
  };

  // 获取级别图标
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'high': return <WarningOutlined style={{ color: '#fa8c16' }} />;
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'medium': return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      case 'low': return <InfoCircleOutlined style={{ color: '#52c41a' }} />;
      case 'info': return <InfoCircleOutlined style={{ color: '#8c8c8c' }} />;
      default: return <InfoCircleOutlined />;
    }
  };

  // 获取事件类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'process_exec': return 'blue';
      case 'process_kprobe': return 'orange';
      case 'process_exit': return 'default';
      case 'network': return 'purple';
      case 'file_access': return 'cyan';
      default: return 'default';
    }
  };

  // 获取连接状态颜色
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  // 快速过滤菜单
  const quickFilterMenu = (
    <Menu>
      <Menu.SubMenu key="level" title="按级别过滤" icon={<SecurityScanOutlined />}>
        <Menu.Item key="critical" onClick={() => setLevelFilter('critical')}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> Critical ({stats.levels.critical || 0})
        </Menu.Item>
        <Menu.Item key="warning" onClick={() => setLevelFilter('warning')}>
          <WarningOutlined style={{ color: '#faad14' }} /> Warning ({stats.levels.warning || 0})
        </Menu.Item>
        <Menu.Item key="info" onClick={() => setLevelFilter('info')}>
          <InfoCircleOutlined /> Info ({stats.levels.info || 0})
        </Menu.Item>
      </Menu.SubMenu>
      <Menu.SubMenu key="namespace" title="按命名空间过滤" icon={<ClusterOutlined />}>
        {Object.entries(stats.namespaces).slice(0, 8).map(([ns, count]) => (
          <Menu.Item key={ns} onClick={() => setNamespaceFilter(ns)}>
            📁 {ns} ({count})
          </Menu.Item>
        ))}
      </Menu.SubMenu>
      <Menu.Divider />
      <Menu.Item key="clear" onClick={clearFilters} icon={<ClearOutlined />}>
        清除所有过滤
      </Menu.Item>
    </Menu>
  );

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      render: (time: string) => (
        <Tooltip title={time}>
          <Text code style={{ fontSize: '11px', fontFamily: 'Monaco, monospace' }}>
            {time ? new Date(time).toLocaleString('zh-CN', { 
              hour12: false,
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }) : ''}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => (
        <Space size={4}>
          {getLevelIcon(level)}
          <Tag color={getLevelColor(level)} style={{ margin: 0, fontWeight: 'bold' }}>
            {level.toUpperCase()}
          </Tag>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: string) => (
        <Tag color={getTypeColor(type)} style={{ margin: 0 }}>
          {type.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '命名空间',
      dataIndex: 'namespace',
      key: 'namespace',
      width: 140,
      render: (namespace: string) => (
        <Space size={4}>
          <ClusterOutlined style={{ color: '#1890ff' }} />
          <Text 
            style={{ 
              fontSize: '12px', 
              fontWeight: namespace === 'fintech-demo' ? 'bold' : 'normal',
              color: namespace === 'fintech-demo' ? '#1890ff' : undefined
            }}
          >
            {namespace || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Pod名称',
      dataIndex: 'pod_name',
      key: 'pod_name',
      width: 220,
      render: (podName: string) => (
        <Tooltip title={podName}>
          <Text 
            ellipsis
            style={{ 
              fontSize: '11px', 
              fontFamily: 'Monaco, monospace',
              maxWidth: 200,
              display: 'block'
            }}
          >
            {podName || '-'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '服务',
      dataIndex: 'service',
      key: 'service',
      width: 120,
      render: (service: string) => (
        <Space size={4}>
          <MonitorOutlined />
          <Text style={{ fontSize: '12px' }}>
            {service || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      render: (summary: string, record: TetragonEvent) => (
        <div style={{ maxWidth: 400 }}>
          <Text 
            style={{ 
              fontSize: '13px',
              fontWeight: record.level === 'critical' ? 'bold' : 'normal'
            }}
          >
            {summary}
          </Text>
          {record.binary && (
            <div style={{ marginTop: 4 }}>
              <Text code style={{ fontSize: '11px', background: '#f0f0f0' }}>
                {record.binary}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: TetragonEvent) => (
        <Tooltip title="查看详细信息">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              message.info('详细信息功能开发中...');
              console.log('事件详情:', record);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header 
        style={{ 
          background: '#fff', 
          padding: '0 24px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space size={16}>
              <SecurityScanOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                Tetragon 安全事件监控
              </Title>
              <Badge 
                status={getConnectionStatusColor()} 
                text={
                  connectionStatus === 'connected' ? '实时连接' :
                  connectionStatus === 'connecting' ? '连接中...' : '连接断开'
                }
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Tooltip title="刷新事件列表">
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={refreshEvents}
                  loading={loading}
                  type="primary"
                  ghost
                >
                  刷新
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ padding: '24px' }}>
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="总事件数"
                value={stats.total}
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Critical 事件"
                value={stats.criticalCount}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Warning 事件"
                value={stats.warningCount}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="过滤结果"
                value={stats.filtered}
                prefix={<FilterOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 命名空间信息 */}
        {namespaceInfo && (
          <Alert
            message={
              <Space>
                <ClusterOutlined />
                <Text strong>命名空间监控状态：</Text>
                <Text>总计 {namespaceInfo.total} 个命名空间</Text>
                <Text type="secondary">
                  (K8s API: {namespaceInfo.from_k8s} | 事件中: {namespaceInfo.from_events})
                </Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 搜索和过滤区域 */}
        <Card 
          title={
            <Space>
              <FilterOutlined />
              <span>事件过滤器</span>
            </Space>
          }
          extra={
            <Space>
              <Dropdown overlay={quickFilterMenu} placement="bottomRight">
                <Button icon={<FilterOutlined />}>
                  快速过滤 <DownOutlined />
                </Button>
              </Dropdown>
              <Button 
                icon={<ClearOutlined />} 
                onClick={clearFilters}
                ghost
                danger
              >
                清除
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>智能搜索</Text>
                <AutoComplete
                  style={{ width: '100%' }}
                  placeholder="搜索事件内容、Pod名称、命名空间..."
                  options={searchOptions}
                  value={searchText}
                  onChange={setSearchText}
                  filterOption={(inputValue, option) =>
                    option!.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
                  }
                >
                  <Input prefix={<SearchOutlined />} allowClear />
                </AutoComplete>
              </Space>
            </Col>
            <Col span={4}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>事件级别</Text>
                <Select
                  placeholder="选择级别"
                  value={levelFilter}
                  onChange={setLevelFilter}
                  style={{ width: '100%' }}
                  allowClear
                >
                  <Option value="critical">
                    <Space>
                      <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                      Critical ({stats.levels.critical || 0})
                    </Space>
                  </Option>
                  <Option value="warning">
                    <Space>
                      <WarningOutlined style={{ color: '#faad14' }} />
                      Warning ({stats.levels.warning || 0})
                    </Space>
                  </Option>
                  <Option value="info">
                    <Space>
                      <InfoCircleOutlined />
                      Info ({stats.levels.info || 0})
                    </Space>
                  </Option>
                </Select>
              </Space>
            </Col>
            <Col span={4}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>事件类型</Text>
                <Select
                  placeholder="选择类型"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  style={{ width: '100%' }}
                  allowClear
                >
                  {Object.entries(stats.types).map(([type, count]) => (
                    <Option key={type} value={type}>
                      {type.replace('_', ' ')} ({count})
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col span={4}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>命名空间</Text>
                <Select
                  placeholder="选择命名空间"
                  value={namespaceFilter}
                  onChange={setNamespaceFilter}
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                >
                  {namespaces.map(ns => (
                    <Option key={ns} value={ns}>
                      <Space>
                        <ClusterOutlined />
                        {ns} {stats.namespaces[ns] ? `(${stats.namespaces[ns]})` : ''}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col span={4}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Pod名称</Text>
                <Input
                  placeholder="输入Pod名称"
                  value={podNameFilter}
                  onChange={(e) => setPodNameFilter(e.target.value)}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 事件表格 */}
        <Card
          title={
            <Space>
              <MonitorOutlined />
              <span>实时事件流</span>
              <Badge count={filteredEvents.length} showZero color="#1890ff" />
            </Space>
          }
          extra={
            <Space>
              <Text type="secondary">
                显示 {filteredEvents.length} / {events.length} 个事件
              </Text>
              <Badge 
                status={getConnectionStatusColor()} 
                text={connectionStatus}
              />
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={filteredEvents}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条事件`,
            }}
            scroll={{ x: 1200, y: 600 }}
            size="small"
            rowClassName={(record) => {
              if (record.level === 'critical') return 'critical-row';
              if (record.level === 'warning') return 'warning-row';
              return '';
            }}
          />
        </Card>
      </Content>

      {/* 自定义样式 */}
      <style>{`
        .critical-row {
          background-color: #fff2f0 !important;
        }
        .warning-row {
          background-color: #fffbe6 !important;
        }
        .ant-table-tbody > tr:hover.critical-row > td {
          background-color: #ffebe8 !important;
        }
        .ant-table-tbody > tr:hover.warning-row > td {
          background-color: #fff7db !important;
        }
      `}</style>
    </Layout>
  );
};

export default AllEventsLog; 
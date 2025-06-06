import React, { useState, useEffect, useRef } from 'react';
import { Card, List, Tag, Badge, Typography, Space, Button, Select, Switch, notification, Statistic, Row, Col } from 'antd';
import { 
  ExclamationCircleOutlined, 
  EyeOutlined, 
  BugOutlined, 
  SafetyCertificateOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface Process {
  pid: number;
  binary: string;
  arguments: string;
  start_time: string;
  pod?: PodInfo;
}

interface PodInfo {
  namespace: string;
  name: string;
  container?: {
    name: string;
    image?: {
      name: string;
    };
  };
}

interface TetragonEvent {
  timestamp: string;
  time: string;
  event_type: string;
  severity: string;
  description: string;
  node_name: string;
  process_exec?: {
    process: Process;
  };
  process_kprobe?: {
    process: Process;
    function_name: string;
    args?: string[];
  };
}

interface SecurityAlert {
  id: string;
  timestamp: string;
  severity: string;
  title: string;
  description: string;
  action: string;
  status: string;
  event: TetragonEvent;
}

interface EventStatistics {
  total_events: number;
  total_alerts: number;
  active_alerts: number;
  recent_events_count: number;
  severity_breakdown: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  event_type_breakdown: {
    process_exec: number;
    process_kprobe: number;
  };
}

const TetragonEventStream: React.FC = () => {
  const [events, setEvents] = useState<TetragonEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);
  const [connected, setConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [maxEvents, setMaxEvents] = useState(50);
  const [enableAlerts, setEnableAlerts] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const isManualDisconnect = useRef(false);

  // WebSocket 連接管理
  useEffect(() => {
    if (isRunning) {
      isManualDisconnect.current = false;
      connectWebSocket();
    } else {
      isManualDisconnect.current = true;
      disconnectWebSocket();
    }

    return () => {
      isManualDisconnect.current = true;
      disconnectWebSocket();
    };
  }, [isRunning]);

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    // 構建WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '30080'; // Trading API 端口
    const wsUrl = `${protocol}//${host}:${port}/api/v1/tetragon/ws`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setConnected(true);
      setConnectionStatus('connected');
      if (enableAlerts) {
        notification.success({
          message: '已連接到 Tetragon 事件流',
          description: '開始接收實時安全事件',
          duration: 3,
        });
      }
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'welcome':
            console.log('WebSocket 歡迎消息:', data.message);
            break;
            
          case 'recent_events':
            setEvents(data.events || []);
            break;
            
          case 'security_event':
            addNewEvent(data.event);
            break;
            
          default:
            console.log('未知消息類型:', data);
        }
      } catch (error) {
        console.error('解析 WebSocket 消息失敗:', error);
      }
    };

    wsRef.current.onclose = () => {
      setConnected(false);
      setConnectionStatus('disconnected');
      
      if (!isManualDisconnect.current && isRunning) {
        console.log('WebSocket 意外斷線，3秒後嘗試重連...');
        setTimeout(() => {
          if (!isManualDisconnect.current && isRunning) {
            connectWebSocket();
          }
        }, 3000);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket 錯誤:', error);
      if (enableAlerts) {
        notification.error({
          message: 'WebSocket 連接錯誤',
          description: '無法連接到事件流，請檢查服務狀態',
          duration: 5,
        });
      }
    };
  };

  const disconnectWebSocket = () => {
    isManualDisconnect.current = true;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setConnectionStatus('disconnected');
  };

  const addNewEvent = (newEvent: TetragonEvent) => {
    if (!isRunning) {
      return;
    }

    setEvents(prevEvents => {
      const updated = [newEvent, ...prevEvents].slice(0, maxEvents);
      return updated;
    });

    if (isRunning && enableAlerts && (newEvent.severity === 'CRITICAL' || newEvent.severity === 'HIGH')) {
      notification.warning({
        message: `${newEvent.severity} 安全事件`,
        description: newEvent.description,
        duration: 8,
        icon: <ExclamationCircleOutlined style={{ color: newEvent.severity === 'CRITICAL' ? '#ff4d4f' : '#faad14' }} />,
      });
    }
  };

  // 獲取事件和告警數據
  const fetchData = async () => {
    try {
      // 獲取事件列表
      const eventsParams = new URLSearchParams();
      if (selectedSeverity) eventsParams.append('severity', selectedSeverity);
      if (selectedEventType) eventsParams.append('event_type', selectedEventType);
      eventsParams.append('limit', maxEvents.toString());

      const eventsResponse = await fetch(`/api/trading/api/v1/tetragon/events?${eventsParams.toString()}`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        if (!connected) { // 只有在WebSocket未連接時才更新
          setEvents(eventsData.events || []);
        }
      }

      // 獲取告警列表
      const alertsResponse = await fetch('/api/trading/api/v1/tetragon/alerts');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      }

      // 獲取統計數據
      const statsResponse = await fetch('/api/trading/api/v1/tetragon/statistics');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData.statistics);
      }
    } catch (error) {
      console.error('獲取數據失敗:', error);
    }
  };

  // 初始數據加載
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 每10秒刷新一次統計數據
    return () => clearInterval(interval);
  }, [selectedSeverity, selectedEventType, maxEvents]);

  // 嚴重程度標籤顏色
  const getSeverityColor = (severity: string) => {
    const colors = {
      CRITICAL: '#ff4d4f',
      HIGH: '#faad14',
      MEDIUM: '#1890ff',
      LOW: '#52c41a',
    };
    return colors[severity as keyof typeof colors] || '#d9d9d9';
  };

  // 事件類型圖標
  const getEventTypeIcon = (eventType: string) => {
    const icons = {
      process_exec: <BugOutlined />,
      process_kprobe: <EyeOutlined />,
    };
    return icons[eventType as keyof typeof icons] || <SafetyCertificateOutlined />;
  };

  // 格式化時間戳
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-TW');
  };

  // 連接狀態指示器
  const getConnectionBadge = () => {
    const statusConfig = {
      connecting: { status: 'processing', text: '連接中' },
      connected: { status: 'success', text: '已連接' },
      disconnected: { status: 'error', text: '已斷線' },
    };
    
    const config = statusConfig[connectionStatus];
    return <Badge status={config.status as any} text={config.text} />;
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <SafetyCertificateOutlined /> Tetragon eBPF 安全事件監控
      </Title>

      {/* 統計概覽 */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="總事件數"
                value={statistics.total_events}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活躍告警"
                value={statistics.active_alerts}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="關鍵事件"
                value={statistics.severity_breakdown.CRITICAL}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="近期事件"
                value={statistics.recent_events_count}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 控制面板 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space size="middle" wrap>
          <span>連接狀態: {getConnectionBadge()}</span>
          
          <Switch
            checked={isRunning}
            onChange={setIsRunning}
            checkedChildren={<PlayCircleOutlined />}
            unCheckedChildren={<PauseCircleOutlined />}
          />
          <Text type="secondary">{isRunning ? '實時監控' : '已暫停'}</Text>

          <Switch
            checked={enableAlerts}
            onChange={setEnableAlerts}
            checkedChildren="告警開啟"
            unCheckedChildren="告警關閉"
          />
          <Text type="secondary">{enableAlerts ? '跳出告警已開啟' : '跳出告警已關閉'}</Text>

          <Select
            style={{ width: 120 }}
            placeholder="嚴重程度"
            allowClear
            value={selectedSeverity}
            onChange={setSelectedSeverity}
          >
            <Option value="CRITICAL">關鍵</Option>
            <Option value="HIGH">高</Option>
            <Option value="MEDIUM">中等</Option>
            <Option value="LOW">低</Option>
          </Select>

          <Select
            style={{ width: 140 }}
            placeholder="事件類型"
            allowClear
            value={selectedEventType}
            onChange={setSelectedEventType}
          >
            <Option value="process_exec">進程執行</Option>
            <Option value="process_kprobe">內核探針</Option>
          </Select>

          <Select
            style={{ width: 100 }}
            value={maxEvents}
            onChange={setMaxEvents}
          >
            <Option value={25}>25</Option>
            <Option value={50}>50</Option>
            <Option value={100}>100</Option>
          </Select>

          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        </Space>
      </Card>

      {/* 事件列表 */}
      <Card title={`安全事件 (${events.length})`}>
        <List
          dataSource={events}
          renderItem={(event: TetragonEvent) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <div style={{ textAlign: 'center' }}>
                    {getEventTypeIcon(event.event_type)}
                    <br />
                    <Tag color={getSeverityColor(event.severity)} style={{ margin: '4px 0 0 0' }}>
                      {event.severity}
                    </Tag>
                  </div>
                }
                title={
                  <Space>
                    <Text strong>{event.description}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatTimestamp(event.timestamp)}
                    </Text>
                  </Space>
                }
                description={
                  <div>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <Text type="secondary">節點: </Text>
                        <Text code>{event.node_name}</Text>
                        <Text type="secondary" style={{ marginLeft: '16px' }}>類型: </Text>
                        <Tag>{event.event_type}</Tag>
                      </div>
                      
                      {event.process_exec && (
                        <div>
                          <Text type="secondary">進程: </Text>
                          <Text code>{event.process_exec.process.binary}</Text>
                          <Text type="secondary" style={{ marginLeft: '16px' }}>參數: </Text>
                          <Text code>{event.process_exec.process.arguments}</Text>
                          {event.process_exec.process.pod && (
                            <div style={{ marginTop: '4px' }}>
                              <Text type="secondary">Pod: </Text>
                              <Text code>{event.process_exec.process.pod.namespace}/{event.process_exec.process.pod.name}</Text>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {event.process_kprobe && (
                        <div>
                          <Text type="secondary">函數: </Text>
                          <Text code>{event.process_kprobe.function_name}</Text>
                          <Text type="secondary" style={{ marginLeft: '16px' }}>進程: </Text>
                          <Text code>{event.process_kprobe.process.binary}</Text>
                          {event.process_kprobe.args && (
                            <div style={{ marginTop: '4px' }}>
                              <Text type="secondary">參數: </Text>
                              <Text code>{event.process_kprobe.args.join(', ')}</Text>
                            </div>
                          )}
                        </div>
                      )}
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{
            emptyText: '暫無安全事件'
          }}
        />
      </Card>

      {/* 告警列表 */}
      {alerts.length > 0 && (
        <Card title={`安全告警 (${alerts.length})`} style={{ marginTop: '24px' }}>
          <List
            dataSource={alerts}
            renderItem={(alert: SecurityAlert) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<ExclamationCircleOutlined style={{ color: getSeverityColor(alert.severity), fontSize: '20px' }} />}
                  title={
                    <Space>
                      <Text strong style={{ color: getSeverityColor(alert.severity) }}>
                        {alert.title}
                      </Text>
                      <Tag color={alert.status === 'ACTIVE' ? 'red' : 'default'}>
                        {alert.status}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div>{alert.description}</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatTimestamp(alert.timestamp)} | 動作: {alert.action}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default TetragonEventStream; 
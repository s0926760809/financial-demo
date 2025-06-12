import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Tabs,
  Button,
  Space,
  Drawer,
  message,
} from 'antd';
import {
  SecurityScanOutlined,
  BugOutlined,
  WifiOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import styles from './Security.module.css';
import PageTitle from '../../components/PageTitle';
import { Event, SecurityTest } from '../../types';
import { triggerSecurityTest, connectWebSocket } from '../../services/api';
import SecurityTestPanel from './SecurityTestPanel';
import AllEventsLog from './AllEventsLog';
import NetworkAttackPanel from './NetworkAttackPanel';
import DnsLogTable from './DnsLogTable';
import HttpFlowTable from './HttpFlowTable';
import SecurityDocumentation from './SecurityDocumentation';

const { Title, Paragraph } = Typography;

const SecurityPage: React.FC = () => {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [dnsEvents, setDnsEvents] = useState<Event[]>([]);
  const [httpEvents, setHttpEvents] = useState<Event[]>([]);
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const handleNewEvent = useCallback((event: Event) => {
    let eventType = (event.type || 'GENERIC').toUpperCase();
    let summary = event.summary;
    let specificData = event.data || {};

    if (eventType === 'DNS_LOOKUP' && specificData.names) {
      eventType = 'DNS';
      summary = `DNS query for ${specificData.names.join(', ')}`;
    } else if (eventType.startsWith('HTTP') && specificData.http) {
      eventType = 'HTTP';
      summary = `${specificData.http.method} ${specificData.http.url} - ${specificData.http.status_code}`;
    } else if (eventType === 'PROCESS_EXEC' && specificData.process) {
      summary = `Process executed: ${specificData.process.binary}`;
    }

    const newEvent: Event = { 
      ...event, 
      id: `evt-${Date.now()}-${Math.random()}`,
      type: eventType,
      summary,
      data: specificData,
    };

    setAllEvents(prev => [newEvent, ...prev.slice(0, 199)]);
    
    if (newEvent.type === 'DNS') {
      setDnsEvents(prev => [newEvent, ...prev.slice(0, 99)]);
    } else if (newEvent.type === 'HTTP') {
      setHttpEvents(prev => [newEvent, ...prev.slice(0, 99)]);
    }

    if (newEvent.level === 'critical' || newEvent.level === 'high') {
      message.error(`高危安全警報: ${newEvent.summary}`);
    }
  }, []);

  useEffect(() => {
    const ws = connectWebSocket(handleNewEvent);
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [handleNewEvent]);

  const handleRunTest = async (test: SecurityTest) => {
    setIsTesting(prev => ({ ...prev, [test.id]: true }));
    try {
      await triggerSecurityTest(test.endpoint, test.payload);
      message.success(`${test.name} 觸發成功`);
    } catch (error: any) {
      console.error(`測試 "${test.name}" 失敗:`, error);
      message.error(error.message || `觸發 ${test.name} 時發生未知錯誤`);
    } finally {
      setIsTesting(prev => ({ ...prev, [test.id]: false }));
    }
  };
  
  const showDrawer = () => {
    setIsDrawerVisible(true);
  };

  const onCloseDrawer = () => {
    setIsDrawerVisible(false);
  };

  return (
    <div className={styles.securityPage}>
      <PageTitle title="安全中心 (Security Center)" />

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <SecurityScanOutlined style={{ fontSize: '24px' }} />
                <Title level={4} style={{ marginBottom: 0 }}>eBPF 安全可觀測性平台</Title>
              </Space>
              <Space>
                <Button onClick={showDrawer} icon={<InfoCircleOutlined />}>測試說明</Button>
              </Space>
            </div>
            <Paragraph type="secondary" style={{ marginTop: '8px' }}>
              基於 eBPF/Tetragon 的實時威脅檢測與響應。點擊下方按鈕可模擬各種安全威脅場景，並在下方的事件日誌中觀察 Tetragon 捕獲到的內核級別事件。
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <Tabs 
        defaultActiveKey="1" 
        type="card" 
        style={{ marginTop: 24 }}
        items={[
          {
            key: "1",
            label: <span><BugOutlined /> 威脅模擬與響應</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col lg={10} xs={24}>
                  <SecurityTestPanel onRunTest={handleRunTest} isTesting={isTesting} />
                </Col>
                <Col lg={14} xs={24}>
                  <AllEventsLog events={allEvents} title="實時安全事件日誌 (All Events)" />
                </Col>
              </Row>
            )
          },
          {
            key: "2",
            label: <span><WifiOutlined /> 網路監控 (Network)</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col lg={8} xs={24}>
                  <NetworkAttackPanel onRunTest={handleRunTest} isTesting={isTesting} />
                </Col>
                <Col lg={16} xs={24}>
                  <DnsLogTable events={dnsEvents} />
                  <HttpFlowTable events={httpEvents} style={{ marginTop: 24 }} />
                </Col>
              </Row>
            )
          }
        ]}
      />
      
      <Drawer
        title="安全測試說明文檔"
        placement="right"
        onClose={onCloseDrawer}
        open={isDrawerVisible}
        width={800}
        styles={{
          body: { padding: 0 }
        }}
      >
        <SecurityDocumentation />
      </Drawer>
    </div>
  );
};

export default SecurityPage; 
import React from 'react';
import { Typography, Divider, Card, List, Tag, Space, Alert } from 'antd';
import { 
  CodeOutlined,
  FileTextOutlined,
  ExportOutlined,
  LockOutlined,
  HddOutlined,
  BugOutlined,
  ClusterOutlined,
  CloudUploadOutlined,
  ForkOutlined,
  GatewayOutlined,
  WarningOutlined,
  SecurityScanOutlined,
  MonitorOutlined,
  WifiOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const SecurityDocumentation: React.FC = () => {
  const generalThreats = [
    {
      name: '進程信息收集',
      icon: <CodeOutlined />,
      riskLevel: 'high',
      description: '模擬攻擊者執行系統命令來收集進程信息，如 ps aux、id 等。',
      ebpfEvents: ['process_exec', 'syscall_execve'],
      impact: '攻擊者可以了解系統中運行的進程，發現潛在的攻擊目標。',
      mitigation: 'eBPF/Tetragon 可以監控所有進程執行事件，檢測異常命令執行模式。'
    },
    {
      name: '讀取敏感文件',
      icon: <FileTextOutlined />,
      riskLevel: 'critical',
      description: '嘗試讀取系統敏感文件，如 /etc/shadow、/etc/passwd 等。',
      ebpfEvents: ['file_open', 'file_read', 'syscall_openat'],
      impact: '可能洩露用戶密碼哈希、系統配置等敏感信息。',
      mitigation: '監控文件系統調用，對敏感文件的訪問進行實時告警。'
    },
    {
      name: '內存轉儲',
      icon: <HddOutlined />,
      riskLevel: 'high',
      description: '使用 gcore 等工具轉儲進程內存，可能包含敏感數據。',
      ebpfEvents: ['memory_access', 'process_ptrace'],
      impact: '可能從內存中提取密碼、密鑰等敏感信息。',
      mitigation: 'eBPF 可以監控內存訪問模式和調試器附加行為。'
    },
    {
      name: '權限提升探測',
      icon: <LockOutlined />,
      riskLevel: 'critical',
      description: '執行 sudo -l 等命令探測權限提升路徑。',
      ebpfEvents: ['process_exec', 'syscall_setuid'],
      impact: '攻擊者可能發現提權機會，獲得更高權限。',
      mitigation: '監控權限相關的系統調用和命令執行。'
    },
    {
      name: '網絡掃描',
      icon: <ExportOutlined />,
      riskLevel: 'high',
      description: '掃描內部網絡服務和端口，探測攻擊面。',
      ebpfEvents: ['network_connect', 'syscall_connect'],
      impact: '可能發現內部服務的漏洞，為進一步攻擊做準備。',
      mitigation: 'eBPF 可以監控所有網絡連接，檢測掃描行為。'
    },
    {
      name: '敏感數據洩露',
      icon: <BugOutlined />,
      riskLevel: 'critical',
      description: '模擬敏感數據的處理和洩露，如信用卡號、API密鑰等。',
      ebpfEvents: ['file_write', 'network_send', 'memory_access'],
      impact: '可能導致用戶隱私洩露和商業損失。',
      mitigation: '監控敏感數據的存儲、傳輸和處理行為。'
    },
    {
      name: 'SQL注入測試',
      icon: <ClusterOutlined />,
      riskLevel: 'critical',
      description: '測試SQL注入漏洞，可能獲取數據庫數據。',
      ebpfEvents: ['network_connect', 'file_read'],
      impact: '可能導致數據庫洩露、數據篡改等嚴重後果。',
      mitigation: '監控數據庫連接和異常查詢模式。'
    }
  ];

  const networkAttacks = [
    {
      name: 'DNS 數據洩露',
      icon: <CloudUploadOutlined />,
      riskLevel: 'medium',
      description: '通過DNS查詢將敏感數據編碼在子域名中向外傳輸。',
      ebpfEvents: ['dns_lookup', 'network_send'],
      impact: '可以繞過防火牆將數據外泄到攻擊者控制的DNS服務器。',
      mitigation: 'eBPF 可以監控DNS查詢模式，檢測異常的域名請求。'
    },
    {
      name: '橫向移動',
      icon: <GatewayOutlined />,
      riskLevel: 'high',
      description: '探測內部網絡中的其他服務，模擬攻擊者的橫向移動。',
      ebpfEvents: ['network_connect', 'syscall_connect'],
      impact: '攻擊者可以擴大攻擊範圍，感染更多內部系統。',
      mitigation: '監控內部網絡連接，識別異常的橫向移動行為。'
    },
    {
      name: 'C2 心跳信標',
      icon: <BugOutlined />,
      riskLevel: 'critical',
      description: '模擬惡意軟件向外部C2服務器發送心跳連接。',
      ebpfEvents: ['network_connect', 'dns_lookup'],
      impact: '表明系統已被感染，正在接受外部控制。',
      mitigation: 'eBPF 可以檢測周期性的外部連接模式。'
    },
    {
      name: '數據外傳',
      icon: <ForkOutlined />,
      riskLevel: 'critical',
      description: '通過非標準端口將大量數據傳輸到外部服務器。',
      ebpfEvents: ['network_send', 'file_read'],
      impact: '可能導致大量敏感數據被竊取。',
      mitigation: '監控網絡流量模式，檢測異常的數據傳輸。'
    }
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'gold';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getRiskText = (level: string) => {
    switch (level) {
      case 'critical': return '極高風險';
      case 'high': return '高風險';
      case 'medium': return '中等風險';
      case 'low': return '低風險';
      default: return '未知';
    }
  };

  return (
    <div style={{ maxWidth: '100%', padding: '0 8px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 文檔標題 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>
            <SecurityScanOutlined style={{ marginRight: 12 }} />
            eBPF 安全測試模擬指南
          </Title>
          <Paragraph type="secondary" style={{ fontSize: '16px' }}>
            基於 Tetragon eBPF 的實時威脅檢測與安全可觀測性平台
          </Paragraph>
        </div>

        {/* 重要提醒 */}
        <Alert
          message="重要安全提醒"
          description="本平台提供的所有安全測試功能僅用於演示 eBPF/Tetragon 的安全監控能力。請勿在生產環境中使用，也不要用於非法目的。"
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* eBPF 監控原理 */}
        <Card title={
          <Space>
            <MonitorOutlined />
            <span>eBPF 監控原理</span>
          </Space>
        }>
          <Paragraph>
            Extended Berkeley Packet Filter (eBPF) 是一項革命性的技術，允許在 Linux 內核中運行沙盒程序，
            而無需修改內核源代碼或加載內核模塊。Tetragon 利用 eBPF 提供：
          </Paragraph>
          <List
            size="small"
            dataSource={[
              '實時進程監控：捕獲所有進程創建、執行和終止事件',
              '文件系統監控：監控文件和目錄的訪問、修改操作',
              '網絡活動監控：追踪網絡連接、DNS查詢等網絡行為',
              '系統調用追踪：監控關鍵系統調用的執行',
              '內核級可見性：提供用戶空間無法獲得的深度洞察'
            ]}
            renderItem={(item) => (
              <List.Item>
                <Text>• {item}</Text>
              </List.Item>
            )}
          />
        </Card>

        <Divider />

        {/* 通用威脅模擬 */}
        <Card title={
          <Space>
            <BugOutlined />
            <span>通用威脅模擬 (General Threats)</span>
          </Space>
        }>
          <Paragraph>
            這些測試模擬了主機和容器環境中最常見的威脅行為，幫助驗證 eBPF 監控系統的檢測能力：
          </Paragraph>
          
          <List
            dataSource={generalThreats}
            renderItem={(threat) => (
              <List.Item style={{ padding: '16px', border: '1px solid #f0f0f0', borderRadius: '8px', marginBottom: '12px' }}>
                <List.Item.Meta
                  avatar={<div style={{ fontSize: '24px', color: '#1890ff' }}>{threat.icon}</div>}
                  title={
                    <Space>
                      <Text strong>{threat.name}</Text>
                      <Tag color={getRiskColor(threat.riskLevel)}>{getRiskText(threat.riskLevel)}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text>{threat.description}</Text>
                      <div>
                        <Text strong>監控事件：</Text>
                        <Space wrap>
                          {threat.ebpfEvents.map(event => (
                            <Tag key={event} color="blue">{event}</Tag>
                          ))}
                        </Space>
                      </div>
                      <div>
                        <Text strong>安全影響：</Text>
                        <Text type="danger">{threat.impact}</Text>
                      </div>
                      <div>
                        <Text strong>eBPF 緩解：</Text>
                        <Text type="success">{threat.mitigation}</Text>
                      </div>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        <Divider />

        {/* 網絡攻擊模擬 */}
        <Card title={
          <Space>
            <WifiOutlined />
            <span>網絡攻擊模擬 (Network Attacks)</span>
          </Space>
        }>
          <Paragraph>
            這些測試專注於網絡層面的威脅，模擬攻擊者的網絡攻擊行為，檢測系統對異常網絡活動的監控能力：
          </Paragraph>
          
          <List
            dataSource={networkAttacks}
            renderItem={(attack) => (
              <List.Item style={{ padding: '16px', border: '1px solid #f0f0f0', borderRadius: '8px', marginBottom: '12px' }}>
                <List.Item.Meta
                  avatar={<div style={{ fontSize: '24px', color: '#ff4d4f' }}>{attack.icon}</div>}
                  title={
                    <Space>
                      <Text strong>{attack.name}</Text>
                      <Tag color={getRiskColor(attack.riskLevel)}>{getRiskText(attack.riskLevel)}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text>{attack.description}</Text>
                      <div>
                        <Text strong>監控事件：</Text>
                        <Space wrap>
                          {attack.ebpfEvents.map(event => (
                            <Tag key={event} color="purple">{event}</Tag>
                          ))}
                        </Space>
                      </div>
                      <div>
                        <Text strong>安全影響：</Text>
                        <Text type="danger">{attack.impact}</Text>
                      </div>
                      <div>
                        <Text strong>eBPF 緩解：</Text>
                        <Text type="success">{attack.mitigation}</Text>
                      </div>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        <Divider />

        {/* 使用指南 */}
        <Card title="使用指南">
          <List
            size="large"
            dataSource={[
              {
                title: '1. 選擇測試類型',
                content: '在主界面中選擇"威脅模擬與響應"或"網路監控"標籤頁。'
              },
              {
                title: '2. 執行安全測試',
                content: '點擊任意測試按鈕觸發模擬攻擊，系統會自動執行相應的安全測試場景。'
              },
              {
                title: '3. 觀察事件日誌',
                content: '在右側的事件日誌中實時觀察 Tetragon 捕獲的內核級別安全事件。'
              },
              {
                title: '4. 分析安全事件',
                content: '點擊事件條目可以查看詳細的事件信息，包括進程信息、系統調用等。'
              },
              {
                title: '5. 監控網絡活動',
                content: '在網絡監控標籤頁中查看 DNS 查詢和 HTTP 流量的詳細記錄。'
              }
            ]}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={<Text strong>{item.title}</Text>}
                  description={item.content}
                />
              </List.Item>
            )}
          />
        </Card>

        {/* 技術說明 */}
        <Card title="技術實現說明">
          <Paragraph>
            <Text strong>後端實現：</Text> 使用 Go 語言開發的微服務架構，集成 Tetragon eBPF 監控組件。
          </Paragraph>
          <Paragraph>
            <Text strong>前端實現：</Text> 基於 React + TypeScript + Ant Design 的現代化前端架構。
          </Paragraph>
          <Paragraph>
            <Text strong>實時通信：</Text> 使用 WebSocket 實現前後端的實時事件傳輸。
          </Paragraph>
          <Paragraph>
            <Text strong>安全隔離：</Text> 所有安全測試都在受控環境中執行，不會影響生產系統。
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
};

export default SecurityDocumentation; 
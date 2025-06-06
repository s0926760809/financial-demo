import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  Alert,
  Input,
  Select,
  Form,
  Modal,
  Table,
  Tag,
  Progress,
  Tooltip,
  Descriptions,
  Badge,
  message,
  Spin,
  Switch,
  InputNumber,
  Divider,
  Collapse,
  Timeline,
} from 'antd';
import {
  SecurityScanOutlined,
  BugOutlined,
  ExperimentOutlined,
  CodeOutlined,
  FileSearchOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LockOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  ExportOutlined,
  ReloadOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

// 安全測試類型定義
interface SecurityTest {
  id: string;
  name: string;
  description: string;
  risk_level: string;
  endpoint: string;
  method: string;
}

interface SecurityTestResponse {
  test_name: string;
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
  risk_level: string;
  ebpf_events?: string[];
}

interface TestResult {
  id: string;
  test: SecurityTest;
  response: SecurityTestResponse;
  timestamp: string;
}

const SecurityTesting: React.FC = () => {
  const [tests, setTests] = useState<SecurityTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedTest, setSelectedTest] = useState<SecurityTest | null>(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [form] = Form.useForm();

  // 獲取安全測試列表
  const fetchSecurityTests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:30080/api/v1/security/tests');
      if (response.data.success) {
        setTests(response.data.tests);
      }
    } catch (error) {
      message.error('獲取安全測試列表失敗');
      console.error('Error fetching security tests:', error);
    } finally {
      setLoading(false);
    }
  };

  // 執行安全測試
  const executeTest = async (test: SecurityTest, parameters: any) => {
    try {
      setLoading(true);
      const response = await axios.post(`http://localhost:30080${test.endpoint}`, parameters, {
        headers: {
          'X-User-ID': 'security-tester',
        },
      });

      const result: TestResult = {
        id: Date.now().toString(),
        test,
        response: response.data,
        timestamp: new Date().toISOString(),
      };

      setTestResults((prev) => [result, ...prev]);
      setTestModalVisible(false);
      form.resetFields();

      // 顯示測試結果
      if (response.data.success) {
        message.success(`${test.name} 執行成功`);
      } else {
        message.warning(`${test.name} 執行完成，但有警告`);
      }

      // 自動顯示結果詳情
      setSelectedResult(result);
      setResultModalVisible(true);
    } catch (error: any) {
      message.error(`執行 ${test.name} 失敗: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 執行綜合安全測試
  const executeComprehensiveTest = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        'http://localhost:30080/api/v1/security/test/comprehensive',
        {
          test_suite: ['command_injection', 'file_access', 'sensitive_data', 'sql_injection'],
          severity: 'high',
        },
        {
          headers: {
            'X-User-ID': 'security-tester',
          },
        },
      );

      const result: TestResult = {
        id: Date.now().toString(),
        test: {
          id: 'comprehensive',
          name: '綜合安全測試',
          description: '執行所有安全測試項目',
          risk_level: 'CRITICAL',
          endpoint: '/api/v1/security/test/comprehensive',
          method: 'POST',
        },
        response: response.data,
        timestamp: new Date().toISOString(),
      };

      setTestResults((prev) => [result, ...prev]);
      setSelectedResult(result);
      setResultModalVisible(true);
      message.success('綜合安全測試執行完成');
    } catch (error: any) {
      message.error(`綜合安全測試失敗: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 打開測試配置對話框
  const openTestModal = (test: SecurityTest) => {
    setSelectedTest(test);
    setTestModalVisible(true);
    form.resetFields();
  };

  // 渲染測試參數表單
  const renderTestForm = () => {
    if (!selectedTest) return null;

    switch (selectedTest.id) {
      case 'command_injection':
        return (
          <>
            <Form.Item
              name="command"
              label="命令"
              rules={[{ required: true, message: '請輸入要執行的命令' }]}
            >
              <Input placeholder="例如: whoami, ls -la, cat /etc/passwd" />
            </Form.Item>
            <Form.Item name="args" label="參數">
              <Input placeholder="額外的命令參數" />
            </Form.Item>
          </>
        );

      case 'file_access':
        return (
          <>
            <Form.Item
              name="file_path"
              label="文件路徑"
              rules={[{ required: true, message: '請輸入文件路徑' }]}
            >
              <Input placeholder="例如: /etc/passwd, /tmp, ." />
            </Form.Item>
            <Form.Item
              name="action"
              label="操作類型"
              rules={[{ required: true, message: '請選擇操作類型' }]}
            >
              <Select placeholder="選擇操作類型">
                <Option value="read">讀取文件</Option>
                <Option value="list">列出目錄</Option>
                <Option value="write">寫入文件</Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'network_scan':
        return (
          <>
            <Form.Item
              name="target"
              label="目標地址"
              rules={[{ required: true, message: '請輸入目標地址' }]}
            >
              <Input placeholder="例如: localhost, 127.0.0.1, google.com" />
            </Form.Item>
            <Form.Item
              name="ports"
              label="端口列表"
              rules={[{ required: true, message: '請輸入端口列表' }]}
            >
              <Select mode="tags" placeholder="例如: 22, 80, 443, 3306">
                <Option value={22}>22 (SSH)</Option>
                <Option value={80}>80 (HTTP)</Option>
                <Option value={443}>443 (HTTPS)</Option>
                <Option value={3306}>3306 (MySQL)</Option>
                <Option value={5432}>5432 (PostgreSQL)</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="scan_type"
              label="掃描類型"
              rules={[{ required: true, message: '請選擇掃描類型' }]}
            >
              <Select placeholder="選擇掃描類型">
                <Option value="tcp">TCP掃描</Option>
                <Option value="ping">PING掃描</Option>
              </Select>
            </Form.Item>
            <Form.Item name="timeout" label="超時時間(秒)">
              <InputNumber min={1} max={60} defaultValue={3} />
            </Form.Item>
          </>
        );

      case 'sensitive_data':
        return (
          <>
            <Form.Item
              name="data_type"
              label="數據類型"
              rules={[{ required: true, message: '請選擇數據類型' }]}
            >
              <Select placeholder="選擇敏感數據類型">
                <Option value="credit_card">信用卡信息</Option>
                <Option value="api_key">API密鑰</Option>
                <Option value="password">密碼信息</Option>
                <Option value="ssn">社會保障號碼</Option>
              </Select>
            </Form.Item>
            <Form.Item name="action" label="操作">
              <Select placeholder="選擇操作" defaultValue="generate">
                <Option value="generate">生成數據</Option>
                <Option value="log">記錄到日誌</Option>
                <Option value="export">導出到文件</Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'sql_injection':
        return (
          <>
            <Form.Item
              name="query"
              label="SQL查詢"
              rules={[{ required: true, message: '請輸入SQL查詢' }]}
            >
              <TextArea rows={3} placeholder="例如: admin' OR '1'='1, 1; DROP TABLE users--" />
            </Form.Item>
            <Form.Item name="test_type" label="攻擊類型">
              <Select placeholder="選擇攻擊類型" defaultValue="union">
                <Option value="union">UNION攻擊</Option>
                <Option value="blind">盲注攻擊</Option>
                <Option value="time">時間延遲攻擊</Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'privilege_escalation':
        return (
          <>
            <Form.Item
              name="action"
              label="測試類型"
              rules={[{ required: true, message: '請選擇測試類型' }]}
            >
              <Select placeholder="選擇權限提升測試類型">
                <Option value="suid">SUID文件檢查</Option>
                <Option value="sudo">Sudo權限檢查</Option>
                <Option value="container_escape">容器逃逸檢測</Option>
              </Select>
            </Form.Item>
            <Form.Item name="target" label="目標">
              <Input placeholder="可選：指定特定目標" />
            </Form.Item>
          </>
        );

      case 'crypto_weakness':
        return (
          <>
            <Form.Item
              name="algorithm"
              label="加密算法"
              rules={[{ required: true, message: '請選擇加密算法' }]}
            >
              <Select placeholder="選擇要測試的算法">
                <Option value="md5">MD5 (弱哈希)</Option>
                <Option value="weak_key">弱密鑰測試</Option>
              </Select>
            </Form.Item>
            <Form.Item name="data" label="測試數據">
              <TextArea rows={2} placeholder="可選：輸入要加密的數據" />
            </Form.Item>
          </>
        );

      case 'memory_dump':
        return (
          <>
            <Form.Item
              name="dump_type"
              label="轉儲類型"
              rules={[{ required: true, message: '請選擇轉儲類型' }]}
            >
              <Select placeholder="選擇內存轉儲類型">
                <Option value="process">進程內存</Option>
                <Option value="heap">堆內存</Option>
                <Option value="stack">棧內存</Option>
              </Select>
            </Form.Item>
            <Form.Item name="pid" label="進程ID">
              <InputNumber min={1} placeholder="可選：指定進程ID" />
            </Form.Item>
          </>
        );

      default:
        return <Text>該測試不需要額外參數</Text>;
    }
  };

  // 獲取風險等級標籤顏色
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'red';
      case 'HIGH':
        return 'orange';
      case 'MEDIUM':
        return 'yellow';
      case 'LOW':
        return 'green';
      default:
        return 'default';
    }
  };

  // 渲染測試結果詳情
  const renderResultDetails = () => {
    if (!selectedResult) return null;

    const { response } = selectedResult;

    return (
      <div>
        <Descriptions bordered size="small">
          <Descriptions.Item label="測試名稱" span={2}>
            {response.test_name}
          </Descriptions.Item>
          <Descriptions.Item label="執行狀態">
            <Badge
              status={response.success ? 'success' : 'error'}
              text={response.success ? '成功' : '失敗'}
            />
          </Descriptions.Item>
          <Descriptions.Item label="風險等級" span={2}>
            <Tag color={getRiskLevelColor(response.risk_level)}>{response.risk_level}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="執行時間">
            {new Date(response.timestamp).toLocaleString('zh-TW')}
          </Descriptions.Item>
          <Descriptions.Item label="結果消息" span={3}>
            {response.message}
          </Descriptions.Item>
        </Descriptions>

        {response.ebpf_events && (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>eBPF監控事件</Title>
            <Space wrap>
              {response.ebpf_events.map((event, index) => (
                <Tag key={index} icon={<EyeOutlined />} color="blue">
                  {event}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {response.data && (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>詳細數據</Title>
            <Card size="small">
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  maxHeight: 300,
                  overflow: 'auto',
                  fontSize: '12px',
                  lineHeight: 1.4,
                }}
              >
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // 測試結果表格列定義
  const resultColumns = [
    {
      title: '時間',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (timestamp: string) => (
        <Text style={{ fontSize: '12px' }}>{new Date(timestamp).toLocaleString('zh-TW')}</Text>
      ),
    },
    {
      title: '測試名稱',
      dataIndex: ['test', 'name'],
      key: 'testName',
      width: 160,
    },
    {
      title: '風險等級',
      dataIndex: ['response', 'risk_level'],
      key: 'riskLevel',
      width: 100,
      render: (level: string) => <Tag color={getRiskLevelColor(level)}>{level}</Tag>,
    },
    {
      title: '狀態',
      dataIndex: ['response', 'success'],
      key: 'success',
      width: 80,
      render: (success: boolean) => (
        <Badge status={success ? 'success' : 'error'} text={success ? '成功' : '失敗'} />
      ),
    },
    {
      title: '消息',
      dataIndex: ['response', 'message'],
      key: 'message',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: TestResult) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedResult(record);
              setResultModalVisible(true);
            }}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchSecurityTests();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      {/* 頁面標題 */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card>
            <Space align="center">
              <SecurityScanOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  🚨 安全測試中心
                </Title>
                <Text type="secondary">eBPF安全監控演示 - 故意的安全漏洞測試工具</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 警告信息 */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Alert
            message="⚠️ 安全測試警告"
            description="這些測試包含故意的安全漏洞，僅用於eBPF監控演示。請在隔離的測試環境中使用，不要在生產環境中執行！"
            type="warning"
            showIcon
            banner
          />
        </Col>
      </Row>

      {/* 快速操作 */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="快速操作" size="small">
            <Space wrap>
              <Button
                type="primary"
                danger
                icon={<ThunderboltOutlined />}
                onClick={executeComprehensiveTest}
                loading={loading}
              >
                執行綜合安全測試
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchSecurityTests} loading={loading}>
                刷新測試列表
              </Button>
              <Button icon={<HistoryOutlined />} onClick={() => setTestResults([])}>
                清除測試記錄
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 安全測試項目 */}
      <Row gutter={[24, 24]}>
        <Col span={16}>
          <Card title="安全測試項目" loading={loading}>
            <Row gutter={[16, 16]}>
              {tests.map((test) => (
                <Col span={12} key={test.id}>
                  <Card
                    size="small"
                    hoverable
                    actions={[
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => openTestModal(test)}
                      >
                        執行測試
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <Tag color={getRiskLevelColor(test.risk_level)}>{test.risk_level}</Tag>
                      }
                      title={test.name}
                      description={
                        <div>
                          <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                            {test.description}
                          </Paragraph>
                          <Text code style={{ fontSize: '11px' }}>
                            {test.method} {test.endpoint}
                          </Text>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* 測試統計 */}
        <Col span={8}>
          <Card title="測試統計">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="總測試數">{tests.length}</Descriptions.Item>
                <Descriptions.Item label="執行記錄">{testResults.length}</Descriptions.Item>
                <Descriptions.Item label="成功率">
                  {testResults.length > 0
                    ? `${Math.round((testResults.filter((r) => r.response.success).length / testResults.length) * 100)}%`
                    : '0%'}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <div>
                <Text strong>風險等級分佈</Text>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => {
                  const count = tests.filter((t) => t.risk_level === level).length;
                  return (
                    <div key={level} style={{ marginTop: 8 }}>
                      <Space>
                        <Tag color={getRiskLevelColor(level)} style={{ minWidth: 80 }}>
                          {level}
                        </Tag>
                        <Progress
                          percent={tests.length > 0 ? (count / tests.length) * 100 : 0}
                          size="small"
                          format={() => count}
                          style={{ width: 100 }}
                        />
                      </Space>
                    </div>
                  );
                })}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 測試結果 */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="測試結果記錄">
            <Table
              columns={resultColumns}
              dataSource={testResults}
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 測試配置對話框 */}
      <Modal
        title={`配置測試: ${selectedTest?.name}`}
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        {selectedTest && (
          <div>
            <Alert message={selectedTest.description} type="info" style={{ marginBottom: 16 }} />
            <Form
              form={form}
              layout="vertical"
              onFinish={(values) => executeTest(selectedTest, values)}
            >
              {renderTestForm()}
            </Form>
          </div>
        )}
      </Modal>

      {/* 測試結果詳情對話框 */}
      <Modal
        title="測試結果詳情"
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setResultModalVisible(false)}>
            關閉
          </Button>,
        ]}
        width={800}
      >
        {renderResultDetails()}
      </Modal>
    </div>
  );
};

export default SecurityTesting;

import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Form,
  Input,
  Button,
  Switch,
  Space,
  Divider,
  message,
  Modal,
  Alert,
  Popconfirm,
  Tabs,
  InputNumber,
  Descriptions,
  Tag,
  Spin,
} from 'antd';
import {
  SettingOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  DeleteOutlined,
  SafetyOutlined,
  ExperimentOutlined,
  ApiOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface SystemConfig {
  trading_enabled: boolean;
  market_open_time: string;
  market_close_time: string;
  commission_rate: number;
  max_order_size: number;
  initial_balance: number;
  yahoo_finance_enabled: boolean;
  real_price_trading: boolean;
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [form] = Form.useForm();

  // 獲取系統配置
  const fetchSystemConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/system/config', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemConfig(data.config);
        form.setFieldsValue(data.config);
      } else {
        // 使用默認配置
        const defaultConfig = {
          trading_enabled: true,
          market_open_time: '09:30',
          market_close_time: '16:00',
          commission_rate: 0.0025,
          max_order_size: 10000,
          initial_balance: 100000,
          yahoo_finance_enabled: true,
          real_price_trading: true,
        };
        setSystemConfig(defaultConfig);
        form.setFieldsValue(defaultConfig);
      }
    } catch (error) {
      console.error('獲取系統配置失敗:', error);
      message.error('獲取系統配置失敗');
    } finally {
      setLoading(false);
    }
  };

  // 更新系統配置
  const updateSystemConfig = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/system/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'demo-user-123'
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('系統配置更新成功！');
        fetchSystemConfig(); // 重新獲取配置
      } else {
        const error = await response.json();
        message.error(`更新失敗: ${error.message || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('更新系統配置失敗:', error);
      message.error('網絡錯誤，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  // 重置帳戶
  const resetAccount = async () => {
    setResetLoading(true);
    try {
      const response = await fetch('/api/v1/user/reset-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'demo-user-123'
        },
        body: JSON.stringify({
          reset_balance: systemConfig?.initial_balance || 100000,
          clear_positions: true,
          clear_trades: false, // 保留交易歷史記錄
        })
      });

      if (response.ok) {
        const result = await response.json();
        message.success('帳戶重置成功！資金已恢復至初始金額，所有持股已清零。');
        
        // 顯示重置詳情
        Modal.info({
          title: '帳戶重置完成',
          content: (
            <div>
              <p>✅ 資金餘額已重置為：${result.new_balance?.toLocaleString() || '100,000'}</p>
              <p>✅ 所有持股已清零</p>
              <p>ℹ️ 交易歷史記錄已保留</p>
              <p style={{ marginTop: '16px', color: '#666' }}>
                您可以重新開始進行交易投資。
              </p>
            </div>
          ),
        });
      } else {
        const error = await response.json();
        message.error(`重置失敗: ${error.message || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('帳戶重置失敗:', error);
      message.error('網絡錯誤，請稍後重試');
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  const handleSubmit = async (values: any) => {
    await updateSystemConfig(values);
  };

  return (
    <Spin spinning={loading}>
      <div>
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2}>
              <SettingOutlined /> 系統設置
            </Title>
            <Text type="secondary">
              管理系統配置和帳戶設置
            </Text>
          </Col>
        </Row>

        <Tabs defaultActiveKey="1">
          {/* 交易配置 */}
          <TabPane tab="交易配置" key="1">
            <Card title="交易系統配置" extra={<ApiOutlined />}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="啟用交易功能"
                      name="trading_enabled"
                      valuePropName="checked"
                    >
                      <Switch
                        checkedChildren="開啟"
                        unCheckedChildren="關閉"
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="使用Yahoo Finance實時數據"
                      name="yahoo_finance_enabled"
                      valuePropName="checked"
                    >
                      <Switch
                        checkedChildren="開啟"
                        unCheckedChildren="關閉"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="市場開放時間"
                      name="market_open_time"
                      rules={[{ required: true, message: '請輸入市場開放時間' }]}
                    >
                      <Input placeholder="09:30" />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="市場關閉時間"
                      name="market_close_time"
                      rules={[{ required: true, message: '請輸入市場關閉時間' }]}
                    >
                      <Input placeholder="16:00" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="手續費率 (%)"
                      name="commission_rate"
                      rules={[{ required: true, message: '請輸入手續費率' }]}
                    >
                      <InputNumber
                        min={0}
                        max={1}
                        step={0.0001}
                        style={{ width: '100%' }}
                        placeholder="0.0025"
                        addonAfter="%"
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="單筆訂單最大數量"
                      name="max_order_size"
                      rules={[{ required: true, message: '請輸入最大數量' }]}
                    >
                      <InputNumber
                        min={1}
                        style={{ width: '100%' }}
                        placeholder="10000"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="初始資金 (USD)"
                      name="initial_balance"
                      rules={[{ required: true, message: '請輸入初始資金' }]}
                    >
                      <InputNumber
                        min={1000}
                        max={10000000}
                        style={{ width: '100%' }}
                        placeholder="100000"
                        addonBefore="$"
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="實時價格交易"
                      name="real_price_trading"
                      valuePropName="checked"
                    >
                      <Switch
                        checkedChildren="開啟"
                        unCheckedChildren="關閉"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    保存配置
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          {/* 帳戶管理 */}
          <TabPane tab="帳戶管理" key="2">
            <Row gutter={[24, 24]}>
              {/* 帳戶重置 */}
              <Col xs={24}>
                <Card 
                  title={
                    <Space>
                      <DeleteOutlined />
                      <span>帳戶重置</span>
                    </Space>
                  }
                >
                  <Alert
                    message="危險操作警告"
                    description="重置帳戶將會清除所有持股並將資金恢復至初始金額。此操作不可撤銷，請謹慎操作。"
                    type="warning"
                    showIcon
                    style={{ marginBottom: '24px' }}
                  />

                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="當前設定的初始資金">
                      <Text strong style={{ color: '#1890ff' }}>
                        ${systemConfig?.initial_balance?.toLocaleString() || '100,000'} USD
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="重置操作將執行">
                      <Space direction="vertical" size={4}>
                        <Text>• 資金餘額重置為初始金額</Text>
                        <Text>• 清除所有股票持倉</Text>
                        <Text>• 保留交易歷史記錄</Text>
                        <Text>• 保留個人設置</Text>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="預期影響">
                      <Tag color="orange">資金重置</Tag>
                      <Tag color="red">持股清零</Tag>
                      <Tag color="green">記錄保留</Tag>
                    </Descriptions.Item>
                  </Descriptions>

                  <Divider />

                  <Popconfirm
                    title="確認重置帳戶"
                    description={
                      <div style={{ maxWidth: '300px' }}>
                        <Paragraph>
                          您確定要重置帳戶嗎？此操作將：
                        </Paragraph>
                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                          <li>將資金重置為 ${systemConfig?.initial_balance?.toLocaleString() || '100,000'} USD</li>
                          <li>清除所有股票持倉</li>
                          <li>保留交易歷史</li>
                        </ul>
                        <Paragraph style={{ marginTop: '12px', marginBottom: 0, color: '#ff4d4f' }}>
                          此操作不可撤銷！
                        </Paragraph>
                      </div>
                    }
                    onConfirm={resetAccount}
                    okText="確認重置"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                  >
                    <Button
                      danger
                      size="large"
                      loading={resetLoading}
                      icon={<ReloadOutlined />}
                    >
                      重置帳戶至初始狀態
                    </Button>
                  </Popconfirm>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 安全設置 */}
          <TabPane tab="安全設置" key="3">
            <Card title={<Space><SafetyOutlined />安全配置</Space>}>
              <Alert
                message="安全模式已啟用"
                description="當前處於eBPF安全監控演示環境，所有交易活動都受到實時監控和審計。"
                type="success"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <Descriptions column={1} bordered>
                <Descriptions.Item label="安全監控狀態">
                  <Tag color="green">✅ eBPF監控已啟用</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="API安全">
                  <Tag color="blue">✅ 請求頭驗證已啟用</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="交易審計">
                  <Tag color="orange">✅ 實時審計已啟用</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="風險評估">
                  <Tag color="purple">✅ 實時風險評估已啟用</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </TabPane>

          {/* 實驗功能 */}
          <TabPane tab="實驗功能" key="4">
            <Card title={<Space><ExperimentOutlined />實驗性功能</Space>}>
              <Alert
                message="實驗性功能"
                description="以下功能僅供演示和測試使用，可能不穩定或包含已知問題。"
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text strong>高頻交易模擬</Text>
                  <br />
                  <Text type="secondary">啟用高頻交易算法模擬（可能觸發安全警報）</Text>
                  <br />
                  <Switch disabled defaultChecked={false} />
                </div>

                <div>
                  <Text strong>市場操縱檢測</Text>
                  <br />
                  <Text type="secondary">啟用市場操縱行為檢測算法</Text>
                  <br />
                  <Switch disabled defaultChecked={true} />
                </div>

                <div>
                  <Text strong>內部交易預警</Text>
                  <br />
                  <Text type="secondary">檢測潛在的內部交易行為</Text>
                  <br />
                  <Switch disabled defaultChecked={true} />
                </div>
              </Space>
            </Card>
          </TabPane>
        </Tabs>
      </div>
    </Spin>
  );
};

export default Settings; 
import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Form,
  Input,
  Button,
  Avatar,
  Space,
  Divider,
  message,
  Descriptions,
  Tag,
  Statistic,
  Alert,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  MailOutlined,
  CalendarOutlined,
  TrophyOutlined,
  DollarOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  initial_balance: number;
  current_balance: number;
  total_trades: number;
  created_at: string;
  updated_at: string;
}

const Profile: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 獲取用戶資料
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/v1/user/profile', {
        headers: {
          'X-User-ID': 'demo-user-123'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
        form.setFieldsValue({
          display_name: data.user.display_name,
          email: data.user.email,
        });
      } else {
        // 使用默認數據
        const defaultProfile = {
          user_id: 'demo-user-123',
          email: 'demo@example.com',
          display_name: '演示用戶',
          initial_balance: 100000,
          current_balance: 99930.97,
          total_trades: 3,
          created_at: '2023-12-01T00:00:00Z',
          updated_at: new Date().toISOString(),
        };
        setUserProfile(defaultProfile);
        form.setFieldsValue({
          display_name: defaultProfile.display_name,
          email: defaultProfile.email,
        });
      }
    } catch (error) {
      console.error('獲取用戶資料失敗:', error);
      message.error('獲取用戶資料失敗');
    }
  };

  // 更新用戶資料
  const updateUserProfile = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'demo-user-123'
        },
        body: JSON.stringify({
          name: values.display_name,
          email: values.email,
        })
      });

      if (response.ok) {
        message.success('個人資料更新成功！');
        setEditing(false);
        await fetchUserProfile(); // 重新獲取本頁資料
        
        // 觸發一個全局事件，通知其他組件（如Layout）更新用戶信息
        window.dispatchEvent(new CustomEvent('profileUpdated'));

      } else {
        const error = await response.json();
        message.error(`更新失敗: ${error.message || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('更新用戶資料失敗:', error);
      message.error('網絡錯誤，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleSubmit = async (values: any) => {
    await updateUserProfile(values);
  };

  const handleCancel = () => {
    setEditing(false);
    // 重置表單為原始值
    form.setFieldsValue({
      display_name: userProfile?.display_name || '',
      email: userProfile?.email || '',
    });
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>
            <UserOutlined /> 個人資料
          </Title>
          <Text type="secondary">
            管理您的個人信息和帳戶設置
          </Text>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* 基本信息卡片 */}
        <Col xs={24} lg={16}>
          <Card
            title="基本信息"
            extra={
              !editing ? (
                <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                  編輯
                </Button>
              ) : null
            }
          >
            {editing ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
              >
                <Form.Item
                  label="顯示名稱"
                  name="display_name"
                  rules={[
                    { required: true, message: '請輸入顯示名稱' },
                    { min: 2, message: '名稱至少需要2個字符' },
                    { max: 50, message: '名稱不能超過50個字符' }
                  ]}
                >
                  <Input placeholder="請輸入您的顯示名稱" />
                </Form.Item>

                <Form.Item
                  label="電子郵件"
                  name="email"
                  rules={[
                    { required: true, message: '請輸入電子郵件' },
                    { type: 'email', message: '請輸入有效的電子郵件地址' }
                  ]}
                >
                  <Input placeholder="請輸入您的電子郵件" />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                      保存修改
                    </Button>
                    <Button onClick={handleCancel}>
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            ) : (
              <Descriptions column={1} bordered>
                <Descriptions.Item label="用戶ID">
                  <Text code>{userProfile?.user_id || 'N/A'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="顯示名稱">
                  <Text strong>{userProfile?.display_name || 'N/A'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="電子郵件">
                  <Space>
                    <MailOutlined />
                    <Text>{userProfile?.email || 'N/A'}</Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="註冊時間">
                  <Space>
                    <CalendarOutlined />
                    <Text>{userProfile?.created_at ? new Date(userProfile.created_at).toLocaleString() : 'N/A'}</Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="最後更新">
                  <Text type="secondary">
                    {userProfile?.updated_at ? new Date(userProfile.updated_at).toLocaleString() : 'N/A'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>

        {/* 帳戶統計 */}
        <Col xs={24} lg={8}>
          <Card title="帳戶統計">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Statistic
                title="初始資金"
                value={userProfile?.initial_balance || 0}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="USD"
                valueStyle={{ color: '#1890ff' }}
              />
              
              <Statistic
                title="當前餘額"
                value={userProfile?.current_balance || 0}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="USD"
                valueStyle={{ 
                  color: (userProfile?.current_balance || 0) >= (userProfile?.initial_balance || 0) 
                    ? '#52c41a' 
                    : '#ff4d4f' 
                }}
              />
              
              <Statistic
                title="總交易次數"
                value={userProfile?.total_trades || 0}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />

              <Divider />

              <div>
                <Text type="secondary">帳戶狀態</Text>
                <br />
                <Tag color="green" style={{ marginTop: '8px' }}>
                  ✅ 已驗證
                </Tag>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 安全提醒 */}
      <Row style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Alert
            message="安全提醒"
            description="為了保護您的帳戶安全，請定期更新您的個人信息。如發現任何異常活動，請立即聯繫客服。"
            type="info"
            showIcon
            closable
          />
        </Col>
      </Row>
    </div>
  );
};

export default Profile; 
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout as AntLayout,
  Menu,
  Typography,
  Badge,
  Avatar,
  Dropdown,
  Space,
  Switch,
  Alert,
  message,
} from 'antd';
import {
  DashboardOutlined,
  StockOutlined,
  PieChartOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  ExperimentOutlined,
  MonitorOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  BugOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';

// 導入主題Context
import { useTheme } from '../../contexts/ThemeContext';

const { Header, Sider, Content } = AntLayout;
const { Title, Text } = Typography;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState('演示用戶');

  // 使用主題Context
  const { isDarkMode, toggleDarkMode } = useTheme();

  // 獲取用戶資料
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/v1/user/profile', {
        headers: {
          'X-User-ID': 'demo-user-123',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserName(data.user?.display_name || '演示用戶');
      }
    } catch (error) {
      console.error('獲取用戶資料失敗:', error);
    }
  };

  // 組件加載時獲取用戶資料
  React.useEffect(() => {
    fetchUserProfile();
  }, []);

  // 菜單項目
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '儀表板',
    },
    {
      key: '/trading',
      icon: <StockOutlined />,
      label: '交易中心',
    },
    {
      key: '/portfolio',
      icon: <PieChartOutlined />,
      label: '投資組合',
    },
    {
      key: '/risk',
      icon: <SafetyOutlined />,
      label: '風險監控',
    },
    {
      key: '/security',
      icon: <SecurityScanOutlined />,
      label: '安全監控',
      badge: 'eBPF',
    },
    {
      key: '/monitoring',
      icon: <MonitorOutlined />,
      label: '系統監控',
    },
  ];

  // 用戶下拉菜單
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人資料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系統設置',
    },
    {
      key: 'debug',
      icon: <BugOutlined />,
      label: '調試模式',
      onClick: () => {
        // 故意暴露調試路由
        window.open('/debug', '_blank');
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'debug') {
      // 調試模式在菜單項中已處理
      window.open('/debug', '_blank');
    } else if (key === 'logout') {
      // 處理登出邏輯
      message.success('已成功登出');
      navigate('/dashboard');
    } else {
      // 導航到對應頁面
      navigate(`/${key}`);
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* 側邊欄 */}
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={240}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #434343',
          }}
        >
          <Title
            level={4}
            style={{
              color: 'white',
              margin: 0,
              fontSize: collapsed ? '14px' : '18px',
            }}
          >
            {collapsed ? 'FT' : '金融eBPF'}
          </Title>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.map((item) => ({
            ...item,
            label: item.badge ? (
              <Space>
                {item.label}
                <Badge
                  count={item.badge}
                  style={{
                    backgroundColor: '#52c41a',
                    fontSize: '10px',
                    height: '16px',
                    lineHeight: '16px',
                  }}
                />
              </Space>
            ) : (
              item.label
            ),
          }))}
          onClick={handleMenuClick}
        />
      </Sider>

      <AntLayout>
        {/* 頂部導航 */}
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
          }}
        >
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              金融微服務 eBPF 安全演示系統
            </Text>
            <Text type="secondary" style={{ marginLeft: '16px' }}>
              v3.0.0 | Kubernetes + Cilium + Tetragon
            </Text>
          </div>

          <Space size="large">
            {/* 故意顯示系統狀態用於演示 */}
            <Space>
              <Text type="secondary">系統狀態:</Text>
              <Badge status="processing" text="運行中" />
              <Text type="secondary">|</Text>
              <Text type="secondary">eBPF監控:</Text>
              <Badge status="success" text="活躍" />
            </Space>

            {/* 主題切換 */}
            <Space>
              {isDarkMode ? <MoonOutlined /> : <SunOutlined />}
              <Text type="secondary">{isDarkMode ? '暗色' : '亮色'}模式</Text>
              <Switch
                checked={isDarkMode}
                onChange={toggleDarkMode}
                size="small"
                checkedChildren="🌙"
                unCheckedChildren="☀️"
              />
            </Space>

            {/* 通知 */}
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: '16px', cursor: 'pointer' }} />
            </Badge>

            {/* 用戶頭像和菜單 */}
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text>{userName}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 安全警告橫幅 */}
        <Alert
          message="⚠️ 安全演示環境"
          description="此系統包含故意設計的安全漏洞，僅用於eBPF安全監控演示。請勿在生產環境中使用。"
          type="warning"
          showIcon
          closable
          style={{ margin: '16px 24px 0' }}
        />

        {/* 主內容區域 */}
        <Content
          style={{
            margin: '16px 24px',
            padding: '24px',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 200px)',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;

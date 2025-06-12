import React, { useState, useMemo, useEffect } from 'react';
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
  Button,
  Popover,
  List,
  Tag,
} from 'antd';
import {
  DashboardOutlined,
  StockOutlined,
  PieChartOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

// 導入主題Context
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import classNames from 'classnames';
import styles from './Layout.module.css';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const NotificationIcon = ({ type }: { type: string }) => {
  const iconStyle = { fontSize: '18px', marginRight: '8px' };
  switch (type) {
    case 'success': return <CheckCircleOutlined style={{ ...iconStyle, color: '#52c41a' }} />;
    case 'info': return <InfoCircleOutlined style={{ ...iconStyle, color: '#1890ff' }} />;
    case 'warning': return <WarningOutlined style={{ ...iconStyle, color: '#faad14' }} />;
    case 'error': return <CloseCircleOutlined style={{ ...iconStyle, color: '#f5222d' }} />;
    default: return <BellOutlined style={iconStyle} />;
  }
};

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { isDark: isDarkMode, toggleTheme: toggleDarkMode } = useTheme();
  const [userName, setUserName] = useState('演示用戶');
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/v1/user/profile', {
        headers: { 'X-User-ID': 'demo-user-123' },
      });
      if (response.ok) {
        const data = await response.json();
        setUserName(data.profile.name || '演示用戶');
      }
    } catch (error) {
      console.error("無法獲取用戶資料:", error);
    }
  };

  useEffect(() => {
    // 組件加載時獲取一次用戶數據
    fetchUser();

    // 監聽用戶資料更新事件
    const handleProfileUpdate = () => {
      console.log('接收到用戶資料更新事件，重新獲取數據...');
      fetchUser();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    // 組件卸載時移除監聽器
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const menuItems = useMemo(() => [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '儀表板' },
    { key: '/trading', icon: <StockOutlined />, label: '交易中心' },
    { key: '/portfolio', icon: <PieChartOutlined />, label: '投資組合' },
    { key: '/risk', icon: <SafetyOutlined />, label: '風險監控' },
    { key: '/security', icon: <SecurityScanOutlined />, label: '安全事件', badge: 'eBPF' },
  ], []);

  const userMenuItems = [
    { key: '/profile', icon: <UserOutlined />, label: '個人資料' },
    { key: '/settings', icon: <SettingOutlined />, label: '系統設置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '登出', danger: true },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      navigate('/dashboard');
    } else {
      navigate(key);
    }
  };
  
  const selectedKeys = useMemo(() => {
    const currentPath = location.pathname;
    const selected = menuItems.find(item => currentPath.startsWith(item.key));
    return selected ? [selected.key] : [];
  }, [location.pathname, menuItems]);

  const notificationContent = (
    <div className={styles.notificationPopover}>
      <div className={styles.notificationHeader}>
        <Text strong>通知中心</Text>
        <Space>
          <Button type="link" size="small" onClick={markAllAsRead}>全部已讀</Button>
          <Button type="link" size="small" onClick={clearAll}>清空</Button>
        </Space>
      </div>
      <List
        itemLayout="horizontal"
        dataSource={notifications}
        renderItem={item => (
          <List.Item className={!item.read ? styles.unreadItem : ''}>
            <List.Item.Meta
              avatar={<NotificationIcon type={item.type} />}
              title={<Text strong={!item.read}>{item.title}</Text>}
              description={
                <>
                  <Text>{item.message}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                </>
              }
            />
          </List.Item>
        )}
        locale={{ emptyText: '暫無通知' }}
      />
    </div>
  );

  return (
    <AntLayout className={styles.appLayout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        className={styles.sider}
        width={220}
      >
        <div className={styles.logo}>
          <WalletOutlined className={styles.logoIcon} />
          {!collapsed && <span className={styles.logoText}>FinTech Pro</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          onClick={({ key }) => navigate(key)}
          items={menuItems.map(item => ({
            ...item,
            label: item.badge ? (
              <div className={styles.menuItemBadge}>
                <span>{item.label}</span>
                <Badge count={item.badge} className={styles.badge} />
              </div>
            ) : item.label,
          }))}
        />
      </Sider>
      <AntLayout>
        <Header className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles.trigger}
          />
          <Space size="middle" className={styles.headerRight}>
            <Switch
              checkedChildren={<SunOutlined />}
              unCheckedChildren={<MoonOutlined />}
              checked={!isDarkMode}
              onChange={() => toggleDarkMode()}
            />
            <Popover
              content={notificationContent}
              title={null}
              trigger="click"
              placement="bottomRight"
              overlayClassName={styles.notificationOverlay}
            >
              <Badge count={unreadCount} size="small">
                <Button shape="circle" icon={<BellOutlined />} />
              </Badge>
            </Popover>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={['click']}>
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text>{userName}</Text>
                </Space>
              </a>
            </Dropdown>
          </Space>
        </Header>
        <Content className={styles.content}>
          <Alert
            message="系統提示"
            description="這是一個用於安全演示的金融系統，所有操作都會被 eBPF 實時監控。"
            type="info"
            showIcon
            closable
            className={styles.contentAlert}
          />
          <div className={styles.pageContainer}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default AppLayout; 
import React, { useState, useMemo } from 'react';
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
} from '@ant-design/icons';

// 導入主題Context
import { useTheme } from '../../contexts/ThemeContext';
import classNames from 'classnames';
import styles from './Layout.module.css';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

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
            <Badge count={5} size="small">
              <Button shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={['click']}>
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text>演示用戶</Text>
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
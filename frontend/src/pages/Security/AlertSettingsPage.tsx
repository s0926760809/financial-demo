import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Typography, 
    Switch, 
    Slider, 
    Select, 
    Form, 
    Row, 
    Col, 
    Divider,
    Alert,
    Button,
    Space,
    Tag,
    List,
    Modal,
    notification
} from 'antd';
import { 
    SettingOutlined,
    BellOutlined,
    SafetyCertificateOutlined,
    EyeOutlined,
    ExclamationCircleOutlined,
    MutedOutlined,
    SoundOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface AlertRule {
    id: string;
    name: string;
    description: string;
    severity: string;
    enabled: boolean;
    pattern: string;
    action: string;
    lastTriggered?: string;
}

interface AlertSettings {
    enablePopupAlerts: boolean;
    enableSoundAlerts: boolean;
    alertThreshold: number;
    severityFilter: string[];
    muteRules: string[];
    autoMuteTime: number; // minutes
    maxAlertsPerMinute: number;
}

const AlertSettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<AlertSettings>({
        enablePopupAlerts: false, // 默认关闭弹窗警报
        enableSoundAlerts: false,
        alertThreshold: 7, // 1-10 scale
        severityFilter: ['critical', 'high'],
        muteRules: [],
        autoMuteTime: 10,
        maxAlertsPerMinute: 5
    });

    const [alertRules, setAlertRules] = useState<AlertRule[]>([
        {
            id: 'sensitive-file-access',
            name: '敏感文件访问警报',
            description: '檢測對 /etc/passwd、/etc/shadow 等敏感文件的訪問',
            severity: 'high',
            enabled: true,
            pattern: '/etc/passwd|/etc/shadow|/etc/hosts',
            action: 'notify',
            lastTriggered: '2025-06-17 19:45:32'
        },
        {
            id: 'privilege-escalation',
            name: '权限提升警报',
            description: '檢測 sudo、setuid 等權限提升行為',
            severity: 'critical',
            enabled: true,
            pattern: 'sudo|setuid|setgid',
            action: 'block_and_notify'
        },
        {
            id: 'network-scan',
            name: '网络扫描警报',
            description: '檢測網絡掃描和端口探測活動',
            severity: 'medium',
            enabled: true,
            pattern: 'nmap|masscan|port.*scan',
            action: 'notify'
        },
        {
            id: 'fintech-api-abuse',
            name: '金融API异常调用',
            description: '檢測對金融 API 的異常調用模式',
            severity: 'high',
            enabled: true,
            pattern: 'api/v1.*trading|api/v1.*payment',
            action: 'throttle_and_notify'
        }
    ]);

    const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        // 加载用户设置
        const savedSettings = localStorage.getItem('alertSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    const saveSettings = (newSettings: AlertSettings) => {
        setSettings(newSettings);
        localStorage.setItem('alertSettings', JSON.stringify(newSettings));
        notification.success({
            message: '設置已保存',
            description: '警報設置已成功更新',
            duration: 2
        });
    };

    const handleSettingChange = (key: keyof AlertSettings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);
    };

    const toggleRule = (ruleId: string) => {
        setAlertRules(rules => 
            rules.map(rule => 
                rule.id === ruleId 
                    ? { ...rule, enabled: !rule.enabled }
                    : rule
            )
        );
    };

    const muteRule = (ruleId: string) => {
        const rule = alertRules.find(r => r.id === ruleId);
        if (rule) {
            const newMuteRules = [...settings.muteRules, ruleId];
            handleSettingChange('muteRules', newMuteRules);
            
            // 自动取消静音
            setTimeout(() => {
                const currentSettings = JSON.parse(localStorage.getItem('alertSettings') || '{}');
                const updatedMuteRules = currentSettings.muteRules.filter((id: string) => id !== ruleId);
                handleSettingChange('muteRules', updatedMuteRules);
            }, settings.autoMuteTime * 60 * 1000);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'red';
            case 'high': return 'orange';
            case 'medium': return 'gold';
            case 'low': return 'blue';
            default: return 'default';
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'block_and_notify': return <SafetyCertificateOutlined style={{ color: '#ff4d4f' }} />;
            case 'throttle_and_notify': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
            default: return <BellOutlined style={{ color: '#1890ff' }} />;
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={3}>
                <SettingOutlined /> 安全警報設置
            </Title>
            <Paragraph type="secondary">
                管理系統安全警報的觸發條件、通知方式和處理策略
            </Paragraph>

            {/* 全局警报设置 */}
            <Card title="全局警報設置" style={{ marginBottom: 24 }}>
                <Form layout="vertical">
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item label="彈窗警報">
                                <Space>
                                    <Switch
                                        checked={settings.enablePopupAlerts}
                                        onChange={(checked) => handleSettingChange('enablePopupAlerts', checked)}
                                        checkedChildren={<BellOutlined />}
                                        unCheckedChildren={<MutedOutlined />}
                                    />
                                    <Text type="secondary">
                                        {settings.enablePopupAlerts ? '已開啟彈窗通知' : '已關閉彈窗通知（推薦）'}
                                    </Text>
                                </Space>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="聲音警報">
                                <Space>
                                    <Switch
                                        checked={settings.enableSoundAlerts}
                                        onChange={(checked) => handleSettingChange('enableSoundAlerts', checked)}
                                        checkedChildren={<SoundOutlined />}
                                        unCheckedChildren={<MutedOutlined />}
                                    />
                                    <Text type="secondary">
                                        {settings.enableSoundAlerts ? '已開啟聲音提醒' : '已關閉聲音提醒'}
                                    </Text>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item label={`警報敏感度: ${settings.alertThreshold}/10`}>
                                <Slider
                                    min={1}
                                    max={10}
                                    value={settings.alertThreshold}
                                    onChange={(value) => handleSettingChange('alertThreshold', value)}
                                    marks={{
                                        1: '低',
                                        5: '中',
                                        10: '高'
                                    }}
                                />
                                <Text type="secondary">
                                    數值越高，觸發警報的門檻越低
                                </Text>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="最大警報頻率（每分鐘）">
                                <Select
                                    value={settings.maxAlertsPerMinute}
                                    onChange={(value) => handleSettingChange('maxAlertsPerMinute', value)}
                                    style={{ width: '100%' }}
                                >
                                    <Option value={1}>1 次/分鐘</Option>
                                    <Option value={3}>3 次/分鐘</Option>
                                    <Option value={5}>5 次/分鐘</Option>
                                    <Option value={10}>10 次/分鐘</Option>
                                    <Option value={-1}>無限制</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label="警報級別過濾">
                        <Select
                            mode="multiple"
                            value={settings.severityFilter}
                            onChange={(value) => handleSettingChange('severityFilter', value)}
                            style={{ width: '100%' }}
                            placeholder="選擇要顯示的警報級別"
                        >
                            <Option value="critical">關鍵 (Critical)</Option>
                            <Option value="high">高 (High)</Option>
                            <Option value="medium">中等 (Medium)</Option>
                            <Option value="low">低 (Low)</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Card>

            {/* 用户体验优化提示 */}
            <Alert
                message="用戶體驗優化建議"
                description="為了避免干擾正常使用，建議關閉彈窗警報，通過事件日誌頁面查看安全事件。高危警報會在頁面右上角顯示徽章提醒。"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            {/* 警报规则管理 */}
            <Card 
                title="警報規則管理" 
                extra={
                    <Space>
                        <Text type="secondary">
                            已啟用: {alertRules.filter(r => r.enabled).length}/{alertRules.length}
                        </Text>
                        <Button type="primary" size="small">
                            新增規則
                        </Button>
                    </Space>
                }
            >
                <List
                    dataSource={alertRules}
                    renderItem={(rule) => {
                        const isMuted = settings.muteRules.includes(rule.id);
                        return (
                            <List.Item
                                actions={[
                                    <Switch
                                        key="toggle"
                                        size="small"
                                        checked={rule.enabled}
                                        onChange={() => toggleRule(rule.id)}
                                    />,
                                    <Button
                                        key="mute"
                                        size="small"
                                        icon={<MutedOutlined />}
                                        onClick={() => muteRule(rule.id)}
                                        disabled={isMuted}
                                        title={isMuted ? '已靜音' : '靜音警報'}
                                    >
                                        {isMuted ? '已靜音' : '靜音'}
                                    </Button>,
                                    <Button
                                        key="edit"
                                        size="small"
                                        icon={<EyeOutlined />}
                                        onClick={() => {
                                            setSelectedRule(rule);
                                            setIsModalVisible(true);
                                        }}
                                    >
                                        詳情
                                    </Button>
                                ]}
                                style={{ 
                                    opacity: rule.enabled ? 1 : 0.6,
                                    backgroundColor: isMuted ? '#f5f5f5' : 'transparent'
                                }}
                            >
                                <List.Item.Meta
                                    avatar={getActionIcon(rule.action)}
                                    title={
                                        <Space>
                                            <Text strong={rule.enabled}>
                                                {rule.name}
                                            </Text>
                                            <Tag color={getSeverityColor(rule.severity)}>
                                                {rule.severity.toUpperCase()}
                                            </Tag>
                                            {isMuted && <Tag color="default">已靜音</Tag>}
                                        </Space>
                                    }
                                    description={
                                        <div>
                                            <Paragraph ellipsis={{ rows: 1 }}>
                                                {rule.description}
                                            </Paragraph>
                                            {rule.lastTriggered && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    上次觸發: {rule.lastTriggered}
                                                </Text>
                                            )}
                                        </div>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            </Card>

            {/* 规则详情模态框 */}
            <Modal
                title="警報規則詳情"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsModalVisible(false)}>
                        關閉
                    </Button>
                ]}
                width={600}
            >
                {selectedRule && (
                    <div>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Text strong>規則名稱：</Text>
                                <div>{selectedRule.name}</div>
                            </Col>
                            <Col span={12}>
                                <Text strong>嚴重程度：</Text>
                                <Tag color={getSeverityColor(selectedRule.severity)}>
                                    {selectedRule.severity.toUpperCase()}
                                </Tag>
                            </Col>
                        </Row>
                        <Divider />
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>描述：</Text>
                            <div>{selectedRule.description}</div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>匹配模式：</Text>
                            <div>
                                <code style={{ 
                                    backgroundColor: '#f6f8fa', 
                                    padding: '2px 4px', 
                                    borderRadius: '3px' 
                                }}>
                                    {selectedRule.pattern}
                                </code>
                            </div>
                        </div>
                        <div>
                            <Text strong>處理動作：</Text>
                            <div>{selectedRule.action}</div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AlertSettingsPage; 
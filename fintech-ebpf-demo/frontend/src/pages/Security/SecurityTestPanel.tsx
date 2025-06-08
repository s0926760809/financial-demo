import React from 'react';
import { Button, Card, Typography, Space, Tooltip } from 'antd';
import { 
    CodeOutlined,
    FileTextOutlined,
    ExportOutlined,
    LockOutlined,
    HddOutlined,
    BugOutlined,
    ClusterOutlined
} from '@ant-design/icons';
import { SecurityTest } from '../../types';

const { Title, Paragraph } = Typography;

interface SecurityTestPanelProps {
    onRunTest: (test: SecurityTest) => void;
    isTesting: Record<string, boolean>;
}

const generalTests: SecurityTest[] = [
    { id: 'st-1', name: '進程信息收集', endpoint: 'command', icon: <CodeOutlined />, description: '模擬攻擊者執行 `ps aux` 和 `id` 命令來收集系統信息。', payload: { command: "ps aux" } },
    { id: 'st-2', name: '讀取敏感文件', endpoint: 'file', icon: <FileTextOutlined />, description: '嘗試讀取 `/etc/shadow` 文件，一個典型的權限探測行為。', payload: { file_path: "/etc/shadow", action: "read" } },
    { id: 'st-3', name: '內存轉儲', endpoint: 'memory', icon: <HddOutlined />, description: '模擬使用 `gcore` 轉儲進程內存，可能包含敏感信息。', payload: { dump_type: "process", pid: 1 } },
    { id: 'st-4', name: '權限提升探測', endpoint: 'privilege', icon: <LockOutlined />, description: '執行 `sudo -l` 來檢查當前用戶可以通過 sudo 執行的命令。', payload: { action: "sudo" } },
    { id: 'st-5', name: '網絡掃描', endpoint: 'network', icon: <ExportOutlined />, description: '模擬網絡掃描攻擊，探測內部服務。', payload: { target: "localhost", ports: [22, 80, 443], scan_type: "tcp" } },
    { id: 'st-6', name: '敏感數據洩露', endpoint: 'sensitive', icon: <BugOutlined />, description: '模擬敏感數據處理和洩露。', payload: { data_type: "credit_card", action: "generate" } },
    { id: 'st-7', name: 'SQL注入測試', endpoint: 'sql', icon: <ClusterOutlined />, description: '測試SQL注入漏洞。', payload: { query: "admin' OR '1'='1", test_type: "union" } },
];


const SecurityTestPanel: React.FC<SecurityTestPanelProps> = ({ onRunTest, isTesting }) => {
    return (
        <Card>
            <Title level={5}>通用威脅模擬 (General Threats)</Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                這些測試模擬了主機和容器環境中最常見的一些威脅行為。
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%' }}>
                {generalTests.map(test => (
                    <Tooltip key={test.id} title={test.description} placement="right">
                        <Button
                            block
                            icon={test.icon}
                            loading={isTesting[test.id]}
                            onClick={() => onRunTest(test)}
                        >
                            {test.name}
                        </Button>
                    </Tooltip>
                ))}
            </Space>
        </Card>
    );
};

export default SecurityTestPanel; 
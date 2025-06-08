import React from 'react';
import { Button, Card, Typography, Space, Tooltip } from 'antd';
import { 
    CloudUploadOutlined,
    ForkOutlined,
    BugOutlined,
    GatewayOutlined
} from '@ant-design/icons';
import { SecurityTest } from '../../types';

const { Title, Paragraph } = Typography;

interface NetworkAttackPanelProps {
    onRunTest: (test: SecurityTest) => void;
    isTesting: Record<string, boolean>;
}

const networkTests: SecurityTest[] = [
    { id: 'nt-1', name: 'DNS 數據洩露', endpoint: 'network', icon: <CloudUploadOutlined />, description: '通過特殊構造的DNS查詢，將敏感數據編碼在子域名中向外傳輸。', payload: { target: "8.8.8.8", scan_type: "ping", timeout: 3 } },
    { id: 'nt-2', name: '橫向移動', endpoint: 'network', icon: <GatewayOutlined />, description: '從當前服務探測內部網絡中的其他服務，模擬攻擊者在內網中的移動。', payload: { target: "127.0.0.1", ports: [22, 80, 443, 3306, 5432], scan_type: "tcp", timeout: 2 } },
    { id: 'nt-3', name: 'C2 心跳信標', endpoint: 'network', icon: <BugOutlined />, description: '模擬惡意軟件周期性地向外部C2服務器發送心跳連接。', payload: { target: "example.com", ports: [443, 8080], scan_type: "tcp", timeout: 5 } },
    { id: 'nt-4', name: '數據外傳', endpoint: 'network', icon: <ForkOutlined />, description: '通過一個非標準的TCP高位端口將批量數據傳輸到外部服務器。', payload: { target: "google.com", ports: [9999, 8888, 7777], scan_type: "tcp", timeout: 3 } },
];


const NetworkAttackPanel: React.FC<NetworkAttackPanelProps> = ({ onRunTest, isTesting }) => {
    return (
        <Card>
            <Title level={5}>網絡攻擊模擬 (Network Attacks)</Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                模擬針對網絡層的攻擊，檢測系統對異常流量、數據洩露和橫向移動的監控能力。
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%' }}>
                {networkTests.map(test => (
                    <Tooltip key={test.id} title={test.description} placement="right">
                        <Button
                            block
                            danger // 網絡攻擊通常是高危操作
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

export default NetworkAttackPanel; 
import React from 'react';
import { Card, Table, Typography, Tag, Space } from 'antd';
import { GlobalOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Event } from '../../types';

const { Title } = Typography;

interface HttpFlowTableProps {
    events: Event[];
    style?: React.CSSProperties;
}

const HttpFlowTable: React.FC<HttpFlowTableProps> = ({ events, style }) => {
    const columns = [
        {
            title: '時間',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 180,
            render: (ts: string) => new Date(ts).toLocaleString(),
        },
        {
            title: '方法',
            dataIndex: 'method',
            key: 'method',
            width: 80,
            render: (method: string) => <Tag color="green">{method}</Tag>
        },
        {
            title: 'URL',
            dataIndex: 'url',
            key: 'url',
            render: (url: string) => (
                <Space>
                    <GlobalOutlined />
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{url}</span>
                </Space>
            )
        },
        {
            title: '狀態碼',
            dataIndex: 'status_code',
            key: 'status_code',
            width: 100,
            render: (status: number) => (
                <Tag color={status >= 400 ? 'red' : status >= 300 ? 'orange' : 'blue'}>
                    {status}
                </Tag>
            )
        },
        {
            title: 'Pod 名稱',
            dataIndex: 'pod_name',
            key: 'pod_name',
            width: 200,
        },
    ];

    return (
        <Card style={style}>
            <Title level={5}>HTTP 流量日誌 (HTTP Flows)</Title>
            <Table
                columns={columns}
                dataSource={events}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 5 }}
                scroll={{ y: 200 }}
            />
        </Card>
    );
};

export default HttpFlowTable; 
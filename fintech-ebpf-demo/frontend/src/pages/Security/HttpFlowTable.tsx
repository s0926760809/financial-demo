import React from 'react';
import { Card, Table, Typography, Tag } from 'antd';
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
            dataIndex: ['data', 'http', 'method'],
            key: 'method',
            width: 80,
            render: (method: string) => <Tag color={method === 'GET' ? 'green' : 'orange'}>{method}</Tag>
        },
        {
            title: 'URL',
            dataIndex: ['data', 'http', 'url'],
            key: 'url',
        },
        {
            title: '狀態碼',
            dataIndex: ['data', 'http', 'status_code'],
            key: 'status',
            width: 90,
            render: (status: number) => {
                let color = 'default';
                if (status >= 500) color = 'volcano';
                else if (status >= 400) color = 'red';
                else if (status >= 300) color = 'orange';
                else if (status >= 200) color = 'green';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: '來源進程',
            dataIndex: 'process_name',
            key: 'process_name',
            width: 120,
        },
    ];

    return (
        <Card style={style}>
            <Title level={5}>HTTP 請求流 (HTTP Flow)</Title>
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
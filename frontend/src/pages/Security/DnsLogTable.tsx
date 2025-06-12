import React from 'react';
import { Card, Table, Typography, Tag } from 'antd';
import { Event } from '../../types';

const { Title } = Typography;

interface DnsLogTableProps {
    events: Event[];
}

const DnsLogTable: React.FC<DnsLogTableProps> = ({ events }) => {
    const columns = [
        {
            title: '時間',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 180,
            render: (ts: string) => new Date(ts).toLocaleString(),
        },
        {
            title: '查詢域名',
            dataIndex: 'summary',
            key: 'summary',
            render: (summary: string) => <Tag color="blue">{summary}</Tag>
        },
        {
            title: 'Pod 名稱',
            dataIndex: 'pod_name',
            key: 'pod_name',
        },
        {
            title: '進程',
            dataIndex: 'process_name',
            key: 'process_name',
        },
    ];

    return (
        <Card>
            <Title level={5}>DNS 查詢日誌 (DNS Logs)</Title>
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

export default DnsLogTable; 
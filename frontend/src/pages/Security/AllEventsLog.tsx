import React, { useState } from 'react';
import { Card, Table, Tag, Typography, Modal, Input } from 'antd';
import { Event } from '../../types';

const { Title } = Typography;
const { Search } = Input;

interface AllEventsLogProps {
    events: Event[];
    title: string;
}

const getLevelColor = (level: string) => {
    switch (level) {
        case 'critical': return 'volcano';
        case 'high': return 'red';
        case 'medium': return 'orange';
        case 'low': return 'geekblue';
        default: return 'default';
    }
};

const AllEventsLog: React.FC<AllEventsLogProps> = ({ events, title }) => {
    const [searchText, setSearchText] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const columns = [
        {
            title: '時間',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 180,
            render: (ts: string) => new Date(ts).toLocaleString(),
        },
        {
            title: '級別',
            dataIndex: 'level',
            key: 'level',
            width: 90,
            render: (level: string) => <Tag color={getLevelColor(level)}>{(level || '').toUpperCase()}</Tag>,
        },
        {
            title: '事件類型',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (type: string) => <Tag>{type}</Tag>,
        },
        {
            title: '摘要',
            dataIndex: 'summary',
            key: 'summary',
            render: (summary: string, record: Event) => <a onClick={() => setSelectedEvent(record)}>{summary}</a>
        },
    ];

    const filteredEvents = events.filter(event =>
        JSON.stringify(event).toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <>
            <Card 
                title={<Title level={5}>{title}</Title>}
                extra={<Search placeholder="搜索事件..." onSearch={setSearchText} style={{ width: 200 }} />}
            >
                <Table
                    columns={columns}
                    dataSource={filteredEvents}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10 }}
                    scroll={{ y: 400 }}
                />
            </Card>

            <Modal
                title="事件詳情"
                open={!!selectedEvent}
                onCancel={() => setSelectedEvent(null)}
                footer={null}
                width={800}
            >
                {selectedEvent && (
                    <pre 
                        style={{
                            backgroundColor: '#1e1e1e',
                            color: '#d4d4d4',
                            padding: '16px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            maxHeight: '400px',
                            overflow: 'auto',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                        }}
                    >
                        {JSON.stringify(selectedEvent, null, 2)}
                    </pre>
                )}
            </Modal>
        </>
    );
};

export default AllEventsLog; 
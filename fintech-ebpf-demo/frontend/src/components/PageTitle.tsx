import React from 'react';
import { Typography } from 'antd';
import styles from './PageTitle.module.css';

const { Title, Paragraph } = Typography;

interface PageTitleProps {
  title: string;
  subtitle?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle }) => {
  return (
    <div className={styles.pageTitle}>
      <Title level={2}>{title}</Title>
      {subtitle && <Paragraph type="secondary">{subtitle}</Paragraph>}
    </div>
  );
};

export default PageTitle; 
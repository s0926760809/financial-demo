import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Portfolio from '../index';

describe('Portfolio 頁面', () => {
  it('應該正確渲染主要標題', () => {
    render(<Portfolio />);
    // 主要標題可能是「投資組合」或類似
    expect(screen.getByText(/投資組合|Portfolio/i)).toBeInTheDocument();
  });
});

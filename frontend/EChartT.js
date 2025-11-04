// frontend/src/EChartT.js
// 一个薄包装：把传入的 ECharts option 做一次翻译（中文→英文），其余完全透明。

import React from 'react';
import ReactECharts from 'echarts-for-react';
import { translateOption } from './i18n';

export default function EChartT(props) {
  const { option, ...rest } = props;
  const opt = translateOption(option);
  return <ReactECharts option={opt} {...rest} />;
}

import React, { useState, useEffect } from 'react';
import { Layout, Card, Select, Button, Spin, message, Row, Col, Statistic, Tag, Timeline, Table, Progress, Tabs, Alert, List } from 'antd';
import { UserOutlined, MessageOutlined, CalendarOutlined, TrophyOutlined, HeartOutlined, TeamOutlined, ExportOutlined, SyncOutlined, FireOutlined, LineChartOutlined, HeartTwoTone, RadarChartOutlined, DashboardOutlined, ShareAltOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'antd/dist/reset.css';
import './App.css';

const { Header, Content } = Layout;
const { Option } = Select;
const { TabPane } = Tabs;

const API_BASE_URL = 'http://localhost:8000';

// Config: test mode
const IS_TEST_MODE = true;  // true in test, false in production
const BATCH_LIMIT = IS_TEST_MODE ? 30 : 0;  // 0 = all

// ===== helpers: two generic chart builders (UI only) =====
const buildPieOption = (title, data) => ({
  title: { text: title, left: 'center' },
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    label: { show: true, formatter: '{b}: {d}%' },
    data
  }]
});

const buildBarOption = (title, categories, values, yName = 'Count') => ({
  title: { text: title, left: 'center' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: categories },
  yAxis: { type: 'value', name: yName },
  series: [{ type: 'bar', data: values }]
});

function App() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchAnalysis, setBatchAnalysis] = useState(null);
  const [userPreference, setUserPreference] = useState(null);
  const [timeAnalysis, setTimeAnalysis] = useState(null);
  const [socialHealth, setSocialHealth] = useState(null);
  const [networkGraph, setNetworkGraph] = useState(null);

  // fetch contacts
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/contacts`);
      setContacts(response.data);
    } catch (error) {
      message.error('Failed to fetch contacts.');
      console.error(error);
    }
  };

  // ==== Display mappers (frontend only; keep backend values intact) ====
  const mapStatus = (status) => {
    const mapping = {
      '活跃': 'Active',
      '冷却中': 'Cooling off',
      '休眠': 'Dormant',
      '失联': 'Disconnected'
    };
    return mapping[status] || status || 'Unknown';
  };

  const mapHealthLevel = (level) => {
    const mapping = {
      '优秀': 'Excellent',
      '良好': 'Good',
      '一般': 'Fair',
      '待改善': 'Needs Improvement'
    };
    return mapping[level] || level || 'Unknown';
  };

  // ==== Category display mapper (frontend-only) ====
  const mapCategory = (name) => {
    const mapping = {
      '密友圈': 'Intimiate',
      '社交圈': 'Familiar',
      '工作圈': 'Known',
      '泛社交': 'Unaware',
    };
    return mapping[name] || name || 'Unknown';
  };

  // ---- Preference display mappers ----
  const mapDimension = (name) => ({
    '互动频率': 'Interaction',
    '内容质量': 'Content',
    '情感表达': 'Emotion',
    '深度交流': 'Depth',
  }[name] || name);

  const mapUserType = (name) => ({
    '分享型': 'Sharing-oriented',
    '互动型': 'Interaction-driven',
    '表达型': 'Expressive',
    '深度型': 'Depth-focused',
    '平衡型': 'Balanced',
  }[name] || name);

  // 将中文描述句子转成英文展示：
  // 形如 “基于522位好友的分析，你是一个分享型社交者，最注重深度交流”
  const translatePrefDescription = (cn) => {
    if (!cn || typeof cn !== 'string') return '';
    // 如果本身已是英文就原样返回
    if (/[A-Za-z]/.test(cn)) return cn;

    // 数字部分
    let out = cn.replace(/^基于(\d+)位好友的分析，?/, (_, n) => `Based on analysis of ${n} contacts, `);

    // 结构化短语
    out = out
      .replace('你是一个', 'you are a ')
      .replace('社交者', ' socializer')
      .replace('最注重', ' and most focused on ');

    // 关键词映射
    out = out
      .replace(/分享型|互动型|表达型|深度型|平衡型/g, m => mapUserType(m))
      .replace(/互动频率|内容质量|情感表达|深度交流/g, m => mapDimension(m));

    return out;
  };


  // compute score
  const calculateScore = async (userName) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/calculate_rscore`, {
        user_name: userName
      });
      setScoreData(response.data);
      message.success('Score calculated!');
    } catch (error) {
      message.error('Failed to calculate: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // batch analysis
  const runBatchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/batch_analysis?limit=${BATCH_LIMIT}`);
      
      setBatchAnalysis(response.data);
      
      // extract sub-analyses
      if (response.data.user_preference) {
        setUserPreference(response.data.user_preference);
      }
      
      if (response.data.time_analysis) {
        setTimeAnalysis(response.data.time_analysis);
      }
      
      if (response.data.social_health) {
        setSocialHealth(response.data.social_health);
      }
      
      if (response.data.network_graph) {
        setNetworkGraph(response.data.network_graph);
      }
      
      const successMsg = BATCH_LIMIT > 0 
        ? `Batch analysis completed! (Test mode: analyzed first ${BATCH_LIMIT} contacts)` 
        : 'Batch analysis completed! (Analyzed all contacts)';
      message.success(successMsg);
    } catch (error) {
      message.error('Batch analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  // export report
  const exportReport = async () => {
    if (!selectedContact) {
      message.warning('Please select a contact first.');
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/api/export_report/${selectedContact}`);
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `rscore_report_${selectedContact}_${dayjs().format('YYYYMMDD')}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      message.success('Report exported.');
    } catch (error) {
      message.error('Export failed.');
    }
  };

  // graph: relationship network
  const getNetworkGraphOption = () => {
    if (!networkGraph) return {};
    
    return {
      title: {
        text: 'Social Network Graph',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        formatter: function(params) {
          if (params.dataType === 'node') {
            return params.data.name + '<br/>Score: ' + (params.data.value || 0).toFixed(2);
          } else {
            return 'Tie Strength: ' + params.data.value.toFixed(2);
          }
        }
      },
      legend: [{
        data: networkGraph.categories.map(c => mapCategory(c.name)),
        orient: 'horizontal',
        left: 'center',
        top: 40
      }],
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [{
        type: 'graph',
        layout: 'force',
        data: networkGraph.nodes,
        links: networkGraph.edges,
        categories: networkGraph.categories.map(c => ({ ...c, name: mapCategory(c.name) })),
        roam: true,
        draggable: true,
        force: {
          repulsion: 200,
          gravity: 0.1,
          edgeLength: 100,
          layoutAnimation: true
        },
        label: {
          show: true,
          position: 'bottom',
          formatter: '{b}',
          fontSize: 10
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 10
          }
        }
      }]
    };
  };

  // gauge: social wellness
  const getHealthGaugeOption = (value, title) => {
    let color = '#52c41a';
    if (value < 40) color = '#f5222d';
    else if (value < 60) color = '#faad14';
    else if (value < 80) color = '#1890ff';
    
    return {
      series: [{
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: '100%',
        splitNumber: 8,
        axisLine: {
          lineStyle: {
            width: 6,
            color: [
              [0.4, '#f5222d'],
              [0.6, '#faad14'],
              [0.8, '#1890ff'],
              [1, '#52c41a']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l2.9,4.6l5.4,0.8l-3.9,3.8l0.9,5.4l-4.8-2.5l-4.8,2.5l0.9-5.4l-3.9-3.8l5.4-0.8L12.8,0.7z',
          length: '70%',
          width: 3,
          offsetCenter: [0, '-10%'],
          itemStyle: {
            color: color
          }
        },
        axisLabel: {
          fontSize: 10,
          distance: -50,
          color: '#999'
        },
        axisTick: {
          length: 8,
          lineStyle: {
            color: 'auto',
            width: 1
          }
        },
        splitLine: {
          length: 10,
          lineStyle: {
            color: 'auto',
            width: 2
          }
        },
        title: {
          show: true,
          offsetCenter: [0, '30%'],
          fontSize: 12,
          color: '#666'
        },
        detail: {
          fontSize: 20,
          offsetCenter: [0, '0%'],
          color: color,
          formatter: '{value}'
        },
        data: [{
          value: value,
          name: title
        }]
      }]
    };
  };

  // heatmap: activity time
  const getHeatmapOption = () => {
    if (!timeAnalysis?.heatmap) return {};
    
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const data = timeAnalysis.heatmap.map(item => [item.hour, item.weekday, item.value || 0]);
    const maxValue = Math.max(...data.map(item => item[2]), 1);
    
    return {
      title: {
        text: 'Social Activity Heatmap',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        position: 'top',
        formatter: function (params) {
          return `${days[params.value[1]]} ${params.value[0]}:00<br/>Messages: ${params.value[2]}`;
        }
      },
      grid: {
        height: '60%',
        top: '15%'
      },
      xAxis: {
        type: 'category',
        data: hours,
        splitArea: {
          show: true
        },
        axisLabel: {
          interval: 2,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'category',
        data: days,
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        inRange: {
          color: ['#f0f0f0', '#ffe4b5', '#ffa500', '#ff6347', '#dc143c', '#8b0000']
        }
      },
      series: [{
        name: 'Messages',
        type: 'heatmap',
        data: data,
        label: {
          show: false
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  // monthly trend
  const getMonthlyTrendOption = () => {
    if (!timeAnalysis?.monthly_trend) return {};
    
    const trend = timeAnalysis.monthly_trend;
    const growth = timeAnalysis.monthly_growth || [];
    
    const growthData = [null, ...growth.map(item => item.growth)];
    
    return {
      title: {
        text: 'Monthly Message Trend',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        formatter: function(params) {
          let result = params[0].name + '<br/>';
          params.forEach(param => {
            if (param.value !== null && param.value !== undefined) {
              result += param.seriesName + ': ' + param.value + 
                       (param.seriesIndex === 1 ? '%' : '') + '<br/>';
            }
          });
          return result;
        }
      },
      legend: {
        data: ['Messages', 'MoM Growth'],
        top: 35
      },
      grid: {
        top: 70,
        bottom: 50
      },
      xAxis: [
        {
          type: 'category',
          data: trend.map(item => item.month),
          axisPointer: {
            type: 'shadow'
          },
          axisLabel: {
            rotate: 45,
            interval: 0,
            fontSize: 10
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Messages',
          min: 0,
          axisLabel: {
            formatter: '{value}'
          }
        },
        {
          type: 'value',
          name: 'MoM Growth Rate',
          axisLabel: {
            formatter: '{value}%'
          }
        }
      ],
      series: [
        {
          name: 'Messages',
          type: 'bar',
          data: trend.map(item => item.count),
          itemStyle: {
            color: '#1890ff'
          },
          label: {
            show: true,
            position: 'top',
            fontSize: 10
          }
        },
        {
          name: 'MoM Growth',
          type: 'line',
          yAxisIndex: 1,
          data: growthData,
          itemStyle: {
            color: '#52c41a'
          },
          smooth: true,
          connectNulls: false,
          markLine: {
            data: [
              { type: 'average', name: 'Average Growth' }
            ]
          }
        }
      ]
    };
  };

  // yearly comparison
  const getYearlyComparisonOption = () => {
    if (!timeAnalysis?.yearly_summary) return {};
    
    const yearData = Object.entries(timeAnalysis.yearly_summary).map(([year, count]) => ({
      year: year,
      count: count
    })).sort((a, b) => a.year - b.year);
    
    if (yearData.length === 0) return {};
    
    return {
      title: {
        text: 'Yearly Activity Comparison',
        left: 'center',
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br/>Total Messages: {c}'
      },
      xAxis: {
        type: 'category',
        data: yearData.map(item => item.year),
        axisLabel: {
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: 'Total Messages'
      },
      series: [{
        type: 'bar',
        data: yearData.map(item => item.count),
        itemStyle: {
          color: function(params) {
            const colors = ['#91d5ff', '#69c0ff', '#40a9ff', '#1890ff', '#096dd9'];
            return colors[params.dataIndex % colors.length];
          }
        },
        label: {
          show: true,
          position: 'top'
        }
      }]
    };
  };

  // radar (dimension scores)
  const getRadarOption = () => {
    if (!scoreData) return {};
    
    return {
      title: {
        text: 'Relationship Dimension Analysis',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      tooltip: {},
      radar: {
        center: ['50%', '55%'],
        radius: '65%',
        indicator: [
          { name: 'Interaction', max: 10 },
          { name: 'Content', max: 10 },
          { name: 'Emotion', max: 10 },
          { name: 'Depth', max: 10 }
        ],
        name: {
          textStyle: {
            fontSize: 12,
            color: '#333'
          }
        }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [
            scoreData.dimensions.interaction,
            scoreData.dimensions.content,
            scoreData.dimensions.emotion,
            scoreData.dimensions.depth
          ],
          name: 'Relationship Score',
          areaStyle: {
            color: 'rgba(24, 144, 255, 0.2)'
          },
          lineStyle: {
            color: '#1890ff',
            width: 2
          },
          itemStyle: {
            color: '#1890ff'
          }
        }]
      }]
    };
  };

  const getDistributionOption = () => {
    if (!batchAnalysis?.statistics?.score_distribution) return {};
    
    const distribution = batchAnalysis.statistics.score_distribution;
    const data = Object.entries(distribution).map(([range, count]) => ({
      name: range + ' pts',
      value: count
    }));
    
    return {
      title: {
        text: 'Score Distribution',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: {
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: 'Contacts'
      },
      series: [{
        type: 'bar',
        data: data.map(d => d.value),
        itemStyle: {
          color: function(params) {
            const colors = ['#f5222d', '#fa8c16', '#faad14', '#52c41a', '#1890ff'];
            return colors[params.dataIndex];
          }
        },
        label: {
          show: true,
          position: 'top'
        }
      }]
    };
  };

  const getUserPreferenceOption = () => {
    if (!userPreference?.preferences) return {};
    
    const prefs = userPreference.preferences;
    
    return {
      title: {
        text: 'Social Preference Analysis',
        left: 'center',
        top: 5,
        textStyle: {
          fontSize: 14
        },
        subtext: translatePrefDescription(userPreference.description),
        subtextStyle: {
          fontSize: 12,
          padding: [5, 0, 0, 0]
        }
      },
      tooltip: {},
      radar: {
        center: ['50%', '60%'],
        radius: '60%',
        indicator: [
          { name: 'Interaction', max: 10 },
          { name: 'Content', max: 10 },
          { name: 'Emotion', max: 10 },
          { name: 'Depth', max: 10 }
        ],
        name: {
          textStyle: {
            fontSize: 11,
            color: '#333'
          }
        }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [
            prefs.interaction?.average || 0,
            prefs.content?.average || 0,
            prefs.emotion?.average || 0,
            prefs.depth?.average || 0
          ],
          name: 'Average',
          areaStyle: {
            color: 'rgba(255, 100, 100, 0.3)'
          },
          lineStyle: {
            color: '#ff6464'
          }
        }]
      }]
    };
  };

  const getTimelineOption = () => {
    if (!scoreData) return {};
    
    const months = ['6mo ago', '5mo ago', '4mo ago', '3mo ago', '2mo ago', '1mo ago', 'Now'];
    const baseScore = scoreData.total_score;
    const data = [
      Math.max(0, baseScore - 0.5 - Math.random()),
      Math.max(0, baseScore - 0.4 - Math.random() * 0.5),
      Math.max(0, baseScore - 0.3 - Math.random() * 0.3),
      Math.max(0, baseScore - 0.2 - Math.random() * 0.2),
      Math.max(0, baseScore - 0.1),
      Math.max(0, baseScore - 0.05),
      baseScore
    ].map(v => Math.min(10, v));
    
    return {
      title: {
        text: 'Relationship Strength Over Time',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: months
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 10,
        name: 'Relationship Score'
      },
      series: [{
        type: 'line',
        data: data,
        smooth: true,
        itemStyle: {
          color: '#1890ff'
        },
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.2)'
        },
        markPoint: {
          data: [
            { type: 'max', name: 'Max' },
            { type: 'min', name: 'Min' }
          ]
        },
        markLine: {
          data: [
            { type: 'average', name: 'Average' }
          ]
        }
      }]
    };
  };

  // score level & colors
  const getScoreLevel = (score) => {
    if (score >= 8) return { level: 'Close', color: '#52c41a' };
    if (score >= 6) return { level: 'Good', color: '#1890ff' };
    if (score >= 4) return { level: 'Fair', color: '#faad14' };
    return { level: 'Distant', color: '#f5222d' };
  };

  // color by status (keys remain Chinese to match backend values)
  const getStatusColor = (status) => {
    const colors = {
      '活跃': 'green',
      '冷却中': 'orange',
      '休眠': 'default',
      '失联': 'red'
    };
    return colors[status] || 'default';
  };

  const getHealthColor = (value) => {
    if (value >= 80) return '#52c41a';
    if (value >= 60) return '#1890ff';
    if (value >= 40) return '#faad14';
    return '#f5222d';
  };

  const getHealthIcon = (level) => {
    const icons = {
      '优秀': '🌟',
      '良好': '😊',
      '一般': '😐',
      '待改善': '😟',
      // also support English labels if backend ever switches
      'Excellent': '🌟',
      'Good': '😊',
      'Fair': '😐',
      'Needs Improvement': '😟'
    };
    return icons[level] || '❓';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '14px 0', fontSize: '24px', color: '#1890ff' }}>
          <HeartOutlined /> RScore - WeChat Relationship Scoring System
        </h1>
      </Header>
      
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        {/* control panel */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="Select or search a contact"
                optionFilterProp="children"
                onChange={(value) => setSelectedContact(value)}
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {contacts.map(contact => (
                  <Option key={contact.user_name} value={contact.user_name}>
                    {contact.display_name || contact.nick_name || contact.user_name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              <Button
                type="primary"
                icon={<UserOutlined />}
                onClick={() => selectedContact && calculateScore(selectedContact)}
                disabled={!selectedContact}
                loading={loading}
                style={{ marginRight: 8 }}
              >
                Compute Score
              </Button>
              <Button
                icon={<TeamOutlined />}
                onClick={runBatchAnalysis}
                loading={loading}
                style={{ marginRight: 8 }}
              >
                Batch Analysis
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={exportReport}
                disabled={!scoreData}
              >
                Export Report
              </Button>
            </Col>
          </Row>
        </Card>

        {/* loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="Analyzing data..." />
          </div>
        )}

        {/* score section (now with Interaction Analysis & Achievements tabs) */}
        {scoreData && !loading && (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Relationship Score"
                    value={scoreData.total_score}
                    precision={2}
                    valueStyle={{ color: getScoreLevel(scoreData.total_score).color }}
                    prefix={<TrophyOutlined />}
                    suffix={
                      <span style={{ fontSize: 14 }}>
                        / 10 
                        <Tag color={getScoreLevel(scoreData.total_score).color} style={{ marginLeft: 8 }}>
                          {getScoreLevel(scoreData.total_score).level}
                        </Tag>
                      </span>
                    }
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Relationship Status"
                    value={mapStatus(scoreData.relationship_status)}
                    valueStyle={{ fontSize: 20 }}
                    suffix={
                      <Tag color={getStatusColor(scoreData.relationship_status)}>
                        Freshness {(scoreData.freshness * 100).toFixed(0)}%
                      </Tag>
                    }
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Messages"
                    value={scoreData.statistics.total_messages}
                    prefix={<MessageOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Last Contact"
                    value={scoreData.statistics.last_chat_date || 'Unknown'}
                    valueStyle={{ fontSize: 16 }}
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Tabs defaultActiveKey="1">
              <TabPane tab="Dimension Analysis" key="1">
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={12}>
                    <Card title="Radar of Dimension Scores">
                      <ReactECharts option={getRadarOption()} style={{ height: 300 }} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Detailed Scores">
                      <div style={{ padding: '10px 0' }}>
                        <div style={{ marginBottom: 16 }}>
                          <span>Interaction</span>
                          <Progress 
                            percent={scoreData.dimensions.interaction * 10} 
                            strokeColor="#1890ff"
                            format={percent => `${(percent / 10).toFixed(1)}`}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <span>Content</span>
                          <Progress 
                            percent={scoreData.dimensions.content * 10}
                            strokeColor="#52c41a"
                            format={percent => `${(percent / 10).toFixed(1)}`}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <span>Emotion</span>
                          <Progress 
                            percent={scoreData.dimensions.emotion * 10}
                            strokeColor="#fa8c16"
                            format={percent => `${(percent / 10).toFixed(1)}`}
                          />
                        </div>
                        <div>
                          <span>Depth</span>
                          <Progress 
                            percent={scoreData.dimensions.depth * 10}
                            strokeColor="#722ed1"
                            format={percent => `${(percent / 10).toFixed(1)}`}
                          />
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </TabPane>

              {/* Interaction Analysis (render only if backend returns interaction_analysis) */}
              <TabPane tab="Interaction Analysis" key="2">
                {scoreData.interaction_analysis ? (
                  <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={24} md={12}>
                        <Card title="Conversation Initiator (Who starts more)">
                          <ReactECharts
                            style={{ height: 300 }}
                            option={buildPieOption('Initiation Share', [
                              { name: 'Me', value: scoreData.interaction_analysis.initiator.self_sessions },
                              { name: 'Friend', value: scoreData.interaction_analysis.initiator.friend_sessions }
                            ])}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card title="One-way / Two-way Ratio">
                          <ReactECharts
                            style={{ height: 300 }}
                            option={buildPieOption('Conversation Directionality', [
                              { name: 'Two-way', value: scoreData.interaction_analysis.directionality.two_way_sessions },
                              { name: 'One-way', value: scoreData.interaction_analysis.directionality.one_way_sessions }
                            ])}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={24} md={12}>
                        <Card title="Reply Delay Distribution">
                          <ReactECharts
                            style={{ height: 300 }}
                            option={buildBarOption(
                              'Reply Delay Distribution',
                              scoreData.interaction_analysis.reply_delay.bins.map(b => b.range),
                              scoreData.interaction_analysis.reply_delay.bins.map(b => b.count),
                              'Count'
                            )}
                          />
                          <div style={{ marginTop: 8, color: '#888' }}>
                            Median: {Math.round(scoreData.interaction_analysis.reply_delay.median_seconds)} sec,&nbsp;
                            P90: {Math.round(scoreData.interaction_analysis.reply_delay.p90_seconds)} sec
                          </div>
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card title="Conversation Length (messages per session)">
                          <ReactECharts
                            style={{ height: 300 }}
                            option={buildBarOption(
                              'Conversation Length Distribution',
                              scoreData.interaction_analysis.conversation_length.bins.map(b => b.range),
                              scoreData.interaction_analysis.conversation_length.bins.map(b => b.count)
                            )}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </>
                ) : (
                  <Alert type="info" message="No interaction analysis data yet." />
                )}
              </TabPane>

              {/* Achievements (8 badges) */}
              <TabPane tab="Achievements" key="3">
                {scoreData.achievements ? (
                  <Card title="Social Achievements 🏆">
                    <Row gutter={[12, 12]}>
                      {scoreData.achievements.map(a => (
                        <Col span={6} key={a.key}>
                          <Card size="small" bordered style={{ textAlign: 'center', height: 160 }}>
                            <div style={{ fontWeight: 600 }}>
                              {a.achieved ? '🏅 ' : '🎯 '} {a.name}
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{a.description}</div>
                            <div style={{ marginTop: 8 }}>
                              <Progress percent={Math.round((a.progress || 0) * 100)} status={a.achieved ? 'success' : 'active'} />
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                ) : (
                  <Alert type="info" message="No achievement data yet." />
                )}
              </TabPane>
            </Tabs>
          </>
        )}

        {/* batch analysis area */}
        {batchAnalysis && (
          <>
            <Tabs defaultActiveKey="1">
              {/* wellness dashboard */}
              <TabPane tab={<span><DashboardOutlined />Social Wellness</span>} key="1">
                {socialHealth && (
                  <>
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col span={8}>
                        <Card title={
                          <span>
                            Overall Wellness 
                            <span style={{ marginLeft: 10, fontSize: 20 }}>
                              {getHealthIcon(socialHealth.health_level)}
                            </span>
                          </span>
                        }>
                          <ReactECharts 
                            option={getHealthGaugeOption(socialHealth.overall_health, 'Composite Score')} 
                            style={{ height: 200 }} 
                          />
                          <div style={{ textAlign: 'center', marginTop: 10 }}>
                            <Tag color={getHealthColor(socialHealth.overall_health)} style={{ fontSize: 16 }}>
                              {mapHealthLevel(socialHealth.health_level)}
                            </Tag>
                          </div>
                        </Card>
                      </Col>
                      
                      <Col span={16}>
                        <Card title="Wellness Metrics">
                          <Row gutter={16}>
                            <Col span={12}>
                              <div style={{ marginBottom: 20 }}>
                                <span>Relationship Diversity</span>
                                <Progress 
                                  percent={socialHealth.diversity_index} 
                                  strokeColor={getHealthColor(socialHealth.diversity_index)}
                                  format={percent => `${percent.toFixed(1)}`}
                                />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                  Whether social layers are well-distributed
                                </div>
                              </div>
                              <div style={{ marginBottom: 20 }}>
                                <span>Social Balance</span>
                                <Progress 
                                  percent={socialHealth.balance_index}
                                  strokeColor={getHealthColor(socialHealth.balance_index)}
                                  format={percent => `${percent.toFixed(1)}`}
                                />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                  Ratio of deep vs. broad ties
                                </div>
                              </div>
                            </Col>
                            <Col span={12}>
                              <div style={{ marginBottom: 20 }}>
                                <span>Maintenance Index</span>
                                <Progress 
                                  percent={socialHealth.maintenance_index}
                                  strokeColor={getHealthColor(socialHealth.maintenance_index)}
                                  format={percent => `${percent.toFixed(1)}`}
                                />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                  Share of active relationships
                                </div>
                              </div>
                              <div style={{ marginBottom: 20 }}>
                                <span>Emotional Expression Index</span>
                                <Progress 
                                  percent={socialHealth.emotional_index}
                                  strokeColor={getHealthColor(socialHealth.emotional_index)}
                                  format={percent => `${percent.toFixed(1)}`}
                                />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                  Richness of emotional exchanges
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    </Row>
                    
                    {socialHealth.suggestions && socialHealth.suggestions.length > 0 && (
                      <Card title="Recommendations" style={{ marginBottom: 24 }}>
                        <List
                          dataSource={socialHealth.suggestions}
                          renderItem={item => (
                            <List.Item>
                              <HeartTwoTone twoToneColor="#ff6464" style={{ marginRight: 8 }} />
                              {item}
                            </List.Item>
                          )}
                        />
                      </Card>
                    )}
                  </>
                )}
              </TabPane>

              {/* network */}
              <TabPane tab={<span><ShareAltOutlined />Relationship Network</span>} key="2">
                {networkGraph && (
                  <Card>
                    <ReactECharts 
                      option={getNetworkGraphOption()} 
                      style={{ height: 600 }} 
                    />
                    <Alert
                      message="Tip"
                      description="Node size ≈ message volume, distance ≈ closeness, color = relationship type. You can drag nodes to adjust layout."
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  </Card>
                )}
              </TabPane>

              {/* insights */}
              <TabPane tab={<span><RadarChartOutlined />Insights</span>} key="3">
                <Card style={{ marginBottom: 24 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Card>
                        <ReactECharts option={getDistributionOption()} style={{ height: 250 }} />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <ReactECharts option={getUserPreferenceOption()} style={{ height: 250 }} />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="Relationship Categories">
                        {batchAnalysis.categories?.summary && Object.entries(batchAnalysis.categories.summary).map(([type, count]) => (
                          <div key={type} style={{ marginBottom: 12 }}>
                            <span style={{ width: 120, display: 'inline-block' }}>{mapCategory(type)}:</span>
                            <Progress 
                              percent={Math.round(count / batchAnalysis.total_analyzed * 100)}
                              strokeColor={
                                type === '密友圈' ? '#52c41a' :
                                type === '社交圈' ? '#1890ff' :
                                type === '工作圈' ? '#faad14' : '#d9d9d9'
                              }
                              format={() => `${count} contacts`}
                            />
                          </div>
                        ))}
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </TabPane>

              {/* time analysis */}
              <TabPane tab={<span><FireOutlined />Time Analysis</span>} key="4">
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={24}>
                    <Card>
                      <ReactECharts option={getHeatmapOption()} style={{ height: 400 }} />
                    </Card>
                  </Col>
                </Row>
                
                {timeAnalysis && (
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                      <Card title="Social Habits">
                        <Statistic 
                          title="Peak Hour" 
                          value={`${timeAnalysis.peak_hour || 0}:00`}
                          prefix={<FireOutlined />}
                        />
                        <Statistic 
                          title="Peak Weekday" 
                          value={timeAnalysis.peak_weekday || 'Unknown'}
                          style={{ marginTop: 16 }}
                        />
                        <Statistic 
                          title="Night-owl Index" 
                          value={timeAnalysis.night_owl_score || 0}
                          suffix="%"
                          style={{ marginTop: 16 }}
                        />
                        <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                          * Night-owl Index: share of messages between 00:00–06:00
                        </div>
                      </Card>
                    </Col>
                    <Col span={16}>
                      <Card>
                        <ReactECharts option={getMonthlyTrendOption()} style={{ height: 300 }} />
                      </Card>
                    </Col>
                  </Row>
                )}
                
                {timeAnalysis?.yearly_summary && Object.keys(timeAnalysis.yearly_summary).length > 1 && (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Card>
                        <ReactECharts option={getYearlyComparisonOption()} style={{ height: 300 }} />
                      </Card>
                    </Col>
                  </Row>
                )}
              </TabPane>

              {/* leaderboard */}
              <TabPane tab={<span><LineChartOutlined />Relationship Leaderboard</span>} key="5">
                <Card title={`Relationship Leaderboard (Analyzed ${batchAnalysis.total_analyzed || 0} / ${batchAnalysis.total_contacts || 0} contacts)`}>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Statistic 
                        title="Average Score" 
                        value={batchAnalysis.statistics?.average_score || 0} 
                        precision={2} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Median Score" 
                        value={batchAnalysis.statistics?.median_score || 0} 
                        precision={2} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Analyzed" 
                        value={batchAnalysis.total_analyzed || 0} 
                        suffix={` / ${batchAnalysis.total_contacts || 0}`} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Failed" 
                        value={batchAnalysis.failed_count || 0} 
                      />
                    </Col>
                  </Row>
                  
                  <Table
                    dataSource={batchAnalysis.top_friends || []}
                    rowKey="user_name"
                    pagination={{ pageSize: 20 }}
                    columns={[
                      {
                        title: 'Rank',
                        key: 'rank',
                        render: (_, __, index) => index + 1,
                        width: 80,
                        fixed: 'left'
                      },
                      {
                        title: 'Contact',
                        dataIndex: 'display_name',
                        key: 'display_name',
                        ellipsis: true,
                        render: (text) => text || 'Unknown'
                      },
                      {
                        title: 'RScore',
                        dataIndex: 'score',
                        key: 'score',
                        sorter: (a, b) => a.score - b.score,
                        render: score => (
                          <span>
                            <Progress
                              percent={score * 10}
                              size="small"
                              format={() => score.toFixed(2)}
                              strokeColor={getScoreLevel(score).color}
                              style={{ width: 150 }}
                            />
                            <Tag color={getScoreLevel(score).color} style={{ marginLeft: 8 }}>
                              {getScoreLevel(score).level}
                            </Tag>
                          </span>
                        )
                      },
                      {
                        title: 'Status',
                        dataIndex: 'relationship_status',
                        key: 'relationship_status',
                        render: (status) => (
                          <Tag color={getStatusColor(status)}>
                            {mapStatus(status)}
                          </Tag>
                        )
                      },
                      {
                        title: 'Messages',
                        dataIndex: 'message_count',
                        key: 'message_count',
                        sorter: (a, b) => a.message_count - b.message_count,
                        render: (count) => count || 0
                      },
                      {
                        title: 'Chat Days',
                        dataIndex: 'days',
                        key: 'days',
                        sorter: (a, b) => (a.days || 0) - (b.days || 0),
                        render: (days) => days ? `${days} days` : '-'
                      },
                      {
                        title: 'Last Contact',
                        dataIndex: 'last_chat',
                        key: 'last_chat',
                        sorter: (a, b) => {
                          const dateA = a.last_chat ? new Date(a.last_chat) : new Date(0);
                          const dateB = b.last_chat ? new Date(b.last_chat) : new Date(0);
                          return dateA - dateB;
                        },
                        render: (date) => date || '-'
                      }
                    ]}
                  />
                </Card>
              </TabPane>
            </Tabs>
          </>
        )}
      </Content>
    </Layout>
  );
}

export default App;

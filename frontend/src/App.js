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

// 配置：测试模式
const IS_TEST_MODE = true;  // 测试时设为true，正式使用时设为false
const BATCH_LIMIT = IS_TEST_MODE ? 30 : 0;  // 0表示全部

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

  // 获取联系人列表
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/contacts`);
      setContacts(response.data);
    } catch (error) {
      message.error('获取联系人列表失败');
      console.error(error);
    }
  };

  // 计算关系评分
  const calculateScore = async (userName) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/calculate_rscore`, {
        user_name: userName
      });
      setScoreData(response.data);
      message.success('评分计算完成！');
    } catch (error) {
      message.error('计算评分失败：' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 批量分析
  const runBatchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/batch_analysis?limit=${BATCH_LIMIT}`);
      
      setBatchAnalysis(response.data);
      
      // 提取各项分析结果
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
        ? `综合分析完成！(测试模式：分析了前${BATCH_LIMIT}人)` 
        : '综合分析完成！(分析了全部好友)';
      message.success(successMsg);
    } catch (error) {
      message.error('批量分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出报告
  const exportReport = async () => {
    if (!selectedContact) {
      message.warning('请先选择联系人');
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
      
      message.success('报告导出成功！');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 关系网络图配置
  const getNetworkGraphOption = () => {
    if (!networkGraph) return {};
    
    return {
      title: {
        text: '社交关系网络图',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        formatter: function(params) {
          if (params.dataType === 'node') {
            return params.data.name + '<br/>评分: ' + (params.data.value || 0).toFixed(2);
          } else {
            return '关系强度: ' + params.data.value.toFixed(2);
          }
        }
      },
      legend: [{
        data: networkGraph.categories.map(c => c.name),
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
        categories: networkGraph.categories,
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

  // 社交健康度仪表盘配置
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

  // 社交活跃时间热力图配置
  const getHeatmapOption = () => {
    if (!timeAnalysis?.heatmap) return {};
    
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    const data = timeAnalysis.heatmap.map(item => [item.hour, item.weekday, item.value || 0]);
    const maxValue = Math.max(...data.map(item => item[2]), 1);
    
    return {
      title: {
        text: '社交活跃时间热力图',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        position: 'top',
        formatter: function (params) {
          return `${days[params.value[1]]} ${params.value[0]}:00<br/>消息数: ${params.value[2]}`;
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
        name: '消息数',
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

  // 月度趋势图配置
  const getMonthlyTrendOption = () => {
    if (!timeAnalysis?.monthly_trend) return {};
    
    const trend = timeAnalysis.monthly_trend;
    const growth = timeAnalysis.monthly_growth || [];
    
    const growthData = [null, ...growth.map(item => item.growth)];
    
    return {
      title: {
        text: '月度消息趋势分析',
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
        data: ['消息数', '环比增长'],
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
          name: '消息数',
          min: 0,
          axisLabel: {
            formatter: '{value}'
          }
        },
        {
          type: 'value',
          name: '环比增长率',
          axisLabel: {
            formatter: '{value}%'
          }
        }
      ],
      series: [
        {
          name: '消息数',
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
          name: '环比增长',
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
              { type: 'average', name: '平均增长率' }
            ]
          }
        }
      ]
    };
  };

  // 年度对比图配置
  const getYearlyComparisonOption = () => {
    if (!timeAnalysis?.yearly_summary) return {};
    
    const yearData = Object.entries(timeAnalysis.yearly_summary).map(([year, count]) => ({
      year: year,
      count: count
    })).sort((a, b) => a.year - b.year);
    
    if (yearData.length === 0) return {};
    
    return {
      title: {
        text: '年度社交活跃度对比',
        left: 'center',
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}年<br/>消息总数: {c}'
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
        name: '消息总数'
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

  // 其他图表配置保持不变...
  const getRadarOption = () => {
    if (!scoreData) return {};
    
    return {
      title: {
        text: '关系维度分析',
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
          { name: '互动频率', max: 10 },
          { name: '内容质量', max: 10 },
          { name: '情感表达', max: 10 },
          { name: '深度交流', max: 10 }
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
          name: '关系评分',
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
      name: range + '分',
      value: count
    }));
    
    return {
      title: {
        text: '好友分数分布',
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
        name: '人数'
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
        text: '社交偏好分析',
        left: 'center',
        top: 5,
        textStyle: {
          fontSize: 14
        },
        subtext: userPreference.description,
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
          { name: '互动频率', max: 10 },
          { name: '内容质量', max: 10 },
          { name: '情感表达', max: 10 },
          { name: '深度交流', max: 10 }
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
          name: '平均水平',
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
    
    const months = ['6月前', '5月前', '4月前', '3月前', '2月前', '1月前', '现在'];
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
        text: '关系强度变化趋势',
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
        name: '关系评分'
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
            { type: 'max', name: '最高点' },
            { type: 'min', name: '最低点' }
          ]
        },
        markLine: {
          data: [
            { type: 'average', name: '平均值' }
          ]
        }
      }]
    };
  };

  // 获取评分等级和颜色
  const getScoreLevel = (score) => {
    if (score >= 8) return { level: '亲密', color: '#52c41a' };
    if (score >= 6) return { level: '良好', color: '#1890ff' };
    if (score >= 4) return { level: '一般', color: '#faad14' };
    return { level: '疏远', color: '#f5222d' };
  };

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
      '待改善': '😟'
    };
    return icons[level] || '❓';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '14px 0', fontSize: '24px', color: '#1890ff' }}>
          <HeartOutlined /> RScore - 微信关系评分系统
        </h1>
      </Header>
      
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        {/* 控制面板 */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="选择或搜索联系人"
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
                计算评分
              </Button>
              <Button
                icon={<TeamOutlined />}
                onClick={runBatchAnalysis}
                loading={loading}
                style={{ marginRight: 8 }}
              >
                批量分析
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={exportReport}
                disabled={!scoreData}
              >
                导出报告
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Loading状态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="正在分析数据..." />
          </div>
        )}

        {/* 评分结果展示 - 保持不变 */}
        {scoreData && !loading && (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="关系总分"
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
                    title="关系状态"
                    value={scoreData.relationship_status}
                    valueStyle={{ fontSize: 20 }}
                    suffix={
                      <Tag color={getStatusColor(scoreData.relationship_status)}>
                        新鲜度 {(scoreData.freshness * 100).toFixed(0)}%
                      </Tag>
                    }
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="消息总数"
                    value={scoreData.statistics.total_messages}
                    prefix={<MessageOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="最后联系"
                    value={scoreData.statistics.last_chat_date || '未知'}
                    valueStyle={{ fontSize: 16 }}
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Tabs defaultActiveKey="1">
              <TabPane tab="维度分析" key="1">
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={12}>
                    <Card title="维度评分雷达图">
                      <ReactECharts option={getRadarOption()} style={{ height: 300 }} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="详细评分">
                      <div style={{ padding: '10px 0' }}>
                        <div style={{ marginBottom: 16 }}>
                          <span>互动频率</span>
                          <Progress 
                            percent={scoreData.dimensions.interaction * 10} 
                            strokeColor="#1890ff"
                            format={percent => `${(percent / 10).toFixed(1)}`}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <span>内容质量</span>
                          <Progress 
                            percent={scoreData.dimensions.content * 10}
                            strokeColor="#52c41a"
                            format={percent => `${(percent / 10).toFixed(1)}`}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <span>情感表达</span>
                          <Progress 
                            percent={scoreData.dimensions.emotion * 10}
                            strokeColor="#fa8c16"
                            format={percent => `${(percent / 10).toFixed(1)}`}
                          />
                        </div>
                        <div>
                          <span>深度交流</span>
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
            </Tabs>
          </>
        )}

        {/* 批量分析结果 */}
        {batchAnalysis && (
          <>
            <Tabs defaultActiveKey="1">
              {/* 健康仪表盘 - 新增为第一个标签页 */}
              <TabPane tab={<span><DashboardOutlined />社交健康度</span>} key="1">
                {socialHealth && (
                  <>
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col span={8}>
                        <Card title={
                          <span>
                            综合健康度 
                            <span style={{ marginLeft: 10, fontSize: 20 }}>
                              {getHealthIcon(socialHealth.health_level)}
                            </span>
                          </span>
                        }>
                          <ReactECharts 
                            option={getHealthGaugeOption(socialHealth.overall_health, '综合评分')} 
                            style={{ height: 200 }} 
                          />
                          <div style={{ textAlign: 'center', marginTop: 10 }}>
                            <Tag color={getHealthColor(socialHealth.overall_health)} style={{ fontSize: 16 }}>
                              {socialHealth.health_level}
                            </Tag>
                          </div>
                        </Card>
                      </Col>
                      
                      <Col span={16}>
                        <Card title="健康指标详情">
                          <Row gutter={16}>
                            <Col span={12}>
                              <div style={{ marginBottom: 20 }}>
                                <span>关系多样性</span>
                                <Progress 
                                  percent={socialHealth.diversity_index} 
                                  strokeColor={getHealthColor(socialHealth.diversity_index)}
                                  format={percent => `${percent.toFixed(1)}`}
                                />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                  社交关系的层次分布是否合理
                                </div>
                              </div>
                              <div style={{ marginBottom: 20 }}>
                                <span>社交平衡度</span>
                                <Progress 
                                  percent={socialHealth.balance_index}
                                  strokeColor={getHealthColor(socialHealth.balance_index)}
                                  format={percent => `${percent.toFixed(1)}`}
                                />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                  深度关系与泛社交的比例
                                </div>
                              </div>
                            </Col>
                            <Col span={12}>
                              <div style={{ marginBottom: 20 }}>
                                <span>关系维护指数</span>
                                <Progress 
                                  percent={socialHealth.maintenance_index}
                                  strokeColor={getHealthColor(socialHealth.maintenance_index)}
                                  format={percent => `${percent.toFixed(1)}`}
                                />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                  活跃关系的比例
                                </div>
                              </div>
                              <div style={{ marginBottom: 20 }}>
                                <span>情感表达指数</span>
                                <Progress 
                                  percent={socialHealth.emotional_index}
                                  strokeColor={getHealthColor(socialHealth.emotional_index)}
                                  format={percent => `${percent.toFixed(1)}`}
                                />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                  情感交流的丰富程度
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    </Row>
                    
                    {socialHealth.suggestions && socialHealth.suggestions.length > 0 && (
                      <Card title="健康建议" style={{ marginBottom: 24 }}>
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

              {/* 关系网络图 - 新增 */}
              <TabPane tab={<span><ShareAltOutlined />关系网络</span>} key="2">
                {networkGraph && (
                  <Card>
                    <ReactECharts 
                      option={getNetworkGraphOption()} 
                      style={{ height: 600 }} 
                    />
                    <Alert
                      message="提示"
                      description="节点大小表示消息量，距离表示关系亲密度，颜色表示关系类型。可以拖拽节点调整位置。"
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  </Card>
                )}
              </TabPane>

              {/* 数据洞察 */}
              <TabPane tab={<span><RadarChartOutlined />数据洞察</span>} key="3">
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
                      <Card title="关系分类">
                        {batchAnalysis.categories?.summary && Object.entries(batchAnalysis.categories.summary).map(([type, count]) => (
                          <div key={type} style={{ marginBottom: 12 }}>
                            <span style={{ width: 60, display: 'inline-block' }}>{type}：</span>
                            <Progress 
                              percent={Math.round(count / batchAnalysis.total_analyzed * 100)}
                              strokeColor={
                                type === '密友圈' ? '#52c41a' :
                                type === '社交圈' ? '#1890ff' :
                                type === '工作圈' ? '#faad14' : '#d9d9d9'
                              }
                              format={() => `${count}人`}
                            />
                          </div>
                        ))}
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </TabPane>

              {/* 时间分析 */}
              <TabPane tab={<span><FireOutlined />时间分析</span>} key="4">
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
                      <Card title="社交习惯分析">
                        <Statistic 
                          title="最活跃时间" 
                          value={`${timeAnalysis.peak_hour || 0}:00`}
                          prefix={<FireOutlined />}
                        />
                        <Statistic 
                          title="最活跃星期" 
                          value={timeAnalysis.peak_weekday || '未知'}
                          style={{ marginTop: 16 }}
                        />
                        <Statistic 
                          title="夜猫子指数" 
                          value={timeAnalysis.night_owl_score || 0}
                          suffix="%"
                          style={{ marginTop: 16 }}
                        />
                        <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                          * 夜猫子指数：0-6点消息占比
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

              {/* 关系排行榜 */}
              <TabPane tab={<span><LineChartOutlined />关系排行榜</span>} key="5">
                <Card title={`关系排行榜 (分析了 ${batchAnalysis.total_analyzed || 0} / ${batchAnalysis.total_contacts || 0} 位好友)`}>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Statistic 
                        title="平均分数" 
                        value={batchAnalysis.statistics?.average_score || 0} 
                        precision={2} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="中位数" 
                        value={batchAnalysis.statistics?.median_score || 0} 
                        precision={2} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="分析成功" 
                        value={batchAnalysis.total_analyzed || 0} 
                        suffix={`/ ${batchAnalysis.total_contacts || 0}`} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="分析失败" 
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
                        title: '排名',
                        key: 'rank',
                        render: (_, __, index) => index + 1,
                        width: 80,
                        fixed: 'left'
                      },
                      {
                        title: '好友',
                        dataIndex: 'display_name',
                        key: 'display_name',
                        ellipsis: true,
                        render: (text) => text || '未知'
                      },
                      {
                        title: '关系评分',
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
                        title: '状态',
                        dataIndex: 'relationship_status',
                        key: 'relationship_status',
                        render: (status) => (
                          <Tag color={getStatusColor(status)}>
                            {status || '未知'}
                          </Tag>
                        )
                      },
                      {
                        title: '消息数',
                        dataIndex: 'message_count',
                        key: 'message_count',
                        sorter: (a, b) => a.message_count - b.message_count,
                        render: (count) => count || 0
                      },
                      {
                        title: '聊天天数',
                        dataIndex: 'days',
                        key: 'days',
                        sorter: (a, b) => (a.days || 0) - (b.days || 0),
                        render: (days) => days ? `${days}天` : '-'
                      },
                      {
                        title: '最后联系',
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
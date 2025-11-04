// frontend/src/i18n.js
// 简易 i18n：不改业务逻辑，仅在“展示层”做英文替换；默认英文演示模式。
// 如需切回中文，把 LANG 改为 'zh' 即可。

export let LANG = 'en'; // 'en' | 'zh'
export const setLang = (lang) => { LANG = lang; };

// —— 通用翻译函数：直接把中文短语替换为英文 ——
// 说明：为了“最小修改”，你可以在 App.js 中将可见中文用 ts('中文') 包起来。
// 对于 ECharts，我们会用 translateOption 自动替换（见 EChartT.js）。

export const dict = {
  // 顶栏与控件
  'RScore - 微信关系评分系统': 'RScore – WeChat Relationship Scoring',
  '选择或搜索联系人': 'Select or search a contact',
  '计算评分': 'Calculate Score',
  '批量分析': 'Batch Analysis',
  '导出报告': 'Export Report',
  '正在分析数据...': 'Analyzing…',
  '获取联系人列表失败': 'Failed to load contacts',
  '批量分析失败': 'Batch analysis failed',
  '评分计算完成！': 'Score calculated!',
  '综合分析完成！(分析了全部好友)': 'Combined analysis complete! (Analyzed all contacts)',
  '导出失败': 'Export failed',
  '报告导出成功！': 'Report exported!',
  '请先选择联系人': 'Please select a contact first',

  // 统计卡片
  '关系总分': 'Total Score',
  '关系状态': 'Relationship Status',
  '消息总数': 'Messages',
  '最后联系': 'Last Contact',
  '新鲜度': 'Freshness',

  // 评分等级（仅展示层）
  '亲密': 'Close',
  '良好': 'Good',
  '一般': 'Fair',
  '疏远': 'Distant',

  // 关系状态（仅展示层）
  '活跃': 'Active',
  '冷却中': 'Cooling',
  '休眠': 'Dormant',
  '失联': 'Lost contact',

  // Tabs
  '维度分析': 'Dimension Analysis',
  '互动分析': 'Interaction Analysis',
  '社交健康度': 'Social Health',
  '关系网络': 'Relationship Network',
  '数据洞察': 'Insights',
  '时间分析': 'Time Analysis',
  '关系排行榜': 'Leaderboard',

  // 图表标题/图例/轴名称/提示
  '维度评分雷达图': 'Dimension Radar',
  '关系强度变化趋势': 'Relationship Strength Trend',
  '社交活跃时间热力图': 'Active Hours Heatmap',
  '月度消息趋势分析': 'Monthly Message Trend',
  '年度社交活跃度对比': 'Yearly Activity',
  '好友分数分布': 'Score Distribution',
  '社交偏好分析': 'Social Preference Analysis',
  '平均水平': 'Average',
  '关系维度分析': 'Relationship Dimensions',
  '消息数': 'Messages',
  '环比增长': 'MoM Growth',
  '环比增长率': 'MoM Growth (%)',
  '月': 'Mon', // 用不到时无妨
  '最高点': 'Max',
  '最低点': 'Min',
  '平均值': 'Average',
  '关系网络图': 'Relationship Network',
  '提示': 'Tip',
  '节点大小表示消息量，距离表示关系亲密度，颜色表示关系类型。可以拖拽节点调整位置。':
    'Node size ~ message volume; distance ~ tie strength; color ~ relation type. You can drag nodes to reposition.',
  '关系分类': 'Relationship Categories',
  '密友圈': 'Intimiate',
  '社交圈': 'Familiar',
  '工作圈': 'Known',
  '泛社交': 'Unaware',

  // 详细评分模块
  '详细评分': 'Detailed Scores',
  '互动频率': 'Frequency',
  '内容质量': 'Content',
  '情感表达': 'Emotion',
  '深度交流': 'Depth',

  // 互动分析模块
  '对话发起者（谁更主动）': 'Conversation Initiator (Who starts more)',
  '单向 / 双向交流比例': 'One-way vs Two-way Conversations',
  '单向/双向交流比例': 'One-way vs Two-way Conversations',
  '回复延迟分布': 'Reply Delay Distribution',
  '对话长度分布（每会话消息数）': 'Conversation Length Distribution (messages per session)',
  '中位数': 'Median',
  '秒': 'sec',
  '聊天下降提示': 'Declining trend in conversations',

  // 健康面板
  '综合健康度': 'Overall Health',
  '综合评分': 'Overall Score',
  '健康指标详情': 'Indicators',
  '关系多样性': 'Relationship Diversity',
  '社交平衡度': 'Balance',
  '关系维护指数': 'Maintenance',
  '情感表达指数': 'Emotional Expression',
  '健康建议': 'Suggestions',
  '社交习惯分析': 'Social Habits',
  '最活跃时间': 'Most Active Time',
  '最活跃星期': 'Most Active Day',
  '夜猫子指数': 'Night-Owl Index',
  '未知': 'Unknown',
  '人': 'people',
  '天': 'days',

  // 排行版与表格列
  '关系排行榜': 'Relationship Leaderboard',
  '平均分数': 'Average',
  '中位数': 'Median',
  '分析成功': 'Analyzed',
  '分析失败': 'Failed',
  '位好友': 'contacts',
  '排名': 'Rank',
  '好友': 'Contact',
  '关系评分': 'Score',
  '状态': 'Status',
  '聊天天数': 'Chat Days',

  // 时间轴
  '6月前': '6 mo ago',
  '5月前': '5 mo ago',
  '4月前': '4 mo ago',
  '3月前': '3 mo ago',
  '2月前': '2 mo ago',
  '1月前': '1 mo ago',
  '现在': 'Now',

  // 一周中文
  '周一': 'Mon',
  '周二': 'Tue',
  '周三': 'Wed',
  '周四': 'Thu',
  '周五': 'Fri',
  '周六': 'Sat',
  '周日': 'Sun',

  // 成就（展示名）
  '深夜守护者': 'Night Watcher',
  '情感大师': 'Emotion Maestro',
  '长情守护': 'Steady Keeper',
  '早起打卡': 'Early Bird',
  '极速响应': 'Quick Responder',
  '深度对话者': 'Deep Conversationalist',
  '连年常青': 'YoY Riser',
  '媒体混搭手': 'Media Mixer',
};

export const ts = (zh) => {
  if (LANG === 'zh') return zh;
  return dict[zh] || zh; // 找不到就原样返回
};

// —— 状态/等级 映射（展示层）——
const STATUS_MAP_EN = {
  '活跃': 'Active',
  '冷却中': 'Cooling',
  '休眠': 'Dormant',
  '失联': 'Lost contact',
};
export const mapStatus = (status) => (LANG === 'en' ? (STATUS_MAP_EN[status] || status) : status);

const LEVEL_MAP_EN = {
  '亲密': 'Close',
  '良好': 'Good',
  '一般': 'Fair',
  '疏远': 'Distant',
};
export const mapLevel = (level) => (LANG === 'en' ? (LEVEL_MAP_EN[level] || level) : level);

// —— 周几英文 —— 
export const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// —— 针对 ECharts 的 option 翻译器：深度遍历，替换字符串 ——
// 只替换“完全匹配”的中文短语，保证安全；未知文本不改动。
export const translateOption = (option) => {
  if (LANG === 'zh' || !option) return option;

  const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]';

  const walker = (node) => {
    if (typeof node === 'string') {
      return dict[node] || node;
    }
    if (Array.isArray(node)) {
      return node.map(walker);
    }
    if (isPlainObject(node)) {
      const out = {};
      for (const k of Object.keys(node)) {
        out[k] = walker(node[k]);
      }
      return out;
    }
    return node;
  };

  return walker(option);
};

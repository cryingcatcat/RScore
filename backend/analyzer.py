import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
import jieba
import re
import math
from collections import Counter
from config import Config

# 尝试导入lz4
try:
    import lz4.block as lb

    HAS_LZ4 = True
    print("✓ LZ4已安装，支持解压缩消息")
except ImportError:
    HAS_LZ4 = False
    print("⚠ LZ4未安装，部分压缩消息可能无法完整解析")


class RelationAnalyzer:
    def __init__(self):
        self.config = Config()

    def _safe_value(self, value):
        """确保值不是NaN或无穷大"""
        if pd.isna(value) or np.isnan(value) or np.isinf(value):
            return 0.0
        return float(value)

    def _logarithmic_scale(self, value, target, steepness=1.0):
        """
        对数缩放函数，使得分数增长更合理
        value: 实际值
        target: 目标值（达到此值时得分约0.63）
        steepness: 陡峭度，越大增长越快
        """
        if value <= 0:
            return 0.0
        return 1.0 - math.exp(-steepness * value / target)

    def _sqrt_scale(self, value, target):
        """平方根缩放，适合总量指标"""
        if value <= 0:
            return 0.0
        return min(math.sqrt(value / target), 1.0)

    def _calculate_relationship_freshness(self, last_chat_date):
        """
        计算关系新鲜度（基于最后联系时间）
        返回0-1的系数，用于调整最终得分
        """
        if not last_chat_date:
            return 0.3

        try:
            if isinstance(last_chat_date, str):
                last_chat = datetime.strptime(last_chat_date, '%Y-%m-%d')
            else:
                last_chat = last_chat_date

            days_since_last_chat = (datetime.now() - last_chat).days

            if days_since_last_chat <= 30:
                return 1.0  # 30天内：100%
            elif days_since_last_chat <= 90:
                return 0.95  # 30-90天：95%
            elif days_since_last_chat <= 180:
                return 0.85  # 90-180天：85%
            elif days_since_last_chat <= 365:
                return 0.70  # 180-365天：70%
            elif days_since_last_chat <= 730:
                return 0.50  # 1-2年：50%
            else:
                return 0.30  # 2年以上：30%
        except:
            return 0.5

    def _get_relationship_status(self, freshness):
        """根据新鲜度获取关系状态"""
        if freshness >= 0.95:
            return "活跃"
        elif freshness >= 0.7:
            return "冷却中"
        elif freshness >= 0.5:
            return "休眠"
        else:
            return "失联"

    def calculate_rscore(self, messages_df: pd.DataFrame) -> Dict:
        """计算关系评分 - 包含新鲜度调整"""
        if messages_df.empty:
            return self._empty_result()

        try:
            # 预处理数据
            messages_df = self._preprocess_messages(messages_df)

            if messages_df.empty:
                return self._empty_result()

            # 计算基础统计
            stats = self._calculate_statistics(messages_df)

            # 计算关系成熟度（0-1），用于调节最终得分
            maturity = self._calculate_maturity(messages_df, stats)

            # 计算各维度得分（新算法）
            interaction_score = self._calculate_interaction_score_v2(messages_df, stats, maturity)
            content_score = self._calculate_content_score_v2(messages_df, stats)
            emotion_score = self._calculate_emotion_score_v2(messages_df, stats)
            depth_score = self._calculate_depth_score_v2(messages_df, stats)

            # 新的权重分配
            weights = {
                'interaction': 0.35,
                'content': 0.25,
                'emotion': 0.20,
                'depth': 0.20
            }

            # 计算加权总分
            weighted_score = (
                    interaction_score['total'] * weights['interaction'] +
                    content_score['total'] * weights['content'] +
                    emotion_score['total'] * weights['emotion'] +
                    depth_score['total'] * weights['depth']
            )

            # 计算关系新鲜度
            freshness = self._calculate_relationship_freshness(stats.get('last_chat_date'))
            relationship_status = self._get_relationship_status(freshness)

            # 应用新鲜度调整（影响30%的分数）
            adjusted_score = weighted_score * 0.7 + weighted_score * freshness * 0.3

            # 应用成熟度调整（新关系有上限）
            if stats['total_days'] < 7:
                max_score = 0.8
            elif stats['total_days'] < 30:
                max_score = 0.9
            else:
                max_score = 1.0

            final_score = min(adjusted_score, max_score)

            # 应用最终的分数映射（让分数分布更均匀）
            final_score = self._score_mapping(final_score)

            # 提取里程碑
            milestones = self._extract_milestones(messages_df)

            return {
                "total_score": round(final_score, 2),
                "dimensions": {
                    "interaction": round(interaction_score['total'] * 10, 2),
                    "content": round(content_score['total'] * 10, 2),
                    "emotion": round(emotion_score['total'] * 10, 2),
                    "depth": round(depth_score['total'] * 10, 2)
                },
                "details": {
                    "interaction": interaction_score['details'],
                    "content": content_score['details'],
                    "emotion": emotion_score['details'],
                    "depth": depth_score['details'],
                    "maturity": {
                        "score": round(maturity, 2),
                        "days": stats['total_days'],
                        "messages": stats['total_messages']
                    }
                },
                "milestones": milestones,
                "statistics": stats,
                "relationship_status": relationship_status,
                "freshness": round(freshness, 2)
            }
        except Exception as e:
            print(f"计算评分时出错: {e}")
            return self._empty_result()

    def _calculate_maturity(self, df: pd.DataFrame, stats: Dict) -> float:
        """计算关系成熟度（0-1）"""
        days = stats['total_days']
        messages = stats['total_messages']

        # 时间维度：180天（6个月）达到成熟
        time_maturity = self._logarithmic_scale(days, 180, 1.5)

        # 消息维度：5000条消息表示充分交流
        msg_maturity = self._logarithmic_scale(messages, 5000, 1.0)

        # 综合成熟度（时间更重要）
        maturity = time_maturity * 0.6 + msg_maturity * 0.4

        return min(maturity, 1.0)

    def _calculate_interaction_score_v2(self, df: pd.DataFrame, stats: Dict, maturity: float) -> Dict:
        """计算互动维度得分 - 新版本"""
        details = {}

        try:
            # 1. 消息频率（考虑总量和日均）
            daily_avg = stats['total_messages'] / max(stats['total_days'], 1)
            total_messages = stats['total_messages']

            # 日均消息评分（10条/天良好，30条/天优秀）
            daily_score = self._logarithmic_scale(daily_avg, 15, 1.2)

            # 总消息量评分（使用平方根缩放，5000条接近满分）
            volume_score = self._sqrt_scale(total_messages, 5000)

            # 综合频率分（日均和总量都重要）
            frequency_score = daily_score * 0.4 + volume_score * 0.6

            details['daily_messages'] = round(daily_avg, 2)
            details['total_messages'] = total_messages

            # 2. 持续性（活跃天数比例 + 连续性）
            active_days = df.groupby(df['CreateTime'].dt.date).size().shape[0]
            active_ratio = active_days / max(stats['total_days'], 1)

            # 计算最长连续天数
            dates = sorted(df['CreateTime'].dt.date.unique())
            max_streak = 1
            current_streak = 1

            for i in range(1, len(dates)):
                if (dates[i] - dates[i - 1]).days <= 2:
                    current_streak += 1
                    max_streak = max(max_streak, current_streak)
                else:
                    current_streak = 1

            # 持续性评分
            continuity_score = active_ratio * 0.5 + min(max_streak / 30, 1.0) * 0.5

            details['active_days'] = active_days
            details['active_ratio'] = round(active_ratio, 3)
            details['max_streak'] = max_streak

            # 3. 响应活跃度（回复速度和双向性）
            sent_messages = len(df[df['IsSender'] == 1])
            received_messages = len(df[df['IsSender'] == 0])

            # 双向平衡度（越接近1:1越好）
            if sent_messages > 0 and received_messages > 0:
                balance = min(sent_messages, received_messages) / max(sent_messages, received_messages)
            else:
                balance = 0

            # 计算平均响应时间
            response_times = []
            for i in range(1, min(len(df), 500)):
                if df.iloc[i]['IsSender'] != df.iloc[i - 1]['IsSender']:
                    time_diff = (df.iloc[i]['CreateTime'] - df.iloc[i - 1]['CreateTime']).seconds
                    if 0 < time_diff < 3600:
                        response_times.append(time_diff)

            if response_times:
                avg_response = np.median(response_times)
                response_score = self._logarithmic_scale(300 / max(avg_response, 60), 1, 2)
            else:
                response_score = 0.5
                avg_response = 1800

            details['balance'] = round(balance, 3)
            details['avg_response_minutes'] = round(avg_response / 60, 2)

            # 4. 综合互动得分
            total = (
                    frequency_score * 0.40 +
                    continuity_score * 0.35 +
                    balance * 0.15 +
                    response_score * 0.10
            )

            # 应用成熟度增益（成熟关系有加分）
            total = total * (0.8 + 0.2 * maturity)

            return {'total': min(total, 1.0), 'details': details}

        except Exception as e:
            print(f"计算互动分数时出错: {e}")
            return {'total': 0.0, 'details': details}

    def _calculate_content_score_v2(self, df: pd.DataFrame, stats: Dict) -> Dict:
        """计算内容维度得分 - 新版本"""
        details = {}

        try:
            text_messages = df[df['Type'] == 1]['Content'].dropna()

            if text_messages.empty:
                return {'total': 0.0, 'details': details}

            # 1. 消息深度（长度分布）
            lengths = text_messages.str.len()
            avg_length = lengths.mean()

            # 计算有深度的消息比例（超过20字）
            meaningful_msgs = (lengths > 20).sum()
            meaningful_ratio = meaningful_msgs / len(lengths)

            # 深度得分（平均30字良好，有30%深度消息优秀）
            depth_score = (
                    self._logarithmic_scale(avg_length, 30, 1.5) * 0.5 +
                    self._logarithmic_scale(meaningful_ratio, 0.3, 2.0) * 0.5
            )

            details['avg_message_length'] = round(avg_length, 2)
            details['meaningful_ratio'] = round(meaningful_ratio, 3)

            # 2. 话题丰富度
            all_text = ' '.join(text_messages.astype(str))[:200000]
            words = jieba.lcut(all_text)

            # 过滤停用词和高频词
            word_freq = Counter(w for w in words if len(w) > 1)
            unique_topics = len([w for w, c in word_freq.items() if c >= 3])

            # 话题得分（200个话题良好，500个优秀）
            topic_score = self._logarithmic_scale(unique_topics, 300, 1.0)

            details['unique_topics'] = unique_topics

            # 3. 时间分布（全天候交流）
            df['Hour'] = df['CreateTime'].dt.hour
            hour_distribution = df['Hour'].value_counts()
            active_hours = len(hour_distribution[hour_distribution >= 5])

            # 深夜交流（显示亲密）
            late_night = df[(df['Hour'] >= 0) & (df['Hour'] <= 6)]
            late_night_ratio = len(late_night) / len(df)

            # 时间分布得分
            time_score = (
                    min(active_hours / 12, 1.0) * 0.7 +
                    min(late_night_ratio * 10, 1.0) * 0.3
            )

            details['active_hours'] = active_hours
            details['late_night_ratio'] = round(late_night_ratio, 3)

            # 综合内容得分
            total = (
                    depth_score * 0.40 +
                    topic_score * 0.35 +
                    time_score * 0.25
            )

            return {'total': min(total, 1.0), 'details': details}

        except Exception as e:
            print(f"计算内容分数时出错: {e}")
            return {'total': 0.0, 'details': details}

    def _calculate_emotion_score_v2(self, df: pd.DataFrame, stats: Dict) -> Dict:
        """计算情感维度得分 - 新版本"""
        details = {}

        try:
            text_messages = df[df['Type'] == 1]['Content'].fillna('')

            if text_messages.empty:
                return {'total': 0.5, 'details': details}

            # 1. 表情使用（emoji + 表情包）
            emoji_pattern = re.compile(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U00002700-\U000027BF]')

            emoji_messages = 0
            total_emojis = 0

            for msg in text_messages[:1000]:
                emojis = emoji_pattern.findall(str(msg))
                if emojis:
                    emoji_messages += 1
                    total_emojis += len(emojis)

            emoji_usage_ratio = emoji_messages / min(len(text_messages), 1000)
            emoji_density = total_emojis / min(len(text_messages), 1000)

            # 表情得分（30%消息含表情良好，每条0.5个表情优秀）
            emoji_score = (
                    self._logarithmic_scale(emoji_usage_ratio, 0.3, 2.0) * 0.5 +
                    self._logarithmic_scale(emoji_density, 0.5, 2.0) * 0.5
            )

            details['emoji_usage_ratio'] = round(emoji_usage_ratio, 3)
            details['emoji_density'] = round(emoji_density, 3)

            # 2. 情感词汇
            positive_words = set(['哈哈', '嘿嘿', '哈哈哈', '好', '棒', '赞', '开心', '快乐',
                                  '爱', '喜欢', '谢谢', '感谢', '么么', '亲', '抱抱', '❤'])
            negative_words = set(['唉', '难过', '烦', '生气', '讨厌', '糟糕', '失望', '难受'])

            sample_text = ' '.join(text_messages.astype(str)[:500])

            positive_count = sum(1 for word in positive_words if word in sample_text)
            negative_count = sum(1 for word in negative_words if word in sample_text)

            # 情感积极度
            if positive_count + negative_count > 0:
                positivity = positive_count / (positive_count + negative_count)
            else:
                positivity = 0.5

            # 情感丰富度
            emotion_richness = min((positive_count + negative_count) / 20, 1.0)

            emotion_word_score = positivity * 0.6 + emotion_richness * 0.4

            details['positivity'] = round(positivity, 3)
            details['emotion_richness'] = round(emotion_richness, 3)

            # 3. 多媒体分享（图片、语音、视频）
            media_types = {
                3: 'image',
                34: 'voice',
                43: 'video',
                47: 'emoji'
            }

            media_msgs = df[df['Type'].isin(media_types.keys())]
            media_ratio = len(media_msgs) / len(df)

            # 语音消息特别加分（显示亲密）
            voice_msgs = len(df[df['Type'] == 34])
            voice_ratio = voice_msgs / len(df)

            # 多媒体得分（15%多媒体良好）
            media_score = (
                    self._logarithmic_scale(media_ratio, 0.15, 2.0) * 0.7 +
                    self._logarithmic_scale(voice_ratio, 0.05, 3.0) * 0.3
            )

            details['media_ratio'] = round(media_ratio, 3)
            details['voice_ratio'] = round(voice_ratio, 3)

            # 综合情感得分
            total = (
                    emoji_score * 0.35 +
                    emotion_word_score * 0.35 +
                    media_score * 0.30
            )

            return {'total': min(total, 1.0), 'details': details}

        except Exception as e:
            print(f"计算情感分数时出错: {e}")
            return {'total': 0.5, 'details': details}

    def _calculate_depth_score_v2(self, df: pd.DataFrame, stats: Dict) -> Dict:
        """计算深度维度得分 - 新版本"""
        details = {}

        try:
            # 1. 分享行为（链接、文件、位置等）
            share_types = [49]
            share_count = len(df[df['Type'].isin(share_types)])
            share_ratio = share_count / len(df)

            # 分享得分（5%分享良好）
            share_score = self._logarithmic_scale(share_ratio, 0.05, 2.0)

            details['share_count'] = share_count
            details['share_ratio'] = round(share_ratio, 3)

            # 2. 对话深度（长消息、引用回复）
            text_messages = df[df['Type'] == 1]['Content'].dropna()

            if not text_messages.empty:
                # 长消息（超过50字）
                long_messages = sum(1 for msg in text_messages if len(str(msg)) > 50)
                long_msg_ratio = long_messages / len(text_messages)

                # 计算对话连续性（连续多条消息）
                conversation_chains = 0
                last_sender = None
                chain_length = 0

                for sender in df['IsSender'].values[:1000]:
                    if sender == last_sender:
                        chain_length += 1
                        if chain_length >= 3:
                            conversation_chains += 1
                    else:
                        chain_length = 1
                        last_sender = sender

                chain_ratio = conversation_chains / min(len(df), 1000)

                depth_dialogue_score = (
                        self._logarithmic_scale(long_msg_ratio, 0.1, 2.0) * 0.5 +
                        self._logarithmic_scale(chain_ratio, 0.05, 2.0) * 0.5
                )
            else:
                long_msg_ratio = 0
                chain_ratio = 0
                depth_dialogue_score = 0

            details['long_msg_ratio'] = round(long_msg_ratio, 3)
            details['conversation_chains'] = conversation_chains

            # 3. 特殊时刻交流（节日、深夜）
            dates = df['CreateTime'].dt.date.value_counts()

            # 超高频日期（特殊事件）
            special_days = len(dates[dates > stats['total_messages'] / stats['total_days'] * 3])
            special_day_score = min(special_days / 10, 1.0)

            details['special_days'] = special_days

            # 综合深度得分
            total = (
                    share_score * 0.30 +
                    depth_dialogue_score * 0.50 +
                    special_day_score * 0.20
            )

            return {'total': min(total, 1.0), 'details': details}

        except Exception as e:
            print(f"计算深度分数时出错: {e}")
            return {'total': 0.0, 'details': details}

    def _score_mapping(self, raw_score):
        """
        将原始分数（0-1）映射到最终分数（0-10）
        使用S型曲线让分数分布更均匀
        """
        if raw_score < 0.1:
            return raw_score * 20  # 0-2分
        elif raw_score < 0.3:
            return 2 + (raw_score - 0.1) * 15  # 2-5分
        elif raw_score < 0.7:
            return 5 + (raw_score - 0.3) * 7.5  # 5-8分
        else:
            return 8 + (raw_score - 0.7) * 6.67  # 8-10分

    def _empty_result(self):
        """返回空结果"""
        return {
            "total_score": 0.0,
            "dimensions": {
                "interaction": 0.0,
                "content": 0.0,
                "emotion": 0.0,
                "depth": 0.0
            },
            "details": {},
            "milestones": [],
            "statistics": {
                'total_messages': 0,
                'total_days': 0,
                'sent_messages': 0,
                'received_messages': 0,
                'first_chat_date': '',
                'last_chat_date': ''
            },
            "relationship_status": "未知",
            "freshness": 0.0
        }

    def _preprocess_messages(self, df: pd.DataFrame) -> pd.DataFrame:
        """预处理消息数据"""
        try:
            # 转换时间戳
            df['CreateTime'] = pd.to_datetime(df['CreateTime'], unit='s', errors='coerce')

            # 移除无效时间戳的行
            df = df.dropna(subset=['CreateTime'])

            # 解析压缩内容
            def decompress_content(row):
                try:
                    if row['Type'] == 49 and row.get('SubType') == 57 and pd.notna(row.get('CompressContent')):
                        if HAS_LZ4:
                            try:
                                unzipped = lb.decompress(row['CompressContent'], uncompressed_size=0x10004)
                                return unzipped.decode('utf-8', errors='ignore')
                            except:
                                pass
                        return row.get('StrContent', '')
                    return row.get('StrContent', '')
                except:
                    return row.get('StrContent', '')

            df['Content'] = df.apply(decompress_content, axis=1)

            # 过滤系统消息，保留主要消息类型
            df = df[df['Type'].isin([1, 3, 34, 43, 47, 49])]

            return df
        except Exception as e:
            print(f"预处理消息时出错: {e}")
            return pd.DataFrame()

    def _extract_milestones(self, df: pd.DataFrame) -> List[Dict]:
        """提取关系里程碑"""
        milestones = []

        if df.empty:
            return milestones

        try:
            # 1. 首次对话
            first_msg = df.iloc[0]
            milestones.append({
                'type': 'first_chat',
                'date': first_msg['CreateTime'].strftime('%Y-%m-%d'),
                'description': '你们的第一次对话',
                'content': str(first_msg.get('Content', ''))[:50] + '...' if first_msg.get('Content') else ''
            })

            # 2. 聊天最频繁的一天
            daily_counts = df.groupby(df['CreateTime'].dt.date).size()
            if not daily_counts.empty:
                busiest_day = daily_counts.idxmax()
                milestones.append({
                    'type': 'busiest_day',
                    'date': busiest_day.strftime('%Y-%m-%d'),
                    'description': f'聊天最活跃的一天',
                    'content': f'共交换了 {daily_counts.max()} 条消息'
                })

            # 3. 最长连续对话
            dates = sorted(df['CreateTime'].dt.date.unique())
            max_streak = 1
            current_streak = 1
            streak_start = dates[0] if dates else None

            for i in range(1, len(dates)):
                if (dates[i] - dates[i - 1]).days <= 1:
                    current_streak += 1
                    if current_streak > max_streak:
                        max_streak = current_streak
                        streak_end = dates[i]
                        streak_start = dates[i - current_streak + 1]
                else:
                    current_streak = 1

            if max_streak >= 7 and streak_start:
                milestones.append({
                    'type': 'streak',
                    'date': streak_start.strftime('%Y-%m-%d'),
                    'description': f'最长连续聊天',
                    'content': f'连续 {max_streak} 天保持联系'
                })

            # 4. 深夜畅谈
            late_night = df[(df['CreateTime'].dt.hour >= 1) & (df['CreateTime'].dt.hour <= 5)]
            if len(late_night) > 20:
                milestones.append({
                    'type': 'late_night',
                    'date': '',
                    'description': '深夜畅谈者',
                    'content': f'你们有 {len(late_night)} 条深夜消息（凌晨1-5点）'
                })

            # 5. 里程碑消息数
            message_milestones = [100, 500, 1000, 5000, 10000, 50000]
            total_msgs = len(df)
            for milestone in message_milestones:
                if total_msgs >= milestone:
                    last_milestone = milestone

            if 'last_milestone' in locals():
                milestones.append({
                    'type': 'message_count',
                    'date': '',
                    'description': f'消息里程碑',
                    'content': f'突破 {last_milestone} 条消息'
                })

            return milestones[:6]

        except Exception as e:
            print(f"提取里程碑时出错: {e}")
            return []

    def _calculate_statistics(self, df: pd.DataFrame) -> Dict:
        """计算统计数据"""
        if df.empty:
            return {
                'total_messages': 0,
                'total_days': 0,
                'sent_messages': 0,
                'received_messages': 0,
                'first_chat_date': '',
                'last_chat_date': ''
            }

        try:
            return {
                'total_messages': int(len(df)),
                'total_days': int((df['CreateTime'].max() - df['CreateTime'].min()).days + 1),
                'sent_messages': int(len(df[df['IsSender'] == 1])),
                'received_messages': int(len(df[df['IsSender'] == 0])),
                'first_chat_date': df['CreateTime'].min().strftime('%Y-%m-%d'),
                'last_chat_date': df['CreateTime'].max().strftime('%Y-%m-%d')
            }
        except Exception as e:
            print(f"计算统计数据时出错: {e}")
            return {
                'total_messages': int(len(df)),
                'total_days': 0,
                'sent_messages': 0,
                'received_messages': 0,
                'first_chat_date': '',
                'last_chat_date': ''
            }
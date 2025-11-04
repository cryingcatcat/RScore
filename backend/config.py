import os
from pathlib import Path


class Config:
    # 项目根目录
    BASE_DIR = Path(__file__).parent.parent

    # 微信数据路径 - User是大写
    WECHAT_DATA_DIR = BASE_DIR / "User" / "wxid_81gpp9tkpgib12"
    MSG_DIR = WECHAT_DATA_DIR / "Msg"
    MULTI_DIR = MSG_DIR / "Multi"  # MSG数据库在Multi子文件夹
    FILE_STORAGE_DIR = WECHAT_DATA_DIR / "FileStorage"

    # 数据库文件路径
    MSG_DB_FILES = []  # 将在运行时动态检测
    MICRO_MSG_DB = MSG_DIR / "MicroMsg.db"  # 联系人数据库在Msg目录
    MEDIA_MSG_DB = MSG_DIR / "MediaMsg.db"  # 媒体数据库在Msg目录

    @classmethod
    def get_msg_databases(cls):
        """动态获取所有MSG数据库文件"""
        msg_files = []
        if cls.MULTI_DIR.exists():
            # 查找所有MSG*.db文件，但排除FTS开头的
            for file in cls.MULTI_DIR.glob("MSG*.db"):
                if not file.name.startswith("FTS"):
                    msg_files.append(file)
        return sorted(msg_files)  # 按名称排序确保MSG0在MSG1前面

    # 评分权重配置
    WEIGHTS = {
        "interaction": {
            "frequency": 0.15,
            "continuity": 0.15,
            "response_speed": 0.10
        },
        "content": {
            "message_length": 0.10,
            "topic_diversity": 0.10,
            "late_night": 0.10
        },
        "emotion": {
            "emoji_rate": 0.08,
            "positive_ratio": 0.07,
            "multimedia": 0.05
        },
        "depth": {
            "shared_content": 0.05,
            "quote_reply": 0.05
        }
    }

    # 时间衰减因子
    TIME_DECAY = {
        90: 1.0,  # 最近3个月
        180: 0.8,  # 3-6个月
        365: 0.6,  # 6-12个月
        float('inf'): 0.4  # 超过一年
    }

    # API配置
    API_HOST = "0.0.0.0"
    API_PORT = 8000

    # 缓存配置
    CACHE_EXPIRE = 3600  # 1小时
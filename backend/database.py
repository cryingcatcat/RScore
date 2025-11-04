import sqlite3
from typing import List, Dict, Any
from pathlib import Path
import pandas as pd
from config import Config


class WeChatDB:
    def __init__(self):
        self.config = Config()
        self.connections = {}
        self._connect_databases()

    def _connect_databases(self):
        """连接所有数据库文件"""
        # 获取所有MSG数据库
        msg_databases = self.config.get_msg_databases()

        print(f"找到 {len(msg_databases)} 个MSG数据库文件")

        # 连接每个MSG数据库
        for db_path in msg_databases:
            try:
                conn = sqlite3.connect(str(db_path), check_same_thread=False)
                self.connections[db_path.name] = conn
                print(f"成功连接: {db_path.name}")

                # 验证是否能读取数据
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM MSG")
                count = cursor.fetchone()[0]
                print(f"  - {db_path.name} 包含 {count} 条消息")

            except Exception as e:
                print(f"连接 {db_path.name} 失败: {e}")

        # 连接联系人数据库
        if self.config.MICRO_MSG_DB.exists():
            try:
                self.connections['MicroMsg'] = sqlite3.connect(
                    str(self.config.MICRO_MSG_DB),
                    check_same_thread=False
                )
                print(f"成功连接联系人数据库: MicroMsg.db")
            except Exception as e:
                print(f"连接MicroMsg.db失败: {e}")

        # 连接媒体数据库
        if self.config.MEDIA_MSG_DB.exists():
            try:
                self.connections['MediaMsg'] = sqlite3.connect(
                    str(self.config.MEDIA_MSG_DB),
                    check_same_thread=False
                )
                print(f"成功连接媒体数据库: MediaMsg.db")
            except Exception as e:
                print(f"连接MediaMsg.db失败: {e}")

    def test_connection(self):
        """测试数据库连接和数据可读性"""
        print("\n=== 数据库连接测试 ===")

        for db_name, conn in self.connections.items():
            print(f"\n测试 {db_name}:")
            try:
                cursor = conn.cursor()

                # 获取所有表
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                print(f"  表数量: {len(tables)}")

                # 如果是MSG数据库，尝试读取一些消息
                if db_name.startswith('MSG'):
                    cursor.execute("""
                        SELECT StrContent, Type, IsSender 
                        FROM MSG 
                        WHERE StrContent IS NOT NULL 
                        LIMIT 3
                    """)
                    samples = cursor.fetchall()

                    if samples:
                        print(f"  示例消息:")
                        for content, msg_type, is_sender in samples:
                            sender = "我" if is_sender else "对方"
                            # 只显示前30个字符
                            display_content = content[:30] if content else "[无内容]"
                            print(f"    [{sender}] {display_content}...")
                    else:
                        print(f"  未找到文本消息")

                # 如果是联系人数据库
                elif db_name == 'MicroMsg':
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM Contact 
                        WHERE Type = 3
                    """)
                    contact_count = cursor.fetchone()[0]
                    print(f"  好友数量: {contact_count}")

            except Exception as e:
                print(f"  错误: {e}")

        print("\n=== 测试完成 ===\n")

        return len(self.connections) > 0

    def get_contacts(self) -> List[Dict]:
        """获取所有联系人列表"""
        if 'MicroMsg' not in self.connections:
            print("警告: 未找到联系人数据库")
            return []

        query = """
        SELECT UserName, NickName, Remark, PYInitial, RemarkPYInitial 
        FROM Contact 
        WHERE Type = 3 OR (Type > 50 AND Type != 2049)
        ORDER BY NickName
        """

        cursor = self.connections['MicroMsg'].cursor()
        cursor.execute(query)
        columns = [desc[0] for desc in cursor.description]

        contacts = []
        for row in cursor.fetchall():
            contact = dict(zip(columns, row))
            # 使用备注名优先，否则使用昵称
            contact['DisplayName'] = contact['Remark'] or contact['NickName'] or contact['UserName']
            contacts.append(contact)

        print(f"获取到 {len(contacts)} 个联系人")
        return contacts

    def get_chat_messages(self, talker_id: str) -> pd.DataFrame:
        """获取与特定联系人的所有聊天记录"""
        all_messages = []

        for db_name, conn in self.connections.items():
            if not db_name.startswith('MSG'):
                continue

            query = """
            SELECT 
                CreateTime,
                IsSender,
                Type,
                SubType,
                StrContent,
                CompressContent,
                MsgSvrID,
                StrTalker
            FROM MSG 
            WHERE StrTalker = ?
            ORDER BY CreateTime
            """

            try:
                df = pd.read_sql_query(query, conn, params=[talker_id])
                if not df.empty:
                    all_messages.append(df)
                    print(f"从 {db_name} 获取到 {len(df)} 条消息")
            except Exception as e:
                print(f"从 {db_name} 读取消息失败: {e}")

        if all_messages:
            result = pd.concat(all_messages, ignore_index=True).sort_values('CreateTime')
            print(f"总共获取到 {len(result)} 条消息")
            return result

        return pd.DataFrame()

    def close(self):
        """关闭所有数据库连接"""
        for conn in self.connections.values():
            conn.close()
        print("所有数据库连接已关闭")


# 测试脚本
if __name__ == "__main__":
    # 测试数据库连接
    db = WeChatDB()

    # 运行连接测试
    if db.test_connection():
        print("\n数据库连接成功！")

        # 测试获取联系人
        contacts = db.get_contacts()
        if contacts:
            print(f"\n前5个联系人:")
            for contact in contacts[:5]:
                print(f"  - {contact['DisplayName']} ({contact['UserName']})")
    else:
        print("\n数据库连接失败，请检查路径和文件")

    db.close()
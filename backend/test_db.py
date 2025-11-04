"""
数据库连接测试脚本
运行方式: python test_db.py
"""

from database import WeChatDB

if __name__ == "__main__":
    print("=" * 50)
    print("RScore 数据库测试")
    print("=" * 50)

    # 测试数据库连接
    db = WeChatDB()

    # 运行连接测试
    if db.test_connection():
        print("\n✅ 数据库连接成功！")

        # 测试获取联系人
        contacts = db.get_contacts()
        if contacts:
            print(f"\n📊 联系人统计: 共找到 {len(contacts)} 个联系人")
            print("\n👥 前10个联系人:")
            for i, contact in enumerate(contacts[:10], 1):
                print(f"  {i}. {contact['DisplayName']} ({contact['UserName']})")

            # 测试获取第一个联系人的消息
            if contacts:
                test_contact = contacts[0]
                print(f"\n📧 测试获取 {test_contact['DisplayName']} 的聊天记录...")
                messages = db.get_chat_messages(test_contact['UserName'])
                if not messages.empty:
                    print(f"  ✅ 成功获取 {len(messages)} 条消息")
                else:
                    print(f"  ⚠️ 该联系人没有聊天记录")
        else:
            print("\n⚠️ 未找到联系人")
    else:
        print("\n❌ 数据库连接失败，请检查路径和文件")

    db.close()
    print("\n测试完成！")
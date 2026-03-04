from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
import os
import json
import xmlrpc.client
from urllib.parse import quote, unquote, urlparse
import requests
import re
from functools import wraps
import hashlib
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'typecho_web_secret_key_2024'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24小时

# 配置文件路径
TYPECHO_CONFIG_FILE = "typecho_config.json"
ALIST_CONFIG_FILE = "alist_config.json"
USER_CONFIG_FILE = "user_config.json"

# 默认用户配置
DEFAULT_USERS = {
    "admin": {
        "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",  # "password" 的SHA256
        "role": "admin",
        "created_at": "2024-01-01"
    }
}

# 用户管理函数
def load_users():
    """加载用户配置"""
    import json
    # 从环境变量加载用户配置
    user_config = os.environ.get('USER_CONFIG', '{}')
    try:
        config = json.loads(user_config)
        if config:
            return config
    except Exception:
        pass
    return DEFAULT_USERS.copy()

def save_users(users):
    """保存用户配置"""
    # 在Serverless环境中，保存操作可以忽略
    print("Users updated:", users)
    # 注意：在Vercel环境中，我们无法写入文件
    # 实际的配置更新需要通过修改环境变量来实现

def hash_password(password):
    """生成密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    """验证密码"""
    return hash_password(password) == hashed

def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def api_login_required(f):
    """API登录验证装饰器，返回JSON错误而不是重定向"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': '未登录或会话已过期，请重新登录'}), 401
        return f(*args, **kwargs)
    return decorated_function

# 文件处理相关常量
VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m3u8', '.asf', '.m4v', '.rm', '.asx', '.rmvb']
IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.hdri']

# ZBlogAPI 类
class ZBlogAPI:
    def __init__(self, api_url, username, password):
        self.api_url = api_url.rstrip('/')
        self.username = username
        self.password = password
        self.token = None
        # 初始化时不立即登录，而是在需要时才登录
        # self.login()

    def login(self):
        """登录Z-Blog，获取token"""
        try:
            import hashlib
            md5_password = hashlib.md5(self.password.encode()).hexdigest()
            
            # 确保api_url包含协议前缀
            api_url = self.api_url
            if not api_url.startswith(('http://', 'https://')):
                api_url = 'http://' + api_url
                print(f"添加协议前缀，使用: {api_url}")
            
            url = f"{api_url}/zb_system/api.php?mod=member&act=login"
            print(f"登录URL: {url}")
            print(f"登录数据: username={self.username}, password={md5_password[:8]}...")
            
            data = {
                'username': self.username,
                'password': md5_password,
                'savedate': '365'
            }
            
            response = requests.post(url, data=data, timeout=10)
            print(f"登录响应状态: {response.status_code}")
            print(f"登录响应头: {dict(response.headers)}")
            print(f"登录响应内容: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            print(f"登录响应JSON: {result}")
            
            if result.get('code') == 200:
                self.token = result.get('data', {}).get('token')
                print(f"Z-Blog登录成功，获取到token: {self.token[:20]}...")
                # 保存登录响应的完整数据，便于调试
                self.login_response = result
            else:
                raise Exception(f"登录失败: {result.get('message')}")
        except Exception as e:
            print(f"Z-Blog登录错误: {e}")
            raise e

    def set_config(self, api_url, username, password):
        self.api_url = api_url.rstrip('/')
        self.username = username
        self.password = password
        self.login()

    def get_categories(self):
        """获取分类列表"""
        try:
            # 确保已登录，每次获取分类前都重新登录获取新的token，避免授权超时
            print("重新登录获取新的token...")
            self.login()
            
            # 确保api_url包含协议前缀
            api_url = self.api_url
            if not api_url.startswith(('http://', 'https://')):
                api_url = 'http://' + api_url
            
            # 尝试不同的分类API端点
            endpoints = [
                f"{api_url}/zb_system/api.php?mod=category&act=list",
                f"{api_url}/zb_system/api.php?mod=category&act=list&manage=1"
            ]
            
            for url in endpoints:
                try:
                    print(f"尝试获取分类，URL: {url}")
                    headers = {'Authorization': self.token}
                    response = requests.get(url, headers=headers, timeout=10)
                    response.raise_for_status()
                    result = response.json()
                    print(f"分类API响应: {result}")
                    if result.get('code') == 200:
                        # 尝试不同的数据结构路径
                        categories = result.get('data', {}).get('category', [])
                        if not categories:
                            categories = result.get('data', {}).get('list', [])
                        if not categories:
                            categories = result.get('data', [])
                        if not categories:
                            categories = result.get('category', [])
                        if not categories:
                            categories = result.get('list', [])
                        print(f"获取到分类数量: {len(categories)}")
                        print(f"分类数据示例: {categories[0] if categories else '无'}")
                        return categories
                    else:
                        print(f"获取分类错误: {result.get('message')}")
                except Exception as e:
                    print(f"尝试获取分类失败: {e}")
                    continue
            
            return []
        except Exception as e:
            print(f"获取分类错误: {e}")
            return []

    def get_tags(self):
        """获取标签列表"""
        try:
            # 确保已登录，每次尝试获取标签前都重新登录获取新的token
            print("重新登录获取新的token...")
            self.login()
            
            # 确保api_url包含协议前缀
            api_url = self.api_url
            if not api_url.startswith(('http://', 'https://')):
                api_url = 'http://' + api_url
            
            # 尝试不同的标签API端点
            endpoints = [
                f"{api_url}/zb_system/api.php?mod=tag&act=list",
                f"{api_url}/zb_system/api.php?mod=tag&act=list&manage=1",
                f"{api_url}/zb_system/api.php?mod=tag&act=list&page=1&count=50",
                f"{api_url}/zb_system/api.php?mod=tag&act=list&page=1&count=50&manage=1",
                f"{api_url}/zb_system/api.php?mod=tag&act=list&token={self.token}"
            ]
            
            for url in endpoints:
                try:
                    print(f"尝试获取标签，URL: {url}")
                    # 尝试不同的头部信息
                    headers_list = [
                        {'Authorization': self.token},
                        {'Authorization': f'Bearer {self.token}'},
                        {'token': self.token},
                        {'X-Token': self.token},
                        {}  # 无头部信息
                    ]
                    
                    for headers in headers_list:
                        try:
                            print(f"尝试使用头部信息: {headers}")
                            # 首先尝试GET请求
                            response = requests.get(url, headers=headers, timeout=10)
                            print(f"标签API响应状态: {response.status_code}")
                            print(f"标签API响应头: {dict(response.headers)}")
                            
                            # 即使状态码不是200，也尝试解析响应
                            try:
                                result = response.json()
                                print(f"标签API响应: {result}")
                            except Exception as e:
                                print(f"解析响应失败: {e}")
                                print(f"响应内容: {response.text}")
                                result = {}
                            
                            if result.get('code') == 200:
                                # 尝试不同的数据结构路径
                                tags = result.get('data', {}).get('tag', [])
                                if not tags:
                                    tags = result.get('data', {}).get('list', [])
                                if not tags:
                                    tags = result.get('data', [])
                                if not tags:
                                    tags = result.get('tag', [])
                                if not tags:
                                    tags = result.get('list', [])
                                print(f"获取到标签数量: {len(tags)}")
                                print(f"标签数据示例: {tags[0] if tags else '无'}")
                                
                                # 确保标签数据格式正确
                                processed_tags = []
                                for tag in tags:
                                    if isinstance(tag, dict):
                                        # 确保标签对象有Name或name属性
                                        if 'Name' not in tag and 'name' not in tag:
                                            # 尝试其他可能的属性名
                                            for key in ['TagName', 'tag_name', 'Title', 'title']:
                                                if key in tag:
                                                    tag['Name'] = tag[key]
                                                    break
                                    processed_tags.append(tag)
                                
                                print(f"处理后标签数量: {len(processed_tags)}")
                                print(f"处理后标签数据示例: {processed_tags[0] if processed_tags else '无'}")
                                return processed_tags
                            else:
                                print(f"获取标签错误: {result.get('message')}")
                        except Exception as e:
                            print(f"GET请求失败: {e}")
                            continue
                    
                    # 如果所有GET请求都失败，尝试POST请求
                    for headers in headers_list:
                        try:
                            print(f"尝试POST请求，使用头部信息: {headers}")
                            response = requests.post(url, headers=headers, timeout=10)
                            print(f"标签API响应状态: {response.status_code}")
                            print(f"标签API响应头: {dict(response.headers)}")
                            
                            # 即使状态码不是200，也尝试解析响应
                            try:
                                result = response.json()
                                print(f"标签API响应: {result}")
                            except Exception as e:
                                print(f"解析响应失败: {e}")
                                print(f"响应内容: {response.text}")
                                result = {}
                            
                            if result.get('code') == 200:
                                # 尝试不同的数据结构路径
                                tags = result.get('data', {}).get('tag', [])
                                if not tags:
                                    tags = result.get('data', {}).get('list', [])
                                if not tags:
                                    tags = result.get('data', [])
                                if not tags:
                                    tags = result.get('tag', [])
                                if not tags:
                                    tags = result.get('list', [])
                                print(f"获取到标签数量: {len(tags)}")
                                print(f"标签数据示例: {tags[0] if tags else '无'}")
                                
                                # 确保标签数据格式正确
                                processed_tags = []
                                for tag in tags:
                                    if isinstance(tag, dict):
                                        # 确保标签对象有Name或name属性
                                        if 'Name' not in tag and 'name' not in tag:
                                            # 尝试其他可能的属性名
                                            for key in ['TagName', 'tag_name', 'Title', 'title']:
                                                if key in tag:
                                                    tag['Name'] = tag[key]
                                                    break
                                    processed_tags.append(tag)
                                
                                print(f"处理后标签数量: {len(processed_tags)}")
                                print(f"处理后标签数据示例: {processed_tags[0] if processed_tags else '无'}")
                                return processed_tags
                            else:
                                print(f"获取标签错误: {result.get('message')}")
                        except Exception as e:
                            print(f"POST请求失败: {e}")
                            continue
                except Exception as e:
                    print(f"尝试获取标签失败: {e}")
                    continue
            
            # 如果所有尝试都失败，返回空列表
            print("所有尝试都失败，返回空列表")
            return []
        except Exception as e:
            print(f"获取标签错误: {e}")
            return []

    def get_category_tree(self):
        """返回父子结构的分类树，便于界面树形展示"""
        cats = self.get_categories()
        print(f"get_category_tree - 原始分类数据: {cats}")
        if not cats or not isinstance(cats, list):
            print("get_category_tree - 分类数据为空或不是列表")
            return {}
        tree = {}
        for cat in cats:
            if not isinstance(cat, dict):
                print(f"get_category_tree - 分类项不是字典: {cat}")
                continue
            try:
                parent_id = int(cat.get('ParentID') or cat.get('parent_id') or cat.get('Parent') or 0)
                category_id = cat.get('ID') or cat.get('id')
                print(f"get_category_tree - 处理分类: ID={category_id}, ParentID={parent_id}")
            except Exception as e:
                print(f"get_category_tree - 解析分类ID失败: {e}")
                parent_id = 0
            tree.setdefault(parent_id, []).append(cat)
        print(f"get_category_tree - 构建的树形结构: {tree}")
        return tree

    def new_category(self, name, slug=None, parent_id=0, description=None):
        """创建新分类"""
        try:
            # 确保已登录，每次创建分类前都重新登录获取新的token，避免授权超时
            print("重新登录获取新的token...")
            self.login()
            
            # 确保api_url包含协议前缀
            api_url = self.api_url
            if not api_url.startswith(('http://', 'https://')):
                api_url = 'http://' + api_url
            
            url = f"{api_url}/zb_system/api.php?mod=category&act=post"
            print(f"创建分类URL: {url}")
            print(f"使用的token: {self.token[:20]}...")
            
            # 尝试不同的头部信息
            headers_list = [
                {'Authorization': self.token},
                {'Authorization': f'Bearer {self.token}'},
                {'token': self.token},
                {'X-Token': self.token},
                {}
            ]
            
            data = {
                'ID': '0',
                'Name': name,
                'Alias': slug if slug is not None else '',
                'ParentID': parent_id,
                'Intro': description or name
            }
            
            # 尝试不同的头部信息
            for headers in headers_list:
                try:
                    print(f"尝试使用头部信息: {headers}")
                    response = requests.post(url, data=data, headers=headers, timeout=10)
                    print(f"创建分类响应状态: {response.status_code}")
                    print(f"创建分类响应头: {dict(response.headers)}")
                    print(f"创建分类响应内容: {response.text}")
                    
                    # 即使状态码不是200，也尝试解析响应
                    try:
                        result = response.json()
                        print(f"创建分类响应JSON: {result}")
                    except Exception as e:
                        print(f"解析响应失败: {e}")
                        result = {}
                    
                    if result.get('code') == 200:
                        return result.get('data', {}).get('id')
                    else:
                        print(f"创建分类错误: {result.get('message')}")
                except Exception as e:
                    print(f"创建分类请求失败: {e}")
                    continue
            
            # 如果所有尝试都失败，抛出最后一个错误
            raise Exception("所有创建分类的尝试都失败了")
        except Exception as e:
            print(f"创建分类错误: {e}")
            raise e

    def get_recent_posts(self, posts_num=20):
        """获取最新文章列表"""
        try:
            # 确保已登录，每次获取文章列表前都重新登录获取新的token，避免授权超时
            print("重新登录获取新的token...")
            self.login()
            
            # 确保api_url包含协议前缀
            api_url = self.api_url
            if not api_url.startswith(('http://', 'https://')):
                api_url = 'http://' + api_url
            
            url = f"{api_url}/zb_system/api.php?mod=post&act=list"
            print(f"获取文章列表URL: {url}")
            print(f"使用的token: {self.token[:20]}...")
            
            # 尝试不同的头部信息
            headers_list = [
                {'Authorization': self.token},
                {'Authorization': f'Bearer {self.token}'},
                {'token': self.token},
                {'X-Token': self.token},
                {}
            ]
            
            params = {
                'page': 1,
                'count': posts_num
            }
            print(f"请求参数: {params}")
            
            # 尝试不同的头部信息
            for headers in headers_list:
                try:
                    print(f"尝试使用头部信息: {headers}")
                    response = requests.get(url, headers=headers, params=params, timeout=10)
                    print(f"获取文章列表响应状态: {response.status_code}")
                    print(f"获取文章列表响应头: {dict(response.headers)}")
                    print(f"获取文章列表响应内容: {response.text}")
                    
                    # 即使状态码不是200，也尝试解析响应
                    try:
                        result = response.json()
                        print(f"获取文章列表响应JSON: {result}")
                    except Exception as e:
                        print(f"解析响应失败: {e}")
                        result = {}
                    
                    if result.get('code') == 200:
                        # 打印完整的响应数据结构
                        print(f"完整响应数据结构: {result}")
                        print(f"data字段: {result.get('data')}")
                        print(f"data类型: {type(result.get('data'))}")
                        
                        # 尝试不同的数据结构路径
                        posts = []
                        if isinstance(result.get('data'), dict):
                            posts = result.get('data', {}).get('post', [])
                            if not posts:
                                posts = result.get('data', {}).get('list', [])
                            if not posts:
                                posts = result.get('data', {}).get('posts', [])
                        elif isinstance(result.get('data'), list):
                            posts = result.get('data', [])
                        
                        # 尝试直接从响应中获取
                        if not posts:
                            posts = result.get('post', [])
                        if not posts:
                            posts = result.get('list', [])
                        if not posts:
                            posts = result.get('posts', [])
                        
                        # 打印获取到的文章数据，特别是Status字段
                        print(f"获取到的文章数量: {len(posts)}")
                        for i, post in enumerate(posts):
                            print(f"文章{i+1}数据: {post}")
                            print(f"文章{i+1}Status字段: {post.get('Status')}")
                            print(f"文章{i+1}标题: {post.get('Title')}")
                        
                        print(f"获取到文章数量: {len(posts)}")
                        if posts:
                            print(f"文章数据示例: {posts[0]}")
                        return posts
                    else:
                        print(f"获取文章列表错误: {result.get('message')}")
                except Exception as e:
                    print(f"获取文章列表请求失败: {e}")
                    continue
            
            # 如果所有尝试都失败，返回空列表
            print("所有获取文章列表的尝试都失败了")
            return []
        except Exception as e:
            print(f"获取文章列表错误: {e}")
            return []

    def get_post(self, post_id):
        """获取单个文章详情"""
        try:
            # 确保已登录，每次获取文章详情前都重新登录获取新的token，避免授权超时
            print("重新登录获取新的token...")
            self.login()
            
            # 确保api_url包含协议前缀
            api_url = self.api_url
            if not api_url.startswith(('http://', 'https://')):
                api_url = 'http://' + api_url
            
            url = f"{api_url}/zb_system/api.php?mod=post&act=get"
            headers = {'Authorization': self.token}
            params = {'id': post_id}
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            result = response.json()
            if result.get('code') == 200:
                return result.get('data', {}).get('post')
            else:
                print(f"获取文章详情错误: {result.get('message')}")
                return None
        except Exception as e:
            print(f"获取文章详情错误: {e}")
            return None

    def delete_post(self, post_id):
        """删除文章"""
        try:
            # 确保已登录，每次删除文章前都重新登录获取新的token，避免授权超时
            print("重新登录获取新的token...")
            self.login()
            
            # 确保api_url包含协议前缀
            api_url = self.api_url
            if not api_url.startswith(('http://', 'https://')):
                api_url = 'http://' + api_url
            
            url = f"{api_url}/zb_system/api.php?mod=post&act=delete"
            headers = {'Authorization': self.token}
            data = {'id': post_id}
            response = requests.post(url, data=data, headers=headers, timeout=10)
            response.raise_for_status()
            result = response.json()
            if result.get('code') == 200:
                return True
            else:
                print(f"删除文章错误: {result.get('message')}")
                return False
        except Exception as e:
            print(f"删除文章错误: {e}")
            return False

    def new_post(self, post_struct, publish=True):
        """发布文章"""
        try:
            # 确保已登录，每次发布文章前都重新登录获取新的token，避免授权超时
            print("重新登录获取新的token...")
            self.login()
            
            # 调试信息
            print(f"ZBlogAPI.new_post - 发送到Z-Blog的数据结构:")
            print(f"  标题: {post_struct.get('title')}")
            print(f"  分类名称: {post_struct.get('categories')}")
            print(f"  分类ID: {post_struct.get('category_ids')}")
            print(f"  标签: {post_struct.get('mt_keywords')}")
            print(f"  完整结构: {post_struct}")
            
            # 确保api_url包含协议前缀
            api_url = self.api_url
            if not api_url.startswith(('http://', 'https://')):
                api_url = 'http://' + api_url
            
            url = f"{api_url}/zb_system/api.php?mod=post&act=post"
            print(f"发布文章URL: {url}")
            print(f"使用的token: {self.token[:20]}...")
            
            # 尝试不同的头部信息
            headers_list = [
                {'Authorization': self.token},
                {'Authorization': f'Bearer {self.token}'},
                {'token': self.token},
                {'X-Token': self.token},
                {}
            ]
            
            # 创建用于发送给Z-Blog的数据结构
            zblog_struct = {
                'ID': '0',  # 0表示新建
                'Title': post_struct.get('title'),
                'Content': post_struct.get('description'),
                'Type': '0',  # 0表示文章
                'Status': '0' if publish else '1',  # 0表示公开，1表示草稿
                'Tag': post_struct.get('mt_keywords', '')
            }
            
            # 处理分类
            if post_struct.get('category_ids'):
                # 如果有分类ID，使用第一个作为主分类
                zblog_struct['CateID'] = post_struct.get('category_ids')[0]
                print(f"使用分类ID: {zblog_struct['CateID']}")
            elif post_struct.get('categories'):
                # 如果只有分类名称，使用第一个作为主分类名称
                zblog_struct['CateName'] = post_struct.get('categories')[0]
                print(f"使用分类名称: {zblog_struct['CateName']}")
            else:
                print("警告: 没有找到分类信息")
            
            print(f"发送给Z-Blog的最终结构: {zblog_struct}")
            
            # 尝试不同的头部信息
            for headers in headers_list:
                try:
                    print(f"尝试使用头部信息: {headers}")
                    response = requests.post(url, data=zblog_struct, headers=headers, timeout=15)
                    print(f"发布文章响应状态: {response.status_code}")
                    print(f"发布文章响应头: {dict(response.headers)}")
                    print(f"发布文章响应内容: {response.text}")
                    
                    # 即使状态码不是200，也尝试解析响应
                    try:
                        result = response.json()
                        print(f"发布文章响应JSON: {result}")
                    except Exception as e:
                        print(f"解析响应失败: {e}")
                        result = {}
                    
                    if result.get('code') == 200:
                        # 打印完整的响应数据结构
                        print(f"发布文章完整响应数据结构: {result}")
                        print(f"发布文章data字段: {result.get('data')}")
                        
                        # 尝试不同的数据结构路径获取文章ID
                        post_id = None
                        if isinstance(result.get('data'), dict):
                            # 尝试从data.post.ID获取
                            post_id = result.get('data', {}).get('post', {}).get('ID')
                            # 尝试从data.id获取
                            if not post_id:
                                post_id = result.get('data', {}).get('id')
                        
                        # 尝试直接从响应中获取
                        if not post_id:
                            post_id = result.get('id')
                        
                        print(f"文章发布成功，ID: {post_id}")
                        return post_id
                    else:
                        print(f"发布文章错误: {result.get('message')}")
                except Exception as e:
                    print(f"发布文章请求失败: {e}")
                    continue
            
            # 如果所有尝试都失败，抛出最后一个错误
            raise Exception("所有发布文章的尝试都失败了")
        except Exception as e:
            print(f"创建文章错误: {e}")
            raise e

# AlistApi 类
class AlistApi:
    def __init__(self, server_url, username, password, token=None):
        self.server_url = server_url.rstrip('/')
        self.username = username
        self.password = password
        self.token = token

    def login(self):
        url = f"{self.server_url}/api/auth/login"
        try:
            resp = requests.post(url, json={"username": self.username, "password": self.password}, timeout=10)
            resp.raise_for_status()
            self.token = resp.json()['data']['token']
            return self.token
        except requests.exceptions.Timeout:
            raise Exception(f"连接Alist服务器超时: {self.server_url}")
        except requests.exceptions.ConnectionError:
            raise Exception(f"无法连接到Alist服务器: {self.server_url}")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Alist登录失败: {e}")

    def get_file_list(self, path="/", page=1, per_page=1000):
        """获取文件列表，支持大目录分页加载所有文件"""
        url = f"{self.server_url}/api/fs/list"
        headers = {"Authorization": self.token}
        all_files = []
        current_page = 1
        
        try:
            while True:
                try:
                    resp = requests.post(url, json={"path": path, "page": current_page, "per_page": per_page}, headers=headers, timeout=15)
                    resp.raise_for_status()
                    data = resp.json().get('data', None)
                    
                    if data is None or not isinstance(data, dict):
                        # 可能token失效，尝试重新登录一次
                        self.login()
                        headers = {"Authorization": self.token}
                        resp = requests.post(url, json={"path": path, "page": current_page, "per_page": per_page}, headers=headers, timeout=15)
                        resp.raise_for_status()
                        data = resp.json().get('data', None)
                        if data is None or not isinstance(data, dict):
                            break
                            
                except requests.exceptions.Timeout:
                    raise Exception(f"获取文件列表超时: {self.server_url} (路径: {path})")
                except requests.exceptions.ConnectionError:
                    raise Exception(f"连接Alist服务器失败: {self.server_url}")
                except requests.exceptions.RequestException as e:
                    raise Exception(f"获取文件列表失败: {e}")
                
                content = data.get('content', [])
                if content is None or len(content) == 0:
                    break
                
                all_files.extend(content)
                print(f"已加载第{current_page}页，本页{len(content)}个文件，总计{len(all_files)}个文件")
                
                # 如果本页文件数少于per_page，说明是最后一页
                if len(content) < per_page:
                    break
                
                current_page += 1
                
                # 防止无限循环，最多加载100页
                if current_page > 100:
                    print(f"警告：已达到最大页数限制，可能还有更多文件未加载")
                    break
            
            print(f"文件列表加载完成，路径: {path}，总文件数: {len(all_files)}")
            return all_files
        except Exception as e:
            print(f"加载文件列表失败: {e}")
            return []

    def get_file_link(self, file_path):
        # 生成无 token 的直链
        encoded_path = "/".join([quote(p) for p in file_path.split("/") if p])
        url = f"{self.server_url}/d/{encoded_path}"
        return url

# 加载Z-Blog配置
def load_typecho_config():
    import json
    # 从环境变量加载配置
    typecho_config = os.environ.get('TYPECHO_CONFIG', '{}')
    try:
        config = json.loads(typecho_config)
        if config:
            return config
    except Exception:
        pass
    return {
        "api_url": "http://example.com",
        "username": "admin",
        "password": "admin123"
    }

# 保存Z-Blog配置
def save_typecho_config(config):
    # 在Serverless环境中，保存操作可以忽略
    print("Typecho config updated:", config)
    # 注意：在Vercel环境中，我们无法写入文件
    # 实际的配置更新需要通过修改环境变量来实现

# 加载Alist账户
def load_alist_accounts():
    import json
    # 从环境变量加载Alist配置
    alist_config = os.environ.get('ALIST_CONFIG', '[]')
    try:
        return json.loads(alist_config)
    except Exception:
        pass
    return []

# 保存Alist账户
def save_alist_accounts(accounts):
    # 在Serverless环境中，保存操作可以忽略
    print("Alist accounts updated:", accounts)
    # 注意：在Vercel环境中，我们无法写入文件
    # 实际的配置更新需要通过修改环境变量来实现

# 处理zylj文件
def extract_sort_key(url):
    """从URL中提取用于排序的数字"""
    try:
        path = unquote(urlparse(url).path)
        filename = os.path.basename(path)

        # 优先级1: 提取括号内的数字
        match = re.search(r'\((\d+)\)', filename)
        if match:
            return int(match.group(1))

        # 优先级2: 提取其他数字
        name_without_ext = os.path.splitext(filename)[0]
        numbers = re.findall(r'\d+', name_without_ext)
        if numbers:
            # 取最后一个数字序列的前6位
            last_digits = numbers[-1]
            truncated = last_digits[:6]
            return int(truncated)
    except (ValueError, IndexError):
        return float('inf')
    return float('inf')

def format_videos(video_links):
    """根据视频链接数量生成HTML5 video标签内容"""
    if not video_links:
        return ""
    table_rows = []
    for i in range(0, len(video_links), 2):
        left_td = f'<td style="background:#fff;border-radius:8px;padding:8px;border:1px solid #eee;width:50%;vertical-align:top;"><video src=\"{video_links[i]}\" controls=\"true\" style=\"width:100%;height:auto;max-width:100%;\"></video></td>'
        if i + 1 < len(video_links):
            right_td = f'<td style="background:#fff;border-radius:8px;padding:8px;border:1px solid #eee;width:50%;vertical-align:top;"><video src=\"{video_links[i+1]}\" controls=\"true\" style=\"width:100%;height:auto;max-width:100%;\"></video></td>'
            table_rows.append(f"<tr>{left_td}{right_td}</tr>")
        else:
            table_rows.append(f"<tr>{left_td}<td></td></tr>")
    return '<table style="border-spacing:16px 16px;width:100%;">\n' + '\n'.join(table_rows) + '\n</table>'

def format_images(image_links):
    """根据图片链接生成HTML内容"""
    if not image_links:
        return ""
    output = [f'<img src="{image_links[0]}">']
    if len(image_links) > 1:
        table_rows = []
        for i in range(1, len(image_links)):
            j = i - 1
            td_class = "图片2" if (j + 1) % 2 == 0 else "图片1"
            img_tag = f'<td class="{td_class}" style="background:#fff;border-radius:8px;padding:8px;border:1px solid #eee;width:50%;vertical-align:top;"><img src="{image_links[i]}"></td>'
            if j % 2 == 0:
                table_rows.append("<tr>" + img_tag)
            else:
                table_rows[-1] += img_tag + "</tr>"
        if (len(image_links) - 1) % 2 != 0:
            if table_rows:
                table_rows[-1] += "</tr>"
        output.append('<table style="border-spacing:16px 16px;width:100%;">')
        output.extend(table_rows)
        output.append('</table>')
    return "\n".join(output)

def format_images_double(image_links):
    """所有图片从第一行开始就是2张一行，无首图"""
    if not image_links:
        return ""
    table_rows = []
    for i in range(0, len(image_links), 2):
        left_td = f'<td class="图片1" style="background:#fff;border-radius:8px;padding:8px;border:1px solid #eee;width:50%;vertical-align:top;"><img src="{image_links[i]}"></td>'
        if i + 1 < len(image_links):
            right_td = f'<td class="图片2" style="background:#fff;border-radius:8px;padding:8px;border:1px solid #eee;width:50%;vertical-align:top;"><img src="{image_links[i+1]}" ></td>'
            table_rows.append(f"<tr>{left_td}{right_td}</tr>")
        else:
            table_rows.append(f"<tr>{left_td}</tr>")
    return '<table style="border-spacing:16px 16px;width:100%;">\n' + '\n'.join(table_rows) + '\n</table>'

def process_zylj_file(filepath="zylj.txt", output_filepath="processed_links.md"):
    """处理zylj.txt文件，过滤、排序并生成最终的文章内容
    返回：(final_content, has_videos) - 内容和是否包含视频的布尔值"""
    try:
        # 尝试从环境变量获取链接数据
        import os
        zylj_content = os.environ.get('ZYLJ_CONTENT', '')
        if zylj_content:
            lines = zylj_content.split('\n')
        else:
            # 尝试从文件读取
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
    except FileNotFoundError:
        return "错误: zylj.txt 文件未找到.", False

    video_links = []
    image_links = []

    for line in lines:
        url = line.strip()
        if not url:
            continue
            
        try:
            path = unquote(urlparse(url).path)
            ext = os.path.splitext(path)[1].lower()
        except Exception:
            continue

        if ext in VIDEO_EXTENSIONS:
            video_links.append(url)
        elif ext in IMAGE_EXTENSIONS:
            image_links.append(url)

    video_links.sort(key=extract_sort_key)
    image_links.sort(key=extract_sort_key)

    video_content = format_videos(video_links)
    image_content = format_images(image_links)
    
    num_videos = len(video_links)
    num_images = len(image_links)

    if num_images > 0 and num_videos > 0:
        stats_str = f"{num_images}P{num_videos}V"
    elif num_images > 0:
        stats_str = f"{num_images}P"
    elif num_videos > 0:
        stats_str = f"{num_videos}V"
    else:
        stats_str = ""

    stats_info = f"统计信息:{'&nbsp;' * 7}[{stats_str}]" if stats_str else ""

    final_content = f"{stats_info}\n\n{video_content}\n\n{image_content}".strip()
    
    # 判断是否包含视频
    has_videos = len(video_links) > 0
    
    # 保存文件
    try:
        with open(output_filepath, 'w', encoding='utf-8') as f:
            f.write(final_content)
    except Exception as e:
        return f"错误: 保存文件失败 - {e}", False

    return final_content, has_videos 

def process_zylj_file_double_image(filepath="zylj.txt", output_filepath="processed_links_double.md"):
    """只处理图片链接，纯双排输出
    返回：(final_content, has_videos) - 内容和是否包含视频的布尔值（纯双排模式always False）"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        return "错误: zylj.txt 文件未找到.", False

    image_links = []
    for line in lines:
        url = line.strip()
        if not url:
            continue
        try:
            path = unquote(urlparse(url).path)
            ext = os.path.splitext(path)[1].lower()
        except Exception:
            continue
        if ext in IMAGE_EXTENSIONS:
            image_links.append(url)
    image_links.sort(key=extract_sort_key)
    num_images = len(image_links)
    stats_str = f"{num_images}P" if num_images > 0 else ""
    stats_info = f"统计信息:{'&nbsp;' * 7}[{stats_str}]" if stats_str else ""
    image_content = format_images_double(image_links)
    final_content = f"{stats_info}\n\n{image_content}".strip()
    try:
        with open(output_filepath, 'w', encoding='utf-8') as f:
            f.write(final_content)
    except Exception as e:
        return f"错误: 保存文件失败 - {e}", False
    return final_content, False

def normalize_text_for_matching(text):
    """标准化文本用于匹配，处理大小写和不同分隔符"""
    if not text:
        return ""
    # 转换为小写
    normalized = text.lower()
    # 替换常见的分隔符为统一格式
    normalized = re.sub(r'[\s_\-\.]+', '', normalized)
    return normalized

# 登录相关路由
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        if not username or not password:
            flash('请输入用户名和密码', 'error')
            return render_template('login.html')
        
        users = load_users()
        user = users.get(username)
        
        if user and verify_password(password, user['password']):
            session['logged_in'] = True
            session['username'] = username
            session['user_role'] = user['role']
            session.permanent = True
            
            # 记录登录日志
            print(f"用户 {username} 登录成功")
            
            # 重定向到原来要访问的页面，如果没有则到首页
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('index'))
        else:
            flash('用户名或密码错误', 'error')
            print(f"用户 {username} 登录失败：密码错误")
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    username = session.get('username', 'Unknown')
    session.clear()
    print(f"用户 {username} 已登出")
    flash('已成功登出', 'success')
    return redirect(url_for('login'))

@app.route('/user_management')
@login_required
def user_management():
    # 只有admin用户可以访问用户管理
    if session.get('user_role') != 'admin':
        flash('权限不足，只有管理员可以访问用户管理', 'error')
        return redirect(url_for('index'))
    return render_template('user_management.html', active_tab='user_management')

# 受保护的路由定义
@app.route('/')
@login_required
def index():
    return render_template('index.html', active_tab='index')

@app.route('/typecho')
@login_required
def typecho():
    return render_template('typecho.html', active_tab='typecho')

@app.route('/articles')
@login_required
def articles():
    return render_template('articles.html', active_tab='articles')

@app.route('/txt')
@login_required
def txt_manager():
    # 读取zylj.txt文件内容
    try:
        with open('zylj.txt', 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        content = ''
    return render_template('txt.html', active_tab='txt', content=content)

@app.route('/processed')
@login_required
def processed():
    # 读取processed_links.md文件内容
    try:
        with open('processed_links.md', 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        content = ''
    return render_template('processed.html', active_tab='processed', content=content)

@app.route('/processed_double')
@login_required
def processed_double():
    # 读取processed_links_double.md文件内容
    try:
        with open('processed_links_double.md', 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        content = ''
    return render_template('processed_double.html', active_tab='processed_double', content=content)

# API路由
@app.route('/api/typecho/config', methods=['GET', 'POST'])
@api_login_required
def typecho_config():
    if request.method == 'GET':
        return jsonify(load_typecho_config())
    else:
        config = request.json
        save_typecho_config(config)
        return jsonify({'success': True})

@app.route('/api/typecho/categories')
@api_login_required
def get_categories():
    config = load_typecho_config()
    api = ZBlogAPI(config['api_url'], config['username'], config['password'])
    try:
        return jsonify(api.get_category_tree())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/typecho/tags')
@api_login_required
def get_tags():
    config = load_typecho_config()
    api = ZBlogAPI(config['api_url'], config['username'], config['password'])
    try:
        return jsonify(api.get_tags())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/typecho/new_category', methods=['POST'])
@api_login_required
def new_category():
    config = load_typecho_config()
    api = ZBlogAPI(config['api_url'], config['username'], config['password'])
    data = request.json
    try:
        result = api.new_category(data['name'], parent_id=data.get('parent_id', 0))
        return jsonify({'success': True, 'id': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/typecho/publish', methods=['POST'])
@api_login_required
def publish_post():
    config = load_typecho_config()
    api = ZBlogAPI(config['api_url'], config['username'], config['password'])
    data = request.json
    
    # 调试信息
    print(f"发布文章 - 接收到的数据: {data}")
    print(f"标题: {data.get('title', '')}")
    print(f"内容长度: {len(data.get('description', ''))}")
    print(f"内容前100字符: {data.get('description', '')[:100]}")
    print(f"分类数据: {data.get('categories', [])}")
    print(f"分类数量: {len(data.get('categories', []))}")
    
    try:
        post_id = api.new_post(data, True)
        return jsonify({'success': True, 'post_id': post_id})
    except Exception as e:
        print(f"发布文章失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/typecho/posts')
@api_login_required
def get_posts():
    """获取文章列表"""
    config = load_typecho_config()
    if not config:
        return jsonify({'success': False, 'message': 'Z-Blog未配置'})
    
    try:
        api = ZBlogAPI(config['api_url'], config['username'], config['password'])
        posts_num = request.args.get('limit', 20, type=int)
        posts = api.get_recent_posts(posts_num)
        
        # 处理日期格式和其他数据
        processed_posts = []
        for post in posts:
            processed_post = {}
            for key, value in post.items():
                processed_post[key] = value
            processed_posts.append(processed_post)
                
        return jsonify({'success': True, 'posts': processed_posts})
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取文章列表失败: {str(e)}'})

@app.route('/api/typecho/posts/<int:post_id>')
@api_login_required
def get_post_detail(post_id):
    """获取文章详情"""
    config = load_typecho_config()
    if not config:
        return jsonify({'success': False, 'message': 'Z-Blog未配置'})
    
    try:
        api = ZBlogAPI(config['api_url'], config['username'], config['password'])
        post = api.get_post(post_id)
        
        if post:
            # 处理日期格式和其他数据
            processed_post = {}
            for key, value in post.items():
                processed_post[key] = value
                    
            return jsonify({'success': True, 'post': processed_post})
        else:
            return jsonify({'success': False, 'message': '文章不存在'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取文章详情失败: {str(e)}'})

@app.route('/api/typecho/posts/<int:post_id>', methods=['DELETE'])
@api_login_required
def delete_post_api(post_id):
    """删除文章"""
    config = load_typecho_config()
    if not config:
        return jsonify({'success': False, 'message': 'Z-Blog未配置'})
    
    try:
        api = ZBlogAPI(config['api_url'], config['username'], config['password'])
        result = api.delete_post(post_id)
        
        if result:
            return jsonify({'success': True, 'message': '文章删除成功'})
        else:
            return jsonify({'success': False, 'message': '删除失败'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'删除文章失败: {str(e)}'})

@app.route('/api/alist/accounts', methods=['GET', 'POST'])
@api_login_required
def alist_accounts():
    if request.method == 'GET':
        return jsonify(load_alist_accounts())
    else:
        accounts = request.json
        save_alist_accounts(accounts)
        return jsonify({'success': True})

@app.route('/api/alist/files', methods=['POST'])
@api_login_required
def get_alist_files():
    data = request.json
    account = data['account']
    path = data['path']
    
    api = AlistApi(account['server'], account['username'], account['password'], account.get('token'))
    try:
        if not api.token:
            api.login()
        files = api.get_file_list(path)
        return jsonify(files)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alist/file_link', methods=['POST'])
@api_login_required
def get_file_link():
    data = request.json
    account = data['account']
    file_path = data['file_path']
    
    api = AlistApi(account['server'], account['username'], account['password'], account.get('token'))
    try:
        if not api.token:
            api.login()
        link = api.get_file_link(file_path)
        return jsonify({'link': link})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alist/test_login', methods=['POST'])
@api_login_required
def test_alist_login():
    data = request.json
    server = data['server']
    username = data['username']
    password = data['password']
    
    try:
        api = AlistApi(server, username, password)
        token = api.login()
        return jsonify({'success': True, 'token': token})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/txt/save', methods=['POST'])
@api_login_required
def save_txt():
    content = request.json.get('content', '')
    clear_first = request.json.get('clear_first', False)
    
    try:
        if clear_first:
            # 手动保存时先清除原内容
            with open('zylj.txt', 'w', encoding='utf-8') as f:
                f.write('')  # 先清空文件
        
        with open('zylj.txt', 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/txt/load')
@api_login_required
def load_txt():
    try:
        with open('zylj.txt', 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'content': content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process/links', methods=['POST'])
@api_login_required
def process_links():
    try:
        result = process_zylj_file()
        
        # 处理新的返回格式: (content, has_videos) 或 单一内容字符串
        if isinstance(result, tuple):
            content, has_videos = result
        else:
            # 兼容旧版本返回
            content = result
            has_videos = False
            
        return jsonify({
            'content': content,
            'has_videos': has_videos
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process/links_double', methods=['POST'])
@api_login_required
def process_links_double():
    try:
        result = process_zylj_file_double_image()
        
        # 处理新的返回格式: (content, has_videos) 或 单一内容字符串
        if isinstance(result, tuple):
            content, has_videos = result
        else:
            # 兼容旧版本返回
            content = result
            has_videos = False
            
        return jsonify({
            'content': content,
            'has_videos': has_videos
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/processed/save', methods=['POST'])
@api_login_required
def save_processed():
    content = request.json.get('content', '')
    file_type = request.json.get('type', 'normal')
    filename = 'processed_links.md' if file_type == 'normal' else 'processed_links_double.md'
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 测试路由，用于验证API调用是否正常
@app.route('/api/test')
@api_login_required
def test_api():
    print('接收到测试API调用')
    return jsonify({'success': True, 'message': '测试API调用成功'})

# 简单的测试路由，不需要登录验证
@app.route('/test')
def test():
    print('接收到简单测试请求')
    return '测试请求成功'

# 用户管理API
@app.route('/api/users', methods=['GET'])
@api_login_required
def get_users():
    # 只有admin可以查看用户列表
    if session.get('user_role') != 'admin':
        return jsonify({'error': '权限不足'}), 403
    
    try:
        users = load_users()
        # 不返回密码信息
        safe_users = {}
        for username, info in users.items():
            safe_users[username] = {
                'role': info.get('role', 'user'),
                'created_at': info.get('created_at', 'Unknown')
            }
        return jsonify(safe_users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
@api_login_required
def add_user():
    # 只有admin可以添加用户
    if session.get('user_role') != 'admin':
        return jsonify({'error': '权限不足'}), 403
    
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        role = data.get('role', 'user').strip()
        
        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400
        
        if role not in ['admin', 'user']:
            return jsonify({'error': '角色只能是admin或user'}), 400
        
        users = load_users()
        
        if username in users:
            return jsonify({'error': '用户名已存在'}), 400
        
        users[username] = {
            'password': hash_password(password),
            'role': role,
            'created_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        save_users(users)
        print(f"管理员 {session.get('username')} 添加了用户 {username}")
        
        return jsonify({'success': True, 'message': f'用户 {username} 添加成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<username>', methods=['DELETE'])
@api_login_required
def delete_user(username):
    # 只有admin可以删除用户
    if session.get('user_role') != 'admin':
        return jsonify({'error': '权限不足'}), 403
    
    try:
        current_user = session.get('username')
        if username == current_user:
            return jsonify({'error': '不能删除自己的账户'}), 400
        
        users = load_users()
        
        if username not in users:
            return jsonify({'error': '用户不存在'}), 404
        
        del users[username]
        save_users(users)
        print(f"管理员 {current_user} 删除了用户 {username}")
        
        return jsonify({'success': True, 'message': f'用户 {username} 删除成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<username>/password', methods=['PUT'])
@api_login_required
def change_user_password(username):
    # 只有admin可以修改其他用户密码，用户可以修改自己的密码
    current_user = session.get('username')
    current_role = session.get('user_role')
    
    if current_user != username and current_role != 'admin':
        return jsonify({'error': '权限不足'}), 403
    
    try:
        data = request.json
        new_password = data.get('password', '').strip()
        
        if not new_password:
            return jsonify({'error': '密码不能为空'}), 400
        
        users = load_users()
        
        if username not in users:
            return jsonify({'error': '用户不存在'}), 404
        
        users[username]['password'] = hash_password(new_password)
        save_users(users)
        
        if current_user == username:
            print(f"用户 {username} 修改了自己的密码")
        else:
            print(f"管理员 {current_user} 修改了用户 {username} 的密码")
        
        return jsonify({'success': True, 'message': '密码修改成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 确保必要的文件存在
    for file in ['zylj.txt', 'processed_links.md', 'processed_links_double.md']:
        if not os.path.exists(file):
            with open(file, 'w', encoding='utf-8') as f:
                f.write('')
    
    app.run(host='0.0.0.0', port=5000, debug=True)
